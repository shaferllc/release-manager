#!/usr/bin/env node
/**
 * Creates renderer-vue/public and copies the app icon. Cross-platform (avoids mkdir -p / cp).
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'renderer-vue', 'public');
const iconSrc = path.join(rootDir, 'assets', 'icons', 'icon-128.png');

fs.mkdirSync(publicDir, { recursive: true });
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(publicDir, 'icon-128.png'));
}
