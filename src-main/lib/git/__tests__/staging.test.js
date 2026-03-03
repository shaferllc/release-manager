const { createGitStaging } = require('../staging');

describe('git staging', () => {
  const dir = '/repo';

  it('stageFile calls add', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitStaging({ runInDir });
    const result = await api.stageFile(dir, 'foo.js');
    expect(result.ok).toBe(true);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['add', 'foo.js']);
  });

  it('stageFile returns error when path empty', async () => {
    const api = createGitStaging({ runInDir: jest.fn() });
    const result = await api.stageFile(dir, '');
    expect(result.ok).toBe(false);
  });

  it('unstageFile calls reset HEAD -- file', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitStaging({ runInDir });
    await api.unstageFile(dir, 'foo.js');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['reset', 'HEAD', '--', 'foo.js']);
  });

  it('discardFile calls checkout -- file', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitStaging({ runInDir });
    await api.discardFile(dir, 'foo.js');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['checkout', '--', 'foo.js']);
  });
});
