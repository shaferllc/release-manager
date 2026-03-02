/**
 * E2E smoke test: launches the app, checks main UI, then closes.
 * Run: npm run test:e2e (builds Vue renderer and requires Playwright).
 */
const path = require('path');
const { _electron: electron } = require('playwright');

const projectRoot = path.join(__dirname, '..', '..');
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';
const electronDir = path.join(projectRoot, 'node_modules', 'electron', 'dist');
const executablePath = isMac
  ? path.join(electronDir, 'Electron.app', 'Contents', 'MacOS', 'Electron')
  : isWin
    ? path.join(electronDir, 'electron.exe')
    : path.join(electronDir, 'electron');

async function main() {
  let app;
  try {
    app = await electron.launch({
      executablePath,
      args: [projectRoot],
      env: { ...process.env, NODE_ENV: 'test' },
      timeout: 15000,
    });
    const window = await app.firstWindow({ timeout: 10000 });
    await window.waitForLoadState('domcontentloaded', { timeout: 5000 });

    // Smoke: app loaded and shows main UI
    const content = await window.content();
    if (!content.includes('Add project') && !content.includes('Shipwell') && !content.includes('Settings')) {
      throw new Error('Expected main UI (Add project / Shipwell / Settings) not found');
    }

    // Optional: open Documentation via View dropdown
    const viewDropdownBtn = window.locator('#view-dropdown-btn');
    if ((await viewDropdownBtn.count()) > 0) {
      await viewDropdownBtn.click();
      await window.locator('.view-dropdown-option[data-value="docs"]').click();
      await new Promise((r) => setTimeout(r, 500));
      const afterDocs = await window.content();
      if (!afterDocs.includes('Overview') && !afterDocs.includes('docs-content')) {
        console.warn('Docs view may not have opened');
      }
    }

    console.log('Smoke test passed: app launched and main UI visible');
  } finally {
    if (app) await app.close();
  }
}

main().catch((err) => {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
});
