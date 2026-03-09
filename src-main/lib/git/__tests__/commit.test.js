const { createGitCommit } = require('../commit');

describe('git commit', () => {
  const dir = '/repo';

  it('gitCommit returns error when message empty', async () => {
    const api = createGitCommit({ runInDir: jest.fn(), getPreference: () => false });
    const result = await api.gitCommit(dir, '');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('message');
  });

  it('gitCommit calls add -A and commit -m', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitCommit({ runInDir, getPreference: () => false });
    const result = await api.gitCommit(dir, 'fix: thing');
    expect(result.ok).toBe(true);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['add', '-A']);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['commit', '-m', 'fix: thing']);
  });

  it('gitCommit adds -S when signCommits true', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitCommit({ runInDir, getPreference: () => true });
    await api.gitCommit(dir, 'fix');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['commit', '-m', 'fix', '-S']);
  });

  it('gitDiscardChanges calls reset and clean', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitCommit({ runInDir, getPreference: () => false });
    await api.gitDiscardChanges(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['reset', '--hard', 'HEAD']);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['clean', '-fd']);
  });

  it('gitMergeAbort calls merge --abort', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitCommit({ runInDir, getPreference: () => false });
    await api.gitMergeAbort(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['merge', '--abort']);
  });
});
