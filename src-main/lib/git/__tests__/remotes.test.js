const { createGitRemotes } = require('../remotes');

describe('git remotes', () => {
  const dir = '/repo';
  const parseRemotes = (stdout) => {
    const lines = (stdout || '').trim().split(/\r?\n/);
    const byName = {};
    for (const line of lines) {
      const [name, url, role] = line.split(/\s+/);
      if (role === 'fetch' || !byName[name]) byName[name] = { name, url: url || '' };
    }
    return Object.values(byName);
  };

  it('getRemotes returns parsed remotes', async () => {
    const runInDir = jest.fn().mockResolvedValue({ stdout: 'origin\thttps://github.com/a/b\tfetch\n' });
    const api = createGitRemotes({ runInDir, parseRemotes });
    const result = await api.getRemotes(dir);
    expect(result.ok).toBe(true);
    expect(result.remotes).toHaveLength(1);
    expect(result.remotes[0].name).toBe('origin');
  });

  it('getRemotes returns ok false on throw', async () => {
    const runInDir = jest.fn().mockRejectedValue(new Error('fail'));
    const api = createGitRemotes({ runInDir, parseRemotes });
    const result = await api.getRemotes(dir);
    expect(result.ok).toBe(false);
    expect(result.remotes).toEqual([]);
  });

  it('addRemote returns error when name or url empty', async () => {
    const api = createGitRemotes({ runInDir: jest.fn(), parseRemotes });
    const result = await api.addRemote(dir, '', 'https://u');
    expect(result.ok).toBe(false);
  });

  it('addRemote calls remote add', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitRemotes({ runInDir, parseRemotes });
    await api.addRemote(dir, 'origin', 'https://u');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['remote', 'add', 'origin', 'https://u']);
  });

  it('removeRemote calls remote remove', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitRemotes({ runInDir, parseRemotes });
    await api.removeRemote(dir, 'origin');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['remote', 'remove', 'origin']);
  });

  it('renameRemote returns ok when old === new', async () => {
    const api = createGitRemotes({ runInDir: jest.fn(), parseRemotes });
    const result = await api.renameRemote(dir, 'o', 'o');
    expect(result.ok).toBe(true);
  });

  it('setRemoteUrl calls remote set-url', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitRemotes({ runInDir, parseRemotes });
    await api.setRemoteUrl(dir, 'origin', 'https://new');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['remote', 'set-url', 'origin', 'https://new']);
  });
});
