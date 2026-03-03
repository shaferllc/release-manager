const { createGitState } = require('../state');

describe('git state', () => {
  const dir = '/repo';
  const path = require('path');

  it('getGitState returns rebasing/cherryPicking/merging from fs', async () => {
    const fs = {
      existsSync: jest.fn().mockReturnValue(false),
    };
    const api = createGitState({ runInDir: jest.fn(), path, fs });
    const result = await api.getGitState(dir);
    expect(result.ok).toBe(true);
    expect(result.rebasing).toBe(false);
    expect(result.merging).toBe(false);
  });

  it('getGitState returns rebasing true when rebase-merge exists', async () => {
    const fs = {
      existsSync: jest.fn().mockImplementation((p) => p.includes('rebase-merge')),
    };
    const api = createGitState({ runInDir: jest.fn(), path, fs });
    const result = await api.getGitState(dir);
    expect(result.rebasing).toBe(true);
  });

  it('getGitUser returns name and email', async () => {
    const runInDir = jest
      .fn()
      .mockResolvedValueOnce({ stdout: 'Alice\n' })
      .mockResolvedValueOnce({ stdout: 'a@b.com\n' });
    const api = createGitState({ runInDir, path, fs: { existsSync: () => false } });
    const result = await api.getGitUser(dir);
    expect(result.ok).toBe(true);
    expect(result.name).toBe('Alice');
    expect(result.email).toBe('a@b.com');
  });
});
