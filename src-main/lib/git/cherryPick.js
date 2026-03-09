/**
 * Git cherry-pick.
 * @param {{ runInDir: Function }} deps
 */
function createGitCherryPick(deps) {
  const { runInDir } = deps;

  async function gitCherryPick(dirPath, sha) {
    const s = (sha || '').trim();
    if (!s) return { ok: false, error: 'Commit SHA required' };
    try {
      await runInDir(dirPath, 'git', ['cherry-pick', s]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Cherry-pick failed' };
    }
  }

  async function gitCherryPickAbort(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['cherry-pick', '--abort']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Cherry-pick abort failed' };
    }
  }

  async function gitCherryPickContinue(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['cherry-pick', '--continue']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Cherry-pick continue failed' };
    }
  }

  return {
    gitCherryPick,
    gitCherryPickAbort,
    gitCherryPickContinue,
  };
}

module.exports = { createGitCherryPick };
