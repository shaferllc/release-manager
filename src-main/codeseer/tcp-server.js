/**
 * CodeSeer TCP server: accepts NDJSON payloads from PHP and forwards to renderer via IPC.
 */
const net = require('net');
const messageStore = require('./message-store');

const DEFAULT_PORT = 23523;
let server = null;
let port = DEFAULT_PORT;
let getWindows = null;

function start(getWindowsFn, onPort) {
  if (server) return;
  getWindows = getWindowsFn || (() => []);
  port = typeof onPort === 'number' ? onPort : DEFAULT_PORT;

  server = net.createServer((socket) => {
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
          messageStore.add(msg);
          const windows = getWindows();
          for (const win of windows) {
            if (win && !win.isDestroyed()) win.webContents.send('codeseer-message', msg);
          }
        } catch (_e) {
          // ignore malformed line
        }
      }
    });
    socket.on('error', () => {});
  });

  server.listen(port, '127.0.0.1', () => {
    const windows = getWindows();
    for (const win of windows) {
      if (win && !win.isDestroyed()) win.webContents.send('codeseer-server-ready', { port });
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[codeseer] Port ${port} is already in use.`);
    } else {
      console.error('[codeseer] TCP server error:', err);
    }
    const windows = getWindows();
    const payload = err.code === 'EADDRINUSE'
      ? { message: `Port ${port} is already in use`, code: 'EADDRINUSE' }
      : { message: err.message, code: err.code };
    for (const win of windows) {
      if (win && !win.isDestroyed()) win.webContents.send('codeseer-server-error', payload);
    }
  });
}

function stop() {
  if (server) {
    server.close();
    server = null;
  }
}

function getPort() {
  return server ? port : null;
}

module.exports = { start, stop, getPort };
