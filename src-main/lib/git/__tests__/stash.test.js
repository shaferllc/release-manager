const { createGitStash } = require('../stash');

describe('git stash', () => {
  const dir = '/repo';
  const path = require('path');
  const parseStashList = (stdout) =>
    (stdout || '')
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => ({ index: line.split(/\s/)[0], message: line }));

  it('getStashList returns error when dirPath empty', async () => {
    const api = createGitStash({ runInDir: jest.fn(), path, fs: { existsSync: () => true }, parseStashList });
    const result = await api.getStashList('');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('path');
  });

  it('getStashList returns error when not a git repo', async () => {
    const fs = { existsSync: (p) => !p.includes('.git') };
    const api = createGitStash({ runInDir: jest.fn(), path, fs, parseStashList });
    const result = await api.getStashList(dir);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Not a Git');
  });

  it('getStashList returns entries from parseStashList', async () => {
    const fs = { existsSync: (p) => p.endsWith('.git') };
    const runInDir = jest.fn().mockResolvedValue({ stdout: 'stash@{0} WIP\n' });
    const api = createGitStash({ runInDir, path, fs, parseStashList });
    const result = await api.getStashList(dir);
    expect(result.ok).toBe(true);
    expect(result.entries).toBeDefined();
  });

  it('stashApply calls git stash apply', async () => {
    const fs = { existsSync: (p) => p.endsWith('.git') };
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitStash({ runInDir, path, fs, parseStashList });
    await api.stashApply(dir, 'stash@{0}');
    expect(runInDir).toHaveBeenCalledWith(path.resolve(dir), 'git', ['stash', 'apply', 'stash@{0}']);
  });

  it('gitStashPush calls git stash push', async () => {
    const fs = { existsSync: (p) => p.endsWith('.git') };
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitStash({ runInDir, path, fs, parseStashList });
    await api.gitStashPush(dir, 'msg');
    expect(runInDir).toHaveBeenCalledWith(path.resolve(dir), 'git', ['stash', 'push', '-m', 'msg']);
  });

  it('stashDrop calls git stash drop', async () => {
    const fs = { existsSync: (p) => p.endsWith('.git') };
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitStash({ runInDir, path, fs, parseStashList });
    await api.stashDrop(dir, 'stash@{0}');
    expect(runInDir).toHaveBeenCalledWith(path.resolve(dir), 'git', ['stash', 'drop', 'stash@{0}']);
  });

  it('gitStashPop calls git stash pop', async () => {
    const fs = { existsSync: (p) => p.endsWith('.git') };
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitStash({ runInDir, path, fs, parseStashList });
    await api.gitStashPop(dir);
    expect(runInDir).toHaveBeenCalledWith(path.resolve(dir), 'git', ['stash', 'pop']);
  });
});
