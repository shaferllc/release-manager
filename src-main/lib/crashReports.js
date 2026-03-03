/**
 * Send crash reports to an ingestion API (POST /api/crash-reports style).
 * No auth; server may throttle by IP (e.g. 60/min).
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

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

/**
 * Send a crash report to the configured endpoint.
 * Only sends if crashReports preference is true and crashReportEndpoint is set.
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
  const endpoint = getPreference && getPreference('crashReportEndpoint');
  const url = typeof endpoint === 'string' ? endpoint.trim() : '';
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return { ok: false, error: 'Crash report endpoint URL is not set or invalid. Set it in Settings → Data & privacy.' };
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

  const fetchFn = fetchImpl || globalThis.fetch;
  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  sendCrashReport,
  getOsString,
};
