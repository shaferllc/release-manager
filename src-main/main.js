const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const Store = require('electron-store');
const { getReleasesUrl, getActionsUrl, getRepoSlug, pickAssetForPlatform } = require('./lib/github');
const { filterValidProjects } = require('./lib/projects');
const { THEME_VALUES, getEffectiveTheme: getEffectiveThemeFromSetting } = require('./lib/theme');
const { isValidBump, isPrereleaseBump, formatTag, PRERELEASE_PREID } = require('./lib/version');
const { runInDir: runInDirLib } = require('./lib/runInDir');
const { parseOldConfig } = require('./lib/migration');
const { parsePackageInfo } = require('./lib/packageJson');

// Use same app name in dev and prod so userData is shared (dev no longer uses "Electron")
const pkg = require(path.join(__dirname, '..', 'package.json'));
if (pkg.productName && !app.isPackaged) {
  app.setName(pkg.productName);
}

let store;

function getStore() {
  if (!store) store = new Store({ name: 'release-manager' });
  return store;
}

function getProjects() {
  return filterValidProjects(getStore().get('projects') || []);
}

function setProjects(projects) {
  getStore().set('projects', projects);
}

function getThemeSetting() {
  const t = getStore().get('theme');
  return THEME_VALUES.includes(t) ? t : 'dark';
}

function setThemeSetting(theme) {
  if (!THEME_VALUES.includes(theme)) return;
  getStore().set('theme', theme);
  nativeTheme.themeSource = theme === 'system' ? 'system' : theme;
  const effective = getEffectiveThemeFromSetting(getThemeSetting(), nativeTheme.shouldUseDarkColors);
  for (const w of BrowserWindow.getAllWindows()) {
    if (w && !w.isDestroyed()) w.webContents.send('rm-theme', effective);
  }
}

function getEffectiveTheme() {
  return getEffectiveThemeFromSetting(getThemeSetting(), nativeTheme.shouldUseDarkColors);
}

function runInDir(dirPath, command, args, options = {}) {
  return runInDirLib(dirPath, command, args, options, spawn);
}

async function getProjectInfoAsync(dirPath) {
  const pkgPath = path.join(dirPath, 'package.json');
  let content;
  try {
    content = fs.readFileSync(pkgPath, 'utf8');
  } catch {
    return { ok: false, error: 'No package.json or invalid JSON', path: dirPath };
  }
  const parsed = parsePackageInfo(content, dirPath, path);
  if (!parsed.ok) return parsed;
  const { name, version } = parsed;
  let latestTag = null;
  let gitRemote = null;
  const gitDir = path.join(dirPath, '.git');
  const hasGit = fs.existsSync(gitDir);

  let branch = null;
  let ahead = null;
  let behind = null;
  let uncommittedLines = [];
  let allTags = [];

  if (hasGit) {
    try {
      const [tagOut, remoteName, statusOut, porcelainOut] = await Promise.all([
        runInDir(dirPath, 'git', ['tag', '-l', '--sort=-version:refname']).catch(() => ({ stdout: '' })),
        getPushRemote(dirPath),
        runInDir(dirPath, 'git', ['status', '-sb']).catch(() => ({ stdout: '' })),
        runInDir(dirPath, 'git', ['status', '--porcelain']).catch(() => ({ stdout: '' })),
      ]);
      const tags = (tagOut.stdout || '').trim().split(/\r?\n/).filter(Boolean);
      latestTag = tags[0] || null;
      allTags = tags.slice(0, 100);
      if (remoteName) {
        const urlOut = await runInDir(dirPath, 'git', ['remote', 'get-url', remoteName]).catch(() => ({ stdout: '' }));
        gitRemote = (urlOut.stdout || '').trim() || null;
      }
      const statusLines = (statusOut.stdout || '').trim().split(/\r?\n/).filter(Boolean);
      const statusLine = statusLines[0] || '';
      const branchMatch = statusLine.match(/^##\s+(.+?)(?:\.\.\.|$)/);
      if (branchMatch) branch = branchMatch[1].trim();
      const aheadMatch = statusLine.match(/ahead\s+(\d+)/);
      if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
      const behindMatch = statusLine.match(/behind\s+(\d+)/);
      if (behindMatch) behind = parseInt(behindMatch[1], 10);
      const porcelain = (porcelainOut.stdout || '').trim();
      uncommittedLines = porcelain ? porcelain.split(/\r?\n/).filter(Boolean) : [];
    } catch (_) {}
  }

  return {
    ok: true,
    path: dirPath,
    name,
    version,
    latestTag,
    allTags,
    gitRemote,
    hasGit,
    branch,
    ahead,
    behind,
    uncommittedLines,
  };
}

/** Get the remote name to use for push (branch's remote or first configured remote). Returns null if no remotes. */
async function getPushRemote(dirPath) {
  try {
    const branchOut = await runInDir(dirPath, 'git', ['branch', '--show-current']);
    const branch = (branchOut.stdout || '').trim();
    if (branch) {
      const remoteOut = await runInDir(dirPath, 'git', ['config', '--get', `branch.${branch}.remote`]);
      const remote = (remoteOut.stdout || '').trim();
      if (remote) return remote;
    }
    const listOut = await runInDir(dirPath, 'git', ['remote']);
    const remotes = (listOut.stdout || '').trim().split(/\r?\n/).filter(Boolean);
    return remotes[0] || null;
  } catch (_) {
    return null;
  }
}

async function runVersionBump(dirPath, bump) {
  const validBump = isValidBump(bump) || isPrereleaseBump(bump);
  if (!validBump) {
    return { ok: false, error: 'Invalid bump type' };
  }
  try {
    if (isPrereleaseBump(bump)) {
      await runInDir(dirPath, 'npm', ['version', 'prerelease', '--preid=' + PRERELEASE_PREID, '--no-git-tag-version']);
    } else {
      await runInDir(dirPath, 'npm', ['version', bump, '--no-git-tag-version']);
    }
    const pkgPath = path.join(dirPath, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return { ok: true, version: pkg.version };
  } catch (e) {
    return { ok: false, error: e.message || 'npm version failed' };
  }
}

async function gitTagAndPush(dirPath, tagMessage) {
  try {
    const pkgPath = path.join(dirPath, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const version = pkg.version;
    const tag = formatTag(version);
    if (!tag) throw new Error('Invalid version');
    await runInDir(dirPath, 'git', ['add', 'package.json']);
    if (fs.existsSync(path.join(dirPath, 'package-lock.json'))) {
      await runInDir(dirPath, 'git', ['add', 'package-lock.json']);
    }
    await runInDir(dirPath, 'git', ['commit', '-m', tagMessage || `chore: release ${tag}`]);
    await runInDir(dirPath, 'git', ['tag', tag]);
    // Use same push as terminal: branch upstream + --follow-tags (no remote name needed)
    await runInDir(dirPath, 'git', ['push', '--follow-tags']);
    return { ok: true, tag };
  } catch (e) {
    return { ok: false, error: e.message || 'git tag/push failed' };
  }
}

async function showDirectoryDialog() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select project folder',
  });
  if (canceled || !filePaths || filePaths.length === 0) return null;
  return filePaths[0];
}


async function getGitStatus(dirPath) {
  try {
    const out = await runInDir(dirPath, 'git', ['status', '--porcelain']);
    const trimmed = (out.stdout || '').trim();
    return { clean: trimmed.length === 0, output: trimmed || null };
  } catch (e) {
    return { clean: false, output: e.message || null };
  }
}

async function gitCommit(dirPath, message) {
  if (!message || typeof message !== 'string' || !message.trim()) {
    return { ok: false, error: 'Commit message is required' };
  }
  const msg = message.trim();
  try {
    await runInDir(dirPath, 'git', ['add', '-A']);
    await runInDir(dirPath, 'git', ['commit', '-m', msg]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Commit failed' };
  }
}

async function gitFetch(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['fetch']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'git fetch failed' };
  }
}

/** Returns commit subject lines since the given tag (or last 30 commits if no tag). */
async function getCommitsSinceTag(dirPath, sinceTag) {
  try {
    const args = sinceTag
      ? ['log', sinceTag + '..HEAD', '--pretty=format:%s', '--no-merges']
      : ['log', '-n', '30', '--pretty=format:%s', '--no-merges'];
    const out = await runInDir(dirPath, 'git', args);
    const lines = (out.stdout || '').trim().split(/\r?\n/).filter(Boolean);
    return { ok: true, commits: lines };
  } catch (e) {
    return { ok: false, error: e.message || 'git log failed', commits: [] };
  }
}

const GITHUB_API_USER_AGENT = 'Release-Manager-Electron/1.0';

async function createGitHubRelease(owner, repo, tagName, body, draft, prerelease, token) {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': GITHUB_API_USER_AGENT,
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tag_name: tagName,
      name: tagName,
      body: body || null,
      draft: !!draft,
      prerelease: !!prerelease,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchGitHubReleases(owner, repo) {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`;
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': GITHUB_API_USER_AGENT },
    redirect: 'follow',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(res.status === 404 ? 'Repo or releases not found' : text || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}


async function downloadToFile(url, savePath) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': GITHUB_API_USER_AGENT },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const out = fs.createWriteStream(savePath);
  const nodeStream = Readable.fromWeb(res.body);
  await pipeline(nodeStream, out);
}

async function showSaveDialogAndDownload(win, defaultPath, url) {
  const { canceled, filePath } = await dialog.showSaveDialog(win || undefined, {
    defaultPath,
    title: 'Save release',
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  try {
    await downloadToFile(url, filePath);
    return { ok: true, filePath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

const iconPath = path.join(__dirname, '..', 'assets', 'icons', 'icon.png');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 640,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'src-renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('rm-theme', getEffectiveTheme());
  });
}

if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
  try {
    const electronReload = require('electron-reload');
    electronReload(path.join(__dirname, '..', 'src-renderer'), {
      electron: require('electron'),
      hardResetMethod: 'exit',
      ignoreSubdirectories: true,
    });
  } catch (_) {}
}

app.whenReady().then(() => {
  store = new Store({ name: 'release-manager' });
  // One-time migration from old JSON config so projects survive rebuilds
  const oldConfigPath = path.join(app.getPath('userData'), 'release-manager-config.json');
  if (fs.existsSync(oldConfigPath)) {
    try {
      const content = fs.readFileSync(oldConfigPath, 'utf8');
      const old = parseOldConfig(content);
      if (old.projects?.length && !store.get('projects', []).length) {
        store.set('projects', filterValidProjects(old.projects));
      }
      if (old.theme && !store.get('theme')) {
        store.set('theme', old.theme);
      }
      fs.unlinkSync(oldConfigPath);
    } catch (_) {}
  }
  if (fs.existsSync(iconPath) && app.dock) {
    app.dock.setIcon(iconPath);
  }
  nativeTheme.themeSource = getThemeSetting() === 'system' ? 'system' : getThemeSetting();
  createWindow();

  ipcMain.handle('rm-get-projects', () => getProjects());
  ipcMain.handle('rm-get-all-projects-info', async () => {
    const list = getProjects();
    const results = await Promise.all(
      list.map(async (p) => {
        const info = await getProjectInfoAsync(p.path);
        return { path: p.path, name: p.name, ...info };
      })
    );
    return results;
  });
  ipcMain.handle('rm-set-projects', (_e, projects) => {
    setProjects(projects);
    return null;
  });
  ipcMain.handle('rm-show-directory-dialog', () => showDirectoryDialog());
  ipcMain.handle('rm-get-project-info', (_e, dirPath) => getProjectInfoAsync(dirPath));
  ipcMain.handle('rm-version-bump', (_e, dirPath, bump) => runVersionBump(dirPath, bump));
  ipcMain.handle('rm-git-tag-and-push', (_e, dirPath, tagMessage) => gitTagAndPush(dirPath, tagMessage));
  ipcMain.handle('rm-release', async (_e, dirPath, bump, force, options = {}) => {
    if (!force) {
      const status = await getGitStatus(dirPath);
      if (!status.clean) {
        return { ok: false, dirty: true, error: 'Uncommitted changes. Commit or stash before releasing.' };
      }
    }
    const bumpResult = await runVersionBump(dirPath, bump);
    if (!bumpResult.ok) return bumpResult;
    const pushResult = await gitTagAndPush(dirPath, `chore: release v${bumpResult.version}`);
    if (!pushResult.ok) return pushResult;
    const tag = pushResult.tag;
    const token = getStore().get('githubToken') || options.githubToken;
    const info = await getProjectInfoAsync(dirPath);
    const gitRemote = info.ok && info.gitRemote ? info.gitRemote : null;
    const slug = gitRemote ? getRepoSlug(gitRemote) : null;
    const actionsUrl = gitRemote ? getActionsUrl(gitRemote) : null;
    if (token && slug) {
      try {
        await createGitHubRelease(
          slug.owner,
          slug.repo,
          tag,
          options.releaseNotes != null ? options.releaseNotes : null,
          !!options.draft,
          !!options.prerelease,
          token
        );
      } catch (e) {
        return { ok: true, tag, version: bumpResult.version, actionsUrl, releaseError: e.message };
      }
    }
    return { ok: true, tag, version: bumpResult.version, actionsUrl };
  });
  ipcMain.handle('rm-get-commits-since-tag', (_e, dirPath, sinceTag) => getCommitsSinceTag(dirPath, sinceTag));
  ipcMain.handle('rm-get-actions-url', (_e, gitRemote) => getActionsUrl(gitRemote) || null);
  ipcMain.handle('rm-get-github-token', () => getStore().get('githubToken') || '');
  ipcMain.handle('rm-set-github-token', (_e, token) => {
    getStore().set('githubToken', typeof token === 'string' ? token : '');
    return null;
  });
  ipcMain.handle('rm-get-git-status', (_e, dirPath) => getGitStatus(dirPath));
  ipcMain.handle('rm-commit-changes', (_e, dirPath, message) => gitCommit(dirPath, message));
  ipcMain.handle('rm-copy-to-clipboard', (_e, text) => {
    if (text != null && typeof text === 'string') clipboard.writeText(text);
    return null;
  });
  ipcMain.handle('rm-open-path-in-finder', (_e, dirPath) => {
    if (dirPath != null && typeof dirPath === 'string') return shell.openPath(dirPath);
    return Promise.resolve('');
  });
  ipcMain.handle('rm-get-releases-url', (_e, gitRemote) => getReleasesUrl(gitRemote));
  ipcMain.handle('rm-sync-from-remote', (_e, dirPath) => gitFetch(dirPath));
  ipcMain.handle('rm-get-github-releases', async (_e, gitRemote) => {
    const slug = getRepoSlug(gitRemote);
    if (!slug) return { ok: false, error: 'Not a GitHub repo', releases: [] };
    try {
      const releases = await fetchGitHubReleases(slug.owner, slug.repo);
      return { ok: true, releases };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to fetch releases', releases: [] };
    }
  });
  ipcMain.handle('rm-download-latest', async (e, gitRemote) => {
    const slug = getRepoSlug(gitRemote);
    if (!slug) return { ok: false, error: 'Not a GitHub repo' };
    try {
      const releases = await fetchGitHubReleases(slug.owner, slug.repo);
      if (!releases.length) return { ok: false, error: 'No releases found' };
      const release = releases[0];
      const assets = release.assets || [];
      const asset = pickAssetForPlatform(assets, process.platform);
      if (!asset || !asset.browser_download_url) return { ok: false, error: 'No compatible asset for your platform' };
      const win = BrowserWindow.fromWebContents(e.sender);
      const defaultPath = path.join(app.getPath('downloads'), asset.name);
      return showSaveDialogAndDownload(win, defaultPath, asset.browser_download_url);
    } catch (err) {
      return { ok: false, error: err.message || 'Failed to fetch or download' };
    }
  });
  ipcMain.handle('rm-download-asset', async (e, url, suggestedFileName) => {
    if (!url || typeof url !== 'string') return { ok: false, error: 'Invalid URL' };
    const win = BrowserWindow.fromWebContents(e.sender);
    const defaultPath = path.join(app.getPath('downloads'), suggestedFileName || 'download');
    return showSaveDialogAndDownload(win, defaultPath, url);
  });
  ipcMain.handle('rm-open-url', (_e, url) => {
    if (url && typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url);
    }
    return null;
  });
  ipcMain.handle('rm-get-app-info', () => {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
      return { name: pkg.productName || pkg.name, version: pkg.version };
    } catch {
      return { name: 'Release Manager', version: '0.1.0' };
    }
  });
  ipcMain.handle('rm-get-theme', () => ({ theme: getThemeSetting(), effective: getEffectiveTheme() }));
  ipcMain.handle('rm-set-theme', (_e, theme) => {
    setThemeSetting(theme);
    return null;
  });
});

nativeTheme.on('updated', () => {
  if (getThemeSetting() !== 'system') return;
  const effective = getEffectiveTheme();
  for (const w of BrowserWindow.getAllWindows()) {
    if (w && !w.isDestroyed()) w.webContents.send('rm-theme', effective);
  }
});

app.on('window-all-closed', () => app.quit());
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
