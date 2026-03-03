/**
 * Git commit, discard, merge abort.
 * @param {{ runInDir: Function, getPreference: Function }} deps
 */
function createGitCommit(deps) {
  const { runInDir, getPreference } = deps;

  async function gitCommit(dirPath, message, options = {}) {
    if (!message || typeof message !== 'string' || !message.trim()) {
      return { ok: false, error: 'Commit message is required' };
    }
    const msg = message.trim();
    const sign = options.sign !== undefined ? options.sign : getPreference('signCommits');
    try {
      await runInDir(dirPath, 'git', ['add', '-A']);
      const commitArgs = ['commit', '-m', msg];
      if (sign) commitArgs.push('-S');
      await runInDir(dirPath, 'git', commitArgs);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Commit failed' };
    }
  }

  async function gitDiscardChanges(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['reset', '--hard', 'HEAD']);
      await runInDir(dirPath, 'git', ['clean', '-fd']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Discard failed' };
    }
  }

  async function gitMergeAbort(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['merge', '--abort']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Merge abort failed' };
    }
  }

  return {
    gitCommit,
    gitDiscardChanges,
    gitMergeAbort,
  };
}

module.exports = { createGitCommit };
