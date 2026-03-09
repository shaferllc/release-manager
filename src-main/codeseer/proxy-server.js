/**
 * CodeSeer HTTP + TCP proxy: API dashboard, ingest, export, SSE, WebSocket.
 * Optional; enable via codeseerProxyEnabled preference.
 */
const net = require('net');
const http = require('http');
const { WebSocketServer } = require('ws');
const messageStore = require('./message-store');

let PROXY_TCP_PORT = 23524;
let PROXY_HTTP_PORT = 23525;

let tcpServer = null;
let httpServer = null;
let wss = null;
let getWindows = null;
let getStatus = null;
let getAppInfo = null;

function forward(getWindowsFn, msg) {
  messageStore.add(msg);
  const windows = getWindowsFn ? getWindowsFn() : [];
  for (const w of windows) {
    if (w && !w.isDestroyed()) w.webContents.send('codeseer-message', msg);
  }
}

function sendJson(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(statusCode);
  res.end(JSON.stringify(data));
}

function parseQuery(url) {
  const i = url.indexOf('?');
  if (i === -1) return {};
  const q = {};
  const search = url.slice(i + 1);
  for (const part of search.split('&')) {
    const [k, v] = part.split('=').map((s) => decodeURIComponent((s || '').replace(/\+/g, ' ')));
    if (k) q[k] = v;
  }
  return q;
}

function normalizeGitHub(body) {
  try {
    const payload = typeof body === 'string' ? JSON.parse(body) : body;
    const action = payload.action || payload.ref_type;
    const repo = payload.repository && payload.repository.full_name;
    const text = [action, repo, payload.sender && payload.sender.login].filter(Boolean).join(' ');
    return [{
      type: 'log',
      meta: { time: new Date().toISOString(), label: 'github' },
      payload: { level: 'info', message: text || JSON.stringify(payload).slice(0, 500) },
    }];
  } catch {
    return [];
  }
}

function normalizeSentry(body) {
  try {
    const payload = typeof body === 'string' ? JSON.parse(body) : body;
    const event = payload.event || payload;
    const message = event.message || event.title || (event.exception && event.exception.values && event.exception.values[0] && event.exception.values[0].type) || 'Sentry event';
    return [{
      type: 'log',
      meta: { time: (event.timestamp && new Date(event.timestamp * 1000).toISOString()) || new Date().toISOString(), label: 'sentry' },
      payload: { level: 'error', message },
    }];
  } catch {
    return [];
  }
}

function normalizeSlack(body) {
  try {
    const payload = typeof body === 'string' ? JSON.parse(body) : body;
    const text = payload.text || payload.message || (payload.command && payload.text) || JSON.stringify(payload).slice(0, 300);
    return [{
      type: 'log',
      meta: { time: new Date().toISOString(), label: 'slack' },
      payload: { level: 'info', message: text },
    }];
  } catch {
    return [];
  }
}

function getDashboardHtml(query) {
  const embed = query.embed === '1' || query.embed === 'true';
  const autoLive = query.autoLive === '1' || query.autoLive === 'true';
  const base = 'http://127.0.0.1:' + PROXY_HTTP_PORT;
  const eventsUrl = base + '/events';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CodeSeer API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 1rem auto; padding: 0 1rem; background: #1a1a1a; color: #e0e0e0; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    a { color: #60a5fa; }
    section { margin: 1.5rem 0; }
    .status { font-size: 0.9rem; color: #9ca3af; }
    pre { background: #262626; padding: 0.75rem; border-radius: 6px; overflow-x: auto; font-size: 12px; }
    .live { margin-top: 0.5rem; }
    .msg { margin: 0.25rem 0; padding: 0.25rem 0; border-bottom: 1px solid #333; font-size: 12px; }
    button { background: #3b82f6; color: #fff; border: none; padding: 0.35rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 13px; }
    button:hover { background: #2563eb; }
    .endpoints { list-style: none; padding: 0; margin: 0.5rem 0; }
    .endpoints li { margin: 0.25rem 0; }
    .chrome { display: ${embed ? 'none' : 'block'}; }
  </style>
</head>
<body>
  <div class="chrome">
    <h1>CodeSeer HTTP API</h1>
    <p class="status">Base URL: <code>${base}</code></p>
    <section>
      <h2>Status</h2>
      <pre id="status">Loading…</pre>
    </section>
    <section>
      <h2>Endpoints</h2>
      <ul class="endpoints">
        <li><a href="/health" target="_blank">GET /health</a> – liveness</li>
        <li><a href="/version" target="_blank">GET /version</a> – app/API version</li>
        <li><a href="/status" target="_blank">GET /status</a> – ports and message count</li>
        <li><a href="/stats" target="_blank">GET /stats</a> – counts by type/screen</li>
        <li><a href="/screens" target="_blank">GET /screens</a> – screen names</li>
        <li><a href="/messages" target="_blank">GET /messages</a> – recent (?limit=, screen=, type=)</li>
        <li><a href="/messages/search?q=test" target="_blank">GET /messages/search</a> – full-text ?q=</li>
        <li><a href="/messages/types" target="_blank">GET /messages/types</a> – distinct types</li>
        <li><a href="/messages/latest" target="_blank">GET /messages/latest</a> – latest (?perScreen=1)</li>
        <li><a href="/export" target="_blank">GET /export</a> – export (?format=ndjson, since=)</li>
        <li><a href="/events" target="_blank">GET /events</a> – SSE (?screen=, types=)</li>
        <li>POST / – send message(s); POST /notify – one log message</li>
        <li>POST /clear, POST /clear-all; POST /import – array of messages</li>
        <li>POST /from/github, /from/sentry, /from/slack, /from/custom – webhooks</li>
      </ul>
    </section>
    <section>
      <h2>Recent messages</h2>
      <button type="button" id="refresh">Refresh</button>
      <pre id="messages">Loading…</pre>
    </section>
    <section>
      <h2>Live stream</h2>
      <button type="button" id="toggleLive">${autoLive ? 'Stop live' : 'Start live'}</button>
      <div id="live" class="live"></div>
    </section>
  </div>
  <script>
    const base = '${base}';
    const eventsUrl = '${eventsUrl}';
    const autoLive = ${autoLive ? 'true' : 'false'};
    fetch(base + '/status').then(r => r.json()).then(d => {
      const el = document.getElementById('status');
      if (el) el.textContent = JSON.stringify(d, null, 2);
    }).catch(e => { const el = document.getElementById('status'); if (el) el.textContent = 'Error: ' + e.message; });
    function loadMessages() {
      fetch(base + '/messages?limit=20').then(r => r.json()).then(d => {
        const el = document.getElementById('messages');
        if (el) el.textContent = JSON.stringify(d, null, 2);
      }).catch(e => { const el = document.getElementById('messages'); if (el) el.textContent = 'Error: ' + e.message; });
    }
    loadMessages();
    const refreshEl = document.getElementById('refresh');
    if (refreshEl) refreshEl.onclick = loadMessages;
    let evtSource = null;
    function startLive() {
      if (evtSource) return;
      const el = document.getElementById('live');
      if (el) el.innerHTML = '';
      evtSource = new EventSource(eventsUrl);
      evtSource.onmessage = function(e) {
        const msg = JSON.parse(e.data);
        const div = document.createElement('div');
        div.className = 'msg';
        div.textContent = (msg.type || '') + ' – ' + (msg.meta && msg.meta.time || '') + ' – ' + JSON.stringify(msg.payload || msg).slice(0, 120);
        if (el) { el.appendChild(div); el.scrollTop = el.scrollHeight; }
      };
      evtSource.onerror = function() { evtSource.close(); evtSource = null; const b = document.getElementById('toggleLive'); if (b) b.textContent = 'Start live'; };
    }
    function stopLive() {
      if (evtSource) { evtSource.close(); evtSource = null; }
      const b = document.getElementById('toggleLive'); if (b) b.textContent = 'Start live';
    }
    if (autoLive) startLive();
    const toggleEl = document.getElementById('toggleLive');
    if (toggleEl) toggleEl.onclick = function() {
      if (evtSource) { stopLive(); return; }
      this.textContent = 'Stop live';
      startLive();
    };
  </script>
</body>
</html>
`;
}

function handleHttpGet(path, query, res) {
  if (path === '/' || path === '' || path === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getDashboardHtml(query));
    return;
  }
  if (path === '/open') {
    res.writeHead(302, { Location: '/' });
    res.end();
    return;
  }
  if (path === '/health') {
    return sendJson(res, 200, { ok: true, store: true });
  }
  if (path === '/version') {
    const info = getAppInfo ? getAppInfo() : {};
    return sendJson(res, 200, { version: info.version || '0.1.0', api: '1.0' });
  }
  if (path === '/status') {
    const status = getStatus ? getStatus() : {};
    const payload = {
      mainPort: status.mainPort ?? 23523,
      proxyTcp: PROXY_TCP_PORT,
      proxyHttp: PROXY_HTTP_PORT,
      messageCount: messageStore.getCount(),
      version: status.version ?? null,
    };
    return sendJson(res, 200, payload);
  }
  if (path === '/stats') {
    return sendJson(res, 200, messageStore.getStats());
  }
  if (path === '/screens') {
    const withCount = query.count === '1' || query.count === 'true';
    const list = messageStore.getScreens(withCount);
    return sendJson(res, 200, withCount ? { screens: list } : { screens: list });
  }
  if (path === '/messages') {
    const messages = messageStore.getMessages({
      limit: query.limit,
      screen: query.screen,
      type: query.type,
      since: query.since,
    });
    return sendJson(res, 200, { messages, count: messages.length });
  }
  if (path === '/messages/search') {
    const messages = messageStore.search(query.q, { limit: query.limit, screen: query.screen, type: query.type });
    return sendJson(res, 200, { messages, count: messages.length });
  }
  if (path === '/messages/types') {
    return sendJson(res, 200, { types: messageStore.getTypes() });
  }
  if (path === '/messages/latest') {
    const latest = messageStore.getLatest({ perScreen: query.perScreen, screen: query.screen });
    return sendJson(res, 200, { message: latest });
  }
  if (path === '/export') {
    const limit = Math.min(parseInt(query.limit, 10) || 100, 500);
    const since = query.since || null;
    const messages = messageStore.getMessages({ limit, since });
    if (query.format === 'ndjson') {
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Content-Disposition', 'attachment; filename="codeseer-export.ndjson"');
      res.writeHead(200);
      for (const m of messages) res.write(JSON.stringify(m) + '\n');
      res.end();
      return;
    }
    return sendJson(res, 200, { messages, count: messages.length });
  }
  if (path === '/events') {
    const screenFilter = query.screen !== undefined && query.screen !== '' ? String(query.screen) : null;
    const typesFilter = query.types ? String(query.types).split(',').map((t) => t.trim()).filter(Boolean) : null;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.flushHeaders?.();
    const unsub = messageStore.subscribe((msg) => {
      try {
        const screen = (msg.meta && msg.meta.screen != null) ? String(msg.meta.screen) : (msg.screen != null ? String(msg.screen) : '');
        if (screenFilter !== null && screen !== screenFilter) return;
        if (typesFilter !== null && typesFilter.length && !typesFilter.includes(msg.type)) return;
        res.write(`data: ${JSON.stringify(msg)}\n\n`);
        res.flushHeaders?.();
      } catch (_) {}
    });
    res.on('close', () => unsub());
    return;
  }
  res.writeHead(404);
  res.end();
}

function handleHttpPost(path, req, res, body) {
  if (path === '/' || path === '') {
    try {
      const data = JSON.parse(body || '{}');
      const messages = Array.isArray(data) ? data : [data];
      for (const msg of messages) {
        if (msg && typeof msg === 'object') forward(getWindows, msg);
      }
      return sendJson(res, 200, { ok: true, received: messages.length });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
  }
  if (path === '/notify') {
    try {
      const data = JSON.parse(body || '{}');
      const text = data.message || data.text || '';
      forward(getWindows, {
        type: 'log',
        meta: { time: new Date().toISOString() },
        payload: { level: 'info', message: String(text) },
      });
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
  }
  if (path === '/clear') {
    const windows = getWindows ? getWindows() : [];
    for (const w of windows) { if (w && !w.isDestroyed()) w.webContents.send('codeseer-clear-request'); }
    return sendJson(res, 200, { ok: true });
  }
  if (path === '/clear-all') {
    const windows = getWindows ? getWindows() : [];
    for (const w of windows) { if (w && !w.isDestroyed()) w.webContents.send('codeseer-clear-request'); }
    messageStore.clear();
    return sendJson(res, 200, { ok: true });
  }
  if (path === '/import') {
    try {
      let list;
      const raw = (body || '').trim();
      if (raw.startsWith('[')) {
        list = JSON.parse(body);
      } else {
        list = raw.split('\n').filter(Boolean).map((line) => {
          try { return JSON.parse(line); } catch { return null; }
        }).filter(Boolean);
      }
      const n = messageStore.importMessages(list);
      if (n > 0) {
        const msgs = messageStore.getMessages({ limit: n });
        const windows = getWindows ? getWindows() : [];
        for (const w of windows) {
          if (w && !w.isDestroyed()) for (const msg of msgs) w.webContents.send('codeseer-message', msg);
        }
      }
      return sendJson(res, 200, { ok: true, imported: n });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON or NDJSON' });
    }
  }
  if (path === '/from/github') {
    const msgs = normalizeGitHub(body || '{}');
    for (const msg of msgs) forward(getWindows, msg);
    return sendJson(res, 200, { ok: true, received: msgs.length });
  }
  if (path === '/from/sentry') {
    const msgs = normalizeSentry(body || '{}');
    for (const msg of msgs) forward(getWindows, msg);
    return sendJson(res, 200, { ok: true, received: msgs.length });
  }
  if (path === '/from/slack') {
    const msgs = normalizeSlack(body || '{}');
    for (const msg of msgs) forward(getWindows, msg);
    return sendJson(res, 200, { ok: true, received: msgs.length });
  }
  if (path === '/from/custom') {
    try {
      const data = JSON.parse(body || '{}');
      const type = data.type || 'log';
      const payload = data.payload || data;
      forward(getWindows, { type, meta: { time: new Date().toISOString() }, payload });
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
  }
  res.writeHead(404);
  res.end();
}

function start(getWindowsFn, getStatusFn, getAppInfoFn, opts = {}) {
  if (tcpServer || httpServer) return;
  PROXY_TCP_PORT = opts.tcpPort != null ? opts.tcpPort : (parseInt(process.env.CODESEER_PROXY_TCP_PORT, 10) || 23524);
  PROXY_HTTP_PORT = opts.httpPort != null ? opts.httpPort : (parseInt(process.env.CODESEER_PROXY_HTTP_PORT, 10) || 23525);
  getWindows = getWindowsFn || null;
  getStatus = getStatusFn || null;
  getAppInfo = getAppInfoFn || null;

  tcpServer = net.createServer((socket) => {
    let buffer = '';
    socket.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const msg = JSON.parse(trimmed);
          forward(getWindows, msg);
        } catch (_e) {
          // ignore malformed line
        }
      }
    });
    socket.on('error', () => {});
  });

  let tcpReady = false;
  let httpReady = false;
  const maybeSendReady = () => {
    if (tcpReady && httpReady && getWindows) {
      const windows = getWindows();
      const payload = { tcp: PROXY_TCP_PORT, http: PROXY_HTTP_PORT };
      for (const w of windows) {
        if (w && !w.isDestroyed()) w.webContents.send('codeseer-proxy-ready', payload);
      }
    }
  };

  tcpServer.listen(PROXY_TCP_PORT, '127.0.0.1', () => {
    tcpReady = true;
    maybeSendReady();
  });

  tcpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && getWindows) {
      const windows = getWindows();
      const payload = { message: `Proxy TCP port ${PROXY_TCP_PORT} in use`, code: err.code };
      for (const w of windows) {
        if (w && !w.isDestroyed()) w.webContents.send('codeseer-proxy-error', payload);
      }
    }
  });

  const applyCors = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  };

  httpServer = http.createServer((req, res) => {
    const url = req.url || '';
    const [pathname, search] = url.split('?');
    const path = (pathname || '/').replace(/\/$/, '') || '/';
    const query = parseQuery(url);

    applyCors(res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'GET') {
      return handleHttpGet(path, query, res);
    }
    if (req.method === 'POST') {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        handleHttpPost(path, req, res, body);
      });
      req.on('error', () => {
        res.writeHead(500);
        res.end();
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  wss = new WebSocketServer({ noServer: true });
  wss.on('connection', (ws) => {
    const unsub = messageStore.subscribe((msg) => {
      try {
        if (ws.readyState === 1) ws.send(JSON.stringify(msg));
      } catch (_) {}
    });
    ws.on('close', () => unsub());
  });

  httpServer.on('upgrade', (req, socket, head) => {
    const url = req.url || '';
    const pathname = url.split('?')[0];
    const path = (pathname || '/').replace(/\/$/, '') || '/';
    if (path !== '/ws') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  httpServer.listen(PROXY_HTTP_PORT, '127.0.0.1', () => {
    httpReady = true;
    maybeSendReady();
  });

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && getWindows) {
      const windows = getWindows();
      const payload = { message: `Proxy HTTP port ${PROXY_HTTP_PORT} in use`, code: err.code };
      for (const w of windows) {
        if (w && !w.isDestroyed()) w.webContents.send('codeseer-proxy-error', payload);
      }
    }
  });
}

function stop() {
  if (wss) {
    wss.close();
    wss = null;
  }
  if (tcpServer) {
    tcpServer.close();
    tcpServer = null;
  }
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
  getWindows = null;
  getStatus = null;
  getAppInfo = null;
}

function getPorts() {
  const listening = !!(tcpServer && httpServer);
  return listening ? { tcp: PROXY_TCP_PORT, http: PROXY_HTTP_PORT, listening: true } : { tcp: PROXY_TCP_PORT, http: PROXY_HTTP_PORT, listening: false };
}

module.exports = { start, stop, getPorts };
