/**
 * Git merge and rebase.
 * @param {{ runInDir: Function }} deps
 */
function createGitMergeRebase(deps) {
  const { runInDir } = deps;

  async function gitMerge(dirPath, branchName, options = {}) {
    const name = (branchName || '').trim();
    if (!name) return { ok: false, error: 'Branch name is required' };
    try {
      const args = ['merge'];
      if (options.strategy === 'ours') args.push('-s', 'ours');
      else if (options.strategy === 'theirs') args.push('-s', 'theirs');
      if (options.strategyOption === 'ours') args.push('-X', 'ours');
      else if (options.strategyOption === 'theirs') args.push('-X', 'theirs');
      args.push(name);
      await runInDir(dirPath, 'git', args);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Merge failed' };
    }
  }

  async function gitMergeContinue(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['merge', '--continue']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Merge continue failed' };
    }
  }

  async function gitRebase(dirPath, ontoBranch) {
    const onto = (ontoBranch || '').trim();
    if (!onto) return { ok: false, error: 'Branch name is required' };
    try {
      await runInDir(dirPath, 'git', ['rebase', onto]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Rebase failed' };
    }
  }

  async function gitRebaseAbort(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['rebase', '--abort']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Rebase abort failed' };
    }
  }

  async function gitRebaseContinue(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['rebase', '--continue']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Rebase continue failed' };
    }
  }

  async function gitRebaseSkip(dirPath) {
    try {
      await runInDir(dirPath, 'git', ['rebase', '--skip']);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Rebase skip failed' };
    }
  }

  async function gitRebaseInteractive(dirPath, ref) {
    const r = (ref || '').trim();
    if (!r) return { ok: false, error: 'Ref is required (e.g. branch name or HEAD~5)' };
    const editors = ['cursor --wait', 'code --wait'];
    for (const editor of editors) {
      try {
        await runInDir(dirPath, 'git', ['rebase', '-i', r], { env: { ...process.env, GIT_EDITOR: editor } });
        return { ok: true };
      } catch (e) {
        try {
          await runInDir(dirPath, 'git', ['rebase', '--abort']).catch(() => {});
        } catch (_) {}
        if (editor === editors[editors.length - 1]) {
          return { ok: false, error: (e.message || 'Interactive rebase failed') + '. Ensure Cursor or VS Code is in PATH with --wait support.' };
        }
      }
    }
    return { ok: false, error: 'Interactive rebase failed. Ensure Cursor or VS Code is in PATH.' };
  }

  return {
    gitMerge,
    gitMergeContinue,
    gitRebase,
    gitRebaseAbort,
    gitRebaseContinue,
    gitRebaseSkip,
    gitRebaseInteractive,
  };
}

module.exports = { createGitMergeRebase };
