/**
 * Git status, tracked files, project files, push remote.
 * @param {{ runInDir: Function, path: Object, fs: Object }} deps
 */
function createGitStatus(deps) {
  const { runInDir, path, fs } = deps;

  const PROJECT_FILES_SKIP_DIRS = new Set([
    '.git', 'node_modules', 'vendor', '__pycache__', '.pycache', '.next', '.nuxt', '.output',
    'dist', 'build', 'out', 'coverage', '.turbo', '.cache', '.parcel-cache', '.vite', '.svelte-kit',
    '.idea', '.vscode', 'tmp', 'temp', '.tmp', '.temp', 'cache', '.cache',
  ]);

  async function getPushRemote(dirPath) {
    try {
      const branchOut = await runInDir(dirPath, 'git', ['branch', '--show-current']);
      const branch = (branchOut.stdout || '').trim();
      if (branch) {
        const remoteOut = await runInDir(dirPath, 'git', ['config', '--get', `branch.${branch}.remote`]);
        const remote = (remoteOut.stdout || '').trim();
        if (remote) return remote;
      }
      const listOut = await runInDir(dirPath, 'git', ['remote']);
      const remotes = (listOut.stdout || '').trim().split(/\r?\n/).filter(Boolean);
      return remotes[0] || null;
    } catch (_) {
      return null;
    }
  }

  async function getGitStatus(dirPath) {
    try {
      const out = await runInDir(dirPath, 'git', ['status', '--porcelain', '-uall']);
      const trimmed = (out.stdout || '').trim();
      return { clean: trimmed.length === 0, output: trimmed || null };
    } catch (e) {
      return { clean: false, output: e.message || null };
    }
  }

  /** Runs `git status -sb` and parses branch, ahead, behind from the first line. */
  async function getStatusShort(dirPath) {
    try {
      const out = await runInDir(dirPath, 'git', ['status', '-sb']);
      const statusLines = (out.stdout || '').trim().split(/\r?\n/).filter(Boolean);
      const statusLine = statusLines[0] || '';
      const branchOut = await runInDir(dirPath, 'git', ['branch', '--show-current']).catch(() => ({ stdout: '' }));
      let branch = (branchOut.stdout || '').trim();
      if (!branch) {
        const branchMatch = statusLine.match(/^##\s+(.+?)(?:\.\.\.|$)/);
        if (branchMatch) branch = branchMatch[1].trim();
      }
      const aheadMatch = statusLine.match(/ahead\s+(\d+)/);
      const behindMatch = statusLine.match(/behind\s+(\d+)/);
      const ahead = aheadMatch ? parseInt(aheadMatch[1], 10) : null;
      const behind = behindMatch ? parseInt(behindMatch[1], 10) : null;
      return { ok: true, branch: branch || null, ahead, behind };
    } catch (e) {
      return { ok: false, error: e.message || 'Status failed', branch: null, ahead: null, behind: null };
    }
  }

  async function getTrackedFiles(dirPath) {
    try {
      const out = await runInDir(dirPath, 'git', ['ls-files']);
      const files = (out.stdout || '').trim().split(/\r?\n/).filter(Boolean);
      return { ok: true, files };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to list files', files: [] };
    }
  }

  function getProjectFiles(dirPath) {
    const files = [];
    const base = path.resolve(dirPath);
    if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) {
      return { ok: true, files: [] };
    }
    function walk(relDir) {
      const fullDir = path.join(base, relDir);
      let entries;
      try {
        entries = fs.readdirSync(fullDir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const relPath = relDir ? `${relDir}/${e.name}` : e.name;
        if (e.isDirectory()) {
          if (PROJECT_FILES_SKIP_DIRS.has(e.name)) continue;
          walk(relPath);
        } else if (e.isFile()) {
          files.push(relPath);
        }
      }
    }
    walk('');
    return { ok: true, files };
  }

  return {
    getPushRemote,
    getGitStatus,
    getStatusShort,
    getTrackedFiles,
    getProjectFiles,
  };
}

module.exports = { createGitStatus };
