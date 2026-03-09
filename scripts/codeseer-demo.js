#!/usr/bin/env node
/**
 * CodeSeer demo – sends sample NDJSON to the TCP port (no PHP required).
 * Usage:
 *   node scripts/codeseer-demo.js --list           # Output JSON list of demos
 *   node scripts/codeseer-demo.js --demo=<id>       # Run a single demo by id
 *
 * Ensure Release Manager (or CodeSeer) is running with TCP server on port 23523.
 */
const net = require('net');

const PORT = parseInt(process.env.CODESEER_PORT || '23523', 10);
const HOST = process.env.CODESEER_HOST || '127.0.0.1';

const DEMOS = [
  { id: 'log_basic', name: 'Basic log', description: 'Simple log message' },
  { id: 'log_levels', name: 'Log levels', description: 'Info, warn, error' },
  { id: 'dump', name: 'Dump object', description: 'Object dump' },
  { id: 'table', name: 'Table', description: 'Tabular data' },
  { id: 'trace', name: 'Trace', description: 'Stack trace' },
  { id: 'json', name: 'JSON', description: 'Pretty JSON' },
  { id: 'html', name: 'HTML', description: 'Rendered HTML' },
  { id: 'multiple', name: 'Multiple', description: 'Several messages at once' },
];

function sendLine(socket, obj) {
  socket.write(JSON.stringify(obj) + '\n');
}

function runDemo(socket, id) {
  const now = new Date().toISOString();
  const meta = (t) => ({ time: t || now });

  switch (id) {
    case 'log_basic':
      sendLine(socket, { type: 'log', meta: meta(), payload: { level: 'info', message: 'Hello from demo!' } });
      break;
    case 'log_levels':
      sendLine(socket, { type: 'log', meta: meta(), payload: { level: 'info', message: 'Info message' } });
      sendLine(socket, { type: 'log', meta: meta(), payload: { level: 'warn', message: 'Warning message' } });
      sendLine(socket, { type: 'log', meta: meta(), payload: { level: 'error', message: 'Error message' } });
      break;
    case 'dump':
      sendLine(socket, { type: 'dump', meta: meta(), payload: { key: 'value', nested: { a: 1, b: 2 }, items: [1, 2, 3] } });
      break;
    case 'table':
      sendLine(socket, {
        type: 'table',
        meta: meta(),
        payload: {
          headers: ['ID', 'Name', 'Role'],
          rows: [
            [1, 'Alice', 'Admin'],
            [2, 'Bob', 'User'],
            [3, 'Carol', 'Editor'],
          ],
        },
      });
      break;
    case 'trace':
      sendLine(socket, {
        type: 'trace',
        meta: meta(),
        payload: {
          message: 'Demo trace',
          frames: [
            { file: '/demo/script.js', line: 42, function: 'runDemo' },
            { file: '/demo/main.js', line: 10, function: 'main' },
          ],
        },
      });
      break;
    case 'json':
      sendLine(socket, { type: 'json', meta: meta(), payload: { data: { name: 'CodeSeer', version: '1.0', features: ['TCP', 'HTTP'] } } });
      break;
    case 'html':
      sendLine(socket, { type: 'html', meta: meta(), payload: { html: '<p>Hello <strong>world</strong></p>' } });
      break;
    case 'multiple':
      sendLine(socket, { type: 'log', meta: meta(), payload: { level: 'info', message: 'First' } });
      sendLine(socket, { type: 'log', meta: meta(), payload: { level: 'info', message: 'Second' } });
      sendLine(socket, { type: 'dump', meta: meta(), payload: { count: 3 } });
      break;
    default:
      sendLine(socket, { type: 'log', meta: meta(), payload: { level: 'info', message: `Unknown demo: ${id}` } });
  }
}

function main() {
  const listOnly = process.argv.includes('--list');
  let demoId = null;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--demo=')) {
      demoId = arg.slice(7);
      break;
    }
  }

  if (listOnly) {
    console.log(JSON.stringify(DEMOS.map((d) => ({ id: d.id, name: d.name, description: d.description }))));
    process.exit(0);
    return;
  }

  if (!demoId) {
    console.error('Usage: node codeseer-demo.js --list | --demo=<id>');
    process.exit(1);
  }

  const demo = DEMOS.find((d) => d.id === demoId);
  if (!demo) {
    console.error(`Unknown demo: ${demoId}`);
    process.exit(1);
  }

  const socket = net.connect(PORT, HOST, () => {
    runDemo(socket, demoId);
    socket.end();
  });

  socket.on('error', (err) => {
    console.error(`Connection failed: ${err.message}. Is the app running on port ${PORT}?`);
    process.exit(1);
  });
}

main();
