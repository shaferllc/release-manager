const { createGitSubmodules } = require('../submodules');

describe('git submodules', () => {
  const dir = '/repo';

  it('getSubmodules returns list from submodule status', async () => {
    const runInDir = jest
      .fn()
      .mockResolvedValueOnce({ stdout: ' abc123 sub/foo\n' })
      .mockResolvedValueOnce({ stdout: 'https://github.com/a/b\n' });
    const api = createGitSubmodules({ runInDir });
    const result = await api.getSubmodules(dir);
    expect(result.ok).toBe(true);
    expect(result.submodules).toHaveLength(1);
    expect(result.submodules[0].path).toBe('sub/foo');
    expect(result.submodules[0].sha).toBe('abc123');
  });

  it('submoduleUpdate calls submodule update --init --recursive', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitSubmodules({ runInDir });
    await api.submoduleUpdate(dir, true);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['submodule', 'update', '--init', '--recursive']);
  });

  it('submoduleUpdate without init omits --init', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitSubmodules({ runInDir });
    await api.submoduleUpdate(dir, false);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['submodule', 'update', '--recursive']);
  });
});
