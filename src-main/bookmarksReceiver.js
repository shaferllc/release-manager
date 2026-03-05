const http = require('http');

const BOOKMARKS_PREF_PREFIX = 'ext.bookmarks.';
const DEFAULT_PORT = 3848;

/**
 * Read request body stream. Returns { body } or { error }.
 * Exported for tests.
 */
async function readRequestBody(req) {
  let body = '';
  try {
    for await (const chunk of req) body += chunk;
    return { body };
  } catch (e) {
    return { error: 'Failed to read body' };
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Create a small HTTP server that accepts POST /bookmarks to add a bookmark to the currently selected project.
 * Used by the browser extension to send the current page URL/title.
 * @param {{ getPreference: (key: string) => any, setPreference: (key: string, value: any) => void; readBody?: (req: import('http').IncomingMessage) => Promise<{ body: string } | { error: string }> }} prefs
 * @returns {{ server: import('http').Server; start: (port?: number) => void; stop: () => Promise<void>; getPort: () => number }}
 */
function createBookmarksReceiver(prefs) {
  const { getPreference, setPreference } = prefs;
  const readBody = prefs.readBody || readRequestBody;
  let server = null;
  let port = DEFAULT_PORT;

  const requestListener = async (req, res) => {
    const setCors = () => {
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    };
    setCors();
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'POST' || (req.url !== '/bookmarks' && req.url !== '/bookmarks/')) {
      res.writeHead(404);
      res.end(JSON.stringify({ ok: false, error: 'Not found. Use POST /bookmarks with JSON body { title?, url, folder?, tags? }.' }));
      return;
    }

    const bodyResult = await readBody(req);
    if (bodyResult.error) {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, error: bodyResult.error }));
      return;
    }
    const body = bodyResult.body;

    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
      return;
    }

    const url = typeof payload.url === 'string' ? payload.url.trim() : '';
    if (!url) {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, error: 'Missing or empty "url"' }));
      return;
    }

    const projectPath = getPreference('selectedProjectPath');
    if (!projectPath || typeof projectPath !== 'string') {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: false, error: 'No project selected in Release Manager. Select a project in the app first.' }));
      return;
    }

    const key = `${BOOKMARKS_PREF_PREFIX}${encodeURIComponent(projectPath)}`;
    let data;
    try {
      const raw = getPreference(key);
      data = raw && typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      data = {};
    }
    const bookmarks = Array.isArray(data?.bookmarks) ? data.bookmarks : [];

    const title = typeof payload.title === 'string' ? payload.title.trim() : undefined;
    const folder = typeof payload.folder === 'string' ? payload.folder.trim() || undefined : undefined;
    let tags = payload.tags;
    if (Array.isArray(tags)) tags = tags.filter((t) => typeof t === 'string').map((t) => t.trim()).filter(Boolean);
    else if (typeof tags === 'string') tags = tags.split(',').map((t) => t.trim()).filter(Boolean);
    else tags = undefined;

    const newBookmark = {
      id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: title || undefined,
      url,
      folder,
      tags: tags && tags.length ? tags : undefined,
      notes: undefined,
      createdAt: new Date().toISOString(),
    };
    bookmarks.push(newBookmark);
    setPreference(key, JSON.stringify({ bookmarks }));

    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, message: 'Bookmark added to current project.' }));
  };

  const httpServer = http.createServer(requestListener);

  return {
    server: httpServer,
    getPort: () => port,
    start(portOverride) {
      const p = portOverride ?? getPreference('bookmarksReceiverPort') ?? DEFAULT_PORT;
      port = Number(p) === 0 ? 0 : (Number(p) || DEFAULT_PORT);
      if (server) return;
      server = httpServer;
      return new Promise((resolve) => {
        server.listen(port, '127.0.0.1', () => {
          if (port === 0 && server) port = server.address().port;
          resolve();
        });
      });
    },
    stop() {
      return new Promise((resolve) => {
        if (!server) {
          resolve();
          return;
        }
        server.close(() => {
          server = null;
          resolve();
        });
      });
    },
  };
}

module.exports = {
  createBookmarksReceiver,
  DEFAULT_BOOKMARKS_RECEIVER_PORT: DEFAULT_PORT,
  readRequestBody,
};
