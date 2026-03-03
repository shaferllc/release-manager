/**
 * Git init.
 * @param {{ runInDir: Function, path: Object, fs: Object }} deps
 */
function createGitInit(deps) {
  const { runInDir, path, fs } = deps;

  async function gitInit(dirPath) {
    if (!dirPath || typeof dirPath !== 'string') return { ok: false, error: 'Directory path is required' };
    const gitDir = path.join(dirPath, '.git');
    if (fs.existsSync(gitDir)) return { ok: false, error: 'Repository already exists' };
    try {
      await runInDir(dirPath, 'git', ['init']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'git init failed' };
    }
  }

  return { gitInit };
}

module.exports = { createGitInit };
