const { createGitResetRevert } = require('../resetRevert');

describe('git resetRevert', () => {
  const dir = '/repo';

  it('gitReset calls reset --mode ref', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitResetRevert({ runInDir, getPreference: () => false });
    await api.gitReset(dir, 'HEAD~1', 'hard');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['reset', '--hard', 'HEAD~1']);
  });

  it('gitReset defaults to mixed', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitResetRevert({ runInDir, getPreference: () => false });
    await api.gitReset(dir, 'HEAD');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['reset', '--mixed', 'HEAD']);
  });

  it('gitRevert returns error when sha empty', async () => {
    const api = createGitResetRevert({ runInDir: jest.fn(), getPreference: () => false });
    const result = await api.gitRevert(dir, '');
    expect(result.ok).toBe(false);
  });

  it('gitRevert calls revert --no-edit sha', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitResetRevert({ runInDir, getPreference: () => false });
    await api.gitRevert(dir, 'abc123');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['revert', '--no-edit', 'abc123']);
  });

  it('gitAmend with message calls commit --amend -m', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitResetRevert({ runInDir, getPreference: () => false });
    await api.gitAmend(dir, 'fixed');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['commit', '--amend', '-m', 'fixed']);
  });

  it('getReflog returns entries', async () => {
    const runInDir = jest.fn().mockResolvedValue({ stdout: 'abc HEAD refs/heads/main: commit\n' });
    const api = createGitResetRevert({ runInDir, getPreference: () => false });
    const result = await api.getReflog(dir, 10);
    expect(result.ok).toBe(true);
    expect(result.entries).toBeDefined();
  });

  it('checkoutRef calls checkout ref', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitResetRevert({ runInDir, getPreference: () => false });
    await api.checkoutRef(dir, 'abc123');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['checkout', 'abc123']);
  });

  it('gitPruneRemotes calls fetch --prune', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitResetRevert({ runInDir, getPreference: () => false });
    await api.gitPruneRemotes(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['fetch', '--prune']);
  });
});
