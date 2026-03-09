/**
 * Send crash reports to the backend (POST /api/crash-reports).
 * Endpoint is derived from the license server base URL.
 * No auth; server may throttle by IP (e.g. 60/min).
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

let _baseUrlProvider = null;

/** Set a function that returns the current backend base URL (e.g. from the license server config). */
function setBaseUrlProvider(fn) { _baseUrlProvider = typeof fn === 'function' ? fn : null; }

function getCrashReportEndpoint() {
  const base = _baseUrlProvider ? _baseUrlProvider() : '';
  return base ? base.replace(/\/+$/, '') + '/api/crash-reports' : '';
}

/**
 * Build a short OS string for crash reports (e.g. "macOS 14.0", "Windows 10").
 */
function getOsString() {
  const platform = process.platform;
  const release = os.release() || '';
  if (platform === 'darwin') return `macOS ${release.split('.')[0] || release}`;
  if (platform === 'win32') return `Windows ${release.split('.')[0] || release}`;
  if (platform === 'linux') return `Linux ${release}`;
  return `${platform} ${release}`;
}

let _accessTokenProvider = null;

/** Set a function that returns the current access token (or null). */
function setAccessTokenProvider(fn) { _accessTokenProvider = typeof fn === 'function' ? fn : null; }

/**
 * Send a crash report to the backend.
 * Only sends if crashReports preference is true and a base URL is configured.
 * When the user is logged in, includes a Bearer token so the server can link the report.
 *
 * @param {() => any} getPreference - Get preference by key
 * @param {object} options - Report fields (all optional)
 * @param {string} [options.message] - Short error message
 * @param {string} [options.stack_trace] - Full stack trace
 * @param {string} [options.app_version] - e.g. "1.0.0"
 * @param {string} [options.os] - e.g. "macOS 14.0"
 * @param {string} [options.user_identifier] - Email or license key for context
 * @param {object} [options.payload] - Any extra JSON
 * @param {object} [fetchImpl] - Optional fetch for testing
 * @returns {Promise<{ ok: true, id?: number, received_at?: string } | { ok: false, error: string }>}
 */
async function sendCrashReport(getPreference, options = {}, fetchImpl) {
  const enabled = getPreference && getPreference('crashReports');
  if (!enabled) {
    return { ok: false, error: 'Crash reports are disabled in settings.' };
  }
  const url = getCrashReportEndpoint();
  if (!url) {
    return { ok: false, error: 'Crash report endpoint not available (no backend URL configured).' };
  }

  const body = {};
  if (options.message != null) body.message = String(options.message);
  if (options.stack_trace != null) body.stack_trace = String(options.stack_trace);
  if (options.app_version != null) body.app_version = String(options.app_version);
  if (options.os != null) body.os = String(options.os);
  if (options.user_identifier != null) body.user_identifier = String(options.user_identifier);
  if (options.payload != null && typeof options.payload === 'object') body.payload = options.payload;

  if (body.app_version === undefined) body.app_version = getAppVersionFromPreference();
  if (body.os === undefined) body.os = getOsString();

  const headers = { 'Content-Type': 'application/json' };
  const token = _accessTokenProvider ? _accessTokenProvider() : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchFn = fetchImpl || globalThis.fetch;
  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (res.status === 201) {
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (_) {}
      return { ok: true, id: data.id, received_at: data.received_at };
    }
    return { ok: false, error: text || `HTTP ${res.status}` };
  } catch (e) {
    const msg = e?.message || String(e);
    return { ok: false, error: msg.length < 200 ? msg : 'Request failed.' };
  }
}

function getAppVersionFromPreference() {
  try {
    const pkgPath = path.join(__dirname, '..', '..', 'package.json');
    const json = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return json.version || '';
  } catch (_) {
    return '';
  }
}

module.exports = {
  setBaseUrlProvider,
  setAccessTokenProvider,
  sendCrashReport,
  getOsString,
};
