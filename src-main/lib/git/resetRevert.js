/**
 * Git reset, revert, amend, reflog, checkout ref, prune.
 * @param {{ runInDir: Function, getPreference: Function }} deps
 */
function createGitResetRevert(deps) {
  const { runInDir, getPreference } = deps;

  async function gitReset(dirPath, ref, mode) {
    const r = (ref || 'HEAD').trim();
    const m = mode === 'soft' || mode === 'mixed' || mode === 'hard' ? mode : 'mixed';
    try {
      await runInDir(dirPath, 'git', ['reset', `--${m}`, r]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Reset failed' };
    }
  }

  async function gitRevert(dirPath, sha) {
    const s = (sha || '').trim();
    if (!s) return { ok: false, error: 'Commit SHA required' };
    try {
      await runInDir(dirPath, 'git', ['revert', '--no-edit', s]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Revert failed' };
    }
  }

  async function gitAmend(dirPath, message) {
    const sign = getPreference('signCommits');
    try {
      const args = ['commit', '--amend'];
      if (sign) args.push('-S');
      if (message != null && String(message).trim()) {
        args.push('-m', String(message).trim());
        await runInDir(dirPath, 'git', args);
      } else {
        args.push('--no-edit');
        await runInDir(dirPath, 'git', args);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Amend failed' };
    }
  }

  async function getReflog(dirPath, n = 50) {
    try {
      const out = await runInDir(dirPath, 'git', ['reflog', '-n', String(n), '--format=%h %gD %s']);
      const lines = (out.stdout || '').trim().split(/\r?\n/).filter(Boolean);
      const entries = lines.map((line) => {
        const match = line.match(/^(\S+)\s+(\S+)\s+(.*)$/);
        return match ? { sha: match[1], ref: match[2], message: match[3] } : { sha: line.split(/\s/)[0] || '', ref: '', message: line };
      });
      return { ok: true, entries };
    } catch (e) {
      return { ok: false, error: e.message || 'Reflog failed', entries: [] };
    }
  }

  async function checkoutRef(dirPath, ref) {
    const r = (ref || '').trim();
    if (!r) return { ok: false, error: 'Ref required' };
    try {
      await runInDir(dirPath, 'git', ['checkout', r]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Checkout failed' };
    }
  }

  async function gitPruneRemotes(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['fetch', '--prune']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Prune failed' };
    }
  }

  return {
    gitReset,
    gitRevert,
    gitAmend,
    getReflog,
    checkoutRef,
    gitPruneRemotes,
  };
}

module.exports = { createGitResetRevert };
