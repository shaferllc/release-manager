const { createGitMergeRebase } = require('../mergeRebase');

describe('git mergeRebase', () => {
  const dir = '/repo';

  it('gitMerge returns error when branch name empty', async () => {
    const api = createGitMergeRebase({ runInDir: jest.fn() });
    const result = await api.gitMerge(dir, '');
    expect(result.ok).toBe(false);
  });

  it('gitMerge calls merge branch', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitMergeRebase({ runInDir });
    await api.gitMerge(dir, 'feature');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['merge', 'feature']);
  });

  it('gitMerge with strategy ours adds -s ours', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitMergeRebase({ runInDir });
    await api.gitMerge(dir, 'feature', { strategy: 'ours' });
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['merge', '-s', 'ours', 'feature']);
  });

  it('gitMergeContinue calls merge --continue', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitMergeRebase({ runInDir });
    await api.gitMergeContinue(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['merge', '--continue']);
  });

  it('gitRebase returns error when onto empty', async () => {
    const api = createGitMergeRebase({ runInDir: jest.fn() });
    const result = await api.gitRebase(dir, '');
    expect(result.ok).toBe(false);
  });

  it('gitRebase calls rebase onto', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitMergeRebase({ runInDir });
    await api.gitRebase(dir, 'main');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['rebase', 'main']);
  });

  it('gitRebaseAbort calls rebase --abort', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitMergeRebase({ runInDir });
    await api.gitRebaseAbort(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['rebase', '--abort']);
  });

  it('gitRebaseContinue calls rebase --continue', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitMergeRebase({ runInDir });
    await api.gitRebaseContinue(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['rebase', '--continue']);
  });

  it('gitRebaseSkip calls rebase --skip', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitMergeRebase({ runInDir });
    await api.gitRebaseSkip(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['rebase', '--skip']);
  });

  it('gitRebaseInteractive calls rebase -i with env', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitMergeRebase({ runInDir });
    await api.gitRebaseInteractive(dir, 'main');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['rebase', '-i', 'main'], expect.any(Object));
  });
});
