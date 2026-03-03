const { createGitProjectInfo } = require('../projectInfo');

describe('git projectInfo', () => {
  const dir = '/repo';
  const parsePorcelainLines = (output) => ({
    lines: (output || '').split(/\n/).map((line) => ({ raw: line })),
    conflictCount: (output || '').includes('UU') ? 1 : 0,
  });

  it('getProjectInfoFromGit returns all fields from deps', async () => {
    const getTags = jest.fn().mockResolvedValue({ ok: true, tags: ['v1.0.0', 'v0.9.0'] });
    const getPushRemote = jest.fn().mockResolvedValue('origin');
    const getRemotes = jest.fn().mockResolvedValue({ ok: true, remotes: [{ name: 'origin', url: 'https://github.com/a/b' }] });
    const getGitStatus = jest.fn().mockResolvedValue({ output: ' M foo.js\n' });
    const getStatusShort = jest.fn().mockResolvedValue({ ok: true, branch: 'main', ahead: 1, behind: 0 });
    const runInDir = jest.fn().mockResolvedValue({ stdout: '3\n' });
    const api = createGitProjectInfo({
      getTags,
      getPushRemote,
      getRemotes,
      getGitStatus,
      getStatusShort,
      parsePorcelainLines,
      runInDir,
    });
    const result = await api.getProjectInfoFromGit(dir);
    expect(result.latestTag).toBe('v1.0.0');
    expect(result.allTags).toContain('v1.0.0');
    expect(result.commitsSinceLatestTag).toBe(3);
    expect(result.gitRemote).toBe('https://github.com/a/b');
    expect(result.branch).toBe('main');
    expect(result.ahead).toBe(1);
    expect(result.uncommittedLines.length).toBeGreaterThanOrEqual(0);
  });

  it('getProjectInfoFromGit handles no tags', async () => {
    const getTags = jest.fn().mockResolvedValue({ ok: true, tags: [] });
    const getPushRemote = jest.fn().mockResolvedValue(null);
    const getRemotes = jest.fn().mockResolvedValue({ ok: true, remotes: [] });
    const getGitStatus = jest.fn().mockResolvedValue({ output: null });
    const getStatusShort = jest.fn().mockResolvedValue({ ok: true, branch: null, ahead: null, behind: null });
    const runInDir = jest.fn();
    const api = createGitProjectInfo({
      getTags,
      getPushRemote,
      getRemotes,
      getGitStatus,
      getStatusShort,
      parsePorcelainLines,
      runInDir,
    });
    const result = await api.getProjectInfoFromGit(dir);
    expect(result.latestTag).toBeNull();
    expect(result.allTags).toEqual([]);
    expect(result.gitRemote).toBeNull();
  });

  it('getProjectInfoFromGit handles throw in try', async () => {
    const getTags = jest.fn().mockRejectedValue(new Error('fail'));
    const api = createGitProjectInfo({
      getTags,
      getPushRemote: jest.fn(),
      getRemotes: jest.fn(),
      getGitStatus: jest.fn(),
      getStatusShort: jest.fn(),
      parsePorcelainLines,
      runInDir: jest.fn(),
    });
    const result = await api.getProjectInfoFromGit(dir);
    expect(result.latestTag).toBeNull();
    expect(result.conflictCount).toBe(0);
  });
});
