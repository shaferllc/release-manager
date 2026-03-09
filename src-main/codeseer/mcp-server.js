/**
 * MCP (Model Context Protocol) server for CodeSeer.
 * Exposes debugging data to MCP clients (Cursor, etc.) via JSON-RPC over HTTP.
 */
const http = require('http');

const LOG_PREFIX = '[codeseer MCP]';
let onActivityCallback = null;

const PROTOCOL_VERSION = '2024-11-05';
const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 500;

let server = null;
let messageStore = null;
let limitPayload = DEFAULT_LIMIT;
let onConfettiCallback = null;

function log(level, ...args) {
  const fn = level === 'error' ? console.error : console.log;
  fn(LOG_PREFIX, ...args);
  if (onActivityCallback && typeof onActivityCallback === 'function') {
    const text = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    onActivityCallback({ level, text, time: new Date().toISOString() });
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : null);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function jsonRpcError(id, code, message, data) {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function textContent(text) {
  return { type: 'text', text: typeof text === 'string' ? text : JSON.stringify(text, null, 2) };
}

function handleInitialize(id) {
  return jsonRpcResult(id, {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: { tools: {} },
    serverInfo: {
      name: 'codeseer',
      version: '0.2.0',
      title: 'CodeSeer MCP',
      description: 'Debugging data from CodeSeer (dumps, logs, traces).',
    },
    instructions: 'Use get_dumps, get_logs, get_traces to retrieve data. Use search to find messages. Use clear_all to clear.',
  });
}

function getLimit(args) {
  const n = args && args.limit != null ? parseInt(args.limit, 10) : limitPayload;
  return Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(n) ? n : limitPayload));
}

function handleToolsList(id) {
  const tools = [
    { name: 'get_logs', description: 'Get all logs.', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
    { name: 'get_dumps', description: 'Get all dumps.', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
    { name: 'get_traces', description: 'Get traces.', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
    { name: 'get_queries', description: 'Get SQL queries.', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
    { name: 'get_project_info', description: 'Get stats, types, screens.' },
    { name: 'search', description: 'Search messages by text.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] } },
    { name: 'summarize_logs', description: 'Summarize recent logs.', inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
    { name: 'clear_all', description: 'Clear all messages.' },
    { name: 'confetti', description: 'Trigger confetti animation.' },
  ];
  return jsonRpcResult(id, { tools });
}

async function handleToolsCall(id, params, store) {
  if (!params || typeof params.name !== 'string') {
    return jsonRpcError(id, -32602, 'Invalid params: name required');
  }
  const name = params.name;
  const args = params.arguments && typeof params.arguments === 'object' ? params.arguments : {};
  const limit = getLimit(args);

  try {
    switch (name) {
      case 'get_dumps': {
        const msgs = store.getMessages({ type: 'dump', limit });
        return jsonRpcResult(id, { content: [textContent(msgs)] });
      }
      case 'get_logs': {
        const msgs = store.getMessages({ type: 'log', limit });
        return jsonRpcResult(id, { content: [textContent(msgs)] });
      }
      case 'get_traces': {
        const msgs = store.getMessages({ type: 'trace', limit });
        return jsonRpcResult(id, { content: [textContent(msgs)] });
      }
      case 'get_queries': {
        const msgs = store.getMessages({ type: 'query', limit });
        return jsonRpcResult(id, { content: [textContent(msgs)] });
      }
      case 'get_project_info': {
        const stats = store.getStats();
        const types = store.getTypes();
        const screens = store.getScreens(true);
        return jsonRpcResult(id, { content: [textContent({ stats, types, screens })] });
      }
      case 'summarize_logs': {
        const n = Math.min(limit, 100);
        const msgs = store.getMessages({ type: 'log', limit: n });
        const summary = msgs.map((m) => ({
          time: m.meta?.time,
          level: m.payload?.level,
          message: m.payload?.message ?? (typeof m.payload === 'object' ? JSON.stringify(m.payload) : String(m.payload)),
        }));
        return jsonRpcResult(id, { content: [textContent(summary)] });
      }
      case 'clear_all':
        store.clear();
        return jsonRpcResult(id, { content: [textContent('All messages cleared.')] });
      case 'search': {
        const q = args.query;
        if (!q || typeof q !== 'string') return jsonRpcError(id, -32602, 'search requires "query" string');
        const results = store.search(q, { limit: getLimit(args) });
        return jsonRpcResult(id, { content: [textContent(results)] });
      }
      case 'confetti':
        if (typeof onConfettiCallback === 'function') onConfettiCallback();
        return jsonRpcResult(id, { content: [textContent('Confetti triggered.')] });
      default:
        return jsonRpcError(id, -32601, `Unknown tool: ${name}`);
    }
  } catch (err) {
    log('error', `tools/call: ${name} failed`, err.message || err);
    return jsonRpcError(id, -32603, err.message || 'Internal error');
  }
}

async function handleRequest(req, res, body) {
  const url = req.url || '/';
  const pathname = url.split('?')[0];

  if (req.method === 'GET' && (pathname === '/mcp' || pathname === '/sse')) {
    const accept = (req.headers.accept || '').toLowerCase();
    if (accept.includes('text/event-stream')) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write('event: endpoint\ndata: ' + JSON.stringify({ url: `http://127.0.0.1:${server?.address()?.port || 3000}${pathname}` }) + '\n\n');
      res.end();
      return;
    }
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Use POST for JSON-RPC or GET with Accept: text/event-stream for SSE.' }));
    return;
  }

  if (req.method === 'POST' && (pathname === '/mcp' || pathname === '/sse')) {
    let msg = body;
    if (msg == null) {
      try {
        msg = await parseBody(req);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(jsonRpcError(null, -32700, 'Parse error')));
        return;
      }
    }
    if (!msg || msg.jsonrpc !== '2.0' || !msg.method) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(jsonRpcError(msg?.id, -32600, 'Invalid Request')));
      return;
    }

    let result;
    switch (msg.method) {
      case 'initialize':
        result = handleInitialize(msg.id);
        break;
      case 'tools/list':
        result = handleToolsList(msg.id);
        break;
      case 'tools/call':
        result = await handleToolsCall(msg.id, msg.params, messageStore);
        break;
      case 'notifications/initialized':
        result = null;
        break;
      default:
        result = jsonRpcError(msg.id, -32601, `Method not found: ${msg.method}`);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(result != null ? JSON.stringify(result) : '');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found. Use POST or GET on /mcp or /sse.' }));
}

function start(store, port, limit, options = {}) {
  if (server) return Promise.resolve(server.address());
  messageStore = store;
  limitPayload = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(limit) ? limit : DEFAULT_LIMIT));
  onConfettiCallback = options.onConfetti ?? null;
  onActivityCallback = options.onActivity ?? null;

  return new Promise((resolve, reject) => {
    server = http.createServer(async (req, res) => {
      try {
        await handleRequest(req, res, null);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(jsonRpcError(null, -32603, err.message || 'Internal error')));
      }
    });
    server.on('error', (err) => reject(err));
    server.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      log('info', `listening on http://127.0.0.1:${addr.port} (/mcp and /sse)`);
      resolve(addr);
    });
  });
}

function stop() {
  if (!server) return Promise.resolve();
  return new Promise((resolve) => {
    server.close(() => {
      server = null;
      messageStore = null;
      onConfettiCallback = null;
      onActivityCallback = null;
      resolve();
    });
  });
}

function getPort() {
  try {
    return server && server.listening ? server.address().port : null;
  } catch {
    return null;
  }
}

module.exports = {
  start,
  stop,
  getPort,
  PROTOCOL_VERSION,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
