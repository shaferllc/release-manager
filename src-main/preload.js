const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('releaseManager', {
  getProjects: () => ipcRenderer.invoke('rm-get-projects'),
  getAllProjectsInfo: () => ipcRenderer.invoke('rm-get-all-projects-info'),
  setProjects: (projects) => ipcRenderer.invoke('rm-set-projects', projects),
  showDirectoryDialog: () => ipcRenderer.invoke('rm-show-directory-dialog'),
  getProjectInfo: (dirPath) => ipcRenderer.invoke('rm-get-project-info', dirPath),
  versionBump: (dirPath, bump) => ipcRenderer.invoke('rm-version-bump', dirPath, bump),
  gitTagAndPush: (dirPath, tagMessage) => ipcRenderer.invoke('rm-git-tag-and-push', dirPath, tagMessage),
  release: (dirPath, bump, force, options) => ipcRenderer.invoke('rm-release', dirPath, bump, force, options),
  getCommitsSinceTag: (dirPath, sinceTag) => ipcRenderer.invoke('rm-get-commits-since-tag', dirPath, sinceTag),
  getActionsUrl: (gitRemote) => ipcRenderer.invoke('rm-get-actions-url', gitRemote),
  getGitHubToken: () => ipcRenderer.invoke('rm-get-github-token'),
  setGitHubToken: (token) => ipcRenderer.invoke('rm-set-github-token', token),
  getGitStatus: (dirPath) => ipcRenderer.invoke('rm-get-git-status', dirPath),
  commitChanges: (dirPath, message) => ipcRenderer.invoke('rm-commit-changes', dirPath, message),
  copyToClipboard: (text) => ipcRenderer.invoke('rm-copy-to-clipboard', text),
  openPathInFinder: (dirPath) => ipcRenderer.invoke('rm-open-path-in-finder', dirPath),
  getReleasesUrl: (gitRemote) => ipcRenderer.invoke('rm-get-releases-url', gitRemote),
  syncFromRemote: (dirPath) => ipcRenderer.invoke('rm-sync-from-remote', dirPath),
  getGitHubReleases: (gitRemote) => ipcRenderer.invoke('rm-get-github-releases', gitRemote),
  downloadLatestRelease: (gitRemote) => ipcRenderer.invoke('rm-download-latest', gitRemote),
  downloadAsset: (url, suggestedFileName) => ipcRenderer.invoke('rm-download-asset', url, suggestedFileName),
  openUrl: (url) => ipcRenderer.invoke('rm-open-url', url),
  getAppInfo: () => ipcRenderer.invoke('rm-get-app-info'),
  getTheme: () => ipcRenderer.invoke('rm-get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('rm-set-theme', theme),
  onTheme: (callback) => {
    ipcRenderer.on('rm-theme', (_e, effective) => callback(effective));
  },
});
