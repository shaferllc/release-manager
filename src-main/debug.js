/**
 * Full app debug logger (main process).
 * Logs to stdout with [RM Debug] [main] [category] when enabled.
 * Enabled when: NODE_ENV=development or preference debug is true.
 * getStore: main process getStore() (available after app.whenReady).
 */

function isEnabled(getStore) {
  if (process.env.NODE_ENV === 'development') return true;
  try {
    const prefs = getStore?.().get?.('preferences');
    if (typeof prefs !== 'object' || prefs === null) return true;
    return prefs.debug !== false;
  } catch (_) {
    return true;
  }
}

/**
 * @param {Function} getStore - getStore()
 * @param {string} category - e.g. 'project' | 'ipc' | 'prefs' | 'theme' | 'api'
 * @param {string} action - Short label
 * @param {...unknown} args - Optional data
 */
function log(getStore, category, action, ...args) {
  if (!isEnabled(getStore)) return;
  console.log('[RM Debug] [main]', `[${category}]`, action, ...args);
}

module.exports = { isEnabled, log };
