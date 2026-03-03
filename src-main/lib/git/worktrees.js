/**
 * Git worktrees.
 * @param {{ runInDir: Function, path: Object }} deps
 */
function createGitWorktrees(deps) {
  const { runInDir, path } = deps;

  async function getWorktrees(dirPath) {
    try {
      const out = await runInDir(dirPath, 'git', ['worktree', 'list', '--porcelain']);
      const lines = (out.stdout || '').trim().split(/\r?\n/).filter(Boolean);
      const worktrees = [];
      let current = {};
      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          if (current.path) worktrees.push(current);
          current = { path: line.slice(9).trim(), head: '', branch: '' };
        } else if (line.startsWith('HEAD ')) current.head = line.slice(5).trim();
        else if (line.startsWith('branch ')) current.branch = line.slice(7).trim().replace(/^refs\/heads\//, '');
      }
      if (current.path) worktrees.push(current);
      return { ok: true, worktrees };
    } catch (e) {
      return { ok: false, error: e.message || 'Worktree list failed', worktrees: [] };
    }
  }

  async function worktreeAdd(dirPath, worktreePath, branch) {
    const wt = (worktreePath || '').trim();
    if (!wt) return { ok: false, error: 'Worktree path required' };
    try {
      const args = ['worktree', 'add', path.isAbsolute(wt) ? wt : path.join(path.dirname(dirPath), wt)];
      if (branch && String(branch).trim()) args.push('-b', String(branch).trim());
      await runInDir(dirPath, 'git', args);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Worktree add failed' };
    }
  }

  async function worktreeRemove(dirPath, worktreePath) {
    const wt = (worktreePath || '').trim();
    if (!wt) return { ok: false, error: 'Worktree path required' };
    try {
      await runInDir(dirPath, 'git', ['worktree', 'remove', wt]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Worktree remove failed' };
    }
  }

  return {
    getWorktrees,
    worktreeAdd,
    worktreeRemove,
  };
}

module.exports = { createGitWorktrees };
