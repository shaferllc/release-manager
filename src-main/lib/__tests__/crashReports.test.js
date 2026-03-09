const {
  setBaseUrlProvider,
  sendCrashReport,
  getOsString,
} = require('../crashReports');

const TEST_BASE_URL = 'https://shipwell-web.test';
const CRASH_ENDPOINT = TEST_BASE_URL + '/api/crash-reports';

beforeAll(() => {
  setBaseUrlProvider(() => TEST_BASE_URL);
});

function createMockFetch(capture = {}, { status = 201, responseBody } = {}) {
  const body = responseBody ?? { id: 42, received_at: '2025-06-01T12:00:00Z' };
  return function mockFetch(url, opts) {
    capture.url = url;
    capture.method = opts?.method;
    capture.headers = opts?.headers;
    capture.body = opts?.body != null ? JSON.parse(opts.body) : undefined;
    return Promise.resolve({
      status,
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  };
}

function enabledPrefs(key) {
  if (key === 'crashReports') return true;
  return undefined;
}

function disabledPrefs(key) {
  if (key === 'crashReports') return false;
  return undefined;
}

describe('crashReports', () => {
  describe('getOsString', () => {
    it('returns a non-empty string with platform info', () => {
      const s = getOsString();
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
      expect(s).toMatch(/macOS|Windows|Linux|darwin|win32/);
    });
  });

  describe('sendCrashReport', () => {
    it('sends POST to /api/crash-reports with crash data when enabled', async () => {
      const capture = {};
      const res = await sendCrashReport(enabledPrefs, {
        message: 'TypeError: Cannot read property "foo" of undefined',
        stack_trace: 'at Object.<anonymous> (main.js:42:15)\n  at Module._compile',
        app_version: '2.1.0',
        payload: { process: 'main', context: 'test' },
      }, createMockFetch(capture));

      expect(res.ok).toBe(true);
      expect(res.id).toBe(42);
      expect(res.received_at).toBe('2025-06-01T12:00:00Z');
      expect(capture.url).toBe(CRASH_ENDPOINT);
      expect(capture.method).toBe('POST');
      expect(capture.headers['Content-Type']).toBe('application/json');
      expect(capture.body.message).toBe('TypeError: Cannot read property "foo" of undefined');
      expect(capture.body.stack_trace).toContain('main.js:42:15');
      expect(capture.body.app_version).toBe('2.1.0');
      expect(capture.body.payload).toEqual({ process: 'main', context: 'test' });
    });

    it('auto-fills os and app_version when not provided', async () => {
      const capture = {};
      await sendCrashReport(enabledPrefs, {
        message: 'test error',
      }, createMockFetch(capture));

      expect(typeof capture.body.os).toBe('string');
      expect(capture.body.os.length).toBeGreaterThan(0);
      expect(typeof capture.body.app_version).toBe('string');
    });

    it('does not send when crash reports are disabled', async () => {
      const capture = {};
      const res = await sendCrashReport(disabledPrefs, {
        message: 'should not send',
      }, createMockFetch(capture));

      expect(res.ok).toBe(false);
      expect(res.error).toContain('disabled');
      expect(capture.url).toBeUndefined();
    });

    it('does not send when no base URL is configured', async () => {
      const originalProvider = () => TEST_BASE_URL;
      setBaseUrlProvider(() => '');
      try {
        const capture = {};
        const res = await sendCrashReport(enabledPrefs, {
          message: 'no url',
        }, createMockFetch(capture));

        expect(res.ok).toBe(false);
        expect(res.error).toContain('not available');
        expect(capture.url).toBeUndefined();
      } finally {
        setBaseUrlProvider(originalProvider);
      }
    });

    it('returns error on non-201 response', async () => {
      const capture = {};
      const res = await sendCrashReport(enabledPrefs, {
        message: 'server error test',
      }, createMockFetch(capture, { status: 500, responseBody: 'Internal Server Error' }));

      expect(res.ok).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('returns error on network failure', async () => {
      const failFetch = () => Promise.reject(new Error('Network unreachable'));
      const res = await sendCrashReport(enabledPrefs, {
        message: 'network fail test',
      }, failFetch);

      expect(res.ok).toBe(false);
      expect(res.error).toContain('Network unreachable');
    });

    it('includes user_identifier when provided', async () => {
      const capture = {};
      await sendCrashReport(enabledPrefs, {
        message: 'ident test',
        user_identifier: 'user@example.com',
      }, createMockFetch(capture));

      expect(capture.body.user_identifier).toBe('user@example.com');
    });

    it('sends renderer crash data with process info in payload', async () => {
      const capture = {};
      await sendCrashReport(enabledPrefs, {
        message: 'Uncaught ReferenceError: x is not defined',
        stack_trace: 'ReferenceError: x is not defined\n  at App.vue:123:5',
        payload: {
          process: 'renderer',
          type: 'error',
          source: 'App.vue',
          lineno: 123,
          colno: 5,
        },
      }, createMockFetch(capture));

      expect(capture.body.message).toContain('ReferenceError');
      expect(capture.body.payload.process).toBe('renderer');
      expect(capture.body.payload.type).toBe('error');
      expect(capture.body.payload.source).toBe('App.vue');
    });

    it('sends Vue lifecycle error data', async () => {
      const capture = {};
      await sendCrashReport(enabledPrefs, {
        message: 'Maximum call stack size exceeded',
        stack_trace: 'RangeError: Maximum call stack size exceeded\n  at computed (reactivity.js:42)',
        payload: {
          process: 'renderer',
          type: 'vue',
          info: 'setup function',
        },
      }, createMockFetch(capture));

      expect(capture.body.message).toContain('Maximum call stack');
      expect(capture.body.payload.type).toBe('vue');
      expect(capture.body.payload.info).toBe('setup function');
    });

    it('sends unhandled promise rejection data', async () => {
      const capture = {};
      await sendCrashReport(enabledPrefs, {
        message: 'fetch failed',
        stack_trace: 'TypeError: fetch failed\n  at node:internal/deps/undici',
        payload: {
          process: 'renderer',
          type: 'unhandledrejection',
        },
      }, createMockFetch(capture));

      expect(capture.body.message).toBe('fetch failed');
      expect(capture.body.payload.type).toBe('unhandledrejection');
    });
  });
});
