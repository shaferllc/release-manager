/**
 * Git fetch, pull, push.
 * @param {{ runInDir: Function }} deps
 */
function createGitPushPull(deps) {
  const { runInDir } = deps;

  async function gitFetch(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['fetch']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'git fetch failed' };
    }
  }

  async function gitPull(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['pull', '--no-rebase']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'git pull failed' };
    }
  }

  async function gitPullFFOnly(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['pull', '--ff-only']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Pull (fast-forward only) failed' };
    }
  }

  async function gitPullRebase(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['pull', '--rebase']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Pull (rebase) failed' };
    }
  }

  async function gitPush(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['push']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Push failed' };
    }
  }

  async function gitPushForce(dirPath, withLease = false) {
    try {
      const branchOut = await runInDir(dirPath, 'git', ['branch', '--show-current']);
      const branch = (branchOut.stdout || '').trim();
      if (!branch) return { ok: false, error: 'Not on a branch' };
      const upstreamOut = await runInDir(dirPath, 'git', ['rev-parse', '--abbrev-ref', '@{u}']).catch(() => ({ stdout: '' }));
      const hasUpstream = (upstreamOut.stdout || '').trim().length > 0;
      const args = ['push'];
      if (withLease) args.push('--force-with-lease');
      else args.push('--force');
      if (hasUpstream) {
        await runInDir(dirPath, 'git', args);
      } else {
        args.push('-u', 'origin', branch);
        await runInDir(dirPath, 'git', args);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Force push failed' };
    }
  }

  async function gitPushWithUpstream(dirPath) {
    try {
      const branchOut = await runInDir(dirPath, 'git', ['branch', '--show-current']);
      const branch = (branchOut.stdout || '').trim();
      if (!branch) return { ok: false, error: 'Not on a branch' };
      const upstreamOut = await runInDir(dirPath, 'git', ['rev-parse', '--abbrev-ref', '@{u}']).catch(() => ({ stdout: '' }));
      const hasUpstream = (upstreamOut.stdout || '').trim().length > 0;
      if (hasUpstream) {
        await runInDir(dirPath, 'git', ['push']);
      } else {
        await runInDir(dirPath, 'git', ['push', '-u', 'origin', branch]);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Push failed' };
    }
  }

  async function gitFetchRemote(dirPath, remoteName, ref) {
    const remote = (remoteName || 'origin').trim();
    if (!remote) return { ok: false, error: 'Remote name required' };
    try {
      const args = ['fetch', remote];
      if (ref && String(ref).trim()) args.push(String(ref).trim());
      await runInDir(dirPath, 'git', args);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Fetch failed' };
    }
  }

  return {
    gitFetch,
    gitPull,
    gitPullFFOnly,
    gitPullRebase,
    gitPush,
    gitPushForce,
    gitPushWithUpstream,
    gitFetchRemote,
  };
}

module.exports = { createGitPushPull };
