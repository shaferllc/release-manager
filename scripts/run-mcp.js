#!/usr/bin/env node
/**
 * Run the MCP server from mcp-server/ so it uses mcp-server/node_modules.
 * Ensures mcp-server deps are installed on first run.
 */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const mcpDir = path.join(rootDir, 'mcp-server');
const mcpNodeModules = path.join(mcpDir, 'node_modules');

if (!fs.existsSync(mcpNodeModules)) {
  console.error('MCP server dependencies not found. Running npm install in mcp-server/...');
  const install = spawnSync('npm', ['install', '--prefix', mcpDir], {
    stdio: 'inherit',
    cwd: rootDir,
    shell: process.platform === 'win32',
  });
  if (install.status !== 0) process.exit(install.status || 1);
}

const result = spawnSync(process.execPath, ['index.mjs'], {
  cwd: mcpDir,
  stdio: 'inherit',
});
process.exit(result.status != null ? result.status : 0);
