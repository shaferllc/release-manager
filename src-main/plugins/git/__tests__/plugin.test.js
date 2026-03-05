const gitPlugin = require('../index');

describe('git plugin', () => {
  it('has id "git"', () => {
    expect(gitPlugin.id).toBe('git');
  });

  it('isEnabled returns true when store is null or has no get', () => {
    expect(gitPlugin.isEnabled(null)).toBe(true);
    expect(gitPlugin.isEnabled(undefined)).toBe(true);
    expect(gitPlugin.isEnabled({})).toBe(true);
  });

  it('isEnabled returns true when store has no preference', () => {
    const store = { get: () => undefined };
    expect(gitPlugin.isEnabled(store)).toBe(true);
  });

  it('isEnabled returns true when plugins.git.enabled is not false', () => {
    const store = { get: (key) => (key === 'plugins.git.enabled' ? true : undefined) };
    expect(gitPlugin.isEnabled(store)).toBe(true);
    const store2 = { get: () => undefined };
    expect(gitPlugin.isEnabled(store2)).toBe(true);
  });

  it('isEnabled returns false when plugins.git.enabled is false', () => {
    const store = { get: (key) => (key === 'plugins.git.enabled' ? false : undefined) };
    expect(gitPlugin.isEnabled(store)).toBe(false);
  });

  it('createApi returns an object with git methods', () => {
    const noop = () => Promise.resolve({ ok: false });
    const runInDir = () => Promise.resolve({ stdout: '', stderr: '', code: 0 });
    const runInDirCapture = () => Promise.resolve({ stdout: '', stderr: '', code: 0 });
    const deps = {
      runInDir,
      runInDirCapture,
      path: require('path'),
      fs: require('fs'),
      getPreference: () => null,
      parseLocalBranches: () => ({ branches: [], current: null }),
      parseRemoteBranches: () => [],
      parseRemotes: () => [],
      parseCommitLog: () => [],
      parseCommitLogWithBody: () => [],
      parseStashList: () => [],
      parsePorcelainLines: () => ({ lines: [], conflictCount: 0 }),
      formatTag: () => 'v1.0.0',
    };
    const api = gitPlugin.createApi(deps);
    expect(api.getGitStatus).toBeDefined();
    expect(api.getBranches).toBeDefined();
    expect(api.getProjectInfoFromGit).toBeDefined();
    expect(typeof api.getGitStatus).toBe('function');
  });

  it('createStub returns stub with async methods', async () => {
    const stub = gitPlugin.createStub();
    const result = await stub.getTags('/path');
    expect(result).toEqual({ ok: false, error: 'Git plugin is disabled' });
  });

  it('exports createGitApi for direct use in tests', () => {
    expect(gitPlugin.createGitApi).toBeDefined();
    expect(typeof gitPlugin.createGitApi).toBe('function');
  });
});
