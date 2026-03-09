/**
 * Git remotes: list, add, remove, rename, set-url.
 * @param {{ runInDir: Function, parseRemotes: Function }} deps
 */
function createGitRemotes(deps) {
  const { runInDir, parseRemotes } = deps;

  async function getRemotes(dirPath) {
    try {
      const out = await runInDir(dirPath, 'git', ['remote', '-v']);
      const remotes = parseRemotes(out.stdout || '');
      return { ok: true, remotes };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to list remotes', remotes: [] };
    }
  }

  async function addRemote(dirPath, name, url) {
    const n = (name || '').trim();
    const u = (url || '').trim();
    if (!n || !u) return { ok: false, error: 'Name and URL required' };
    try {
      await runInDir(dirPath, 'git', ['remote', 'add', n, u]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Add remote failed' };
    }
  }

  async function removeRemote(dirPath, name) {
    const n = (name || '').trim();
    if (!n) return { ok: false, error: 'Remote name required' };
    try {
      await runInDir(dirPath, 'git', ['remote', 'remove', n]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Remove remote failed' };
    }
  }

  async function renameRemote(dirPath, oldName, newName) {
    const oldN = (oldName || '').trim();
    const newN = (newName || '').trim();
    if (!oldN || !newN) return { ok: false, error: 'Current name and new name required' };
    if (oldN === newN) return { ok: true };
    try {
      await runInDir(dirPath, 'git', ['remote', 'rename', oldN, newN]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Rename remote failed' };
    }
  }

  async function setRemoteUrl(dirPath, name, url) {
    const n = (name || '').trim();
    const u = (url || '').trim();
    if (!n || !u) return { ok: false, error: 'Remote name and URL required' };
    try {
      await runInDir(dirPath, 'git', ['remote', 'set-url', n, u]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Set URL failed' };
    }
  }

  return {
    getRemotes,
    addRemote,
    removeRemote,
    renameRemote,
    setRemoteUrl,
  };
}

module.exports = { createGitRemotes };
