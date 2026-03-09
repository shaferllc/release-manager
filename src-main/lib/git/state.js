/**
 * Git state (rebase/merge/cherry-pick) and user config.
 * @param {{ runInDir: Function, path: Object, fs: Object }} deps
 */
function createGitState(deps) {
  const { runInDir, path, fs } = deps;

  async function getGitState(dirPath) {
    const gitDir = path.join(dirPath, '.git');
    const rebasing = fs.existsSync(path.join(gitDir, 'rebase-merge')) || fs.existsSync(path.join(gitDir, 'rebase-apply'));
    const cherryPicking = fs.existsSync(path.join(gitDir, 'sequencer'));
    const merging = fs.existsSync(path.join(gitDir, 'MERGE_HEAD'));
    return { ok: true, rebasing, cherryPicking, merging };
  }

  async function getGitUser(dirPath) {
    try {
      const [nameOut, emailOut] = await Promise.all([
        runInDir(dirPath, 'git', ['config', '--get', 'user.name']).catch(() => ({ stdout: '' })),
        runInDir(dirPath, 'git', ['config', '--get', 'user.email']).catch(() => ({ stdout: '' })),
      ]);
      const name = (nameOut.stdout || '').trim();
      const email = (emailOut.stdout || '').trim();
      return { ok: true, name, email };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to get git user', name: '', email: '' };
    }
  }

  return {
    getGitState,
    getGitUser,
  };
}

module.exports = { createGitState };
