import sharp from "sharp";

export const DEFAULT_WATERMARK_TEXT = "PROOF";

/**
 * Builds a full-image SVG overlay with the given text tiled diagonally at ~7%
 * opacity. Invisible at normal viewing but reveals clearly when contrast is
 * boosted (Photoshop Levels -> drag black point right, or Curves -> pull
 * highlights down).
 */
function buildDiagonalOverlaySVG(imgWidth: number, imgHeight: number, text: string): Buffer {
  const fontSize = Math.max(Math.round(Math.min(imgWidth, imgHeight) * 0.022), 18);
  const cellW = fontSize * 5.5;
  const cellH = fontSize * 2.8;
  const cx = cellW / 2;
  const cy = cellH * 0.68;

  const pivotX = Math.round(imgWidth / 2);
  const pivotY = Math.round(imgHeight / 2);

  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${imgWidth}" height="${imgHeight}">
  <defs>
    <pattern id="wm" x="0" y="0"
      width="${cellW}" height="${cellH}"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(-32 ${pivotX} ${pivotY})">
      <text
        x="${cx}" y="${cy}"
        font-family="Georgia,'Times New Roman',serif"
        font-style="italic"
        font-size="${fontSize}"
        fill="rgba(255,255,255,0.07)"
        text-anchor="middle">${escaped}</text>
    </pattern>
  </defs>
  <rect width="${imgWidth}" height="${imgHeight}" fill="url(#wm)"/>
</svg>`
  );
}

export interface ApplyWatermarkOptions {
  text?: string;
}

export interface ApplyWatermarkResult {
  buffer: Buffer;
  format: "jpeg" | "png";
}

/**
 * Embeds a subtle, forensic diagonal text watermark into an image buffer.
 * Pure function: no filesystem access, no side effects.
 */
export async function applyWatermark(
  input: Buffer,
  opts: ApplyWatermarkOptions = {}
): Promise<ApplyWatermarkResult> {
  const text = opts.text?.trim() || DEFAULT_WATERMARK_TEXT;

  const image = sharp(input);
  const { width, height, format } = await image.metadata();
  if (!width || !height) {
    throw new Error("Could not read image dimensions");
  }

  const overlayBuffer = await sharp(buildDiagonalOverlaySVG(width, height, text))
    .png()
    .toBuffer();

  const composited = image.composite([
    {
      input: overlayBuffer,
      top: 0,
      left: 0,
      blend: "over",
    },
  ]);

  if (format === "jpeg") {
    return { buffer: await composited.jpeg({ quality: 92 }).toBuffer(), format: "jpeg" };
  }

  return { buffer: await composited.png({ compressionLevel: 8 }).toBuffer(), format: "png" };
}
