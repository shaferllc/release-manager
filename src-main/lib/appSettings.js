/**
 * App-level settings: launch at login, proxy, export/import/reset, confirm quit, tray, always on top.
 * Call init(getStore, getPreference, setPreference) from main after store is ready.
 */
const { app, session, BrowserWindow, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let mainWindowRef = null;
let getStoreFn = null;
let getPreferenceFn = null;
let setPreferenceFn = null;

function init(getStore, getPreference, setPreference) {
  getStoreFn = getStore;
  getPreferenceFn = getPreference;
  setPreferenceFn = setPreference;
}

function getStore() {
  return getStoreFn ? getStoreFn() : null;
}

function getPreference(key) {
  return getPreferenceFn ? getPreferenceFn(key) : undefined;
}

function setPreference(key, value) {
  if (setPreferenceFn) setPreferenceFn(key, value);
}

/** Launch at login */
function getLaunchAtLogin() {
  try {
    const settings = app.getLoginItemSettings?.();
    return { openAtLogin: !!settings?.openAtLogin };
  } catch {
    return { openAtLogin: false };
  }
}

function setLaunchAtLogin(openAtLogin) {
  try {
    app.setLoginItemSettings?.({ openAtLogin: !!openAtLogin });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || 'Failed' };
  }
}

/** Proxy: '' = system, or 'http://host:port' etc. */
function getProxy() {
  return getPreference('proxy') ?? '';
}

function setProxy(proxyRules) {
  const rules = typeof proxyRules === 'string' ? proxyRules.trim() : '';
  setPreference('proxy', rules);
  try {
    if (!rules) {
      session.defaultSession.setProxy({ proxyRules: '', proxyBypassRules: '' });
    } else {
      session.defaultSession.setProxy({ proxyRules: rules });
    }
    return null;
  } catch (e) {
    return null;
  }
}

function applyProxy() {
  const rules = getProxy();
  try {
    if (!rules) session.defaultSession.setProxy({ proxyRules: '', proxyBypassRules: '' });
    else session.defaultSession.setProxy({ proxyRules: rules });
  } catch (_) {}
}

/** Export settings to JSON string */
function exportSettings() {
  const store = getStore();
  if (!store) return { ok: false, error: 'Store not available' };
  try {
    const prefs = store.get('preferences') || {};
    const theme = store.get('theme');
    const data = { preferences: prefs, theme: theme || 'dark', exportedAt: new Date().toISOString() };
    return { ok: true, data: JSON.stringify(data, null, 2) };
  } catch (e) {
    return { ok: false, error: e?.message || 'Export failed' };
  }
}

/** Import settings from JSON string; merge with existing or replace */
function importSettings(jsonString, replace = false) {
  const store = getStore();
  if (!store) return { ok: false, error: 'Store not available' };
  try {
    const data = JSON.parse(jsonString);
    const prefs = data?.preferences ?? {};
    if (replace) {
      store.set('preferences', prefs);
    } else {
      const current = store.get('preferences') || {};
      store.set('preferences', { ...current, ...prefs });
    }
    if (data?.theme) store.set('theme', data.theme);
    applyProxy();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || 'Import failed' };
  }
}

/** Reset preferences to defaults (does not clear projects) */
function resetSettings() {
  const store = getStore();
  if (!store) return { ok: false, error: 'Store not available' };
  try {
    store.set('preferences', {});
    store.set('theme', 'dark');
    applyProxy();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || 'Reset failed' };
  }
}

/** Confirm before quit is just a preference; main.js before-quit handler reads it */
function getConfirmBeforeQuit() {
  return getPreference('confirmBeforeQuit') ?? false;
}

function setConfirmBeforeQuit(value) {
  setPreference('confirmBeforeQuit', !!value);
  return null;
}

/** Always on top */
function getAlwaysOnTop() {
  return getPreference('alwaysOnTop') ?? false;
}

function setAlwaysOnTop(value) {
  setPreference('alwaysOnTop', !!value);
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) win.setAlwaysOnTop(!!value);
  return null;
}

/** Minimize to tray */
function setMainWindowRef(win) {
  mainWindowRef = win;
}

function getMinimizeToTray() {
  return getPreference('minimizeToTray') ?? false;
}

function setMinimizeToTray(value) {
  setPreference('minimizeToTray', !!value);
  if (!!value) {
    ensureTray();
  } else {
    destroyTray();
  }
  return null;
}

function ensureTray() {
  if (tray) return;
  try {
    const iconPath = path.join(__dirname, '..', 'assets', 'icons', 'icon.png');
    const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : null;
    tray = new Tray(icon || nativeImage.createEmpty());
    tray.setToolTip(app.name || 'Shipwell');
    tray.on('click', () => {
      const w = mainWindowRef || BrowserWindow.getAllWindows()[0];
      if (w && !w.isDestroyed()) {
        w.show();
        w.focus();
      }
    });
    const ctxMenu = require('electron').Menu.buildFromTemplate([
      { label: 'Show', click: () => { const w = mainWindowRef || BrowserWindow.getAllWindows()[0]; if (w) w.show(); } },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]);
    tray.setContextMenu(ctxMenu);
  } catch (_) {}
}

function destroyTray() {
  if (tray) {
    try { tray.destroy(); } catch (_) {}
    tray = null;
  }
}

function shouldMinimizeToTray() {
  return getMinimizeToTray();
}

function handleWindowClose(win) {
  if (shouldMinimizeToTray() && win && !win.isDestroyed()) {
    win.hide();
    ensureTray();
    return true; // prevent close
  }
  return false;
}

module.exports = {
  init,
  getLaunchAtLogin,
  setLaunchAtLogin,
  getProxy,
  setProxy,
  applyProxy,
  exportSettings,
  importSettings,
  resetSettings,
  getConfirmBeforeQuit,
  setConfirmBeforeQuit,
  getAlwaysOnTop,
  setAlwaysOnTop,
  getMinimizeToTray,
  setMinimizeToTray,
  setMainWindowRef,
  destroyTray,
  handleWindowClose,
};
