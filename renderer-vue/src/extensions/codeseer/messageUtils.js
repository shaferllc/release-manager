export const MESSAGE_TYPES = [
  'dump', 'trace', 'log', 'query', 'table', 'markdown', 'html', 'json', 'xml',
  'phpinfo', 'time_track', 'benchmark', 'label', 'color', 'screen', 'job', 'mail',
  'brains', 'cache', 'gate', 'command', 'scheduled_command', 'http', 'slow_query', 'original_dump',
];

export const TYPE_TAB_LABELS = {
  all: 'All', dump: 'Dump', trace: 'Trace', log: 'Log', query: 'Query', table: 'Table',
  markdown: 'MD', json: 'JSON', xml: 'XML', html: 'HTML', phpinfo: 'PHP', time_track: 'Time',
  benchmark: 'Bench', label: 'Label', color: 'Color', screen: 'Screen', job: 'Job', mail: 'Mail',
  brains: 'Brains', cache: 'Cache', gate: 'Gate', command: 'Command', scheduled_command: 'Scheduled',
  http: 'HTTP', slow_query: 'Slow query', original_dump: 'Original dump',
};

export function isPayloadEnvelope(msg) {
  if (!msg || !Array.isArray(msg.payloads) || msg.payloads.length === 0) return false;
  const first = msg.payloads[0];
  return first && typeof first.type === 'string' && first.content !== undefined && first.origin !== undefined;
}

export function normalizePayloadToMessage(p, envelopeMeta = {}) {
  const origin = p.origin || {};
  const content = p.content || {};
  let type = (p.type || 'custom').toLowerCase();
  let payload = content;

  if (type === 'custom') {
    if (content.label === 'HTML') {
      type = 'html';
      payload = { content: content.content ?? '' };
    } else {
      type = 'markdown';
      payload = { content: typeof content.content === 'string' ? content.content : JSON.stringify(content, null, 2) };
    }
  } else if (type === 'log') {
    payload = { level: content.level || 'info', message: content.message ?? content.value ?? '' };
  } else if (type === 'query' && (content.sql !== undefined || content.query !== undefined)) {
    payload = { sql: content.sql ?? content.query ?? '' };
  } else if (type === 'table' && content.data) {
    payload = { data: content.data };
  } else if ((type === 'html' || type === 'markdown' || type === 'json' || type === 'xml') && content.content !== undefined) {
    payload = { content: content.content };
  } else if (type === 'clear') {
    payload = {};
  } else if (type === 'screen') {
    payload = { screen_name: content.screen_name ?? content.title ?? '', raise_in: content.raise_in ?? 0, new_window: content.new_window ?? false };
  } else if (type === 'phpinfo' && content.html !== undefined) {
    payload = { content: content.html };
  } else if (type === 'time_track') {
    payload = { name: content.name ?? '', duration: content.duration ?? null };
  } else if (type === 'benchmark') {
    payload = { name: content.name ?? '', duration: content.duration ?? 0 };
  } else if (type === 'label') {
    payload = { label: content.label ?? '' };
  } else if (type === 'color') {
    payload = { color: content.color ?? '' };
  }

  const meta = {
    file: origin.file,
    line: origin.line_number ?? origin.line,
    label: content.label ?? envelopeMeta.label ?? null,
    time: envelopeMeta.time ?? new Date().toISOString(),
    ...(envelopeMeta.envelope_uuid && { envelope_uuid: envelopeMeta.envelope_uuid }),
    ...(envelopeMeta.screen != null && { screen: envelopeMeta.screen }),
    ...(content.color && { color: content.color }),
    ...(content.to_screen === true && { to_screen: true }),
  };
  return { type, payload, meta };
}

export function formatPayload(msg) {
  if (!msg || !msg.payload) return '';
  if (msg.type === 'log' && msg.payload) return `[${(msg.payload.level || 'info').toUpperCase()}] ${msg.payload.message ?? ''}`;
  if (msg.type === 'query' && msg.payload && (msg.payload.sql !== undefined || msg.payload.query !== undefined)) return msg.payload.sql ?? msg.payload.query ?? '';
  if (msg.type === 'table' && msg.payload && msg.payload.data) return formatTable(msg.payload.data);
  if ((msg.type === 'markdown' || msg.type === 'html' || msg.type === 'json' || msg.type === 'xml') && msg.payload && msg.payload.content) return msg.payload.content;
  if (msg.type === 'time_track' && msg.payload) {
    const name = msg.payload.name ?? '?';
    const d = msg.payload.duration;
    return d != null ? `${name}: ${Number(d).toFixed(2)} ms` : `${name} (start)`;
  }
  if (msg.type === 'benchmark' && msg.payload) {
    const name = msg.payload.name ?? '?';
    const d = msg.payload.duration != null ? Number(msg.payload.duration).toFixed(2) : '?';
    return `${name}: ${d} ms`;
  }
  if (msg.type === 'label' && msg.payload && msg.payload.label !== undefined) return String(msg.payload.label);
  if (msg.type === 'screen' && msg.payload && msg.payload.screen_name) return `Screen: ${msg.payload.screen_name}`;
  return JSON.stringify(msg.payload, null, 2);
}

function formatTable(data) {
  if (!Array.isArray(data) || data.length === 0) return '[]';
  return data.map((row) => (typeof row === 'object' && row !== null ? JSON.stringify(row) : String(row))).join('\n');
}

export function getSearchableText(msg) {
  const meta = msg.meta || {};
  const parts = [msg.type, meta.file || '', meta.label || '', String(meta.line || ''), formatPayload(msg)];
  return parts.join(' ').toLowerCase();
}
