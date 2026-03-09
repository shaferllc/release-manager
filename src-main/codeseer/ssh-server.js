/**
 * SSH server (Node.js via ssh2 package).
 * Accepts NDJSON payloads (same protocol as TCP server).
 * When enabled, clients can connect and send one JSON message per line over shell or exec.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let Server = null;
let ssh2LoadError = null;
try {
  Server = require('ssh2').Server;
} catch (err) {
  ssh2LoadError = err;
  console.warn('[codeseer] SSH: ssh2 package failed to load. Run: npm install ssh2 && npx electron-rebuild', err.message);
}

const messageStore = require('./message-store');

const DEFAULT_PORT = 23526;
const HOST_KEY_FILENAME = 'codeseer-ssh-host-key.pem';

let server = null;
let port = DEFAULT_PORT;
let getWindows = null;
let keysDir = null;

function getOrCreateHostKey(appUserData) {
  keysDir = keysDir || appUserData;
  const keyPath = path.join(keysDir, HOST_KEY_FILENAME);
  try {
    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath, 'utf8');
    }
    const { privateKey } = crypto.generateKeyPairSync('ed25519', {
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    fs.mkdirSync(keysDir, { recursive: true });
    fs.writeFileSync(keyPath, privateKey, { mode: 0o600 });
    return privateKey;
  } catch (err) {
    console.error('[codeseer] SSH: failed to get or create host key:', err.message);
    return null;
  }
}

function parseLinesAndForward(buffer, getWindowsFn) {
  const lines = buffer.split('\n');
  let remainder = lines.pop() || '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const msg = JSON.parse(trimmed);
      messageStore.add(msg);
      const windows = getWindowsFn();
      for (const win of windows) {
        if (win && !win.isDestroyed()) win.webContents.send('codeseer-message', msg);
      }
    } catch (_) {
      // ignore malformed line
    }
  }
  return remainder;
}

function start(getWindowsFn, appUserData, onPort) {
  if (server) return;
  if (!Server || !getWindowsFn) return;
  getWindows = getWindowsFn;
  const requestedPort = typeof onPort === 'number' && onPort >= 1024 && onPort <= 65535 ? onPort : DEFAULT_PORT;
  port = requestedPort;

  const hostKeyPem = appUserData ? getOrCreateHostKey(appUserData) : null;
  if (!hostKeyPem) return;

  server = new Server(
    {
      hostKeys: [hostKeyPem],
      greeting: 'CodeSeer SSH (NDJSON). Send one JSON message per line.',
    },
    (client) => {
      client.on('authentication', (ctx) => {
        ctx.accept();
      }).on('ready', () => {
        client.on('session', (accept, reject) => {
          const session = accept();
          session.on('shell', (acceptShell, rejectShell) => {
            const stream = acceptShell();
            let buffer = '';
            stream.on('data', (data) => {
              buffer += data.toString();
              buffer = parseLinesAndForward(buffer, getWindows);
            });
            stream.stderr.on('data', () => {});
          });
          session.on('exec', (acceptExec, rejectExec) => {
            const stream = acceptExec();
            let buffer = '';
            stream.on('data', (data) => {
              buffer += data.toString();
              buffer = parseLinesAndForward(buffer, getWindows);
            });
            stream.stderr.on('data', () => {});
          });
        });
      }).on('close', () => {});
      client.on('error', () => {});
    }
  );

  server.listen(port, '127.0.0.1', () => {
    const windows = getWindows();
    for (const win of windows) {
      if (win && !win.isDestroyed()) win.webContents.send('codeseer-ssh-ready', { port });
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[codeseer] SSH: port ${port} is already in use.`);
    } else {
      console.error('[codeseer] SSH server error:', err.message);
    }
    const windows = getWindows();
    const payload = err.code === 'EADDRINUSE'
      ? { message: `SSH port ${port} is already in use`, code: 'EADDRINUSE' }
      : { message: err.message, code: err.code };
    for (const win of windows) {
      if (win && !win.isDestroyed()) win.webContents.send('codeseer-ssh-error', payload);
    }
  });
}

function stop() {
  if (server) {
    try {
      server.close();
    } catch (_) {}
    server = null;
  }
}

function getPort() {
  return server ? port : null;
}

function noop() {}

module.exports = Server
  ? { start, stop, getPort, available: true, getLoadError: () => ssh2LoadError?.message ?? null }
  : { start: noop, stop: noop, getPort: () => null, available: false, getLoadError: () => ssh2LoadError?.message ?? null };
