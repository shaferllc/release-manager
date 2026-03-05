const http = require('http');
const {
  createBookmarksReceiver,
  DEFAULT_BOOKMARKS_RECEIVER_PORT,
  readRequestBody,
} = require('../bookmarksReceiver');

function request(port, options) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: options.path ?? '/bookmarks',
        method: options.method ?? 'POST',
        headers: options.headers ?? { 'Content-Type': 'application/json' },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : null;
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, body });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body !== undefined) {
      const data = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(data);
    }
    req.end();
  });
}

describe('bookmarksReceiver', () => {
  let receiver;
  let getPreference;
  let setPreference;
  let port;

  beforeEach(async () => {
    getPreference = jest.fn();
    setPreference = jest.fn();
    receiver = createBookmarksReceiver({ getPreference, setPreference });
    await receiver.start(0);
    port = receiver.getPort();
  });

  afterEach(async () => {
    if (receiver) await receiver.stop();
  });

  describe('createBookmarksReceiver', () => {
    it('exports DEFAULT_BOOKMARKS_RECEIVER_PORT', () => {
      expect(DEFAULT_BOOKMARKS_RECEIVER_PORT).toBe(3848);
    });

    it('start(0) uses ephemeral port', async () => {
      const r = createBookmarksReceiver({ getPreference: jest.fn(), setPreference: jest.fn() });
      await r.start(0);
      expect(r.getPort()).toBeGreaterThan(0);
      expect(r.getPort()).not.toBe(3848);
      await r.stop();
    });

    it('start() uses getPreference(bookmarksReceiverPort) when no override', async () => {
      const getPref = jest.fn().mockReturnValue(9000);
      const r = createBookmarksReceiver({ getPreference: getPref, setPreference: jest.fn() });
      await r.start();
      expect(r.getPort()).toBe(9000);
      expect(getPref).toHaveBeenCalledWith('bookmarksReceiverPort');
      await r.stop();
    });

    it('start() returns early when server already running', async () => {
      await receiver.start(0);
      const ret = receiver.start(9999);
      expect(ret).toBeUndefined();
      expect(receiver.getPort()).toBeGreaterThan(0);
    });

    it('getPort returns the port the server is listening on', async () => {
      const res = await request(port, { method: 'OPTIONS' });
      expect(res.status).toBe(204);
      expect(receiver.getPort()).toBe(port);
    });
  });

  describe('OPTIONS', () => {
    it('returns 204 with CORS headers', async () => {
      const res = await request(port, { method: 'OPTIONS', path: '/bookmarks' });
      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toMatch(/POST/);
    });
  });

  describe('wrong method or path', () => {
    it('returns 404 for GET /bookmarks', async () => {
      const res = await request(port, { method: 'GET', path: '/bookmarks' });
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('ok', false);
      expect(res.body.error).toMatch(/POST \/bookmarks/);
    });

    it('returns 404 for POST /other', async () => {
      const res = await request(port, { method: 'POST', path: '/other', body: { url: 'https://x.com' } });
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('ok', false);
    });

    it('accepts POST /bookmarks/ (trailing slash)', async () => {
      getPreference.mockImplementation((key) => {
        if (key === 'selectedProjectPath') return '/my/project';
        if (key.startsWith('ext.bookmarks.')) return undefined;
        return undefined;
      });
      const res = await request(port, { path: '/bookmarks/', body: { url: 'https://example.com' } });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(setPreference).toHaveBeenCalled();
    });
  });

  describe('POST /bookmarks body validation', () => {
    it('returns 400 for invalid JSON', async () => {
      const res = await request(port, { body: 'not json' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('ok', false);
      expect(res.body.error).toMatch(/JSON/i);
    });

    it('returns 400 for missing url', async () => {
      getPreference.mockReturnValue('/proj');
      const res = await request(port, { body: {} });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('ok', false);
      expect(res.body.error).toMatch(/url/i);
    });

    it('returns 400 for empty url', async () => {
      getPreference.mockReturnValue('/proj');
      const res = await request(port, { body: { url: '   ' } });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/url/i);
    });
  });

  describe('no project selected', () => {
    it('returns 200 with ok: false when selectedProjectPath is missing', async () => {
      getPreference.mockReturnValue(undefined);
      const res = await request(port, { body: { url: 'https://x.com' } });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toMatch(/project selected/i);
      expect(setPreference).not.toHaveBeenCalled();
    });

    it('returns 200 with ok: false when selectedProjectPath is empty string', async () => {
      getPreference.mockReturnValue('');
      const res = await request(port, { body: { url: 'https://x.com' } });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(false);
      expect(setPreference).not.toHaveBeenCalled();
    });

    it('returns 200 with ok: false when selectedProjectPath is not a string', async () => {
      getPreference.mockReturnValue(123);
      const res = await request(port, { body: { url: 'https://x.com' } });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(false);
      expect(setPreference).not.toHaveBeenCalled();
    });
  });

  describe('successful add bookmark', () => {
    beforeEach(() => {
      getPreference.mockImplementation((key) => {
        if (key === 'selectedProjectPath') return '/my/project';
        if (key === 'ext.bookmarks.%2Fmy%2Fproject') return undefined;
        return undefined;
      });
    });

    it('returns 200 and ok: true', async () => {
      const res = await request(port, { body: { url: 'https://example.com/page' } });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.message).toMatch(/added/i);
    });

    it('calls setPreference with encoded project path key', async () => {
      await request(port, { body: { url: 'https://a.com' } });
      expect(setPreference).toHaveBeenCalledWith(
        'ext.bookmarks.%2Fmy%2Fproject',
        expect.stringContaining('"bookmarks":')
      );
    });

    it('stores one bookmark with id, url, createdAt', async () => {
      await request(port, { body: { url: 'https://test.com' } });
      const call = setPreference.mock.calls[0];
      const stored = JSON.parse(call[1]);
      expect(stored.bookmarks).toHaveLength(1);
      expect(stored.bookmarks[0].url).toBe('https://test.com');
      expect(stored.bookmarks[0].id).toMatch(/^bm-/);
      expect(stored.bookmarks[0].createdAt).toBeDefined();
    });

    it('includes title when provided', async () => {
      await request(port, { body: { url: 'https://x.com', title: ' My Title ' } });
      const stored = JSON.parse(setPreference.mock.calls[0][1]);
      expect(stored.bookmarks[0].title).toBe('My Title');
    });

    it('includes folder and tags when provided', async () => {
      await request(port, {
        body: { url: 'https://x.com', folder: ' Docs ', tags: ['a', 'b'] },
      });
      const stored = JSON.parse(setPreference.mock.calls[0][1]);
      expect(stored.bookmarks[0].folder).toBe('Docs');
      expect(stored.bookmarks[0].tags).toEqual(['a', 'b']);
    });

    it('treats whitespace-only folder as undefined', async () => {
      await request(port, { body: { url: 'https://x.com', folder: '   ' } });
      const stored = JSON.parse(setPreference.mock.calls[0][1]);
      expect(stored.bookmarks[0].folder).toBeUndefined();
    });

    it('treats tags as undefined when not array or string', async () => {
      await request(port, { body: { url: 'https://x.com', tags: 123 } });
      const stored = JSON.parse(setPreference.mock.calls[0][1]);
      expect(stored.bookmarks[0].tags).toBeUndefined();
    });

    it('appends to existing bookmarks', async () => {
      getPreference.mockImplementation((key) => {
        if (key === 'selectedProjectPath') return '/p';
        if (key === 'ext.bookmarks.%2Fp') {
          return JSON.stringify({
            bookmarks: [{ id: 'old', url: 'https://old.com', title: 'Old' }],
          });
        }
        return undefined;
      });
      await request(port, { body: { url: 'https://new.com' } });
      const stored = JSON.parse(setPreference.mock.calls[0][1]);
      expect(stored.bookmarks).toHaveLength(2);
      expect(stored.bookmarks[0].url).toBe('https://old.com');
      expect(stored.bookmarks[1].url).toBe('https://new.com');
    });

    it('uses raw object when getPreference returns non-string (already parsed)', async () => {
      getPreference.mockImplementation((key) => {
        if (key === 'selectedProjectPath') return '/proj';
        if (key === 'ext.bookmarks.%2Fproj') return { bookmarks: [{ id: 'existing', url: 'https://a.com' }] };
        return undefined;
      });
      const res = await request(port, { body: { url: 'https://b.com' } });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      const stored = JSON.parse(setPreference.mock.calls[0][1]);
      expect(stored.bookmarks).toHaveLength(2);
      expect(stored.bookmarks[1].url).toBe('https://b.com');
    });

    it('uses empty bookmarks when getPreference returns invalid JSON string', async () => {
      getPreference.mockImplementation((key) => {
        if (key === 'selectedProjectPath') return '/p';
        if (key === 'ext.bookmarks.%2Fp') return 'not valid json {';
        return undefined;
      });
      const res = await request(port, { body: { url: 'https://new.com' } });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      const stored = JSON.parse(setPreference.mock.calls[0][1]);
      expect(stored.bookmarks).toHaveLength(1);
      expect(stored.bookmarks[0].url).toBe('https://new.com');
    });
  });

  describe('readRequestBody', () => {
    it('returns { body } when stream reads successfully', async () => {
      const chunks = ['{"url":"https://x.com"}'];
      const req = {
        [Symbol.asyncIterator]() {
          let i = 0;
          return {
            async next() {
              if (i < chunks.length) return { value: chunks[i++], done: false };
              return { value: undefined, done: true };
            },
          };
        },
      };
      const result = await readRequestBody(req);
      expect(result.body).toBe('{"url":"https://x.com"}');
      expect(result.error).toBeUndefined();
    });

    it('returns { error } when stream throws', async () => {
      const req = {
        [Symbol.asyncIterator]() {
          return {
            async next() {
              throw new Error('Stream broken');
            },
          };
        },
      };
      const result = await readRequestBody(req);
      expect(result.error).toBe('Failed to read body');
      expect(result.body).toBeUndefined();
    });
  });

  describe('POST /bookmarks when readBody returns error', () => {
    it('returns 400 with error message', async () => {
      const receiverWithFakeRead = createBookmarksReceiver({
        getPreference: jest.fn(),
        setPreference: jest.fn(),
        readBody: () => Promise.resolve({ error: 'Failed to read body' }),
      });
      await receiverWithFakeRead.start(0);
      const port2 = receiverWithFakeRead.getPort();
      const res = await request(port2, { body: { url: 'https://x.com' } });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toBe('Failed to read body');
      await receiverWithFakeRead.stop();
    });
  });

  describe('stop when server already null', () => {
    it('resolves without throwing when stop() called twice', async () => {
      await receiver.stop();
      receiver = null;
      const r = createBookmarksReceiver({ getPreference: jest.fn(), setPreference: jest.fn() });
      await r.start(0);
      await r.stop();
      await expect(r.stop()).resolves.toBeUndefined();
    });
  });

  describe('stop', () => {
    it('closes the server', async () => {
      const p = port;
      await receiver.stop();
      receiver = null;
      await expect(request(p, { method: 'OPTIONS' })).rejects.toThrow();
    });
  });
});
