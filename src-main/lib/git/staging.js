/**
 * Stage, unstage, discard single file.
 * @param {{ runInDir: Function }} deps
 */
function createGitStaging(deps) {
  const { runInDir } = deps;

  async function stageFile(dirPath, filePath) {
    const f = (filePath || '').trim();
    if (!f) return { ok: false, error: 'File path required' };
    try {
      await runInDir(dirPath, 'git', ['add', f]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Stage failed' };
    }
  }

  async function unstageFile(dirPath, filePath) {
    const f = (filePath || '').trim();
    if (!f) return { ok: false, error: 'File path required' };
    try {
      await runInDir(dirPath, 'git', ['reset', 'HEAD', '--', f]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Unstage failed' };
    }
  }

  async function discardFile(dirPath, filePath) {
    const f = (filePath || '').trim();
    if (!f) return { ok: false, error: 'File path required' };
    try {
      await runInDir(dirPath, 'git', ['checkout', '--', f]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Discard file failed' };
    }
  }

  return {
    stageFile,
    unstageFile,
    discardFile,
  };
}

module.exports = { createGitStaging };
