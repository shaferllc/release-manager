#!/usr/bin/env node
/**
 * Kills the Release Manager Electron process if it is running from this project.
 * Used by `npm run restart` so we stop the app before starting it again.
 */
const { execSync, spawnSync } = require('child_process');
const path = require('path');

const cwd = process.cwd();
const isWindows = process.platform === 'win32';

function killUnix() {
  // Match process whose command line contains this project path and Electron
  const safeCwd = cwd.replace(/'/g, "'\\''");
  const pattern = `${safeCwd}.*[Ee]lectron`;
  try {
    execSync(`pkill -f '${pattern}' 2>/dev/null || true`, { stdio: 'ignore', shell: true });
  } catch (_) {
    // pkill exits 1 when no match; ignore
  }
}

function killWindows() {
  try {
    // Find Electron.exe processes whose command line includes this project path
    const ps = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Get-CimInstance Win32_Process -Filter "name='Electron.exe'" | Where-Object { $_.CommandLine -like '*${cwd.replace(/'/g, "''")}*' } | ForEach-Object { $_.ProcessId }`,
      ],
      { encoding: 'utf8', windowsHide: true }
    );
    const pids = (ps.stdout || '').trim().split(/\r?\n/).filter(Boolean);
    for (const pid of pids) {
      try {
        spawnSync('taskkill', ['/F', '/PID', pid], { stdio: 'ignore', windowsHide: true });
      } catch (_) {}
    }
  } catch (_) {
    // Ignore if PowerShell or taskkill fails
  }
}

if (isWindows) {
  killWindows();
} else {
  killUnix();
}
