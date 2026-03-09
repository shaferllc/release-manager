const { createGitRelease } = require('../release');

describe('git release', () => {
  const dir = '/repo';
  const path = require('path');

  it('gitTagAndPush with version override skips commit and uses version', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const fs = { existsSync: () => false, readFileSync: () => '{}' };
    const formatTag = (v) => (v ? `v${v}` : null);
    const getPushRemote = jest.fn().mockResolvedValue('origin');
    const stageFile = jest.fn();
    const gitCommit = jest.fn();
    const createTag = jest.fn().mockResolvedValue({ ok: true });
    const api = createGitRelease({
      runInDir,
      path,
      fs,
      formatTag,
      getPushRemote,
      stageFile,
      gitCommit,
      createTag,
    });
    const result = await api.gitTagAndPush(dir, 'release', { version: '2.0.0' });
    expect(result.ok).toBe(true);
    expect(result.tag).toBe('v2.0.0');
    expect(stageFile).not.toHaveBeenCalled();
    expect(gitCommit).not.toHaveBeenCalled();
    expect(createTag).toHaveBeenCalledWith(dir, 'v2.0.0', null, 'HEAD');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['push', 'origin', 'HEAD']);
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['push', 'origin', 'v2.0.0']);
  });

  it('gitTagAndPush without override reads package.json and commits', async () => {
    const runInDir = jest.fn().mockResolvedValue({});
    const fs = {
      existsSync: (p) => p.includes('package-lock.json'),
      readFileSync: (p) => (p.includes('package.json') ? '{"version":"1.0.0"}' : ''),
    };
    const formatTag = (v) => (v ? `v${v}` : null);
    const getPushRemote = jest.fn().mockResolvedValue('origin');
    const stageFile = jest.fn().mockResolvedValue({ ok: true });
    const gitCommit = jest.fn().mockResolvedValue({ ok: true });
    const createTag = jest.fn().mockResolvedValue({ ok: true });
    const api = createGitRelease({
      runInDir,
      path,
      fs,
      formatTag,
      getPushRemote,
      stageFile,
      gitCommit,
      createTag,
    });
    const result = await api.gitTagAndPush(dir, 'chore: release');
    expect(result.ok).toBe(true);
    expect(stageFile).toHaveBeenCalledWith(dir, 'package.json');
    expect(stageFile).toHaveBeenCalledWith(dir, 'package-lock.json');
    expect(gitCommit).toHaveBeenCalledWith(dir, 'chore: release');
  });

  it('gitTagAndPush returns error when formatTag returns null', async () => {
    const fs = { existsSync: () => false, readFileSync: () => '{"version":""}' };
    const formatTag = () => null;
    const api = createGitRelease({
      runInDir: jest.fn(),
      path,
      fs,
      formatTag,
      getPushRemote: jest.fn(),
      stageFile: jest.fn(),
      gitCommit: jest.fn(),
      createTag: jest.fn(),
    });
    const result = await api.gitTagAndPush(dir, 'msg');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Invalid');
  });
});
