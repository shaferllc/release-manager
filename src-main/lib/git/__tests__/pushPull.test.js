const { createGitPushPull } = require('../pushPull');

describe('git pushPull', () => {
  const dir = '/repo';

  it('gitFetch calls fetch', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitPushPull({ runInDir });
    const result = await api.gitFetch(dir);
    expect(result.ok).toBe(true);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['fetch']);
  });

  it('gitPull calls pull --no-rebase', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitPushPull({ runInDir });
    await api.gitPull(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['pull', '--no-rebase']);
  });

  it('gitPullFFOnly calls pull --ff-only', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitPushPull({ runInDir });
    await api.gitPullFFOnly(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['pull', '--ff-only']);
  });

  it('gitPullRebase calls pull --rebase', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitPushPull({ runInDir });
    await api.gitPullRebase(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['pull', '--rebase']);
  });

  it('gitPush calls push', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitPushPull({ runInDir });
    await api.gitPush(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['push']);
  });

  it('gitPushForce with lease calls push --force-with-lease when upstream', async () => {
    const runInDir = jest
      .fn()
      .mockResolvedValueOnce({ stdout: 'main\n' })
      .mockResolvedValueOnce({ stdout: 'origin/main\n' })
      .mockResolvedValueOnce({});
    const api = createGitPushPull({ runInDir });
    const result = await api.gitPushForce(dir, true);
    expect(result.ok).toBe(true);
    expect(runInDir).toHaveBeenLastCalledWith(dir, 'git', ['push', '--force-with-lease']);
  });

  it('gitFetchRemote calls fetch remote', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitPushPull({ runInDir });
    await api.gitFetchRemote(dir, 'origin');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['fetch', 'origin']);
  });

  it('gitPushForce without upstream pushes -u origin branch', async () => {
    const runInDir = jest
      .fn()
      .mockResolvedValueOnce({ stdout: 'main\n' })
      .mockResolvedValueOnce({ stdout: '' })
      .mockResolvedValueOnce({});
    const api = createGitPushPull({ runInDir });
    const result = await api.gitPushForce(dir, false);
    expect(result.ok).toBe(true);
    expect(runInDir).toHaveBeenLastCalledWith(dir, 'git', ['push', '--force', '-u', 'origin', 'main']);
  });

  it('gitPushWithUpstream calls push -u origin branch', async () => {
    const runInDir = jest
      .fn()
      .mockResolvedValueOnce({ stdout: 'feature\n' })
      .mockResolvedValueOnce({});
    const api = createGitPushPull({ runInDir });
    await api.gitPushWithUpstream(dir);
    expect(runInDir).toHaveBeenLastCalledWith(dir, 'git', ['push', '-u', 'origin', 'feature']);
  });
});
