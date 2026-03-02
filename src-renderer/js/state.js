/**
 * Shared mutable state for the renderer.
 * Other modules import state and use state.projects, state.selectedPath, etc.
 */
export const state = {
  lastCoverageByPath: {},
  projects: [],
  selectedPath: null,
  filterByType: '',
  filterByTag: '',
  currentInfo: null,
  viewMode: 'detail',
  dashboardData: [],
  selectedPaths: new Set(),
  currentGitSubtab: 'main',
  gitSectionsMovedToRightPanel: false,
  isRefreshingAfterCheckout: false,
  switchWithChangesModalResolve: null,
  modalCommitDetailSha: null,
  rightPanelCommitSha: null,
  fileViewerModalProjectPath: null,
  fileViewerModalFilePath: null,
  fileViewerModalIsUntracked: false,
};
