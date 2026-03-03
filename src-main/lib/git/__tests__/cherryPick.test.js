const { createGitCherryPick } = require('../cherryPick');

describe('git cherryPick', () => {
  const dir = '/repo';

  it('gitCherryPick returns error when sha empty', async () => {
    const api = createGitCherryPick({ runInDir: jest.fn() });
    const result = await api.gitCherryPick(dir, '');
    expect(result.ok).toBe(false);
  });

  it('gitCherryPick calls cherry-pick sha', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitCherryPick({ runInDir });
    await api.gitCherryPick(dir, 'abc123');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['cherry-pick', 'abc123']);
  });

  it('gitCherryPickAbort calls cherry-pick --abort', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitCherryPick({ runInDir });
    await api.gitCherryPickAbort(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['cherry-pick', '--abort']);
  });

  it('gitCherryPickContinue calls cherry-pick --continue', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitCherryPick({ runInDir });
    await api.gitCherryPickContinue(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['cherry-pick', '--continue']);
  });
});
