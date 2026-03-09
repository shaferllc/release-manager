#!/usr/bin/env node
/**
 * Generate license-server.bundled.json for the packaged app so Production (and
 * optional Staging) login works without users setting Client ID/Secret in Settings.
 * Run before electron-builder in CI; set env vars:
 *   LICENSE_PROD_CLIENT_ID, LICENSE_PROD_CLIENT_SECRET
 *   LICENSE_STAGING_CLIENT_ID, LICENSE_STAGING_CLIENT_SECRET (optional)
 * If none are set, the script does nothing (no file written).
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outPath = path.join(root, 'license-server.bundled.json');

const prodId = (process.env.LICENSE_PROD_CLIENT_ID || '').trim();
const prodSecret = (process.env.LICENSE_PROD_CLIENT_SECRET || '').trim();
const stagingId = (process.env.LICENSE_STAGING_CLIENT_ID || '').trim();
const stagingSecret = (process.env.LICENSE_STAGING_CLIENT_SECRET || '').trim();

const config = {};

if (prodId && prodSecret) {
  config.prod = { clientId: prodId, clientSecret: prodSecret };
}
if (stagingId && stagingSecret) {
  config.staging = { clientId: stagingId, clientSecret: stagingSecret };
}

if (Object.keys(config).length === 0) {
  console.log('[generate-license-bundled] No LICENSE_* env vars set; skipping license-server.bundled.json');
  process.exit(0);
}

fs.writeFileSync(outPath, JSON.stringify(config, null, 2), 'utf8');
console.log('[generate-license-bundled] Wrote', outPath, 'with', Object.keys(config).join(', '));
