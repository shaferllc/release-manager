#!/usr/bin/env node
/**
 * Generates proper icon sizes from assets/icons/icon.png.
 * Strips white background, trims transparent padding, then resizes to 16–1024px so the graphic fills the icon.
 * Requires: npm install sharp (devDependency).
 */
const fs = require('fs');
const path = require('path');

const SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];
const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
const iconPath = path.join(iconsDir, 'icon.png');
const minSourceSize = 128;
const WHITE_THRESHOLD = 240;
/** Pixels with alpha below this are considered empty for trim. */
const TRIM_ALPHA_THRESHOLD = 128;
/** RGB all above this is treated as empty (white/light background) for trim. */
const TRIM_LIGHT_RGB_THRESHOLD = 235;
/** After trim, scale content to this fraction of the icon size (leaves a small margin). */
const FILL_RATIO = 0.92;

function stripWhiteToTransparent(inputSharp) {
  return inputSharp
    .ensureAlpha(1)
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      const { width, height, channels } = info;
      for (let i = 0; i < data.length; i += channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
          data[i + 3] = 0;
        }
      }
      return require('sharp')(data, {
        raw: { width, height, channels },
      });
    });
}

/** True if pixel at index i is considered empty for trim (transparent or very light). */
function isEmptyPixel(data, i, channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = channels === 4 ? data[i + 3] : 255;
  if (a <= TRIM_ALPHA_THRESHOLD) return true;
  if (r >= TRIM_LIGHT_RGB_THRESHOLD && g >= TRIM_LIGHT_RGB_THRESHOLD && b >= TRIM_LIGHT_RGB_THRESHOLD) return true;
  return false;
}

/** Get bounding box of non-empty pixels. Returns { left, top, width, height } or null. */
function getTrimBox(data, width, height, channels) {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (!isEmptyPixel(data, i, channels)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/** Trim transparent padding and return a sharp instance of the trimmed image. */
async function trimToContent(sharpInstance) {
  const { data, info } = await sharpInstance.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const box = getTrimBox(data, width, height, channels);
  if (!box || box.width < 1 || box.height < 1) return sharpInstance;
  if (box.width >= width && box.height >= height) return sharpInstance;
  return sharpInstance.extract({
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
  });
}

async function main() {
  if (!fs.existsSync(iconPath)) {
    console.log('No icon.png found at assets/icons/icon.png. Run ensure-icon or add a logo first.');
    process.exit(0);
  }

  let sharp;
  try {
    sharp = require('sharp');
  } catch (_) {
    console.log('Optional: install sharp (npm install --save-dev sharp) to generate icon sizes.');
    process.exit(0);
  }

  const meta = await sharp(iconPath).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (w < minSourceSize || h < minSourceSize) {
    console.log('Icon is too small to resize. Use an image at least 128×128.');
    process.exit(0);
  }

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const source = sharp(iconPath);
  const withTransparency = await stripWhiteToTransparent(source);
  // Use sharp's trim to remove transparent/same-color edges (threshold: include pixels that differ from corner)
  let trimmed = withTransparency;
  try {
    const trimmedBuffer = await withTransparency.clone().trim({ threshold: 5 }).png().toBuffer();
    trimmed = sharp(trimmedBuffer);
  } catch (_) {
    trimmed = await trimToContent(withTransparency);
  }
  const trimmedMeta = await trimmed.metadata();
  const tw = trimmedMeta.width || 1;
  const th = trimmedMeta.height || 1;
  const maxDim = Math.max(tw, th);
  if (maxDim < 1) {
    console.log('No visible content after trim.');
    process.exit(1);
  }
  console.log(`  Trimmed to content: ${tw}×${th}`);

  const tmp1024 = path.join(iconsDir, 'icon-1024-tmp.png');
  for (const size of SIZES) {
    const outPath = size === 1024 ? tmp1024 : path.join(iconsDir, `icon-${size}.png`);
    const scale = (size * FILL_RATIO) / maxDim;
    const w = Math.round(tw * scale);
    const h = Math.round(th * scale);
    const left = Math.round((size - w) / 2);
    const top = Math.round((size - h) / 2);
    const resized = await trimmed.clone().resize(w, h).png().toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resized, left, top }])
      .png()
      .toFile(outPath);
    console.log(`  ${size}×${size} → ${size === 1024 ? 'icon.png' : `icon-${size}.png`}`);
  }
  fs.renameSync(tmp1024, iconPath);

  console.log('Generated icon sizes in assets/icons/ (trimmed, then scaled to fill)');

  // macOS: build icon.icns so Dock/desktop use full resolution (512/1024)
  if (process.platform === 'darwin') {
    const iconset = path.join(iconsDir, 'icon.iconset');
    if (!fs.existsSync(iconset)) fs.mkdirSync(iconset, { recursive: true });
    const copies = [
      ['icon-16.png', 'icon_16x16.png'],
      ['icon-32.png', 'icon_16x16@2x.png'],
      ['icon-32.png', 'icon_32x32.png'],
      ['icon-64.png', 'icon_32x32@2x.png'],
      ['icon-128.png', 'icon_128x128.png'],
      ['icon-256.png', 'icon_128x128@2x.png'],
      ['icon-256.png', 'icon_256x256.png'],
      ['icon-512.png', 'icon_256x256@2x.png'],
      ['icon-512.png', 'icon_512x512.png'],
      ['icon.png', 'icon_512x512@2x.png'],
    ];
    for (const [from, to] of copies) {
      const src = path.join(iconsDir, from);
      const dest = path.join(iconset, to);
      if (fs.existsSync(src)) fs.copyFileSync(src, dest);
    }
    const { execSync } = require('child_process');
    execSync(`iconutil -c icns "${iconset}" -o "${path.join(iconsDir, 'icon.icns')}"`, { stdio: 'inherit' });
    fs.rmSync(iconset, { recursive: true });
    console.log('  → icon.icns (macOS Dock/desktop)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
