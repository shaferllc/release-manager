/**
 * Full app debug logger (renderer).
 * Logs to console with [RM Debug] [renderer] [category] when enabled.
 * Enabled by default; turn off in Settings → "Debug logging" (preference: debug).
 */

const PREFIX = '[RM Debug] [renderer]';

export function isEnabled() {
  if (import.meta.env?.DEV) return true;
  if (typeof window === 'undefined') return false;
  return window.__rmDebug !== false;
}

export function setEnabled(value) {
  if (typeof window !== 'undefined') {
    window.__rmDebug = value === true;
  }
}

/**
 * @param {string} category - e.g. 'project' | 'nav' | 'api' | 'store' | 'prefs' | 'view' | 'settings'
 * @param {string} action - Short label for the action
 * @param {...unknown} detail - Optional data (avoid logging secrets)
 */
export function log(category, action, ...detail) {
  if (!isEnabled()) return;
  const args = detail.length ? [action, ...detail] : [action];
  console.log(PREFIX, `[${category}]`, ...args);
}

export function warn(category, action, ...detail) {
  if (!isEnabled()) return;
  console.warn(PREFIX, `[${category}]`, action, ...detail);
}
