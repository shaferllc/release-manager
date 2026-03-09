/**
 * Git stash: list, apply, drop, push, pop.
 * @param {{ runInDir: Function, path: Object, fs: Object, parseStashList: Function }} deps
 */
function createGitStash(deps) {
  const { runInDir, path, fs, parseStashList } = deps;

  async function getStashList(dirPath) {
    if (!dirPath || typeof dirPath !== 'string' || !dirPath.trim()) {
      return { ok: false, error: 'Project path is required', entries: [] };
    }
    const cwd = path.resolve(dirPath.trim());
    if (!fs.existsSync(path.join(cwd, '.git'))) {
      return { ok: false, error: 'Not a Git repository', entries: [] };
    }
    try {
      const out = await runInDir(cwd, 'git', ['stash', 'list', '--pretty=format:%gd %s']);
      const entries = parseStashList(out.stdout || '');
      return { ok: true, entries };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to list stash', entries: [] };
    }
  }

  async function stashApply(dirPath, index) {
    if (!dirPath || typeof dirPath !== 'string' || !dirPath.trim()) {
      return { ok: false, error: 'Project path is required' };
    }
    const cwd = path.resolve(dirPath.trim());
    if (!fs.existsSync(path.join(cwd, '.git'))) {
      return { ok: false, error: 'Not a Git repository' };
    }
    try {
      const args = index ? ['stash', 'apply', String(index)] : ['stash', 'apply'];
      await runInDir(cwd, 'git', args);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Stash apply failed' };
    }
  }

  async function stashDrop(dirPath, index) {
    if (!dirPath || typeof dirPath !== 'string' || !dirPath.trim()) {
      return { ok: false, error: 'Project path is required' };
    }
    const cwd = path.resolve(dirPath.trim());
    if (!fs.existsSync(path.join(cwd, '.git'))) {
      return { ok: false, error: 'Not a Git repository' };
    }
    try {
      const args = index ? ['stash', 'drop', String(index)] : ['stash', 'drop'];
      await runInDir(cwd, 'git', args);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Stash drop failed' };
    }
  }

  async function gitStashPush(dirPath, message, options = {}) {
    if (!dirPath || typeof dirPath !== 'string' || !dirPath.trim()) {
      return { ok: false, error: 'Project path is required' };
    }
    const cwd = path.resolve(dirPath.trim());
    if (!fs.existsSync(path.join(cwd, '.git'))) {
      return { ok: false, error: 'Not a Git repository' };
    }
    try {
      const args = ['stash', 'push'];
      if (options && options.includeUntracked) args.push('--include-untracked');
      if (options && options.keepIndex) args.push('--keep-index');
      if (message && typeof message === 'string' && message.trim()) args.push('-m', message.trim());
      await runInDir(cwd, 'git', args);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'git stash failed' };
    }
  }

  async function gitStashPop(dirPath) {
    if (!dirPath || typeof dirPath !== 'string' || !dirPath.trim()) {
      return { ok: false, error: 'Project path is required' };
    }
    const cwd = path.resolve(dirPath.trim());
    if (!fs.existsSync(path.join(cwd, '.git'))) {
      return { ok: false, error: 'Not a Git repository' };
    }
    try {
      await runInDir(cwd, 'git', ['stash', 'pop']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'git stash pop failed' };
    }
  }

  return {
    getStashList,
    stashApply,
    stashDrop,
    gitStashPush,
    gitStashPop,
  };
}

module.exports = { createGitStash };
