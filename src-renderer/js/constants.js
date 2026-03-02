/**
 * Application constants.
 */
export const VIEW_LABELS = {
  detail: 'Project',
  dashboard: 'Dashboard',
  settings: 'Settings',
  docs: 'Documentation',
  changelog: 'Changelog',
};

export const PREF_DETAIL_USE_TABS = 'detailUseTabs';
export const PREF_COLLAPSED_SECTIONS = 'collapsedSections';

export const GIT_SUBTAB_LABELS = { main: 'Main', history: 'History', advanced: 'Advanced' };

export const GIT_RIGHT_SECTION_IDS = [
  'git-section-branch-sync',
  'git-section-merge-rebase',
  'git-section-stash',
  'git-section-tags',
  'git-section-commit-history',
  'git-section-reflog',
  'git-section-delete-branch',
  'git-section-remotes',
  'git-section-compare-reset',
  'git-section-gitignore',
  'git-section-gitattributes',
  'git-section-submodules',
  'git-section-worktrees',
  'git-section-bisect',
];

export const GIT_ACTION_CONFIRMS = {
  pull: 'Pull fetches from the remote and merges into your current branch. Your local commits and any uncommitted changes may be updated or merged with remote changes.\n\nContinue?',
  push: 'Push uploads your current branch to the remote. Continue?',
  forcePush: "Force push overwrites the remote branch with your local branch. This can discard others' commits. Only use if you are sure (e.g. after rebasing).\n\nContinue?",
  forcePushLease: 'Force push with lease overwrites the remote only if no one else has pushed. Safer than plain force push.\n\nContinue?',
  stash: 'Stash temporarily saves your uncommitted changes (modified and untracked files) so you can switch branches or pull. You can restore them later with Pop stash.\n\nContinue?',
  pop: 'Pop stash reapplies the most recent stashed changes to your working tree. If you already have uncommitted changes, they may conflict and you may need to resolve them.\n\nContinue?',
  discard: 'Discard all will permanently remove every uncommitted change: modified and staged files will be reverted to the last commit, and untracked files and directories will be deleted. This cannot be undone.\n\nAre you sure?',
  stage: 'Stage this file so it will be included in the next commit?',
  unstage: "Unstage this file? Changes will remain in the working tree but won't be included in the next commit.",
  discardFile: 'Discard all changes in this file? This cannot be undone.',
  mergeAbort: 'Abort the current merge? Your branch will be restored to its state before the merge. Uncommitted changes from the merge (including conflict resolutions) will be lost.\n\nContinue?',
  checkout: 'Switch branch? Uncommitted changes may need to be committed or stashed first.\n\nContinue?',
  merge: 'Merge the chosen branch into the current branch. Resolve any conflicts in your editor if needed.\n\nContinue?',
};

export const GIT_ACTION_SUCCESS = {
  pull: 'Pulled from remote. Your branch is up to date.',
  stash: 'Changes stashed. Use Pop stash to restore them.',
  pop: 'Stash applied. Your stashed changes are back in the working tree.',
  discard: 'Uncommitted changes discarded.',
  mergeAbort: 'Merge aborted. Branch restored to pre-merge state.',
  checkout: 'Switched branch.',
  fetch: 'Fetched from remote.',
  push: 'Pushed to remote.',
  createBranch: 'Branch created and checked out.',
  merge: 'Merge completed.',
  stashApply: 'Stash applied.',
  stashDrop: 'Stash dropped.',
  rebase: 'Rebase completed.',
  rebaseAbort: 'Rebase aborted.',
  cherryPickAbort: 'Cherry-pick aborted.',
  cherryPick: 'Cherry-pick applied.',
  amend: 'Commit amended.',
  deleteTag: 'Tag deleted.',
  revert: 'Revert committed.',
};

export const BTN_ICONS = {
  plus: 'M12 5v14M5 12h14',
  check: 'M20 6 9 17l-5-5',
  minus: 'M5 12h14',
  trash: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'],
  play: 'M5 3l14 9-14 9V3z',
  'git-branch': 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM15 6a9 9 0 0 1-9 9',
};
