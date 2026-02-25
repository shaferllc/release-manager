#!/usr/bin/env node
/**
 * Generates proper icon sizes from assets/icons/icon.png.
 * Strips white background (makes near-white pixels transparent), then resizes to 16–1024px.
 * Requires: npm install sharp (devDependency).
 */
const fs = require('fs');
const path = require('path');

const SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];
const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
const iconPath = path.join(iconsDir, 'icon.png');
const minSourceSize = 128;
const WHITE_THRESHOLD = 240;

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
  const pipeline = await stripWhiteToTransparent(source);
  const tmp1024 = path.join(iconsDir, 'icon-1024-tmp.png');
  for (const size of SIZES) {
    const outPath = size === 1024 ? tmp1024 : path.join(iconsDir, `icon-${size}.png`);
    await pipeline
      .clone()
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`  ${size}×${size} → ${size === 1024 ? 'icon.png' : `icon-${size}.png`}`);
  }
  fs.renameSync(tmp1024, iconPath);

  console.log('Generated icon sizes in assets/icons/ (white background made transparent)');

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
