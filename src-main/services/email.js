const EMAIL_INBOX_MAX = 500;
const DEFAULT_SMTP_PORT = 1025;

/**
 * Create the email/SMTP inbox service (Helo-style).
 * @param {Object} deps
 * @param {Function} deps.getStore
 * @param {Function} deps.send - (channel, ...args) => void
 * @param {Function} deps.SMTPServer - smtp-server constructor
 * @param {Function} deps.simpleParser - mailparser simpleParser
 * @param {Function} deps.sanitizeHtml
 * @param {Object} deps.debug - { log: (...args) => void }
 */
function createEmailService(deps) {
  const { getStore, send, SMTPServer, simpleParser, sanitizeHtml, debug } = deps;
  let smtpServerInstance = null;
  let smtpServerPort = DEFAULT_SMTP_PORT;

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

  function getEmailSmtpStatus() {
    const running = smtpServerInstance != null;
    return {
      running,
      port: running ? smtpServerPort : null,
      defaultPort: DEFAULT_SMTP_PORT,
    };
  }

  function notifyEmailReceived() {
    send('rm-email-received');
  }

  function startEmailSmtpServer(port) {
    if (smtpServerInstance) {
      return Promise.resolve({ ok: true, port: smtpServerPort, alreadyRunning: true });
    }
    const p = Math.max(1, Math.min(65535, parseInt(port, 10) || DEFAULT_SMTP_PORT));
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
          smtpServerInstance = server;
          smtpServerPort = p;
          resolve({ ok: true, port: p });
        });
        server.once('error', (err) => {
          if (!smtpServerInstance) resolve({ ok: false, error: err.message || 'SMTP server failed to start' });
        });
      } catch (e) {
        resolve({ ok: false, error: e.message || 'Failed to start SMTP server' });
      }
    });
  }

  function stopEmailSmtpServer() {
    if (!smtpServerInstance) return Promise.resolve({ ok: true, wasRunning: false });
    return new Promise((resolve) => {
      try {
        const server = smtpServerInstance;
        smtpServerInstance = null;
        server.close(() => resolve({ ok: true, wasRunning: true }));
      } catch (e) {
        smtpServerInstance = null;
        resolve({ ok: false, error: e.message || 'Failed to stop' });
      }
    });
  }

  function getEmails() {
    return getEmailInbox();
  }

  function clearEmails() {
    saveEmailInbox([]);
    notifyEmailReceived();
    return null;
  }

  function cleanup() {
    try {
      if (smtpServerInstance) {
        smtpServerInstance.close();
        smtpServerInstance = null;
      }
    } catch (_) {}
  }

  return {
    getEmailSmtpStatus,
    startEmailSmtpServer,
    stopEmailSmtpServer,
    getEmails,
    clearEmails,
    cleanup,
  };
}

module.exports = { createEmailService };
