/**
 * Ollama API client for generating text. Testable without Electron.
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md
 */

const MAX_PROMPT_LENGTH = 12000;
const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'llama3.2';

/** Normalize base URL so localhost uses 127.0.0.1 (avoids IPv6 vs IPv4 issues on macOS). */
function normalizeBaseUrl(url) {
  if (!url || typeof url !== 'string') return DEFAULT_BASE_URL;
  const u = url.trim().replace(/\/$/, '');
  if (u.includes('localhost') && u.includes('11434')) return u.replace(/localhost/g, '127.0.0.1');
  return u || DEFAULT_BASE_URL;
}

/** User-friendly message when Ollama isn't running or request fails. */
const OLLAMA_NOT_RUNNING_HINT =
  'Ollama isn’t running or isn’t reachable. Start it in a terminal: ollama serve. Then pull a model, e.g. ollama pull llama3.2';

/**
 * Turn a raw error from fetch/generate into a short, user-friendly message.
 * @param {string} rawError
 * @param {string} [model] - current model name for "model not found" hint
 * @returns {string}
 */
const OLLAMA_ALREADY_RUNNING_HINT =
  'Ollama is already running (port 11434 in use). You can use Generate without starting it again.';

function formatOllamaError(rawError, model) {
  if (!rawError || typeof rawError !== 'string') return OLLAMA_NOT_RUNNING_HINT;
  let msg = rawError.trim();
  try {
    if (msg.startsWith('{')) {
      const data = JSON.parse(msg);
      if (data && typeof data.error === 'string') msg = data.error;
    }
  } catch (_) {}
  const msgLower = msg.toLowerCase();
  if (msgLower.includes('econnrefused') || msgLower.includes('fetch failed') || msgLower.includes('failed to fetch') || msgLower.includes('network')) {
    return OLLAMA_NOT_RUNNING_HINT;
  }
  if (msgLower.includes('address already in use') || msgLower.includes('bind: address already in use')) {
    return OLLAMA_ALREADY_RUNNING_HINT;
  }
  if (msgLower.includes('no such file or directory') || msgLower.includes('couldn\'t open model file') || msgLower.includes('couldn\'t open model')) {
    const pull = model ? `ollama pull ${model}` : 'ollama pull <model>';
    return `Model files missing or corrupted. Re-pull the model in a terminal: ${pull}`;
  }
  if (msgLower.includes('does not support generate')) {
    return 'This model doesn\'t support text generation. In Settings, pick a different model (e.g. llama3.2 or llama3.2:3b) and use List models to see options.';
  }
  if (msgLower.includes('404') || msgLower.includes('not found') || msgLower.includes('model')) {
    const pull = model ? `ollama pull ${model}` : 'ollama pull llama3.2';
    return `Model not found. Pull it in a terminal: ${pull}`;
  }
  if (msg.length > 120) return `Ollama error: ${msg.slice(0, 117)}…`;
  return `Ollama: ${msg}`;
}

/**
 * Call Ollama /api/generate with the given prompt.
 * @param {string} baseUrl - e.g. http://localhost:11434
 * @param {string} model - e.g. llama3.2
 * @param {string} prompt
 * @param {object} [fetchImpl] - optional fetch for testing
 * @returns {Promise<{ ok: boolean, text?: string, error?: string }>}
 */
async function generate(baseUrl, model, prompt, fetchImpl) {
  const fetchFn = fetchImpl || globalThis.fetch;
  const base = normalizeBaseUrl(baseUrl);
  const url = `${base}/api/generate`;
  const body = {
    model: model || DEFAULT_MODEL,
    prompt: typeof prompt === 'string' ? prompt.slice(0, MAX_PROMPT_LENGTH) : '',
    stream: false,
  };
  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      const raw = (t && t.trim()) || `HTTP ${res.status}`;
      return { ok: false, error: formatOllamaError(raw, body.model) };
    }
    const data = await res.json();
    const text = data.response != null ? String(data.response).trim() : '';
    return { ok: true, text };
  } catch (e) {
    const raw = e && e.message ? e.message : 'Ollama request failed';
    return { ok: false, error: formatOllamaError(raw, body.model) };
  }
}

/**
 * Check if a model supports /api/generate (text generation) via Ollama POST /api/show.
 * @param {string} base - normalized base URL
 * @param {string} name - model name
 * @param {object} fetchFn - fetch implementation
 * @returns {Promise<boolean>}
 */
async function modelSupportsGenerate(base, name, fetchFn) {
  try {
    const res = await fetchFn(`${base}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const modalities = data?.modalities;
    if (!Array.isArray(modalities)) return true;
    if (modalities.includes('text')) return true;
    if (modalities.length === 1 && modalities[0] === 'embedding') return false;
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * List available models from Ollama (GET /api/tags).
 * @param {string} baseUrl - e.g. http://localhost:11434
 * @param {object} [fetchImpl] - optional fetch for testing
 * @param {{ onlyGenerate?: boolean }} [options] - if onlyGenerate: true, filter to models that support /api/generate
 * @returns {Promise<{ ok: boolean, models?: string[], error?: string }>}
 */
async function listModels(baseUrl, fetchImpl, options = {}) {
  const fetchFn = fetchImpl || globalThis.fetch;
  const base = normalizeBaseUrl(baseUrl);
  const url = `${base}/api/tags`;
  try {
    const res = await fetchFn(url);
    if (!res.ok) {
      const t = await res.text();
      const raw = (t && t.trim()) || `HTTP ${res.status}`;
      return { ok: false, error: formatOllamaError(raw) };
    }
    const data = await res.json();
    let models = Array.isArray(data?.models)
      ? data.models.map((m) => (m?.name != null ? String(m.name) : '')).filter(Boolean)
      : [];
    if (options.onlyGenerate && models.length > 0) {
      const results = await Promise.all(
        models.map(async (name) => ({ name, ok: await modelSupportsGenerate(base, name, fetchFn) }))
      );
      models = results.filter((r) => r.ok).map((r) => r.name);
    }
    return { ok: true, models };
  } catch (e) {
    const raw = e && e.message ? e.message : 'Ollama request failed';
    return { ok: false, error: formatOllamaError(raw) };
  }
}

/**
 * Build a prompt for generating a conventional commit message from a diff summary.
 * @param {string} diffSummary - git diff or status summary
 * @returns {string}
 */
function buildCommitMessagePrompt(diffSummary) {
  return `Generate exactly one short conventional commit message line for these changes. Use format: type(scope): description. Types: feat, fix, docs, style, refactor, test, chore. No quotes, no explanation.

Changes:
${diffSummary}`;
}

/**
 * Build a prompt for generating release notes from commit subjects.
 * @param {string[]} commits - list of commit subject lines
 * @returns {string}
 */
function buildReleaseNotesPrompt(commits) {
  const list = Array.isArray(commits) && commits.length ? commits.join('\n') : 'No commits';
  return `Generate short release notes (2-5 bullet points or one short paragraph) for these commits. Be concise. No title, just the notes.

Commits:
${list}`;
}

module.exports = {
  generate,
  listModels,
  buildCommitMessagePrompt,
  buildReleaseNotesPrompt,
  formatOllamaError,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
};
