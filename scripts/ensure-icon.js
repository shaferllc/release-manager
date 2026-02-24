#!/usr/bin/env node
/**
 * Ensures assets/icons/icon.png exists. If not, writes a minimal placeholder.
 */
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
const iconPath = path.join(iconsDir, 'icon.png');

if (fs.existsSync(iconPath)) {
  process.exit(0);
}

const base64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const buf = Buffer.from(base64, 'base64');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}
fs.writeFileSync(iconPath, buf);
console.log('Created placeholder icon at assets/icons/icon.png');
