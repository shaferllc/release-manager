/**
 * Git bisect.
 * @param {{ runInDir: Function, runInDirCapture: Function }} deps
 */
function createGitBisect(deps) {
  const { runInDir, runInDirCapture } = deps;

  async function getBisectStatus(dirPath) {
    try {
      const out = await runInDir(dirPath, 'git', ['bisect', 'status']);
      const text = (out.stdout || '').trim();
      const active = text.includes('bisecting');
      let current = '';
      let currentSha = '';
      let good = '';
      let bad = '';
      let remaining = '';
      const currentMatch = text.match(/Currently at: ([^\n]+)/);
      if (currentMatch) {
        current = currentMatch[1].trim();
        const shaMatch = current.match(/^([0-9a-f]{7,40})/i);
        if (shaMatch) currentSha = shaMatch[1];
      }
      const goodMatch = text.match(/between ([^\n]+) and/);
      if (goodMatch) good = goodMatch[1].trim();
      const badMatch = text.match(/and ([^\n\s]+)/);
      if (badMatch) bad = badMatch[1].trim();
      const remMatch = text.match(/(\d+) revisions left/);
      if (remMatch) remaining = remMatch[1];
      return { ok: true, active, current, currentSha, good, bad, remaining, raw: text };
    } catch (e) {
      return { ok: false, error: e.message || 'Bisect status failed', active: false, raw: '' };
    }
  }

  async function bisectStart(dirPath, badRef, goodRef) {
    const bad = (badRef || 'HEAD').trim();
    const good = (goodRef || '').trim();
    try {
      const args = ['bisect', 'start'];
      await runInDir(dirPath, 'git', args);
      await runInDir(dirPath, 'git', ['bisect', 'bad', bad]);
      if (good) await runInDir(dirPath, 'git', ['bisect', 'good', good]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Bisect start failed' };
    }
  }

  async function bisectGood(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['bisect', 'good']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Bisect good failed' };
    }
  }

  async function bisectBad(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['bisect', 'bad']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Bisect bad failed' };
    }
  }

  async function bisectSkip(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['bisect', 'skip']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Bisect skip failed' };
    }
  }

  async function bisectRun(dirPath, commandArgs) {
    const args = Array.isArray(commandArgs) && commandArgs.length > 0 ? commandArgs : ['true'];
    const result = await runInDirCapture(dirPath, 'git', ['bisect', 'run', ...args]);
    return { ok: true, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
  }

  async function bisectReset(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['bisect', 'reset']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Bisect reset failed' };
    }
  }

  return {
    getBisectStatus,
    bisectStart,
    bisectGood,
    bisectBad,
    bisectSkip,
    bisectRun,
    bisectReset,
  };
}

module.exports = { createGitBisect };
