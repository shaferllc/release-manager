/**
 * Send telemetry events to an ingestion API (POST /api/telemetry).
 * No auth; server may throttle (e.g. 120/min per IP).
 * Supports single event or batch (up to 100 events per request).
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

const BATCH_MAX = 100;
const FLUSH_INTERVAL_MS = 60000; // 1 minute

let _baseUrlProvider = null;

/** Set a function that returns the current backend base URL (e.g. from the license server config). */
function setBaseUrlProvider(fn) { _baseUrlProvider = typeof fn === 'function' ? fn : null; }

function getTelemetryEndpoint() {
  if (typeof process !== 'undefined' && process.env && process.env.TELEMETRY_URL) {
    return process.env.TELEMETRY_URL;
  }
  const base = _baseUrlProvider ? _baseUrlProvider() : '';
  return base ? base.replace(/\/+$/, '') + '/api/telemetry' : '';
}

let queue = [];
let flushTimer = null;

function getOsString() {
  const platform = process.platform;
  const release = os.release() || '';
  if (platform === 'darwin') return `macOS ${release.split('.')[0] || release}`;
  if (platform === 'win32') return `Windows ${release.split('.')[0] || release}`;
  if (platform === 'linux') return `Linux ${release}`;
  return `${platform} ${release}`;
}

function getAppVersion() {
  try {
    const pkgPath = path.join(__dirname, '..', '..', 'package.json');
    const json = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return json.version || '';
  } catch (_) {
    return '';
  }
}

function buildCommonPayload(getPreference) {
  const userIdentifier = getPreference && getPreference('telemetryUserIdentifier');
  const deviceId = getPreference && getPreference('telemetryDeviceId');
  return {
    app_version: getAppVersion(),
    os: getOsString(),
    ...(typeof deviceId === 'string' && deviceId.trim() ? { device_id: deviceId.trim() } : {}),
    ...(typeof userIdentifier === 'string' && userIdentifier.trim() ? { user_identifier: userIdentifier.trim() } : {}),
  };
}

/**
 * Send a single telemetry event.
 * @param {() => any} getPreference
 * @param {string} event - e.g. "app.opened", "feature.export_used"
 * @param {object} [properties] - optional event properties
 * @param {object} [fetchImpl]
 * @returns {Promise<{ ok: true, id?, received_at? } | { ok: false, error: string }>}
 */
async function sendSingleEvent(getPreference, event, properties, fetchImpl) {
  if (!getPreference || !getPreference('telemetry')) return { ok: false, error: 'Telemetry is disabled in settings.' };
  if (getPreference('offlineMode')) return { ok: false, error: 'Offline mode enabled' };
  const url = getTelemetryEndpoint();
  const body = {
    ...buildCommonPayload(getPreference),
    event: String(event),
    ...(properties != null && typeof properties === 'object' ? { properties } : {}),
  };
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

/**
 * Send a batch of events (up to 100). Common app_version, os, user_identifier applied to all.
 * @param {() => any} getPreference
 * @param {Array<{ event: string, properties?: object }>} events
 * @param {object} [fetchImpl]
 * @returns {Promise<{ ok: true, accepted_count?, events? } | { ok: false, error: string }>}
 */
async function sendBatch(getPreference, events, fetchImpl) {
  if (!getPreference || !getPreference('telemetry')) return { ok: false, error: 'Telemetry is disabled in settings.' };
  if (getPreference('offlineMode')) return { ok: false, error: 'Offline mode enabled' };
  const url = getTelemetryEndpoint();
  if (!Array.isArray(events) || events.length === 0) return { ok: true, accepted_count: 0, events: [] };
  const batch = events.slice(0, BATCH_MAX).map((e) => {
    const out = { event: String(e.event) };
    if (e.properties != null && typeof e.properties === 'object') out.properties = e.properties;
    return out;
  });
  const body = {
    ...buildCommonPayload(getPreference),
    events: batch,
  };
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
      const acceptedCount = data.accepted_count ?? data.accepted;
      return { ok: true, accepted_count: acceptedCount, events: data.events };
    }
    return { ok: false, error: text || `HTTP ${res.status}` };
  } catch (e) {
    const msg = e?.message || String(e);
    return { ok: false, error: msg.length < 200 ? msg : 'Request failed.' };
  }
}

/**
 * Queue an event for batched send. Flushes when queue reaches BATCH_MAX or on flush interval / flushTelemetry().
 * @param {() => any} getPreference
 * @param {string} event
 * @param {object} [properties]
 */
function track(getPreference, event, properties) {
  if (!getPreference || !getPreference('telemetry')) return;
  if (getPreference('offlineMode')) return;
  const url = getTelemetryEndpoint();
  if (!url) return;
  queue.push({ event: String(event), properties: properties != null && typeof properties === 'object' ? properties : undefined });
  if (queue.length >= BATCH_MAX) {
    flush(getPreference).catch(() => {});
  }
}

/**
 * Flush queued events (batch POST). Called automatically on interval and can be called on app close.
 * @param {() => any} getPreference
 * @param {object} [fetchImpl]
 * @returns {Promise<{ ok: boolean, accepted_count?, error? }>}
 */
async function flush(getPreference, fetchImpl) {
  if (queue.length === 0) return { ok: true, accepted_count: 0 };
  const batch = queue.splice(0, BATCH_MAX);
  const result = await sendBatch(getPreference, batch, fetchImpl);
  return result;
}

/**
 * Start the periodic flush timer (call once after app is ready).
 * @param {() => any} getPreference
 */
function startFlushTimer(getPreference) {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    if (queue.length > 0) flush(getPreference).catch(() => {});
  }, FLUSH_INTERVAL_MS);
  if (flushTimer.unref) flushTimer.unref();
}

function stopFlushTimer() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

module.exports = {
  setBaseUrlProvider,
  sendSingleEvent,
  sendBatch,
  track,
  flush,
  startFlushTimer,
  stopFlushTimer,
  getOsString,
};
