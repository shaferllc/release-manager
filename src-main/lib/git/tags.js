/**
 * Git tags: list, checkout, create, delete, push.
 * @param {{ runInDir: Function }} deps
 */
function createGitTags(deps) {
  const { runInDir } = deps;

  async function getTags(dirPath) {
    try {
      const out = await runInDir(dirPath, 'git', ['tag', '-l', '--sort=-version:refname']);
      const tags = (out.stdout || '').trim().split(/\r?\n/).filter(Boolean);
      return { ok: true, tags };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to list tags', tags: [] };
    }
  }

  async function checkoutTag(dirPath, tagName) {
    const name = (tagName || '').trim();
    if (!name) return { ok: false, error: 'Tag name is required' };
    try {
      await runInDir(dirPath, 'git', ['checkout', name]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Checkout failed' };
    }
  }

  async function createTag(dirPath, tagName, message, ref) {
    const name = (tagName || '').trim();
    if (!name) return { ok: false, error: 'Tag name is required' };
    const r = (ref || 'HEAD').trim();
    try {
      if (message != null && String(message).trim()) {
        await runInDir(dirPath, 'git', ['tag', '-a', name, '-m', String(message).trim(), r]);
      } else {
        await runInDir(dirPath, 'git', ['tag', name, r]);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Create tag failed' };
    }
  }

  async function deleteTag(dirPath, tagName) {
    const t = (tagName || '').trim();
    if (!t) return { ok: false, error: 'Tag name required' };
    try {
      await runInDir(dirPath, 'git', ['tag', '-d', t]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Delete tag failed' };
    }
  }

  async function pushTag(dirPath, tagName, remoteName = 'origin') {
    const t = (tagName || '').trim();
    const r = (remoteName || 'origin').trim();
    if (!t) return { ok: false, error: 'Tag name required' };
    try {
      await runInDir(dirPath, 'git', ['push', r, 'refs/tags/' + t]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Push tag failed' };
    }
  }

  return {
    getTags,
    checkoutTag,
    createTag,
    deleteTag,
    pushTag,
  };
}

module.exports = { createGitTags };
