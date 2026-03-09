export const VIEW_LABELS = {
  detail: 'Project',
  dashboard: 'Dashboard',
  settings: 'Settings',
  docs: 'Documentation',
  changelog: 'Changelog',
};

export const PREF_DETAIL_USE_TABS = 'detailUseTabs';
export const PREF_COLLAPSED_SECTIONS = 'collapsedSections';

export const GIT_ACTION_CONFIRMS = {
  pull: 'Pull fetches from the remote and merges into your current branch. Your local commits and any uncommitted changes may be updated or merged with remote changes.\n\nContinue?',
  push: 'Push uploads your current branch to the remote. Continue?',
  forcePush: "Force push overwrites the remote branch with your local branch. This can discard others' commits. Only use if you are sure (e.g. after rebasing).\n\nContinue?",
  forcePushLease: 'Force push with lease overwrites the remote only if no one else has pushed. Safer than plain force push.\n\nContinue?',
  stash: 'Stash temporarily saves your uncommitted changes (modified and untracked files) so you can switch branches or pull. You can restore them later with Pop stash.\n\nContinue?',
  pop: 'Pop stash reapplies the most recent stashed changes to your working tree. If you already have uncommitted changes, they may conflict and you may need to resolve them.\n\nContinue?',
  discard: 'Discard all will permanently remove every uncommitted change: modified and staged files will be reverted to the last commit, and untracked files and directories will be deleted. This cannot be undone.\n\nAre you sure?',
  checkout: 'Switch branch? Uncommitted changes may need to be committed or stashed first.\n\nContinue?',
  merge: 'Merge the chosen branch into the current branch. Resolve any conflicts in your editor if needed.\n\nContinue?',
};

export const GIT_ACTION_SUCCESS = {
  pull: 'Pulled from remote. Your branch is up to date.',
  stash: 'Changes stashed. Use Pop stash to restore them.',
  pop: 'Stash applied. Your stashed changes are back in the working tree.',
  discard: 'Uncommitted changes discarded.',
  checkout: 'Switched branch.',
  fetch: 'Fetched from remote.',
  push: 'Pushed to remote.',
  createBranch: 'Branch created and checked out.',
  merge: 'Merge completed.',
};
