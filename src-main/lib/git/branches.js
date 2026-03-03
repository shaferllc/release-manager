/**
 * Git branches: list, checkout, create, delete, remote branches, etc.
 * @param {{ runInDir: Function, parseLocalBranches: Function, parseRemoteBranches: Function }} deps
 */
function createGitBranches(deps) {
  const { runInDir, parseLocalBranches, parseRemoteBranches } = deps;

  async function getBranches(dirPath) {
    try {
      const out = await runInDir(dirPath, 'git', ['branch', '--no-color']);
      const branches = parseLocalBranches(out.stdout || '');
      const currentOut = await runInDir(dirPath, 'git', ['branch', '--show-current']);
      const current = (currentOut.stdout || '').trim() || null;
      return { ok: true, branches, current };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to list branches', branches: [], current: null };
    }
  }

  async function checkoutBranch(dirPath, branchName) {
    const name = (branchName || '').trim();
    if (!name) return { ok: false, error: 'Branch name is required' };
    try {
      await runInDir(dirPath, 'git', ['checkout', name]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Checkout failed' };
    }
  }

  async function createBranch(dirPath, branchName, checkout = true) {
    const name = (branchName || '').trim();
    if (!name) return { ok: false, error: 'Branch name is required' };
    try {
      if (checkout) {
        await runInDir(dirPath, 'git', ['checkout', '-b', name]);
      } else {
        await runInDir(dirPath, 'git', ['branch', name]);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Create branch failed' };
    }
  }

  async function createBranchFrom(dirPath, newBranchName, fromRef) {
    const name = (newBranchName || '').trim();
    const ref = (fromRef || '').trim();
    if (!name) return { ok: false, error: 'Branch name is required' };
    if (!ref) return { ok: false, error: 'Source branch or ref is required' };
    try {
      await runInDir(dirPath, 'git', ['checkout', '-b', name, ref]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Create branch failed' };
    }
  }

  async function renameBranch(dirPath, oldName, newName) {
    const n = (newName || '').trim();
    if (!n) return { ok: false, error: 'New branch name is required' };
    try {
      if (oldName && oldName.trim()) {
        await runInDir(dirPath, 'git', ['branch', '-m', oldName.trim(), n]);
      } else {
        await runInDir(dirPath, 'git', ['branch', '-m', n]);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Rename branch failed' };
    }
  }

  async function getRemoteBranches(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['fetch', '--prune']);
      const out = await runInDir(dirPath, 'git', ['branch', '-r', '--no-color']);
      const branches = parseRemoteBranches(out.stdout || '');
      return { ok: true, branches };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to list remote branches', branches: [] };
    }
  }

  async function checkoutRemoteBranch(dirPath, ref) {
    const r = (ref || '').trim();
    if (!r || r.indexOf('/') === -1) return { ok: false, error: 'Remote branch ref required (e.g. origin/feature)' };
    try {
      await runInDir(dirPath, 'git', ['checkout', '--track', r]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Checkout failed' };
    }
  }

  async function deleteBranch(dirPath, branchName, force = false) {
    const name = (branchName || '').trim();
    if (!name) return { ok: false, error: 'Branch name is required' };
    try {
      await runInDir(dirPath, 'git', ['branch', force ? '-D' : '-d', name]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Delete branch failed' };
    }
  }

  async function deleteRemoteBranch(dirPath, remoteName, branchName) {
    const remote = (remoteName || 'origin').trim();
    const name = (branchName || '').trim();
    if (!name) return { ok: false, error: 'Branch name is required' };
    try {
      await runInDir(dirPath, 'git', ['push', remote, '--delete', name]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Delete remote branch failed' };
    }
  }

  async function setBranchUpstream(dirPath, branchName) {
    const branch = (branchName || '').trim();
    if (!branch) return { ok: false, error: 'Branch name required' };
    try {
      await runInDir(dirPath, 'git', ['branch', '--set-upstream-to=origin/' + branch, branch]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Set upstream failed' };
    }
  }

  async function getBranchRevision(dirPath, ref) {
    const r = (ref || 'HEAD').trim();
    if (!r) return { ok: false, error: 'Ref required', sha: '' };
    try {
      const out = await runInDir(dirPath, 'git', ['rev-parse', r]);
      const sha = (out.stdout || '').trim();
      return { ok: true, sha };
    } catch (e) {
      return { ok: false, error: e.message || 'Rev-parse failed', sha: '' };
    }
  }

  return {
    getBranches,
    checkoutBranch,
    createBranch,
    createBranchFrom,
    renameBranch,
    getRemoteBranches,
    checkoutRemoteBranch,
    deleteBranch,
    deleteRemoteBranch,
    setBranchUpstream,
    getBranchRevision,
  };
}

module.exports = { createGitBranches };
