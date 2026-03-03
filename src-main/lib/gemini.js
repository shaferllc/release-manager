/**
 * Google Gemini API client for text generation.
 * @see https://ai.google.dev/gemini-api/docs
 */

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-1.5-flash';
const MAX_INPUT_CHARS = 1000000;

/**
 * Call Gemini generateContent with a single user prompt.
 * @param {string} apiKey - Google AI / Gemini API key
 * @param {string} model - e.g. gemini-1.5-flash, gemini-1.5-pro
 * @param {string} prompt - user message
 * @param {object} [fetchImpl] - optional fetch for testing
 * @returns {Promise<{ ok: boolean, text?: string, error?: string }>}
 */
async function generate(apiKey, model, prompt, fetchImpl) {
  const fetchFn = fetchImpl || globalThis.fetch;
  const trimmedKey = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!trimmedKey) {
    return { ok: false, error: 'Gemini API key is not set. Add it in Settings.' };
  }
  const modelId = (model || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const url = `${BASE_URL}/models/${encodeURIComponent(modelId)}:generateContent`;
  const body = {
    contents: [
      {
        parts: [{ text: typeof prompt === 'string' ? prompt.slice(0, MAX_INPUT_CHARS) : '' }],
      },
    ],
  };
  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': trimmedKey,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      let errMsg = text;
      try {
        const data = JSON.parse(text);
        if (data?.error?.message) errMsg = data.error.message;
      } catch (_) {}
      return { ok: false, error: errMsg && errMsg.length < 200 ? errMsg : `Gemini API error: ${res.status}` };
    }
    const data = JSON.parse(text);
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts;
    const out =
      Array.isArray(parts) && parts.length > 0 && parts[0]?.text != null ? String(parts[0].text).trim() : '';
    return { ok: true, text: out };
  } catch (e) {
    const msg = e?.message || 'Gemini request failed';
    return { ok: false, error: msg.length < 200 ? msg : 'Gemini request failed.' };
  }
}

module.exports = {
  generate,
  DEFAULT_MODEL,
};
