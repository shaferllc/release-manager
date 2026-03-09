/**
 * Git submodules.
 * @param {{ runInDir: Function }} deps
 */
function createGitSubmodules(deps) {
  const { runInDir } = deps;

  async function getSubmodules(dirPath) {
    try {
      const out = await runInDir(dirPath, 'git', ['submodule', 'status']);
      const lines = (out.stdout || '').trim().split(/\r?\n/).filter(Boolean);
      const subs = [];
      for (const line of lines) {
        const match = line.match(/^[\s\-+]?([a-f0-9]+)\s+(\S+)(?:\s+\([^)]*\))?$/);
        if (match) {
          const sha = match[1];
          const subPath = match[2];
          let url = '';
          try {
            const cfg = await runInDir(dirPath, 'git', ['config', '--get', `submodule.${subPath}.url`]);
            url = (cfg.stdout || '').trim();
          } catch (_) {}
          subs.push({ path: subPath, url, sha });
        }
      }
      return { ok: true, submodules: subs };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to list submodules', submodules: [] };
    }
  }

  async function submoduleUpdate(dirPath, init = true) {
    try {
      const args = init ? ['submodule', 'update', '--init', '--recursive'] : ['submodule', 'update', '--recursive'];
      await runInDir(dirPath, 'git', args);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Submodule update failed' };
    }
  }

  return {
    getSubmodules,
    submoduleUpdate,
  };
}

module.exports = { createGitSubmodules };
