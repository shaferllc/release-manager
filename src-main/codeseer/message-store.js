/**
 * In-memory store of CodeSeer messages (PHP dumps, traces, logs).
 * Used by TCP server and exposed via IPC to the codeseer extension.
 */
const { EventEmitter } = require('events');

const MAX_MESSAGES = 2000;

const messages = [];
const emitter = new EventEmitter();
emitter.setMaxListeners(100);

function getScreen(msg) {
  return (msg.meta && msg.meta.screen != null) ? String(msg.meta.screen) : (msg.screen != null ? String(msg.screen) : '');
}

function getTime(msg) {
  const t = msg.meta && msg.meta.time;
  if (t) return new Date(t).getTime();
  return 0;
}

function add(msg) {
  if (!msg || typeof msg !== 'object') return;
  messages.push(msg);
  if (messages.length > MAX_MESSAGES) {
    messages.splice(0, messages.length - MAX_MESSAGES);
  }
  emitter.emit('message', msg);
}

function getMessages(opts = {}) {
  const limit = Math.min(Math.max(0, parseInt(opts.limit, 10) || 50), 500);
  const screen = opts.screen !== undefined && opts.screen !== '' ? String(opts.screen) : null;
  const type = opts.type && String(opts.type).trim() ? String(opts.type).trim() : null;
  const since = opts.since ? new Date(opts.since).getTime() : null;

  let out = messages;
  if (screen !== null) out = out.filter((m) => getScreen(m) === screen);
  if (type !== null) out = out.filter((m) => m.type === type);
  if (since != null && !isNaN(since)) out = out.filter((m) => getTime(m) >= since);
  return out.slice(-limit);
}

function clear() {
  messages.length = 0;
  emitter.emit('clear');
}

function clearByType(type) {
  if (!type || typeof type !== 'string') return;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].type === type) messages.splice(i, 1);
  }
}

function subscribe(onMessage) {
  emitter.on('message', onMessage);
  return () => emitter.off('message', onMessage);
}

function subscribeClear(onClear) {
  emitter.on('clear', onClear);
  return () => emitter.off('clear', onClear);
}

function getCount() {
  return messages.length;
}

function getStats() {
  const byType = {};
  const byScreen = {};
  for (const m of messages) {
    const t = m.type || 'log';
    byType[t] = (byType[t] || 0) + 1;
    const s = getScreen(m) || '(default)';
    byScreen[s] = (byScreen[s] || 0) + 1;
  }
  return { byType, byScreen, total: messages.length };
}

function getScreens(withCount = false) {
  const seen = new Set();
  const counts = {};
  for (const m of messages) {
    const s = getScreen(m) || '';
    if (!seen.has(s)) seen.add(s);
    if (withCount) counts[s] = (counts[s] || 0) + 1;
  }
  const list = [...seen].filter(Boolean).sort();
  if (withCount) {
    return list.map((name) => ({ name, count: counts[name] || 0 }));
  }
  return list;
}

function search(q, opts = {}) {
  if (!q || typeof q !== 'string') return [];
  const limit = Math.min(Math.max(0, parseInt(opts.limit, 10) || 50), 500);
  const screen = opts.screen !== undefined && opts.screen !== '' ? String(opts.screen) : null;
  const type = opts.type && String(opts.type).trim() ? String(opts.type).trim() : null;
  const lower = q.trim().toLowerCase();
  let out = messages.filter((m) => {
    const text = JSON.stringify(m).toLowerCase();
    if (!text.includes(lower)) return false;
    if (screen !== null && getScreen(m) !== screen) return false;
    if (type !== null && m.type !== type) return false;
    return true;
  });
  return out.slice(-limit);
}

function getTypes() {
  const seen = new Set();
  for (const m of messages) {
    if (m.type) seen.add(m.type);
  }
  return [...seen].sort();
}

function getLatest(opts = {}) {
  const perScreen = opts.perScreen === '1' || opts.perScreen === true;
  const screen = opts.screen !== undefined && opts.screen !== '' ? String(opts.screen) : null;
  if (perScreen) {
    const byScreen = {};
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      const s = getScreen(m) || '(default)';
      if (!byScreen[s]) byScreen[s] = m;
    }
    return byScreen;
  }
  if (screen !== null) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (getScreen(messages[i]) === screen) return messages[i];
    }
    return null;
  }
  return messages.length > 0 ? messages[messages.length - 1] : null;
}

function importMessages(list) {
  if (!Array.isArray(list)) return 0;
  let n = 0;
  for (const msg of list) {
    if (msg && typeof msg === 'object') {
      add(msg);
      n++;
    }
  }
  return n;
}

module.exports = {
  add,
  getMessages,
  getCount,
  getStats,
  getScreens,
  search,
  getTypes,
  getLatest,
  importMessages,
  clear,
  clearByType,
  subscribe,
  subscribeClear,
  MAX_MESSAGES,
};
