/**
 * App update checking via electron-updater.
 * Requires build.publish in package.json (e.g. GitHub Releases or generic server).
 * See docs/UPDATES.md for setup.
 */

const { autoUpdater } = require('electron-updater');
const { app, BrowserWindow } = require('electron');
const path = require('path');

let autoCheckIntervalId = null;
const AUTO_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if update server is configured (publish in package.json / built app config).
 */
function isUpdateServerConfigured() {
  try {
    const pkg = require(path.join(__dirname, '..', '..', 'package.json'));
    const publish = pkg?.build?.publish;
    return publish && typeof publish === 'object' && (publish.provider || publish.url);
  } catch (_) {
    return false;
  }
}

/**
 * Configure autoUpdater and wire events. Call once at app ready.
 * @param {Object} options
 * @param {Function} options.getPreference - (key) => value
 * @param {Function} options.sendToRenderer - (channel, ...args) => void
 */
function initUpdater({ getPreference, sendToRenderer }) {
  if (!isUpdateServerConfigured()) {
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    const version = info?.version || 'new version';
    sendToRenderer('rm-update-available', { version });
  });

  autoUpdater.on('update-not-available', () => {
    sendToRenderer('rm-update-not-available');
  });

  autoUpdater.on('update-downloaded', () => {
    sendToRenderer('rm-update-downloaded');
  });

  autoUpdater.on('error', (err) => {
    sendToRenderer('rm-update-error', err?.message || 'Update check failed');
  });
}

/**
 * Run an update check. Respects checkForUpdates preference for auto/manual.
 * When mode is 'manual', only call this from the Check now button.
 * @param {Object} options
 * @param {Function} options.getPreference - (key) => value
 * @returns {Promise<{ ok: boolean, updateAvailable?: boolean, error?: string }>}
 */
async function checkForUpdatesNow({ getPreference }) {
  if (getPreference?.('offlineMode')) {
    return { ok: false, error: 'Offline mode enabled' };
  }
  if (!isUpdateServerConfigured()) {
    return { ok: false, error: 'Update server not configured. Set build.publish in package.json.' };
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    const remoteVersion = result?.updateInfo?.version;
    const currentVersion = app.getVersion();
    const updateAvailable = remoteVersion && remoteVersion !== currentVersion;

    return { ok: true, updateAvailable, version: remoteVersion };
  } catch (e) {
    return { ok: false, error: e?.message || 'Update check failed' };
  }
}

/**
 * Start download of the available update. Call after update-available.
 */
function downloadUpdate() {
  if (isUpdateServerConfigured()) {
    autoUpdater.downloadUpdate();
  }
}

/**
 * Restart the app to install the downloaded update. Call after update-downloaded.
 */
function quitAndInstall() {
  autoUpdater.quitAndInstall(false, true);
}

/**
 * Run auto-check if preference is 'auto'. Call on app start and set up periodic check.
 * @param {Object} options
 * @param {Function} options.getPreference - (key) => value
 * @param {Function} options.checkForUpdatesNow - () => Promise<result>
 */
function runAutoCheckIfEnabled({ getPreference, checkForUpdatesNow }) {
  if (!isUpdateServerConfigured()) return;
  if (getPreference?.('offlineMode')) return;

  const mode = getPreference?.('checkForUpdates') ?? 'auto';
  if (mode !== 'auto') return;

  // Check on startup (defer slightly so app is responsive)
  setTimeout(() => {
    checkForUpdatesNow().catch(() => {});
  }, 5000);

  // Clear any existing interval
  if (autoCheckIntervalId) {
    clearInterval(autoCheckIntervalId);
    autoCheckIntervalId = null;
  }

  // Periodic check every 24 hours
  autoCheckIntervalId = setInterval(() => {
    if (getPreference?.('offlineMode')) return;
    const currentMode = getPreference?.('checkForUpdates') ?? 'auto';
    if (currentMode !== 'auto') {
      clearInterval(autoCheckIntervalId);
      autoCheckIntervalId = null;
      return;
    }
    checkForUpdatesNow().catch(() => {});
  }, AUTO_CHECK_INTERVAL_MS);
}

/**
 * Stop periodic auto-check (e.g. when preference changes to manual/never).
 */
function stopAutoCheck() {
  if (autoCheckIntervalId) {
    clearInterval(autoCheckIntervalId);
    autoCheckIntervalId = null;
  }
}

module.exports = {
  isUpdateServerConfigured,
  initUpdater,
  checkForUpdatesNow,
  downloadUpdate,
  quitAndInstall,
  runAutoCheckIfEnabled,
  stopAutoCheck,
};
