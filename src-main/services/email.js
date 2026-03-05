const net = require('net');

const EMAIL_INBOX_MAX = 500;
const DEFAULT_SMTP_PORT = 1025;

function normalizeProjectPath(p) {
  if (p == null || typeof p !== 'string') return null;
  const s = p.trim();
  if (s === '') return null;
  return s.replace(/\\/g, '/').replace(/\/+$/, '') || s;
}

/** True when the SMTP line is the final one for this reply (code followed by space or end, not hyphen). */
function isTerminalSmtpLine(line, code) {
  if (!line.startsWith(code)) return false;
  const fourth = line.charAt(3);
  return fourth === ' ' || fourth === '' || fourth === '\r';
}

/** Simple CRLF-terminated SMTP client for sending a test message to the catch server. */
function sendTestEmailToPort(port) {
  return new Promise((resolve, reject) => {
    const p = Math.max(1, Math.min(65535, parseInt(port, 10) || DEFAULT_SMTP_PORT));
    const socket = net.connect({ port: p, host: '127.0.0.1' }, () => {});
    let buffer = '';
    /** Queue of { code, next } - consume lines until we see a terminal reply for that code, then call next. */
    const expectedReplies = [];
    let step = 0;

    function send(line) {
      socket.write(line + '\r\n');
    }

    function expectCode(code, next) {
      expectedReplies.push({ code, next });
    }

    function finish() {
      try {
        socket.destroy();
      } catch (_) {}
      resolve({ ok: true });
    }

    function fail(err) {
      try {
        socket.destroy();
      } catch (_) {}
      reject(err);
    }

    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      let idx;
      while ((idx = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const code = line.slice(0, 3);
        const handler = expectedReplies[0];
        if (!handler) {
          fail(new Error(`Unexpected SMTP reply: ${line}`));
          return;
        }
        if (!line.startsWith(handler.code)) {
          fail(new Error(`SMTP error: expected ${handler.code}, got ${line}`));
          return;
        }
        if (!isTerminalSmtpLine(line, handler.code)) continue;
        expectedReplies.shift();
        if (handler.next) handler.next(code, line.slice(4));
      }
    });

    socket.on('error', (err) => reject(err));
    socket.on('close', () => {
      if (expectedReplies.length > 0 && step < 6) {
        reject(new Error('Connection closed before send completed'));
      }
    });

    expectCode('220', () => {
      step = 1;
      send('EHLO localhost');
      expectCode('250', () => {
        step = 2;
        send('MAIL FROM:<test@localhost>');
        expectCode('250', () => {
          step = 3;
          send('RCPT TO:<inbox@localhost>');
          expectCode('250', () => {
            step = 4;
            send('DATA');
            expectCode('354', () => {
              const subject = 'Test email from Release Manager';
              const bodyPlain = 'This is a test message sent from the Email extension to verify the catch server is working.';
              const bodyHtml = '<p>This is a <strong>test message</strong> sent from the Email extension to verify the catch server is working.</p>';
              const raw = [
                'From: Release Manager <test@localhost>',
                'To: inbox@localhost',
                `Subject: ${subject}`,
                'MIME-Version: 1.0',
                'Content-Type: multipart/alternative; boundary="----test-boundary"',
                '',
                '------test-boundary',
                'Content-Type: text/plain; charset=utf-8',
                '',
                bodyPlain,
                '',
                '------test-boundary',
                'Content-Type: text/html; charset=utf-8',
                '',
                bodyHtml,
                '',
                '------test-boundary--',
                '.',
              ].join('\r\n');
              socket.write(raw + '\r\n');
              step = 5;
              expectCode('250', () => {
                step = 6;
                send('QUIT');
                expectCode('221', finish);
              });
            });
          });
        });
      });
    });
  });
}

/**
 * Heuristic spam score (0–10, one decimal). Higher = more likely spam.
 * @param {Object} parsed - mailparser result
 * @param {string|null} rawHtml
 * @param {string|null} text
 * @returns {{ score: number, signals: string[] }}
 */
function computeSpamScore(parsed, rawHtml, text) {
  const signals = [];
  let score = 0;

  const subject = (parsed.subject || '').toLowerCase();
  const from = (parsed.from?.text || parsed.from?.value?.[0]?.address || '').toLowerCase();
  const body = ((rawHtml || '') + '\n' + (text || '')).toLowerCase();

  const spammySubjectWords = ['free', 'winner', 'urgent', 'act now', 'click here', 'congratulations', 'claim', 'prize', 'limited time', 'buy now', 'viagra', 'casino', 'lottery', 'unsubscribe'];
  const matchCount = spammySubjectWords.filter((w) => subject.includes(w)).length;
  if (matchCount > 0) {
    score += Math.min(matchCount * 0.8, 3);
    signals.push(`Subject contains ${matchCount} suspicious word(s)`);
  }

  const subjectCapsRatio = (parsed.subject || '').replace(/[^A-Za-z]/g, '');
  if (subjectCapsRatio.length > 5) {
    const caps = (subjectCapsRatio.match(/[A-Z]/g) || []).length;
    if (caps / subjectCapsRatio.length > 0.7) {
      score += 0.5;
      signals.push('Subject is mostly ALL CAPS');
    }
  }

  const linkCount = ((rawHtml || '') + (text || '')).match(/https?:\/\/[^\s<>"']+/g)?.length || 0;
  if (linkCount > 10) {
    score += 1.5;
    signals.push(`Many links (${linkCount})`);
  } else if (linkCount > 5) {
    score += 0.5;
    signals.push(`Several links (${linkCount})`);
  }

  if (rawHtml && !(text && text.trim().length > 50)) {
    score += 0.3;
    signals.push('HTML-only or very little plain text');
  }

  let hasListUnsubscribe = false;
  try {
    if (parsed.headers) {
      if (typeof parsed.headers.get === 'function') {
        hasListUnsubscribe = !!parsed.headers.get('list-unsubscribe');
      } else if (parsed.headers['list-unsubscribe']) {
        hasListUnsubscribe = true;
      }
    }
  } catch (_) {}
  if (!hasListUnsubscribe && (body.includes('unsubscribe') || body.includes('opt-out'))) {
    score += 0.2;
    signals.push('No List-Unsubscribe header');
  }

  const scoreRounded = Math.min(10, Math.round(score * 10) / 10);
  return { score: scoreRounded, signals };
}

/**
 * Create the email/SMTP inbox service (Helo-style).
 * @param {Object} deps
 * @param {Function} deps.getStore
 * @param {Function} [deps.getPreference] - (key) => value, for emailSmtpPort etc.
 * @param {Function} deps.send - (channel, ...args) => void
 * @param {Function} deps.SMTPServer - smtp-server constructor
 * @param {Function} deps.simpleParser - mailparser simpleParser
 * @param {Function} deps.sanitizeHtml
 * @param {Object} deps.debug - { log: (...args) => void }
 */
function createEmailService(deps) {
  const { getStore, getPreference, send, SMTPServer, simpleParser, sanitizeHtml, debug } = deps;
  /** @type {Map<number, { server: import('smtp-server').SMTPServer, projectPath: string }>} */
  const portToServer = new Map();

  function getDefaultPort() {
    return DEFAULT_SMTP_PORT;
  }

  function findNextAvailablePort(startPort) {
    const base = Math.max(1, Math.min(65535, parseInt(startPort, 10) || DEFAULT_SMTP_PORT));
    for (let p = base; p < base + 100; p++) {
      if (!portToServer.has(p)) return p;
    }
    return base;
  }

  function getEmailInbox() {
    try {
      const raw = getStore().get('emailInbox');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function saveEmailInbox(inbox) {
    const list = Array.isArray(inbox) ? inbox.slice(0, EMAIL_INBOX_MAX) : [];
    getStore().set('emailInbox', list);
  }

  function getEmailSmtpStatus(projectPath) {
    const pathNorm = normalizeProjectPath(projectPath);
    if (pathNorm != null) {
      for (const [port, entry] of portToServer) {
        if (normalizeProjectPath(entry.projectPath) === pathNorm) {
          return { running: true, port, defaultPort: getDefaultPort(), servers: Array.from(portToServer.entries()).map(([p, e]) => ({ port: p, projectPath: e.projectPath })) };
        }
      }
      return { running: false, port: null, defaultPort: getDefaultPort(), servers: Array.from(portToServer.entries()).map(([p, e]) => ({ port: p, projectPath: e.projectPath })) };
    }
    const first = portToServer.keys().next();
    const port = first.done ? null : first.value;
    return {
      running: portToServer.size > 0,
      port,
      defaultPort: getDefaultPort(),
      servers: Array.from(portToServer.entries()).map(([p, e]) => ({ port: p, projectPath: e.projectPath })),
    };
  }

  function notifyEmailReceived() {
    send('rm-email-received');
  }

  function startEmailSmtpServer(port, projectPath) {
    const pathForTag = normalizeProjectPath(projectPath) || undefined;
    const requestedPort = Math.max(1, Math.min(65535, parseInt(port, 10) || getDefaultPort()));
    const p = portToServer.has(requestedPort) ? findNextAvailablePort(requestedPort + 1) : requestedPort;
    if (portToServer.has(p)) {
      return Promise.resolve({ ok: false, error: `Port ${p} already in use by another project.` });
    }
    return new Promise((resolve) => {
      try {
        const server = new SMTPServer({
          disabledCommands: ['AUTH', 'STARTTLS'],
          size: 25 * 1024 * 1024,
          onConnect(session, callback) {
            callback();
          },
          onMailFrom(address, session, callback) {
            callback();
          },
          onRcptTo(address, session, callback) {
            callback();
          },
          onData(stream, session, callback) {
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', async () => {
              try {
                const raw = Buffer.concat(chunks);
                const parsed = await simpleParser(raw);
                const fromText = parsed.from?.text || (parsed.from?.value?.[0]?.address) || '';
                const toText = parsed.to?.text || (parsed.to?.value?.map((v) => v.address).join(', ')) || '';
                const headers = {};
                if (parsed.headers && typeof parsed.headers.forEach === 'function') {
                  parsed.headers.forEach((v, k) => { headers[k] = v; });
                }
                const rawHtml = parsed.html || null;
                const sanitizedHtml = rawHtml
                  ? sanitizeHtml(rawHtml, {
                      allowedTags: ['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'u', 'code', 'pre', 'br', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'div', 'span'],
                      allowedAttributes: { a: ['href', 'target'], img: ['src', 'alt', 'width', 'height'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'] },
                      allowedSchemes: ['http', 'https', 'cid', 'data'],
                    })
                  : null;
                const projectOpts = pathForTag && getPreference?.('projectEmailOptions')?.[pathForTag];
                const spamEnabled = projectOpts?.enableSpamChecking !== false;
                const { score: spamScore, signals: spamSignals } = spamEnabled ? computeSpamScore(parsed, rawHtml, parsed.text || null) : { score: null, signals: [] };
                const email = {
                  id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                  from: fromText,
                  to: toText,
                  subject: parsed.subject || '(no subject)',
                  date: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
                  html: rawHtml,
                  sanitizedHtml,
                  text: parsed.text || null,
                  headers: JSON.stringify(headers, null, 2),
                  raw: raw.length > 100000 ? raw.slice(0, 100000).toString('utf8') + '\n...[truncated]' : raw.toString('utf8'),
                  spamScore,
                  spamSignals,
                  projectPath: pathForTag,
                };
                const inbox = getEmailInbox();
                inbox.unshift(email);
                saveEmailInbox(inbox);
                notifyEmailReceived();
                callback(null, 'OK');
              } catch (err) {
                debug.log(getStore, 'email', 'parse failed', err?.message || err);
                callback(err);
              }
            });
            stream.on('error', (err) => callback(err));
          },
        });
        server.on('error', (err) => {
          debug.log(getStore, 'email', 'smtp server error', err?.message || err);
        });
        server.listen(p, '127.0.0.1', () => {
          portToServer.set(p, { server, projectPath: pathForTag });
          resolve({ ok: true, port: p });
        });
        server.once('error', (err) => {
          if (!portToServer.has(p)) resolve({ ok: false, error: err.message || 'SMTP server failed to start' });
        });
      } catch (e) {
        resolve({ ok: false, error: e.message || 'Failed to start SMTP server' });
      }
    });
  }

  function stopEmailSmtpServer(projectPath) {
    const pathNorm = normalizeProjectPath(projectPath);
    if (pathNorm != null) {
      for (const [port, entry] of portToServer) {
        if (normalizeProjectPath(entry.projectPath) === pathNorm) {
          const { server } = entry;
          portToServer.delete(port);
          return new Promise((resolve) => {
            server.close(() => resolve({ ok: true, wasRunning: true }));
          });
        }
      }
      return Promise.resolve({ ok: true, wasRunning: false });
    }
    if (portToServer.size === 0) return Promise.resolve({ ok: true, wasRunning: false });
    const entries = Array.from(portToServer.entries());
    portToServer.clear();
    return Promise.all(entries.map(([, entry]) => new Promise((res) => entry.server.close(() => res())))).then(() => ({ ok: true, wasRunning: true }));
  }

  function getEmails(projectPath) {
    const inbox = getEmailInbox();
    const pathNorm = normalizeProjectPath(projectPath);
    if (pathNorm == null) return inbox.filter((e) => e.projectPath == null);
    return inbox.filter((e) => e.projectPath == null || normalizeProjectPath(e.projectPath) === pathNorm);
  }

  function clearEmails(projectPath) {
    const pathNorm = normalizeProjectPath(projectPath);
    if (pathNorm == null) {
      saveEmailInbox([]);
    } else {
      const inbox = getEmailInbox().filter((e) => normalizeProjectPath(e.projectPath) !== pathNorm);
      saveEmailInbox(inbox);
    }
    notifyEmailReceived();
    return null;
  }

  function deleteEmails(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return null;
    const idSet = new Set(ids);
    const inbox = getEmailInbox().filter((e) => !idSet.has(e.id));
    saveEmailInbox(inbox);
    notifyEmailReceived();
    return null;
  }

  function cleanup() {
    try {
      for (const [, entry] of portToServer) {
        try {
          entry.server.close();
        } catch (_) {}
      }
      portToServer.clear();
    } catch (_) {}
  }

  function addTestEmailToInbox(projectPath) {
    const pathForTag = normalizeProjectPath(projectPath) || undefined;
    const subject = 'Test email from Release Manager';
    const bodyPlain = 'This is a test message sent from the Email extension to verify the catch server is working.';
    const bodyHtml = '<p>This is a <strong>test message</strong> sent from the Email extension to verify the catch server is working.</p>';
    const raw = [
      'From: Release Manager <test@localhost>',
      'To: inbox@localhost',
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="----test-boundary"',
      '',
      '------test-boundary',
      'Content-Type: text/plain; charset=utf-8',
      '',
      bodyPlain,
      '',
      '------test-boundary',
      'Content-Type: text/html; charset=utf-8',
      '',
      bodyHtml,
      '',
      '------test-boundary--',
    ].join('\r\n');
    const email = {
      id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      from: 'Release Manager <test@localhost>',
      to: 'inbox@localhost',
      subject,
      date: new Date().toISOString(),
      html: bodyHtml,
      sanitizedHtml: bodyHtml,
      text: bodyPlain,
      headers: '{}',
      raw,
      spamScore: null,
      spamSignals: [],
      projectPath: pathForTag,
    };
    const inbox = getEmailInbox();
    inbox.unshift(email);
    saveEmailInbox(inbox);
    notifyEmailReceived();
  }

  function sendTestEmail(port, projectPath) {
    addTestEmailToInbox(projectPath || undefined);
    return Promise.resolve({ ok: true });
  }

  return {
    getEmailSmtpStatus,
    startEmailSmtpServer,
    stopEmailSmtpServer,
    getEmails,
    clearEmails,
    deleteEmails,
    sendTestEmail,
    cleanup,
  };
}

module.exports = { createEmailService };
