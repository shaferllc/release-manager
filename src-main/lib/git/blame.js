/**
 * Git blame.
 * @param {{ runInDir: Function }} deps
 */
function createGitBlame(deps) {
  const { runInDir } = deps;

  async function getBlame(dirPath, filePath) {
    const f = (filePath || '').trim();
    if (!f) return { ok: false, error: 'File path required', text: '' };
    try {
      const out = await runInDir(dirPath, 'git', ['blame', '-w', '--no-color', '-L', '1,500', '--', f]);
      return { ok: true, text: (out.stdout || '').trim() };
    } catch (e) {
      return { ok: false, error: e.message || 'Blame failed', text: '' };
    }
  }

  return { getBlame };
}

module.exports = { createGitBlame };
