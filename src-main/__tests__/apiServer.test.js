const http = require('http');
const { createApiServer } = require('../apiServer');

function request(port, options) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: options.path ?? '/api',
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
    if (options.body !== undefined) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    req.end();
  });
}

describe('apiServer', () => {
  let server;
  let port;
  let invoke;

  beforeEach(() => {
    port = 0;
    invoke = jest.fn();
  });

  afterEach(async () => {
    if (server) await server.stop();
  });

  function startServer(onListen) {
    return new Promise((resolve) => {
      server = createApiServer(port, invoke);
      server.server.on('listening', () => {
        const a = server.server.address();
        port = a.port;
        if (onListen) onListen();
        resolve();
      });
      server.start();
    });
  }

  describe('createApiServer', () => {
    it('start() listens on given port', async () => {
      port = 0;
      server = createApiServer(port, invoke);
      server.server.on('listening', () => {
        const a = server.server.address();
        expect(a.port).toBeGreaterThan(0);
        expect(a.address).toBe('127.0.0.1');
      });
      server.start();
      await new Promise((r) => server.server.once('listening', r));
    });

    it('stop() closes the server', async () => {
      await startServer();
      await server.stop();
      server = null;
      await expect(request(port, { method: 'POST', body: '{}' })).rejects.toThrow();
    });
  });

  describe('OPTIONS', () => {
    it('returns 204 and CORS headers', async () => {
      await startServer();
      const res = await request(port, { method: 'OPTIONS', path: '/api' });
      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toMatch(/POST/);
    });
  });

  describe('non-POST or wrong path', () => {
    it('returns 404 for GET /api', async () => {
      await startServer();
      const res = await request(port, { method: 'GET', path: '/api' });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ ok: false, error: expect.stringContaining('POST /api') });
    });

    it('returns 404 for POST /other', async () => {
      await startServer();
      const res = await request(port, { method: 'POST', path: '/other', body: '{}' });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ ok: false, error: expect.stringContaining('POST /api') });
    });
  });

  describe('invalid request body', () => {
    it('returns 400 for invalid JSON', async () => {
      await startServer();
      const res = await request(port, { body: 'not json' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ ok: false, error: 'Invalid JSON' });
    });

    it('returns 400 for missing method', async () => {
      await startServer();
      const res = await request(port, { body: '{"params":[]}' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ ok: false, error: expect.stringMatching(/method/i) });
    });

    it('returns 400 for method not a string', async () => {
      await startServer();
      const res = await request(port, { body: '{"method":123,"params":[]}' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ ok: false, error: expect.stringMatching(/method/i) });
    });
  });

  describe('successful invoke', () => {
    it('returns 200 with result when invoke resolves', async () => {
      invoke.mockResolvedValue({ data: [1, 2, 3] });
      await startServer();
      const res = await request(port, { body: { method: 'getSomething', params: [] } });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, result: { data: [1, 2, 3] } });
      expect(invoke).toHaveBeenCalledWith('getSomething', []);
    });

    it('passes params to invoke', async () => {
      invoke.mockResolvedValue(null);
      await startServer();
      await request(port, {
        body: { method: 'setSomething', params: ['/path', { opt: true }] },
      });
      expect(invoke).toHaveBeenCalledWith('setSomething', ['/path', { opt: true }]);
    });

    it('trims method name', async () => {
      invoke.mockResolvedValue('ok');
      await startServer();
      const res = await request(port, { body: { method: '  getProjects  ', params: [] } });
      expect(res.status).toBe(200);
      expect(invoke).toHaveBeenCalledWith('getProjects', []);
    });

    it('uses empty array when params missing', async () => {
      invoke.mockResolvedValue([]);
      await startServer();
      await request(port, { body: { method: 'getProjects' } });
      expect(invoke).toHaveBeenCalledWith('getProjects', []);
    });
  });

  describe('invoke throws', () => {
    it('returns 200 with ok: false and error message', async () => {
      invoke.mockRejectedValue(new Error('Unknown method: x'));
      await startServer();
      const res = await request(port, { body: { method: 'x', params: [] } });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: false, error: 'Unknown method: x' });
    });

    it('handles error without message', async () => {
      invoke.mockRejectedValue({});
      await startServer();
      const res = await request(port, { body: { method: 'x', params: [] } });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(false);
      expect(typeof res.body.error).toBe('string');
    });
  });
});
