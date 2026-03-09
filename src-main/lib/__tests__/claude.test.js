const { generate, DEFAULT_MODEL } = require('../claude');

describe('claude', () => {
  describe('DEFAULT_MODEL', () => {
    it('exports default model name', () => {
      expect(DEFAULT_MODEL).toBe('claude-sonnet-4-20250514');
    });
  });

  describe('generate', () => {
    it('returns error when API key is not set', async () => {
      const result = await generate('', 'model', 'hi');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('API key is not set');
    });

    it('returns error when API key is whitespace only', async () => {
      const result = await generate('   ', null, 'hi');
      expect(result.ok).toBe(false);
    });

    it('returns error when apiKey is not a string', async () => {
      const result = await generate(123, 'model', 'hi');
      expect(result.ok).toBe(false);
    });

    it('trims API key and uses default model when model empty', async () => {
      let capturedBody;
      const fetchMock = async (_url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return { ok: true, text: async () => JSON.stringify({ content: [{ type: 'text', text: ' Hi ' }] }) };
      };
      const result = await generate('  sk-ant-x  ', '  ', 'hello', fetchMock);
      expect(result.ok).toBe(true);
      expect(result.text).toBe('Hi');
      expect(capturedBody.model).toBe(DEFAULT_MODEL);
    });

    it('uses default model when model is whitespace only', async () => {
      let capturedBody;
      const fetchMock = async (_url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return { ok: true, text: async () => JSON.stringify({ content: [{ type: 'text', text: '' }] }) };
      };
      await generate('sk-ant-x', '   ', 'hi', fetchMock);
      expect(capturedBody.model).toBe(DEFAULT_MODEL);
    });

    it('returns text from successful response', async () => {
      const fetchMock = async () => ({
        ok: true,
        text: async () => JSON.stringify({ content: [{ type: 'text', text: ' response ' }] }),
      });
      const result = await generate('sk-ant-x', 'claude-3-5-sonnet', 'hi', fetchMock);
      expect(result.ok).toBe(true);
      expect(result.text).toBe('response');
    });

    it('returns error when response not ok with JSON error message', async () => {
      const fetchMock = async () => ({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: { message: 'Invalid request' } }),
      });
      const result = await generate('sk-ant-x', 'm', 'hi', fetchMock);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Invalid request');
    });

    it('returns error when response not ok with invalid JSON (parse throws)', async () => {
      const fetchMock = async () => ({
        ok: false,
        status: 500,
        text: async () => 'not json at all',
      });
      const result = await generate('sk-ant-x', 'm', 'hi', fetchMock);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('not json at all');
    });

    it('returns error when response not ok with JSON without error.message', async () => {
      const fetchMock = async () => ({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: {} }),
      });
      const result = await generate('sk-ant-x', 'm', 'hi', fetchMock);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('{"error":{}}');
    });

    it('returns error when response not ok with long text (truncated)', async () => {
      const longMsg = 'x'.repeat(250);
      const fetchMock = async () => ({
        ok: false,
        status: 500,
        text: async () => longMsg,
      });
      const result = await generate('sk-ant-x', 'm', 'hi', fetchMock);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Claude API error: 500');
    });

    it('truncates prompt to max input length', async () => {
      let capturedBody;
      const fetchMock = async (_url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return { ok: true, text: async () => JSON.stringify({ content: [{ type: 'text', text: '' }] }) };
      };
      const longPrompt = 'a'.repeat(1000000);
      await generate('sk-ant-x', 'm', longPrompt, fetchMock);
      const maxChars = 180000 * 4;
      expect(capturedBody.messages[0].content.length).toBeLessThanOrEqual(maxChars);
    });

    it('sends empty string when prompt is not a string', async () => {
      let capturedBody;
      const fetchMock = async (_url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return { ok: true, text: async () => JSON.stringify({ content: [{ type: 'text', text: '' }] }) };
      };
      await generate('sk-ant-x', 'm', null, fetchMock);
      expect(capturedBody.messages[0].content).toBe('');
    });

    it('returns empty text when response has empty content', async () => {
      const fetchMock = async () => ({
        ok: true,
        text: async () => JSON.stringify({ content: [] }),
      });
      const result = await generate('sk-ant-x', 'm', 'hi', fetchMock);
      expect(result.ok).toBe(true);
      expect(result.text).toBe('');
    });

    it('returns error on fetch throw with short message', async () => {
      const fetchMock = async () => {
        throw new Error('network error');
      };
      const result = await generate('sk-ant-x', 'm', 'hi', fetchMock);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('network error');
    });

    it('returns generic error when fetch throw has long message', async () => {
      const fetchMock = async () => {
        throw new Error('x'.repeat(300));
      };
      const result = await generate('sk-ant-x', 'm', 'hi', fetchMock);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Claude request failed.');
    });

    it('returns generic error when catch has no message', async () => {
      const fetchMock = async () => {
        throw {};
      };
      const result = await generate('sk-ant-x', 'm', 'hi', fetchMock);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Claude request failed');
    });
  });
});
