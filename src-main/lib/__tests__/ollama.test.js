const {
  generate,
  listModels,
  modelSupportsGenerate,
  buildCommitMessagePrompt,
  buildReleaseNotesPrompt,
  buildTagMessagePrompt,
  buildTestFixPrompt,
  formatOllamaError,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
} = require('../ollama');

describe('ollama', () => {
  describe('buildCommitMessagePrompt', () => {
    it('includes changes in prompt', () => {
      const out = buildCommitMessagePrompt('diff -- a b');
      expect(out).toContain('diff -- a b');
      expect(out).toContain('conventional commit');
    });
    it('handles empty diff summary', () => {
      const out = buildCommitMessagePrompt('');
      expect(out).toContain('Changes:');
      expect(out).toContain('conventional commit');
    });
  });

  describe('buildTestFixPrompt', () => {
    it('includes script name and stdout/stderr in prompt', () => {
      const out = buildTestFixPrompt('test', 'stdout here', 'stderr here');
      expect(out).toContain('test script "test" failed');
      expect(out).toContain('stdout here');
      expect(out).toContain('stderr here');
    });
    it('uses "test" when testScriptName is empty', () => {
      const out = buildTestFixPrompt('', 'out', 'err');
      expect(out).toContain('"test" failed');
    });
    it('handles empty stdout and stderr', () => {
      const out = buildTestFixPrompt('test', '', '');
      expect(out).toContain('(empty)');
    });
  });

  describe('buildReleaseNotesPrompt', () => {
    it('joins commits with newlines', () => {
      const out = buildReleaseNotesPrompt(['feat: one', 'fix: two']);
      expect(out).toContain('feat: one');
      expect(out).toContain('fix: two');
    });
    it('handles empty or non-array', () => {
      expect(buildReleaseNotesPrompt([])).toContain('No commits');
      expect(buildReleaseNotesPrompt(null)).toContain('No commits');
    });
    it('handles single commit', () => {
      const out = buildReleaseNotesPrompt(['fix: bug']);
      expect(out).toContain('fix: bug');
    });
  });

  describe('buildTagMessagePrompt', () => {
    it('joins commits and asks for one line', () => {
      const out = buildTagMessagePrompt(['feat: one', 'fix: two']);
      expect(out).toContain('feat: one');
      expect(out).toContain('fix: two');
      expect(out).toContain('One line');
    });
    it('handles empty or non-array', () => {
      expect(buildTagMessagePrompt([])).toContain('No commits');
      expect(buildTagMessagePrompt(null)).toContain('No commits');
    });
  });

  describe('generate', () => {
    it('returns error when fetch fails', async () => {
      const fetchMock = async () => { throw new Error('network'); };
      const result = await generate('http://localhost:11434', 'llama3.2', 'hi', fetchMock);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('ollama serve');
    });
    it('returns fallback error when catch has no message', async () => {
      const fetchMock = async () => { throw {}; };
      const result = await generate('http://localhost:11434', 'x', 'hi', fetchMock);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Ollama request failed');
    });
    it('returns error when response not ok', async () => {
      const fetchMock = async () => ({ ok: false, status: 404, text: async () => 'not found' });
      const result = await generate('http://localhost:11434', 'x', 'hi', fetchMock);
      expect(result.ok).toBe(false);
    });
    it('returns HTTP status when response not ok and text empty', async () => {
      const fetchMock = async () => ({ ok: false, status: 500, text: async () => '' });
      const result = await generate('http://localhost:11434', 'x', 'hi', fetchMock);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('HTTP 500');
    });
    it('sends empty prompt when prompt is not a string', async () => {
      let capturedBody;
      const fetchMock = async (_url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return { ok: true, json: async () => ({ response: '' }) };
      };
      await generate('http://localhost:11434', 'x', null, fetchMock);
      expect(capturedBody.prompt).toBe('');
    });
    it('returns text from response.response', async () => {
      const fetchMock = async () => ({
        ok: true,
        json: async () => ({ response: ' generated text ' }),
      });
      const result = await generate('http://localhost:11434', 'x', 'hi', fetchMock);
      expect(result.ok).toBe(true);
      expect(result.text).toBe('generated text');
    });
    it('returns empty string when response.response is null', async () => {
      const fetchMock = async () => ({
        ok: true,
        json: async () => ({ response: null }),
      });
      const result = await generate('http://localhost:11434', 'x', 'hi', fetchMock);
      expect(result.ok).toBe(true);
      expect(result.text).toBe('');
    });
    it('returns empty string when response.response is undefined', async () => {
      const fetchMock = async () => ({
        ok: true,
        json: async () => ({}),
      });
      const result = await generate('http://localhost:11434', 'x', 'hi', fetchMock);
      expect(result.ok).toBe(true);
      expect(result.text).toBe('');
    });
    it('uses default base URL and model when passed empty', async () => {
      let capturedUrl;
      let capturedBody;
      const fetchMock = async (url, opts) => {
        capturedUrl = url;
        capturedBody = JSON.parse(opts.body);
        return { ok: true, json: async () => ({ response: 'ok' }) };
      };
      await generate('', '', 'hi', fetchMock);
      expect(capturedUrl).toContain('127.0.0.1:11434');
      expect(capturedUrl).toContain('/api/generate');
      expect(capturedBody.model).toBe(DEFAULT_MODEL);
    });
    it('strips trailing slash from base URL', async () => {
      let capturedUrl;
      const fetchMock = async (url) => {
        capturedUrl = url;
        return { ok: true, json: async () => ({ response: '' }) };
      };
      await generate('http://localhost:11434/', 'x', 'p', fetchMock);
      expect(capturedUrl).toBe('http://127.0.0.1:11434/api/generate');
    });
    it('truncates very long prompt', async () => {
      const longPrompt = 'x'.repeat(20000);
      let capturedBody;
      const fetchMock = async (_url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return { ok: true, json: async () => ({ response: '' }) };
      };
      await generate('http://localhost:11434', 'x', longPrompt, fetchMock);
      expect(capturedBody.prompt.length).toBe(12000);
    });
    it('uses default fetch when fetchImpl not passed', async () => {
      const origFetch = globalThis.fetch;
      globalThis.fetch = async (url, opts) => {
        expect(url).toContain('/api/generate');
        return { ok: true, json: async () => ({ response: 'ok' }) };
      };
      try {
        const result = await generate('http://localhost:11434', 'x', 'hi');
        expect(result.ok).toBe(true);
        expect(result.text).toBe('ok');
      } finally {
        globalThis.fetch = origFetch;
      }
    });
  });

  describe('formatOllamaError', () => {
    it('returns not-running hint for ECONNREFUSED', () => {
      expect(formatOllamaError('ECONNREFUSED')).toContain('ollama serve');
      expect(formatOllamaError('ECONNREFUSED')).toContain('ollama pull');
    });
    it('returns not-running hint for fetch failed', () => {
      expect(formatOllamaError('Failed to fetch')).toContain('ollama serve');
    });
    it('returns model-not-found hint for 404/not found', () => {
      expect(formatOllamaError('404')).toContain('ollama pull');
      expect(formatOllamaError('model not found', 'llama3.2')).toContain('ollama pull llama3.2');
    });
    it('returns already-running hint for address already in use', () => {
      expect(formatOllamaError('listen tcp 127.0.0.1:11434: bind: address already in use')).toContain('already running');
      expect(formatOllamaError('address already in use')).toContain('already running');
    });
    it('returns re-pull hint for missing model file / no such file', () => {
      expect(formatOllamaError('couldn\'t open model file', 'llama3.2')).toContain('Re-pull');
      expect(formatOllamaError('no such file or directory', 'codellama')).toContain('ollama pull codellama');
    });
    it('returns friendly message for does not support generate', () => {
      expect(formatOllamaError('{"error":"\\"llama3.2:1b\\" does not support generate"}')).toContain("doesn't support text generation");
      expect(formatOllamaError('Model x does not support generate')).toContain('List models');
    });
    it('returns prefixed message for other errors', () => {
      expect(formatOllamaError('Something went wrong')).toBe('Ollama: Something went wrong');
    });
    it('parses JSON error but keeps message when data.error is not a string', () => {
      expect(formatOllamaError('{"error": 123}')).toContain('Ollama:');
    });
    it('truncates very long error message', () => {
      const long = 'x'.repeat(150);
      const out = formatOllamaError(long);
      expect(out).toContain('Ollama error:');
      expect(out).toContain('…');
      expect(out.length).toBeLessThan(140);
    });
    it('returns re-pull hint without model when model not passed', () => {
      expect(formatOllamaError('no such file or directory')).toContain('ollama pull <model>');
    });
    it('returns not-running hint for null/empty', () => {
      expect(formatOllamaError('')).toContain('ollama serve');
      expect(formatOllamaError(null)).toContain('ollama serve');
    });
  });

  describe('defaults', () => {
    it('exports default base URL and model', () => {
      expect(DEFAULT_BASE_URL).toBe('http://127.0.0.1:11434');
      expect(DEFAULT_MODEL).toBe('llama3.2');
    });
  });

  describe('localhost normalization', () => {
    it('uses 127.0.0.1 when baseUrl is localhost:11434', async () => {
      let capturedUrl;
      const fetchMock = (url) => {
        capturedUrl = url;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ response: 'ok' }) });
      };
      await generate('http://localhost:11434', 'x', 'hi', fetchMock);
      expect(capturedUrl).toBe('http://127.0.0.1:11434/api/generate');
    });
    it('uses default base URL when baseUrl is only slash', async () => {
      let capturedUrl;
      const fetchMock = (url) => {
        capturedUrl = url;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ response: 'ok' }) });
      };
      await generate('/', 'x', 'hi', fetchMock);
      expect(capturedUrl).toContain('127.0.0.1:11434');
    });
  });

  describe('listModels', () => {
    it('returns model names from /api/tags', async () => {
      const fetchMock = () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              models: [
                { name: 'llama3.2', modified_at: '2024-01-01T00:00:00Z' },
                { name: 'codellama:7b', modified_at: '2024-01-02T00:00:00Z' },
              ],
            }),
        });
      const result = await listModels('http://127.0.0.1:11434', fetchMock);
      expect(result.ok).toBe(true);
      expect(result.models).toEqual(['llama3.2', 'codellama:7b']);
    });
    it('returns empty array when models is missing', async () => {
      const fetchMock = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      const result = await listModels('http://127.0.0.1:11434', fetchMock);
      expect(result.ok).toBe(true);
      expect(result.models).toEqual([]);
    });
    it('returns error when fetch fails', async () => {
      const fetchMock = () => Promise.reject(new Error('ECONNREFUSED'));
      const result = await listModels('http://127.0.0.1:11434', fetchMock);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('ollama serve');
    });
    it('returns error when /api/tags returns non-ok', async () => {
      const fetchMock = () =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve('Internal Server Error'),
        });
      const result = await listModels('http://127.0.0.1:11434', fetchMock);
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });
    it('returns HTTP status when /api/tags returns non-ok and text empty', async () => {
      const fetchMock = () =>
        Promise.resolve({
          ok: false,
          status: 503,
          text: () => Promise.resolve(''),
        });
      const result = await listModels('http://127.0.0.1:11434', fetchMock);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('503');
    });
    it('filters out models with null or missing name', async () => {
      const fetchMock = () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              models: [
                { name: 'valid' },
                { name: null },
                {},
                { name: '' },
              ],
            }),
        });
      const result = await listModels('http://127.0.0.1:11434', fetchMock);
      expect(result.ok).toBe(true);
      expect(result.models).toEqual(['valid']);
    });
    it('returns error when listModels fetch throws with no message', async () => {
      const fetchMock = () => Promise.reject(new Error());
      const result = await listModels('http://127.0.0.1:11434', fetchMock);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Ollama request failed');
    });
    it('excludes model when /api/show fetch throws', async () => {
      const fetchMock = async (url) => {
        if (url.includes('/api/tags')) {
          return {
            ok: true,
            json: () => Promise.resolve({ models: [{ name: 'throws' }] }),
          };
        }
        if (url.includes('/api/show')) return Promise.reject(new Error('network'));
        return { ok: false };
      };
      const result = await listModels('http://127.0.0.1:11434', fetchMock, { onlyGenerate: true });
      expect(result.ok).toBe(true);
      expect(result.models).toEqual([]);
    });
    it('excludes model when /api/show throws synchronously', async () => {
      const fetchMock = (url) => {
        if (url.includes('/api/tags')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [{ name: 'sync-throw' }] }),
          });
        }
        if (url.includes('/api/show')) throw new Error('sync error');
        return Promise.resolve({ ok: false });
      };
      const result = await listModels('http://127.0.0.1:11434', fetchMock, { onlyGenerate: true });
      expect(result.ok).toBe(true);
      expect(result.models).toEqual([]);
    });
    it('excludes model when /api/show res.json() throws', async () => {
      const fetchMock = (url) => {
        if (url.includes('/api/tags')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: [{ name: 'bad-json' }] }),
          });
        }
        if (url.includes('/api/show')) {
          return Promise.resolve({ ok: true, json: () => Promise.reject(new Error('invalid json')) });
        }
        return Promise.resolve({ ok: false });
      };
      const result = await listModels('http://127.0.0.1:11434', fetchMock, { onlyGenerate: true });
      expect(result.ok).toBe(true);
      expect(result.models).toEqual([]);
    });
    it('filters to models that support generate when onlyGenerate: true', async () => {
      const fetchMock = async (url, opts) => {
        if (url.includes('/api/tags')) {
          return {
            ok: true,
            json: () =>
              Promise.resolve({
                models: [
                  { name: 'llama3.2', modified_at: '2024-01-01' },
                  { name: 'llama3.2:1b', modified_at: '2024-01-02' },
                  { name: 'codellama:7b', modified_at: '2024-01-03' },
                ],
              }),
          };
        }
        if (url.includes('/api/show') && opts?.body) {
          const body = JSON.parse(opts.body);
          const name = body.name || '';
          const modalities = name === 'llama3.2:1b' ? ['embedding'] : ['text'];
          return { ok: true, json: () => Promise.resolve({ modalities }) };
        }
        return { ok: false };
      };
      const result = await listModels('http://127.0.0.1:11434', fetchMock, { onlyGenerate: true });
      expect(result.ok).toBe(true);
      expect(result.models).toEqual(['llama3.2', 'codellama:7b']);
    });
    it('includes model when show returns no modalities (treat as supports generate)', async () => {
      const fetchMock = async (url, opts) => {
        if (url.includes('/api/tags')) {
          return {
            ok: true,
            json: () => Promise.resolve({ models: [{ name: 'legacy' }] }),
          };
        }
        if (url.includes('/api/show')) {
          return { ok: true, json: () => Promise.resolve({}) };
        }
        return { ok: false };
      };
      const result = await listModels('http://127.0.0.1:11434', fetchMock, { onlyGenerate: true });
      expect(result.ok).toBe(true);
      expect(result.models).toEqual(['legacy']);
    });
    it('excludes model when show returns non-ok', async () => {
      const fetchMock = async (url, opts) => {
        if (url.includes('/api/tags')) {
          return {
            ok: true,
            json: () => Promise.resolve({ models: [{ name: 'broken' }] }),
          };
        }
        if (url.includes('/api/show')) return { ok: false };
        return { ok: false };
      };
      const result = await listModels('http://127.0.0.1:11434', fetchMock, { onlyGenerate: true });
      expect(result.ok).toBe(true);
      expect(result.models).toEqual([]);
    });
    it('includes model when modalities has text and embedding', async () => {
      const fetchMock = async (url, opts) => {
        if (url.includes('/api/tags')) {
          return {
            ok: true,
            json: () => Promise.resolve({ models: [{ name: 'multi' }] }),
          };
        }
        if (url.includes('/api/show')) {
          return { ok: true, json: () => Promise.resolve({ modalities: ['text', 'embedding'] }) };
        }
        return { ok: false };
      };
      const result = await listModels('http://127.0.0.1:11434', fetchMock, { onlyGenerate: true });
      expect(result.ok).toBe(true);
      expect(result.models).toEqual(['multi']);
    });
    it('modelSupportsGenerate returns false when fetch throws', async () => {
      const fetchMock = () => Promise.reject(new Error('network'));
      const result = await modelSupportsGenerate('http://127.0.0.1:11434', 'm', fetchMock);
      expect(result).toBe(false);
    });
    it('modelSupportsGenerate returns false when res.json() rejects', async () => {
      const fetchMock = () =>
        Promise.resolve({ ok: true, json: () => Promise.reject(new Error('parse')) });
      const result = await modelSupportsGenerate('http://127.0.0.1:11434', 'm', fetchMock);
      expect(result).toBe(false);
    });
    it('modelSupportsGenerate returns false when res.json() throws synchronously', async () => {
      const fetchMock = () =>
        Promise.resolve({ ok: true, json: () => { throw new Error('sync parse'); } });
      const result = await modelSupportsGenerate('http://127.0.0.1:11434', 'm', fetchMock);
      expect(result).toBe(false);
    });
    it('modelSupportsGenerate returns true when modalities is array without text and not only embedding', async () => {
      const fetchMock = () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ modalities: ['embedding', 'other'] }),
        });
      const result = await modelSupportsGenerate('http://127.0.0.1:11434', 'm', fetchMock);
      expect(result).toBe(true);
    });
    it('returns all models when onlyGenerate is false or omitted', async () => {
      const fetchMock = () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              models: [
                { name: 'a' },
                { name: 'b' },
              ],
            }),
        });
      const withFalse = await listModels('http://127.0.0.1:11434', fetchMock, { onlyGenerate: false });
      const omitted = await listModels('http://127.0.0.1:11434', fetchMock);
      expect(withFalse.models).toEqual(['a', 'b']);
      expect(omitted.models).toEqual(['a', 'b']);
    });
    it('uses default fetch when fetchImpl not passed', async () => {
      const origFetch = globalThis.fetch;
      globalThis.fetch = (url) => {
        expect(url).toContain('/api/tags');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ models: [{ name: 'default' }] }),
        });
      };
      try {
        const result = await listModels('http://127.0.0.1:11434');
        expect(result.ok).toBe(true);
        expect(result.models).toEqual(['default']);
      } finally {
        globalThis.fetch = origFetch;
      }
    });
  });
});
