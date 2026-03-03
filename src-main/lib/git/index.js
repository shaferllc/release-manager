/**
 * Composed Git API. Pass runInDir, runInDirCapture, path, fs, getPreference, and parser libs.
 * Each submodule is created with the deps it needs; all methods are merged into one object.
 */
const { createGitStatus } = require('./status');
const { createGitCommit } = require('./commit');
const { createGitPushPull } = require('./pushPull');
const { createGitBranches } = require('./branches');
const { createGitTags } = require('./tags');
const { createGitStash } = require('./stash');
const { createGitRemotes } = require('./remotes');
const { createGitMergeRebase } = require('./mergeRebase');
const { createGitCherryPick } = require('./cherryPick');
const { createGitResetRevert } = require('./resetRevert');
const { createGitLog } = require('./log');
const { createGitDiff } = require('./diff');
const { createGitIgnore } = require('./ignore');
const { createGitAttributes } = require('./attributes');
const { createGitState } = require('./state');
const { createGitInit } = require('./init');
const { createGitBlame } = require('./blame');
const { createGitStaging } = require('./staging');
const { createGitSubmodules } = require('./submodules');
const { createGitWorktrees } = require('./worktrees');
const { createGitBisect } = require('./bisect');
const { createGitProjectInfo } = require('./projectInfo');
const { createGitRelease } = require('./release');

function createGitApi(deps) {
  const status = createGitStatus(deps);
  const commit = createGitCommit(deps);
  const pushPull = createGitPushPull(deps);
  const branches = createGitBranches({
    runInDir: deps.runInDir,
    parseLocalBranches: deps.parseLocalBranches,
    parseRemoteBranches: deps.parseRemoteBranches,
  });
  const tags = createGitTags(deps);
  const stash = createGitStash({
    runInDir: deps.runInDir,
    path: deps.path,
    fs: deps.fs,
    parseStashList: deps.parseStashList,
  });
  const remotes = createGitRemotes({
    runInDir: deps.runInDir,
    parseRemotes: deps.parseRemotes,
  });
  const mergeRebase = createGitMergeRebase(deps);
  const cherryPick = createGitCherryPick(deps);
  const resetRevert = createGitResetRevert(deps);
  const log = createGitLog({
    runInDir: deps.runInDir,
    parseCommitLog: deps.parseCommitLog,
    parseCommitLogWithBody: deps.parseCommitLogWithBody,
  });
  const diff = createGitDiff(deps);
  const ignore = createGitIgnore(deps);
  const attributes = createGitAttributes(deps);
  const state = createGitState(deps);
  const init = createGitInit(deps);
  const blame = createGitBlame(deps);
  const staging = createGitStaging(deps);
  const submodules = createGitSubmodules(deps);
  const worktrees = createGitWorktrees(deps);
  const bisect = createGitBisect(deps);
  const projectInfo = createGitProjectInfo({
    getTags: tags.getTags,
    getPushRemote: status.getPushRemote,
    getRemotes: remotes.getRemotes,
    getGitStatus: status.getGitStatus,
    getStatusShort: status.getStatusShort,
    parsePorcelainLines: deps.parsePorcelainLines,
    runInDir: deps.runInDir,
  });
  const release = createGitRelease({
    runInDir: deps.runInDir,
    path: deps.path,
    fs: deps.fs,
    formatTag: deps.formatTag,
    getPushRemote: status.getPushRemote,
    stageFile: staging.stageFile,
    gitCommit: commit.gitCommit,
    createTag: tags.createTag,
  });

  return {
    ...status,
    ...commit,
    ...pushPull,
    ...branches,
    ...tags,
    ...stash,
    ...remotes,
    ...mergeRebase,
    ...cherryPick,
    ...resetRevert,
    ...log,
    ...diff,
    ...ignore,
    ...attributes,
    ...state,
    ...init,
    ...blame,
    ...staging,
    ...submodules,
    ...worktrees,
    ...bisect,
    ...projectInfo,
    ...release,
  };
}

module.exports = { createGitApi };
