const fs = require('fs');

/**
 * Create the FTP client service.
 * @param {Object} deps
 * @param {Function} deps.FtpClient - basic-ftp Client constructor
 */
function createFtpClient(deps) {
  const { FtpClient } = deps;
  let ftpClient = null;
  let ftpConfig = null;

  function getFtpStatus() {
    const connected = ftpClient != null && !ftpClient.closed;
    return {
      connected,
      host: connected && ftpConfig ? ftpConfig.host : null,
    };
  }

  async function ftpConnect(config) {
    if (ftpClient && !ftpClient.closed) {
      try { ftpClient.close(); } catch (_) {}
      ftpClient = null;
    }
    const host = (config?.host || '').trim() || 'localhost';
    const port = Math.max(1, Math.min(65535, parseInt(config?.port, 10) || 21));
    const user = config?.user != null ? String(config.user) : 'anonymous';
    const password = config?.password != null ? String(config.password) : 'guest';
    const secure = !!config?.secure;
    ftpClient = new FtpClient(30000);
    try {
      await ftpClient.access({
        host,
        port,
        user,
        password,
        secure: secure ? true : false,
      });
      ftpConfig = { host, port, user, secure };
      return { ok: true };
    } catch (e) {
      ftpClient = null;
      ftpConfig = null;
      return { ok: false, error: e.message || 'FTP connection failed' };
    }
  }

  function ftpDisconnect() {
    if (!ftpClient) return Promise.resolve({ ok: true });
    try {
      ftpClient.close();
    } catch (_) {}
    ftpClient = null;
    ftpConfig = null;
    return Promise.resolve({ ok: true });
  }

  async function ftpList(remotePath) {
    if (!ftpClient || ftpClient.closed) return { ok: false, error: 'Not connected', list: [] };
    try {
      const path = (remotePath || '').trim() || '.';
      const list = await ftpClient.list(path);
      const items = list
        .filter((f) => f.name !== '.' && f.name !== '..')
        .map((f) => ({
          name: f.name,
          size: f.size,
          isDirectory: f.isDirectory,
          modifiedAt: f.modifiedAt ? new Date(f.modifiedAt).toISOString() : null,
        }));
      return { ok: true, list: items };
    } catch (e) {
      return { ok: false, error: e.message || 'List failed', list: [] };
    }
  }

  async function ftpDownload(remotePath, localPath) {
    if (!ftpClient || ftpClient.closed) return { ok: false, error: 'Not connected' };
    const remote = (remotePath || '').trim();
    const local = (localPath || '').trim();
    if (!remote || !local) return { ok: false, error: 'Invalid path' };
    try {
      await ftpClient.downloadTo(local, remote);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Download failed' };
    }
  }

  async function ftpUpload(localPath, remotePath) {
    if (!ftpClient || ftpClient.closed) return { ok: false, error: 'Not connected' };
    const local = (localPath || '').trim();
    const remote = (remotePath || '').trim();
    if (!local || !remote) return { ok: false, error: 'Invalid path' };
    if (!fs.existsSync(local)) return { ok: false, error: 'Local file not found' };
    try {
      await ftpClient.uploadFrom(local, remote);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Upload failed' };
    }
  }

  async function ftpRemove(remotePath) {
    if (!ftpClient || ftpClient.closed) return { ok: false, error: 'Not connected' };
    const remote = (remotePath || '').trim();
    if (!remote) return { ok: false, error: 'Invalid path' };
    try {
      await ftpClient.remove(remote);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Remove failed' };
    }
  }

  function cleanup() {
    return ftpDisconnect();
  }

  return {
    getFtpStatus,
    ftpConnect,
    ftpDisconnect,
    ftpList,
    ftpDownload,
    ftpUpload,
    ftpRemove,
    cleanup,
  };
}

module.exports = { createFtpClient };
