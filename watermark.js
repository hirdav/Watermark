import sharp from 'sharp';
import { readFile, writeFile, readdir } from 'fs/promises';
import { join, extname } from 'path';

const IMAGES_DIR = join(process.cwd(), 'src/assets/images');

/**
 * Builds a full-image SVG overlay with "TLA" tiled diagonally at ~7% opacity.
 * Invisible at normal viewing but reveals clearly when contrast is boosted
 * (Photoshop Levels → drag black point right, or Curves → pull highlights down).
 */
function buildDiagonalOverlaySVG(imgWidth, imgHeight) {
  // Font size: ~2% of the shorter side — small enough to be overlooked, large
  // enough to survive JPEG compression and still be readable forensically.
  const fontSize = Math.max(Math.round(Math.min(imgWidth, imgHeight) * 0.022), 18);
  const cellW    = fontSize * 5.5;   // horizontal tile spacing
  const cellH    = fontSize * 2.8;   // vertical tile spacing
  const cx       = cellW / 2;
  const cy       = cellH * 0.68;

  // Rotate pattern grid -32° around image centre for a natural diagonal flow.
  const pivotX = Math.round(imgWidth  / 2);
  const pivotY = Math.round(imgHeight / 2);

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${imgWidth}" height="${imgHeight}">
  <defs>
    <pattern id="tlawm" x="0" y="0"
      width="${cellW}" height="${cellH}"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(-32 ${pivotX} ${pivotY})">
      <text
        x="${cx}" y="${cy}"
        font-family="Georgia,'Times New Roman',serif"
        font-style="italic"
        font-size="${fontSize}"
        fill="rgba(255,255,255,0.07)"
        text-anchor="middle">TLA</text>
    </pattern>
  </defs>
  <rect width="${imgWidth}" height="${imgHeight}" fill="url(#tlawm)"/>
</svg>`
  );
}

async function collectImages(dir) {
  const images = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      images.push(...(await collectImages(full)));
    } else if (['.jpg', '.jpeg', '.png'].includes(extname(entry.name).toLowerCase())) {
      images.push(full);
    }
  }
  return images;
}

async function applyWatermark(imagePath) {
  const inputBuffer = await readFile(imagePath);
  const image = sharp(inputBuffer);
  const { width, height, format } = await image.metadata();

  const overlayBuffer = await sharp(buildDiagonalOverlaySVG(width, height))
    .png()
    .toBuffer();

  const composited = image.composite([{
    input: overlayBuffer,
    top: 0,
    left: 0,
    blend: 'over',
  }]);

  let outputBuffer;
  if (format === 'jpeg') {
    outputBuffer = await composited.jpeg({ quality: 92 }).toBuffer();
  } else {
    outputBuffer = await composited.png({ compressionLevel: 8 }).toBuffer();
  }

  await writeFile(imagePath, outputBuffer);
}

async function main() {
  const files = await collectImages(IMAGES_DIR);
  console.log(`Found ${files.length} images — embedding subtle diagonal TLA watermark...\n`);

  let ok = 0;
  let failed = 0;

  for (const file of files) {
    const label = file.replace(IMAGES_DIR, '').replace(/\\/g, '/');
    try {
      await applyWatermark(file);
      console.log(`  ✓  ${label}`);
      ok++;
    } catch (err) {
      console.error(`  ✗  ${label}  —  ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${ok} watermarked${failed ? `, ${failed} failed` : ''}.`);
  console.log('Tip: to reveal — open in Photoshop → Image → Adjustments → Levels → drag black point rightward.');
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
