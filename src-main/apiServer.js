const http = require('http');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Create an HTTP API server that accepts POST /api with JSON body { method, params }.
 * @param {number} port
 * @param {(method: string, params: any[]) => Promise<any>} invoke - runs the API method and returns the result
 * @returns {{ server: import('http').Server; start: () => void; stop: () => void }}
 */
function createApiServer(port, invoke) {
  const server = http.createServer(async (req, res) => {
    const setCors = () => {
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    };
    setCors();
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method !== 'POST' || req.url !== '/api') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Not found. Use POST /api with { method, params }.' }));
      return;
    }
    let body = '';
    try {
      for await (const chunk of req) body += chunk;
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Failed to read body' }));
      return;
    }
    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
      return;
    }
    const method = typeof payload.method === 'string' ? payload.method.trim() : '';
    const params = Array.isArray(payload.params) ? payload.params : [];
    if (!method) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Missing or invalid "method"' }));
      return;
    }
    try {
      const result = await invoke(method, params);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result }));
    } catch (e) {
      const message = e && (e.message || e.toString && e.toString());
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: message || 'Unknown error' }));
    }
  });

  return {
    server,
    start() {
      server.listen(port, '127.0.0.1', () => {});
    },
    stop() {
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}

module.exports = { createApiServer };
