const { spawn } = require('child_process');

/**
 * Create the SSH manager service (saved connections + open in system terminal).
 * @param {Object} deps
 * @param {Function} deps.getPreference
 * @param {Function} deps.setPreference
 */
function createSshManager(deps) {
  const { getPreference, setPreference } = deps;

  function getSshConnections() {
    const list = getPreference('sshConnections');
    return Array.isArray(list) ? list : [];
  }

  function setSshConnections(connections) {
    const list = Array.isArray(connections) ? connections : [];
    setPreference('sshConnections', list);
    return null;
  }

  function openSshInTerminal(connection) {
    if (!connection || typeof connection.host !== 'string' || !connection.host.trim()) {
      return Promise.resolve({ ok: false, error: 'Invalid connection: host required' });
    }
    const host = connection.host.trim();
    const port = Math.max(1, Math.min(65535, parseInt(connection.port, 10) || 22));
    const user = (connection.user != null ? String(connection.user) : '').trim() || 'root';
    const identityFile = (connection.identityFile != null ? String(connection.identityFile) : '').trim();
    const platform = process.platform;
    const finalCmd = (() => {
      let s = 'ssh ';
      if (port !== 22) s += `-p ${port} `;
      if (identityFile) s += `-i "${identityFile.replace(/"/g, '\\"')}" `;
      s += `${user}@${host}`;
      return s;
    })();
    try {
      if (platform === 'darwin') {
        const escaped = finalCmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const script = `tell application "Terminal" to do script "${escaped}"`;
        spawn('osascript', ['-e', script], { detached: true, stdio: 'ignore' });
      } else if (platform === 'win32') {
        spawn('cmd.exe', ['/c', 'start', 'cmd', '/k', finalCmd], { detached: true, stdio: 'ignore' });
      } else {
        spawn('x-terminal-emulator', ['-e', finalCmd], { detached: true, stdio: 'ignore' }).on('error', () => {
          spawn('gnome-terminal', ['--', 'bash', '-c', finalCmd], { detached: true, stdio: 'ignore' });
        });
      }
      return Promise.resolve({ ok: true });
    } catch (e) {
      return Promise.resolve({ ok: false, error: e.message });
    }
  }

  return {
    getSshConnections,
    setSshConnections,
    openSshInTerminal,
  };
}

module.exports = { createSshManager };
