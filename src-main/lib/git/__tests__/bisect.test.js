const { createGitBisect } = require('../bisect');

describe('git bisect', () => {
  const dir = '/repo';

  it('getBisectStatus returns active and parsed fields', async () => {
    const runInDir = jest.fn().mockResolvedValue({
      stdout: 'bisecting (5/10)\nCurrently at: abc1234 fix\nbetween good and bad\n3 revisions left to test',
    });
    const api = createGitBisect({ runInDir, runInDirCapture: jest.fn() });
    const result = await api.getBisectStatus(dir);
    expect(result.ok).toBe(true);
    expect(result.active).toBe(true);
    expect(result.currentSha).toBe('abc1234');
    expect(result.remaining).toBe('3');
  });

  it('bisectStart calls bisect start, bad, good', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitBisect({ runInDir, runInDirCapture: jest.fn() });
    await api.bisectStart(dir, 'HEAD', 'v1.0.0');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['bisect', 'start']);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['bisect', 'bad', 'HEAD']);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['bisect', 'good', 'v1.0.0']);
  });

  it('bisectGood calls bisect good', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitBisect({ runInDir, runInDirCapture: jest.fn() });
    await api.bisectGood(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['bisect', 'good']);
  });

  it('bisectBad calls bisect bad', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitBisect({ runInDir, runInDirCapture: jest.fn() });
    await api.bisectBad(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['bisect', 'bad']);
  });

  it('bisectReset calls bisect reset', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const api = createGitBisect({ runInDir, runInDirCapture: jest.fn() });
    await api.bisectReset(dir);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['bisect', 'reset']);
  });
});
