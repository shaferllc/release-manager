/**
 * .gitattributes read/write.
 * @param {{ path: Object, fs: Object }} deps
 */
function createGitAttributes(deps) {
  const { path, fs } = deps;

  async function getGitattributes(dirPath) {
    const p = path.join(dirPath, '.gitattributes');
    try {
      if (!fs.existsSync(p)) return { ok: true, content: null, path: p };
      const content = fs.readFileSync(p, 'utf8').slice(0, 8192);
      return { ok: true, content, path: p };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to read .gitattributes', content: null, path: p };
    }
  }

  async function writeGitattributes(dirPath, content) {
    const p = path.join(dirPath, '.gitattributes');
    try {
      fs.writeFileSync(p, typeof content === 'string' ? content : '', 'utf8');
      return { ok: true, path: p };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to write .gitattributes', path: p };
    }
  }

  return {
    getGitattributes,
    writeGitattributes,
  };
}

module.exports = { createGitAttributes };
