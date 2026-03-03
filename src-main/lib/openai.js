/**
 * OpenAI Chat Completions API client for text generation.
 * @see https://platform.openai.com/docs/api-reference/chat
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_INPUT_CHARS = 120000;

/**
 * Call OpenAI Chat Completions with a single user message.
 * @param {string} apiKey - OpenAI API key (sk-...)
 * @param {string} model - e.g. gpt-4o-mini, gpt-4o
 * @param {string} prompt - user message
 * @param {object} [fetchImpl] - optional fetch for testing
 * @returns {Promise<{ ok: boolean, text?: string, error?: string }>}
 */
async function generate(apiKey, model, prompt, fetchImpl) {
  const fetchFn = fetchImpl || globalThis.fetch;
  const trimmedKey = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!trimmedKey) {
    return { ok: false, error: 'OpenAI API key is not set. Add it in Settings.' };
  }
  const body = {
    model: (model || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
    messages: [{ role: 'user', content: typeof prompt === 'string' ? prompt.slice(0, MAX_INPUT_CHARS) : '' }],
  };
  try {
    const res = await fetchFn(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${trimmedKey}`,
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
      return { ok: false, error: errMsg && errMsg.length < 200 ? errMsg : `OpenAI API error: ${res.status}` };
    }
    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content;
    const out = content != null ? String(content).trim() : '';
    return { ok: true, text: out };
  } catch (e) {
    const msg = e?.message || 'OpenAI request failed';
    return { ok: false, error: msg.length < 200 ? msg : 'OpenAI request failed.' };
  }
}

module.exports = {
  generate,
  DEFAULT_MODEL,
};
