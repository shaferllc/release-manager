/**
 * Anthropic Claude API client for text generation.
 * @see https://docs.anthropic.com/en/api/messages
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MAX_INPUT_TOKENS = 180000;
const MAX_OUTPUT_TOKENS = 4096;

/**
 * Call Claude Messages API with a single user prompt.
 * @param {string} apiKey - Anthropic API key (sk-ant-...)
 * @param {string} model - e.g. claude-sonnet-4-20250514, claude-3-5-sonnet-20241022
 * @param {string} prompt - user message
 * @param {object} [fetchImpl] - optional fetch for testing
 * @returns {Promise<{ ok: boolean, text?: string, error?: string }>}
 */
async function generate(apiKey, model, prompt, fetchImpl) {
  const fetchFn = fetchImpl || globalThis.fetch;
  const trimmedKey = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!trimmedKey) {
    return { ok: false, error: 'Claude API key is not set. Add it in Settings.' };
  }
  const body = {
    model: (model || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [{ role: 'user', content: typeof prompt === 'string' ? prompt.slice(0, MAX_INPUT_TOKENS * 4) : '' }],
  };
  try {
    const res = await fetchFn(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': trimmedKey,
        'anthropic-version': '2023-06-01',
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
      return { ok: false, error: errMsg && errMsg.length < 200 ? errMsg : `Claude API error: ${res.status}` };
    }
    const data = JSON.parse(text);
    const block = Array.isArray(data?.content) && data.content.length > 0 ? data.content[0] : null;
    const out = block?.text != null ? String(block.text).trim() : '';
    return { ok: true, text: out };
  } catch (e) {
    const msg = e?.message || 'Claude request failed';
    return { ok: false, error: msg.length < 200 ? msg : 'Claude request failed.' };
  }
}

module.exports = {
  generate,
  DEFAULT_MODEL,
};
