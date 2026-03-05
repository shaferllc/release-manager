/**
 * Stub Git API used when the git plugin is disabled. Every method returns a rejected promise
 * or { ok: false, error } so the renderer can show "Git plugin is disabled" without changing handlers.
 */

const DISABLED_MSG = 'Git plugin is disabled';

function asyncReject() {
  return Promise.resolve({ ok: false, error: DISABLED_MSG });
}

/**
 * @returns {import('../../lib/git').createGitApi extends (deps: any) => infer R ? R : never}
 */
function createGitStub() {
  const stub = {
    getGitStatus: asyncReject,
    getTrackedFiles: asyncReject,
    getProjectFiles: asyncReject,
    gitPull: asyncReject,
    getBranches: asyncReject,
    checkoutBranch: asyncReject,
    createBranch: asyncReject,
    createBranchFrom: asyncReject,
    gitPushWithUpstream: asyncReject,
    gitPushForce: asyncReject,
    gitFetch: asyncReject,
    gitMerge: asyncReject,
    gitStashPush: asyncReject,
    gitCommit: asyncReject,
    gitStashPop: asyncReject,
    gitDiscardChanges: asyncReject,
    gitMergeAbort: asyncReject,
    getRemoteBranches: asyncReject,
    checkoutRemoteBranch: asyncReject,
    getStashList: asyncReject,
    stashApply: asyncReject,
    stashDrop: asyncReject,
    getTags: asyncReject,
    checkoutTag: asyncReject,
    getCommitLog: asyncReject,
    getCommitLogWithBody: asyncReject,
    getCommitDetail: asyncReject,
    deleteBranch: asyncReject,
    deleteRemoteBranch: asyncReject,
    gitRebase: asyncReject,
    gitRebaseAbort: asyncReject,
    gitRebaseContinue: asyncReject,
    gitRebaseSkip: asyncReject,
    gitMergeContinue: asyncReject,
    getRemotes: asyncReject,
    addRemote: asyncReject,
    removeRemote: asyncReject,
    renameRemote: asyncReject,
    setRemoteUrl: asyncReject,
    gitCherryPick: asyncReject,
    gitCherryPickAbort: asyncReject,
    gitCherryPickContinue: asyncReject,
    renameBranch: asyncReject,
    createTag: asyncReject,
    gitInit: asyncReject,
    writeGitignore: asyncReject,
    writeGitattributes: asyncReject,
    gitRebaseInteractive: asyncReject,
    gitReset: asyncReject,
    getBranchRevision: asyncReject,
    setBranchUpstream: asyncReject,
    getDiffBetween: asyncReject,
    getDiffBetweenFull: asyncReject,
    getFileDiffStructured: asyncReject,
    revertFileLine: asyncReject,
    gitRevert: asyncReject,
    gitPruneRemotes: asyncReject,
    gitAmend: asyncReject,
    getReflog: asyncReject,
    checkoutRef: asyncReject,
    getBlame: asyncReject,
    deleteTag: asyncReject,
    pushTag: asyncReject,
    stageFile: asyncReject,
    unstageFile: asyncReject,
    discardFile: asyncReject,
    gitFetchRemote: asyncReject,
    gitPullRebase: asyncReject,
    gitPullFFOnly: asyncReject,
    getGitignore: asyncReject,
    scanProjectForGitignore: asyncReject,
    getFileAtRef: asyncReject,
    getGitattributes: asyncReject,
    getSubmodules: asyncReject,
    submoduleUpdate: asyncReject,
    getGitState: asyncReject,
    getGitUser: asyncReject,
    getWorktrees: asyncReject,
    worktreeAdd: asyncReject,
    worktreeRemove: asyncReject,
    getBisectStatus: asyncReject,
    bisectStart: asyncReject,
    bisectGood: asyncReject,
    bisectBad: asyncReject,
    bisectSkip: asyncReject,
    bisectReset: asyncReject,
    bisectRun: asyncReject,
    getProjectInfoFromGit: asyncReject,
    gitTagAndPush: asyncReject,
    getRecentCommits: asyncReject,
    getGitDiffForCommit: asyncReject,
  };

  return stub;
}

module.exports = { createGitStub, DISABLED_MSG };
