const { createGitApi } = require('../index');

describe('git index createGitApi', () => {
  const runInDir = jest.fn().mockResolvedValue({ stdout: '' });
  const runInDirCapture = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
  const path = require('path');
  const fs = require('fs');
  const getPreference = jest.fn().mockReturnValue(false);
  const parseLocalBranches = (stdout) => (stdout || '').trim().split(/\n/).map((n) => ({ name: n.trim() }));
  const parseRemoteBranches = (stdout) => (stdout || '').trim().split(/\n/).filter(Boolean);
  const parseRemotes = () => [];
  const parseCommitLog = () => [];
  const parseCommitLogWithBody = () => [];
  const parseStashList = () => [];
  const parsePorcelainLines = (out) => ({ lines: [], conflictCount: 0 });
  const formatTag = (v) => (v ? `v${v}` : null);

  const deps = {
    runInDir,
    runInDirCapture,
    path,
    fs,
    getPreference,
    parseLocalBranches,
    parseRemoteBranches,
    parseRemotes,
    parseCommitLog,
    parseCommitLogWithBody,
    parseStashList,
    parsePorcelainLines,
    formatTag,
  };

  it('returns object with status methods', () => {
    const api = createGitApi(deps);
    expect(typeof api.getPushRemote).toBe('function');
    expect(typeof api.getGitStatus).toBe('function');
    expect(typeof api.getTrackedFiles).toBe('function');
    expect(typeof api.getProjectFiles).toBe('function');
  });

  it('returns object with branches methods', () => {
    const api = createGitApi(deps);
    expect(typeof api.getBranches).toBe('function');
    expect(typeof api.checkoutBranch).toBe('function');
    expect(typeof api.createBranch).toBe('function');
  });

  it('returns object with tags methods', () => {
    const api = createGitApi(deps);
    expect(typeof api.getTags).toBe('function');
    expect(typeof api.createTag).toBe('function');
  });

  it('returns object with commit, pushPull, remotes', () => {
    const api = createGitApi(deps);
    expect(typeof api.gitCommit).toBe('function');
    expect(typeof api.gitPush).toBe('function');
    expect(typeof api.getRemotes).toBe('function');
  });

  it('returns object with log and diff methods', () => {
    const api = createGitApi(deps);
    expect(typeof api.getCommitLog).toBe('function');
    expect(typeof api.getRecentCommits).toBe('function');
    expect(typeof api.getFileDiffRaw).toBe('function');
    expect(typeof api.getGitDiffForCommit).toBe('function');
  });

  it('returns object with projectInfo and release', () => {
    const api = createGitApi(deps);
    expect(typeof api.getProjectInfoFromGit).toBe('function');
    expect(typeof api.gitTagAndPush).toBe('function');
  });
});
