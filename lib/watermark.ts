import sharp from "sharp";

export const DEFAULT_WATERMARK_TEXT = "PROOF";

export type WatermarkType = "text" | "logo";

export type WatermarkPosition =
  | "TOP_LEFT"
  | "TOP_CENTER"
  | "TOP_RIGHT"
  | "MIDDLE_LEFT"
  | "CENTER"
  | "MIDDLE_RIGHT"
  | "BOTTOM_LEFT"
  | "BOTTOM_CENTER"
  | "BOTTOM_RIGHT";

const GRAVITY_BY_POSITION: Record<WatermarkPosition, string> = {
  TOP_LEFT: "northwest",
  TOP_CENTER: "north",
  TOP_RIGHT: "northeast",
  MIDDLE_LEFT: "west",
  CENTER: "center",
  MIDDLE_RIGHT: "east",
  BOTTOM_LEFT: "southwest",
  BOTTOM_CENTER: "south",
  BOTTOM_RIGHT: "southeast",
};

export interface WatermarkConfig {
  type: WatermarkType;
  /** Required when type === "text". */
  text?: string;
  /** Required when type === "logo": a transparent PNG buffer. */
  logo?: Buffer;
  position: WatermarkPosition;
  /** Stamp width as a percentage of the base image width. */
  sizePercent: number;
  /** 0-1 */
  opacity: number;
  rotationDeg: number;
  /** Percentage of min(imageWidth, imageHeight); ignored for CENTER. */
  marginPercent: number;
}

export interface ApplyWatermarkResult {
  buffer: Buffer;
  format: "jpeg" | "png";
}

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

function buildTextStampSVG(stampWidth: number, text: string, opacity: number): Buffer {
  const fontSize = Math.max(Math.round(stampWidth * 0.18), 12);
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paddingX = Math.round(fontSize * 0.4);
  const width = stampWidth;
  const height = Math.round(fontSize * 1.6);

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <text
    x="${paddingX}" y="${Math.round(height * 0.72)}"
    font-family="'DejaVu Sans', Arial, Helvetica, sans-serif"
    font-weight="bold"
    font-size="${fontSize}"
    fill="rgba(255,255,255,${opacity})"
    stroke="rgba(0,0,0,${Math.min(opacity * 1.3, 1)})"
    stroke-width="${Math.max(Math.round(fontSize * 0.04), 1)}"
    paint-order="stroke"
    >${escaped}</text>
</svg>`
  );
}

/** Multiplies the alpha channel of an RGBA image buffer by `opacity` (0-1). */
async function applyOpacityToRaster(buffer: Buffer, opacity: number): Promise<Buffer> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * opacity);
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

/**
 * Composites a single positioned watermark stamp (text or logo) onto an image.
 * Pure function: no filesystem access, no side effects.
 */
export async function applyWatermark(
  input: Buffer,
  config: WatermarkConfig
): Promise<ApplyWatermarkResult> {
  const image = sharp(input);
  const { width, height, format } = await image.metadata();
  if (!width || !height) {
    throw new Error("Could not read image dimensions");
  }

  const sizePercent = Math.min(Math.max(config.sizePercent, 1), 100);
  const opacity = Math.min(Math.max(config.opacity, 0), 1);
  const marginPercent = Math.min(Math.max(config.marginPercent, 0), 40);
  const stampWidth = Math.max(Math.round((width * sizePercent) / 100), 1);

  let stamp: Buffer;
  if (config.type === "logo") {
    if (!config.logo) throw new Error("logo buffer is required when type is 'logo'");
    const resized = await sharp(config.logo).resize({ width: stampWidth }).png().toBuffer();
    stamp = await applyOpacityToRaster(resized, opacity);
  } else {
    const text = config.text?.trim() || DEFAULT_WATERMARK_TEXT;
    stamp = await sharp(buildTextStampSVG(stampWidth, text, opacity)).png().toBuffer();
  }

  if (config.rotationDeg) {
    stamp = await sharp(stamp)
      .rotate(config.rotationDeg, { background: TRANSPARENT })
      .png()
      .toBuffer();
  }

  const marginPx = Math.round((Math.min(width, height) * marginPercent) / 100);
  if (marginPx > 0) {
    stamp = await sharp(stamp)
      .extend({ top: marginPx, bottom: marginPx, left: marginPx, right: marginPx, background: TRANSPARENT })
      .png()
      .toBuffer();
  }

  const composited = image.composite([
    {
      input: stamp,
      gravity: GRAVITY_BY_POSITION[config.position],
    },
  ]);

  if (format === "jpeg") {
    return { buffer: await composited.jpeg({ quality: 92 }).toBuffer(), format: "jpeg" };
  }

  return { buffer: await composited.png({ compressionLevel: 8 }).toBuffer(), format: "png" };
}
