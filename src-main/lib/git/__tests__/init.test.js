const { createGitInit } = require('../init');

describe('git init', () => {
  const dir = '/repo';
  const path = require('path');

  it('gitInit returns error when dirPath empty', async () => {
    const api = createGitInit({ runInDir: jest.fn(), path, fs: { existsSync: () => false } });
    const result = await api.gitInit('');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('path');
  });

  it('gitInit returns error when repo already exists', async () => {
    const fs = { existsSync: (p) => p.endsWith('.git') };
    const api = createGitInit({ runInDir: jest.fn(), path, fs });
    const result = await api.gitInit(dir);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('already exists');
  });

  it('gitInit calls git init', async () => {
    const fs = { existsSync: () => false };
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitInit({ runInDir, path, fs });
    const result = await api.gitInit(dir);
    expect(result.ok).toBe(true);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['init']);
  });
});
