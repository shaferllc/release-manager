/**
 * LM Studio API client for local LLM inference.
 * Uses OpenAI-compatible endpoints at http://localhost:1234/v1
 * @see https://lmstudio.ai/docs/developer/openai-compat
 */

const DEFAULT_BASE_URL = 'http://localhost:1234/v1';
const DEFAULT_MODEL = 'local-model';
const MAX_INPUT_CHARS = 120000;

/** Normalize base URL (remove trailing slash, ensure /v1). */
function normalizeBaseUrl(url) {
  if (!url || typeof url !== 'string') return DEFAULT_BASE_URL;
  const u = url.trim().replace(/\/+$/, '');
  if (!u) return DEFAULT_BASE_URL;
  return u.endsWith('/v1') ? u : `${u}/v1`;
}

/**
 * Call LM Studio chat completions (OpenAI-compatible).
 * @param {string} baseUrl - e.g. http://localhost:1234/v1
 * @param {string} model - model identifier from LM Studio
 * @param {string} prompt - user message
 * @param {object} [options] - temperature, max_tokens, top_p
 * @param {object} [fetchImpl] - optional fetch for testing
 * @returns {Promise<{ ok: boolean, text?: string, error?: string }>}
 */
async function generate(baseUrl, model, prompt, options = {}, fetchImpl) {
  const fetchFn = fetchImpl || globalThis.fetch;
  const base = normalizeBaseUrl(baseUrl);
  const url = `${base}/chat/completions`;
  const body = {
    model: (model || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
    messages: [{ role: 'user', content: typeof prompt === 'string' ? prompt.slice(0, MAX_INPUT_CHARS) : '' }],
  };
  if (typeof options.temperature === 'number' && options.temperature >= 0 && options.temperature <= 2) {
    body.temperature = options.temperature;
  }
  if (typeof options.max_tokens === 'number' && options.max_tokens > 0) {
    body.max_tokens = options.max_tokens;
  }
  if (typeof options.top_p === 'number' && options.top_p >= 0 && options.top_p <= 1) {
    body.top_p = options.top_p;
  }
  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      let errMsg = text;
      try {
        const data = JSON.parse(text);
        if (data?.error?.message) errMsg = data.error.message;
      } catch (_) {}
      const hint = errMsg.toLowerCase().includes('econnrefused') || errMsg.toLowerCase().includes('fetch failed')
        ? 'LM Studio server not running. Start it in LM Studio\'s Developer tab.'
        : errMsg;
      return { ok: false, error: hint && hint.length < 200 ? hint : `LM Studio API error: ${res.status}` };
    }
    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content;
    const out = content != null ? String(content).trim() : '';
    return { ok: true, text: out };
  } catch (e) {
    const msg = e?.message || 'LM Studio request failed';
    const hint = msg.toLowerCase().includes('econnrefused') || msg.toLowerCase().includes('fetch failed')
      ? 'LM Studio server not running. Start it in LM Studio\'s Developer tab.'
      : msg;
    return { ok: false, error: hint.length < 200 ? hint : 'LM Studio request failed.' };
  }
}

/**
 * List available models from LM Studio (GET /v1/models).
 * @param {string} baseUrl - e.g. http://localhost:1234/v1
 * @param {object} [fetchImpl] - optional fetch for testing
 * @returns {Promise<{ ok: boolean, models?: string[], error?: string }>}
 */
async function listModels(baseUrl, fetchImpl) {
  const fetchFn = fetchImpl || globalThis.fetch;
  const base = normalizeBaseUrl(baseUrl);
  const url = `${base}/models`;
  try {
    const res = await fetchFn(url);
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: (t && t.trim()) || `HTTP ${res.status}` };
    }
    const data = await res.json();
    const models = Array.isArray(data?.data)
      ? data.data.map((m) => m?.id || m?.model || '').filter(Boolean)
      : [];
    return { ok: true, models };
  } catch (e) {
    const raw = e?.message || 'LM Studio request failed';
    const hint = raw.toLowerCase().includes('econnrefused') || raw.toLowerCase().includes('fetch failed')
      ? 'LM Studio server not running. Start it in LM Studio\'s Developer tab.'
      : raw;
    return { ok: false, error: hint };
  }
}

module.exports = {
  generate,
  listModels,
  normalizeBaseUrl,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
};
