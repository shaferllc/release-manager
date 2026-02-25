const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, clipboard, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const Store = require('electron-store');
const appRoot = path.join(__dirname, '..');
const { marked } = require(path.join(appRoot, 'node_modules', 'marked'));
const sanitizeHtml = require(path.join(appRoot, 'node_modules', 'sanitize-html'));
const { getReleasesUrl, getActionsUrl, getRepoSlug, pickAssetForPlatform } = require('./lib/github');
const { formatGitHubError } = require('./lib/githubErrors');
const { filterValidProjects } = require('./lib/projects');
const { THEME_VALUES, getEffectiveTheme: getEffectiveThemeFromSetting } = require('./lib/theme');
const { isValidBump, isPrereleaseBump, formatTag, PRERELEASE_PREID } = require('./lib/version');
const { runInDir: runInDirLib } = require('./lib/runInDir');
const { parseOldConfig } = require('./lib/migration');
const { getProjectNameVersionAndType } = require('./lib/projectDetection');
const { getReleasePlan } = require('./lib/releaseStrategy');
const { getRecentCommits: getRecentCommitsLib } = require('./lib/gitLog');
const { suggestBumpFromCommits } = require('./lib/conventionalCommits');
const { getShortcutAction } = require('./lib/shortcuts');
const {
  generate: ollamaGenerate,
  listModels: ollamaListModels,
  buildCommitMessagePrompt,
  buildReleaseNotesPrompt,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
} = require('./lib/ollama');
const { getGitDiffForCommit: getGitDiffForCommitLib } = require('./lib/gitDiff');
const {
  getComposerManifestInfo,
  parseComposerOutdatedJson,
  parseComposerValidateOutput,
  parseComposerAuditJson,
} = require('./lib/composer');
const { parseCoverageSummary } = require('./lib/coverageParse');
const {
  getNpmScriptNames,
  getComposerScriptNames,
  getCoverageScriptNameNpm,
  getCoverageScriptNameComposer,
} = require('./lib/projectTestScripts');

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

function getPreference(key) {
  const prefs = getStore().get('preferences');
  return typeof prefs === 'object' && prefs !== null && key in prefs ? prefs[key] : undefined;
}

function setPreference(key, value) {
  const prefs = getStore().get('preferences') || {};
  prefs[key] = value;
  getStore().set('preferences', prefs);
}

function getEffectiveTheme() {
  return getEffectiveThemeFromSetting(getThemeSetting(), nativeTheme.shouldUseDarkColors);
}

function runInDir(dirPath, command, args, options = {}) {
  return runInDirLib(dirPath, command, args, options, spawn);
}

/** Remove ANSI escape codes for parsing/display. */
function stripAnsi(text) {
  if (text == null || typeof text !== 'string') return '';
  return text
    .replace(/\x1b\[[\d;]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[?[\d;]*[a-zA-Z]/g, '');
}

/** Get PHP version string (e.g. "8.2") from a binary path. Returns null if not runnable. */
function getPhpVersionFromPath(phpPath) {
  if (!phpPath || typeof phpPath !== 'string') return null;
  const trimmed = phpPath.trim();
  if (!trimmed) return null;
  return new Promise((resolve) => {
    const proc = spawn(trimmed, ['-r', "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;"], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    proc.stdout?.on('data', (d) => { out += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) {
        const v = out.trim().match(/^(\d+\.\d+)/);
        resolve(v ? v[1] : null);
      } else resolve(null);
    });
    proc.on('error', () => resolve(null));
  });
}

/** Common PHP binary paths to probe (Homebrew macOS, Linux, plus global preference). */
function getCandidatePhpPaths() {
  const candidates = [];
  const global = getPreference('phpPath');
  if (global && typeof global === 'string' && global.trim()) candidates.push(global.trim());
  if (process.platform !== 'win32') {
    candidates.push('/opt/homebrew/opt/php/bin/php', '/usr/local/bin/php', '/usr/bin/php');
    for (const v of ['8.1', '8.2', '8.3', '8.4', '9.0']) {
      candidates.push(`/opt/homebrew/opt/php@${v}/bin/php`);
      candidates.push(path.join('/usr/local', `opt/php@${v}/bin/php`));
    }
  }
  return [...new Set(candidates)];
}

/** Discover available PHP versions (path + version string). Sorted by version desc. */
async function getAvailablePhpVersions() {
  const candidates = getCandidatePhpPaths();
  const results = [];
  for (const phpPath of candidates) {
    try {
      if (!fs.existsSync(phpPath)) continue;
    } catch {
      continue;
    }
    const version = await getPhpVersionFromPath(phpPath);
    if (version) results.push({ version, path: phpPath });
  }
  results.sort((a, b) => {
    const [aM, aN] = a.version.split('.').map(Number);
    const [bM, bN] = b.version.split('.').map(Number);
    return bM !== aM ? bM - aM : (bN || 0) - (aN || 0);
  });
  const seen = new Set();
  return results.filter((r) => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });
}

/** Parse composer "require"."php" constraint to a preferred version string (e.g. "^8.2" -> "8.2"). */
function parsePhpRequireToVersion(phpRequire) {
  if (!phpRequire || typeof phpRequire !== 'string') return null;
  const m = phpRequire.trim().match(/(\d+)\.(\d+)/);
  return m ? `${m[1]}.${m[2]}` : null;
}

/** Environment for Composer/Pest: per-project phpPath or global preference; prepend that PHP's directory to PATH. */
function getComposerEnv(dirPath) {
  let phpPath = null;
  if (dirPath && typeof dirPath === 'string') {
    const list = getStore().get('projects') || [];
    const project = list.find((p) => p && p.path === dirPath);
    if (project && typeof project.phpPath === 'string' && project.phpPath.trim()) {
      phpPath = project.phpPath.trim();
    }
  }
  if (!phpPath) phpPath = getPreference('phpPath');
  if (!phpPath || typeof phpPath !== 'string') return process.env;
  const trimmed = String(phpPath).trim();
  if (!trimmed) return process.env;
  const phpDir = path.dirname(trimmed);
  const pathSep = process.platform === 'win32' ? ';' : ':';
  const pathEnv = process.env.PATH || '';
  return { ...process.env, PATH: phpDir + pathSep + pathEnv };
}

/** Run a command and return { ok, exitCode, stdout, stderr } without rejecting on non-zero exit. */
function runInDirCapture(dirPath, command, args, options = {}) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'cmd.exe' : command;
    const cargs = isWin ? ['/c', command, ...args] : args;
    const proc = spawn(cmd, cargs, {
      cwd: dirPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      resolve({
        ok: code === 0,
        exitCode: code ?? -1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
    proc.on('error', (e) => {
      resolve({ ok: false, exitCode: -1, stdout: '', stderr: e.message || 'Spawn failed' });
    });
  });
}

async function getProjectInfoAsync(dirPath) {
  const resolved = getProjectNameVersionAndType(dirPath, path, fs);
  if (!resolved.ok) return { ok: false, error: resolved.error, path: resolved.path };
  const { name, version, projectType } = resolved;
  const hasComposer = fs.existsSync(path.join(dirPath, 'composer.json'));
  let latestTag = null;
  let gitRemote = null;
  const gitDir = path.join(dirPath, '.git');
  const hasGit = fs.existsSync(gitDir);

  let branch = null;
  let ahead = null;
  let behind = null;
  let uncommittedLines = [];
  let allTags = [];
  let commitsSinceLatestTag = null;

  if (hasGit) {
    try {
      const [tagOut, remoteName, statusOut, porcelainOut] = await Promise.all([
        runInDir(dirPath, 'git', ['tag', '-l', '--sort=-version:refname']).catch(() => ({ stdout: '' })),
        getPushRemote(dirPath),
        runInDir(dirPath, 'git', ['status', '-sb']).catch(() => ({ stdout: '' })),
        runInDir(dirPath, 'git', ['status', '--porcelain', '-uall']).catch(() => ({ stdout: '' })),
      ]);
      const tags = (tagOut.stdout || '').trim().split(/\r?\n/).filter(Boolean);
      latestTag = tags[0] || null;
      allTags = tags.slice(0, 100);
      if (latestTag) {
        try {
          const countOut = await runInDir(dirPath, 'git', ['rev-list', '--count', `${latestTag}..HEAD`]).catch(() => ({ stdout: '' }));
          const count = parseInt((countOut.stdout || '').trim(), 10);
          commitsSinceLatestTag = Number.isFinite(count) ? count : null;
        } catch (_) {}
      }
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
    projectType,
    hasComposer,
    latestTag,
    commitsSinceLatestTag,
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

async function runVersionBump(dirPath, bump, projectType = 'npm') {
  const validBump = isValidBump(bump) || isPrereleaseBump(bump);
  if (!validBump) {
    return { ok: false, error: 'Invalid bump type' };
  }
  if (projectType !== 'npm') {
    return { ok: false, error: 'Version bump from app is only supported for npm. For Rust/Go/Python/PHP, update the version in your manifest and use "Tag and push".' };
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

async function gitTagAndPush(dirPath, tagMessage, options = {}) {
  const versionOverride = options.version;
  try {
    let version;
    if (versionOverride != null && typeof versionOverride === 'string') {
      version = versionOverride;
    } else {
      const pkgPath = path.join(dirPath, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      version = pkg.version;
    }
    const tag = formatTag(version);
    if (!tag) throw new Error('Invalid version');
    if (versionOverride == null) {
      await runInDir(dirPath, 'git', ['add', 'package.json']);
      if (fs.existsSync(path.join(dirPath, 'package-lock.json'))) {
        await runInDir(dirPath, 'git', ['add', 'package-lock.json']);
      }
      await runInDir(dirPath, 'git', ['commit', '-m', tagMessage || `chore: release ${tag}`]);
    }
    await runInDir(dirPath, 'git', ['tag', tag]);
    const remote = await getPushRemote(dirPath);
    const target = remote || 'origin';
    // Push branch then tag explicitly so the tag always appears on the remote
    await runInDir(dirPath, 'git', ['push', target, 'HEAD']);
    await runInDir(dirPath, 'git', ['push', target, tag]);
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
    const out = await runInDir(dirPath, 'git', ['status', '--porcelain', '-uall']);
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

async function gitPull(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['pull', '--no-rebase']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'git pull failed' };
  }
}

async function gitMergeAbort(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['merge', '--abort']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Merge abort failed' };
  }
}

async function gitStashPush(dirPath, message) {
  try {
    const args = message && message.trim() ? ['stash', 'push', '-m', message.trim()] : ['stash', 'push'];
    await runInDir(dirPath, 'git', args);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'git stash failed' };
  }
}

async function gitStashPop(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['stash', 'pop']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'git stash pop failed' };
  }
}

async function gitDiscardChanges(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['reset', '--hard', 'HEAD']);
    await runInDir(dirPath, 'git', ['clean', '-fd']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Discard failed' };
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

async function getRecentCommits(dirPath, n = 10) {
  return getRecentCommitsLib(runInDir, dirPath, n);
}

async function getGitDiffForCommit(dirPath) {
  return getGitDiffForCommitLib(runInDir, dirPath);
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

async function fetchGitHubReleases(owner, repo, token = null) {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`;
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': GITHUB_API_USER_AGENT };
  if (token && typeof token === 'string') headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers, redirect: 'follow' });
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

const DEFAULT_WINDOW_WIDTH = 1200;
const DEFAULT_WINDOW_HEIGHT = 800;

/** Ensure saved bounds are on a visible display (handles disconnected monitors). */
function clampBoundsToDisplay(saved) {
  if (!saved || typeof saved.width !== 'number' || typeof saved.height !== 'number') return null;
  const width = Math.max(400, Math.min(saved.width, 4096));
  const height = Math.max(300, Math.min(saved.height, 4096));
  let display;
  try {
    display = screen.getDisplayMatching({ x: saved.x ?? 0, y: saved.y ?? 0, width: 1, height: 1 });
  } catch (_) {
    display = screen.getPrimaryDisplay();
  }
  const area = display?.workArea ?? display?.bounds;
  if (!area) return { width, height, x: undefined, y: undefined };
  const x = typeof saved.x === 'number' ? saved.x : area.x;
  const y = typeof saved.y === 'number' ? saved.y : area.y;
  const inBounds =
    x >= area.x &&
    y >= area.y &&
    x + width <= area.x + area.width &&
    y + height <= area.y + area.height;
  if (inBounds) return { width, height, x, y };
  return { width, height, x: area.x, y: area.y };
}

function saveWindowBounds(win) {
  try {
    const isMaximized = win.isMaximized();
    const bounds = isMaximized ? win.getNormalBounds() : win.getBounds();
    getStore().set('windowBounds', {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
    });
  } catch (_) {}
}

function createWindow() {
  const saved = getStore().get('windowBounds');
  const clamped = clampBoundsToDisplay(saved);
  const width = clamped?.width ?? DEFAULT_WINDOW_WIDTH;
  const height = clamped?.height ?? DEFAULT_WINDOW_HEIGHT;
  const x = clamped?.x;
  const y = clamped?.y;

  const win = new BrowserWindow({
    width,
    height,
    x: x !== undefined ? x : undefined,
    y: y !== undefined ? y : undefined,
    minWidth: 400,
    minHeight: 300,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (saved?.isMaximized === true) {
    win.maximize();
  }

  win.loadFile(path.join(__dirname, '..', 'src-renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());

  let saveBoundsTimeout;
  function scheduleSaveBounds() {
    if (saveBoundsTimeout) clearTimeout(saveBoundsTimeout);
    saveBoundsTimeout = setTimeout(() => {
      saveBoundsTimeout = undefined;
      saveWindowBounds(win);
    }, 500);
  }
  win.on('move', scheduleSaveBounds);
  win.on('resize', scheduleSaveBounds);
  win.on('close', () => {
    if (saveBoundsTimeout) clearTimeout(saveBoundsTimeout);
    saveWindowBounds(win);
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('rm-theme', getEffectiveTheme());
  });
}

// Only enable file watcher + hard reset when explicitly in dev (npm run dev).
// Enabling reload for all unpackaged runs (npm start) can cause SIGABRT on macOS when the watcher restarts the process.
const devReloadEnabled =
  process.env.NODE_ENV === 'development' &&
  process.env.DISABLE_ELECTRON_RELOAD !== '1';
if (devReloadEnabled) {
  try {
    const electronReload = require('electron-reload');
    const root = path.join(__dirname, '..');
    const electronPath = path.join(root, 'node_modules', 'electron', 'cli.js');
    if (fs.existsSync(electronPath)) {
      electronReload([path.join(root, 'src-main'), path.join(root, 'src-renderer')], {
        electron: electronPath,
        hardResetMethod: 'exit',
        forceHardReset: true,
      });
    }
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
  ipcMain.handle('rm-get-composer-info', (_e, dirPath) => {
    const result = getComposerManifestInfo(dirPath, fs);
    return Promise.resolve(result.ok ? result : { ok: false, error: result.error });
  });
  ipcMain.handle('rm-get-composer-outdated', async (_e, dirPath, direct = false) => {
    try {
      const args = ['outdated', '--format=json', '--no-ansi'];
      if (direct) args.push('--direct');
      const out = await runInDir(dirPath, 'composer', args, { env: getComposerEnv(dirPath) });
      const parsed = parseComposerOutdatedJson(out.stdout);
      if (!parsed.ok) return { ok: false, error: parsed.error, packages: [] };
      return { ok: true, packages: parsed.packages || [] };
    } catch (e) {
      const msg = e.message || '';
      if (/ENOENT|not found|spawn composer/i.test(msg)) {
        return { ok: false, error: 'Composer not found. Install Composer and ensure it is in PATH.', packages: [] };
      }
      return { ok: false, error: msg || 'composer outdated failed', packages: [] };
    }
  });
  ipcMain.handle('rm-get-composer-validate', async (_e, dirPath) => {
    try {
      await runInDir(dirPath, 'composer', ['validate', '--no-ansi'], { env: getComposerEnv(dirPath) });
      return { valid: true };
    } catch (e) {
      return parseComposerValidateOutput('', e.message || '', 1);
    }
  });
  ipcMain.handle('rm-get-composer-audit', async (_e, dirPath) => {
    try {
      const out = await runInDir(dirPath, 'composer', ['audit', '--format=json', '--no-ansi'], { env: getComposerEnv(dirPath) });
      const parsed = parseComposerAuditJson(out.stdout);
      if (!parsed.ok) return { ok: false, error: parsed.error, advisories: [] };
      return { ok: true, advisories: parsed.advisories || [] };
    } catch (e) {
      const msg = e.message || '';
      if (/ENOENT|not found|spawn composer/i.test(msg)) {
        return { ok: false, error: 'Composer not found.', advisories: [] };
      }
      return { ok: false, error: msg || 'composer audit failed', advisories: [] };
    }
  });
  ipcMain.handle('rm-composer-update', async (_e, dirPath, packageNames) => {
    try {
      const args = ['update', '--no-interaction', '--no-ansi'];
      if (Array.isArray(packageNames) && packageNames.length > 0) {
        packageNames.forEach((name) => {
          if (typeof name === 'string' && name.trim()) args.push(name.trim());
        });
      }
      await runInDir(dirPath, 'composer', args, { env: getComposerEnv(dirPath) });
      return { ok: true };
    } catch (e) {
      const msg = e.message || '';
      if (/ENOENT|not found|spawn composer/i.test(msg)) {
        return { ok: false, error: 'Composer not found. Install Composer and ensure it is in PATH.' };
      }
      return { ok: false, error: msg || 'composer update failed' };
    }
  });
  function getProjectTestScripts(dirPath, projectType) {
    try {
      if (projectType === 'npm') {
        const pkgPath = path.join(dirPath, 'package.json');
        if (!fs.existsSync(pkgPath)) return { ok: true, scripts: [] };
        const content = fs.readFileSync(pkgPath, 'utf8');
        const { ok, scripts, error } = getNpmScriptNames(content);
        return ok ? { ok: true, scripts: scripts || [] } : { ok: false, scripts: [], error: error || 'Failed' };
      }
      if (projectType === 'php') {
        const manifest = getComposerManifestInfo(dirPath);
        const { scripts } = getComposerScriptNames(manifest);
        return { ok: true, scripts };
      }
      return { ok: true, scripts: [] };
    } catch (e) {
      return { ok: false, scripts: [], error: e.message || 'Failed to get test scripts' };
    }
  }
  ipcMain.handle('rm-get-project-test-scripts', (_e, dirPath, projectType) => getProjectTestScripts(dirPath, projectType));
  ipcMain.handle('rm-run-project-tests', async (_e, dirPath, projectType, scriptName) => {
    try {
      const runNpm = (script) => runInDirCapture(dirPath, 'npm', ['run', script, '--no-color']);
      const runComposer = (script) => runInDirCapture(dirPath, 'composer', ['run', script, '--no-ansi'], { env: getComposerEnv(dirPath) });
      if (projectType === 'npm') {
        const script = scriptName && scriptName.trim() ? scriptName.trim() : 'test';
        const result = await runNpm(script);
        return { ok: result.ok, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
      }
      if (projectType === 'php') {
        const script = scriptName && scriptName.trim() ? scriptName.trim() : 'test';
        const result = await runComposer(script);
        return { ok: result.ok, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
      }
      return { ok: false, error: 'Run tests is supported for npm and PHP projects only.', stdout: '', stderr: '' };
    } catch (e) {
      return { ok: false, exitCode: -1, stdout: '', stderr: e.message || 'Failed to run tests' };
    }
  });
  ipcMain.handle('rm-run-project-coverage', async (_e, dirPath, projectType) => {
    try {
      let result;
      const runNpmCoverage = async () => {
        const pkgPath = path.join(dirPath, 'package.json');
        let scriptName = null;
        let hasTestScript = false;
        if (fs.existsSync(pkgPath)) {
          const data = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          const scripts = typeof data.scripts === 'object' && data.scripts !== null ? data.scripts : {};
          scriptName = getCoverageScriptNameNpm(scripts);
          hasTestScript = typeof scripts.test === 'string';
        }
        if (scriptName) {
          return await runInDirCapture(dirPath, 'npm', ['run', scriptName, '--no-color']);
        }
        if (hasTestScript) {
          return await runInDirCapture(dirPath, 'npm', ['test', '--', '--coverage', '--no-color']);
        }
        return null;
      };
      const composerEnv = getComposerEnv(dirPath);
      const runPhpCoverage = async () => {
        const manifest = getComposerManifestInfo(dirPath);
        const { scripts } = getComposerScriptNames(manifest);
        const coverageScript = getCoverageScriptNameComposer(scripts);
        if (coverageScript) {
          return await runInDirCapture(dirPath, 'composer', ['run', coverageScript, '--no-ansi'], { env: composerEnv });
        }
        if (scripts && scripts.length > 0 && scripts.includes('test')) {
          return await runInDirCapture(dirPath, 'composer', ['run', 'test', '--', '--coverage-text', '--no-ansi'], { env: composerEnv });
        }
        return null;
      };
      if (projectType === 'npm') {
        result = await runNpmCoverage();
        if (result === null) {
          result = await runPhpCoverage();
        }
        if (result === null) {
          return { ok: false, error: 'No coverage or test script found in package.json or composer.json.', stdout: '', stderr: '', summary: null };
        }
      } else if (projectType === 'php') {
        result = await runPhpCoverage();
        if (result === null) {
          return { ok: false, error: 'No coverage or test script found in composer.json.', stdout: '', stderr: '', summary: null };
        }
      } else {
        return { ok: false, error: 'Coverage is supported for npm and PHP projects only.', stdout: '', stderr: '', summary: null };
      }
      const out = [result.stdout, result.stderr].filter(Boolean).join('\n');
      const summary = parseCoverageSummary(stripAnsi(out)) || null;
      return { ok: result.ok, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr, summary };
    } catch (e) {
      return { ok: false, exitCode: -1, stdout: '', stderr: e.message || 'Failed to run coverage', summary: null };
    }
  });
  ipcMain.handle('rm-version-bump', (_e, dirPath, bump) => runVersionBump(dirPath, bump));
  ipcMain.handle('rm-git-tag-and-push', (_e, dirPath, tagMessage) => gitTagAndPush(dirPath, tagMessage));
  ipcMain.handle('rm-release', async (_e, dirPath, bump, force, options = {}) => {
    if (!force) {
      const status = await getGitStatus(dirPath);
      if (!status.clean) {
        return { ok: false, dirty: true, error: 'Uncommitted changes. Commit or stash before releasing.' };
      }
    }
    const info = await getProjectInfoAsync(dirPath);
    if (!info.ok) return { ok: false, error: info.error };
    const projectType = info.projectType || 'npm';
    const plan = getReleasePlan(projectType, info.version);
    if (plan.action === 'error') return { ok: false, error: plan.error };
    let version;
    let tag;
    if (plan.action === 'bump_and_tag') {
      const bumpResult = await runVersionBump(dirPath, bump, projectType);
      if (!bumpResult.ok) return bumpResult;
      version = bumpResult.version;
      const pushResult = await gitTagAndPush(dirPath, `chore: release v${version}`);
      if (!pushResult.ok) return pushResult;
      tag = pushResult.tag;
    } else {
      tag = formatTag(plan.versionForTag);
      const pushResult = await gitTagAndPush(dirPath, `chore: release ${tag}`, { version: plan.versionForTag });
      if (!pushResult.ok) return pushResult;
      version = plan.versionForTag;
    }
    const token = getStore().get('githubToken') || options.githubToken;
    const gitRemote = info.gitRemote || null;
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
        return { ok: true, tag, version, actionsUrl, releaseError: formatGitHubError(e.message || '') };
      }
    }
    return { ok: true, tag, version, actionsUrl };
  });
  ipcMain.handle('rm-get-commits-since-tag', (_e, dirPath, sinceTag) => getCommitsSinceTag(dirPath, sinceTag));
  ipcMain.handle('rm-get-recent-commits', (_e, dirPath, n) => getRecentCommits(dirPath, n));
  ipcMain.handle('rm-get-suggested-bump', (_e, commits) => suggestBumpFromCommits(commits));
  ipcMain.handle('rm-get-shortcut-action', (_e, viewMode, selectedPath, key, metaKey, ctrlKey, inInput) =>
    getShortcutAction(viewMode, selectedPath, key, metaKey, ctrlKey, inInput)
  );
  ipcMain.handle('rm-get-actions-url', (_e, gitRemote) => getActionsUrl(gitRemote) || null);
  ipcMain.handle('rm-get-github-token', () => getStore().get('githubToken') || '');
  ipcMain.handle('rm-set-github-token', (_e, token) => {
    getStore().set('githubToken', typeof token === 'string' ? token : '');
    return null;
  });
  ipcMain.handle('rm-get-ollama-settings', () => ({
    baseUrl: getStore().get('ollamaBaseUrl') || DEFAULT_BASE_URL,
    model: getStore().get('ollamaModel') || DEFAULT_MODEL,
  }));
  ipcMain.handle('rm-set-ollama-settings', (_e, baseUrl, model) => {
    getStore().set('ollamaBaseUrl', typeof baseUrl === 'string' ? baseUrl : DEFAULT_BASE_URL);
    getStore().set('ollamaModel', typeof model === 'string' ? model : DEFAULT_MODEL);
    return null;
  });
  ipcMain.handle('rm-ollama-list-models', async (_e, baseUrl) => {
    const url = typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl.trim() : getStore().get('ollamaBaseUrl') || DEFAULT_BASE_URL;
    return ollamaListModels(url, undefined, { onlyGenerate: true });
  });
  ipcMain.handle('rm-ollama-generate-commit-message', async (_e, dirPath) => {
    const { baseUrl, model } = getStore().get('ollamaBaseUrl') != null
      ? { baseUrl: getStore().get('ollamaBaseUrl'), model: getStore().get('ollamaModel') }
      : { baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL };
    const diff = await getGitDiffForCommit(dirPath);
    const prompt = buildCommitMessagePrompt(diff);
    const result = await ollamaGenerate(baseUrl, model, prompt);
    return result.ok ? { ok: true, text: result.text } : { ok: false, error: result.error };
  });
  ipcMain.handle('rm-ollama-generate-release-notes', async (_e, dirPath, sinceTag) => {
    const { baseUrl, model } = getStore().get('ollamaBaseUrl') != null
      ? { baseUrl: getStore().get('ollamaBaseUrl'), model: getStore().get('ollamaModel') }
      : { baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL };
    const commitsResult = await getCommitsSinceTag(dirPath, sinceTag || null);
    const commits = commitsResult.ok && commitsResult.commits ? commitsResult.commits : [];
    const prompt = buildReleaseNotesPrompt(commits);
    const result = await ollamaGenerate(baseUrl, model, prompt);
    return result.ok ? { ok: true, text: result.text } : { ok: false, error: result.error };
  });
  ipcMain.handle('rm-get-git-status', (_e, dirPath) => getGitStatus(dirPath));
  ipcMain.handle('rm-commit-changes', (_e, dirPath, message) => gitCommit(dirPath, message));
  ipcMain.handle('rm-git-pull', (_e, dirPath) => gitPull(dirPath));
  ipcMain.handle('rm-git-stash-push', (_e, dirPath, message) => gitStashPush(dirPath, message));
  ipcMain.handle('rm-git-stash-pop', (_e, dirPath) => gitStashPop(dirPath));
  ipcMain.handle('rm-git-discard-changes', (_e, dirPath) => gitDiscardChanges(dirPath));
  ipcMain.handle('rm-git-merge-abort', (_e, dirPath) => gitMergeAbort(dirPath));
  ipcMain.handle('rm-copy-to-clipboard', (_e, text) => {
    if (text != null && typeof text === 'string') clipboard.writeText(text);
    return null;
  });
  ipcMain.handle('rm-open-path-in-finder', (_e, dirPath) => {
    if (dirPath != null && typeof dirPath === 'string') return shell.openPath(dirPath);
    return Promise.resolve('');
  });
  ipcMain.handle('rm-open-in-terminal', (_e, dirPath) => {
    if (!dirPath || typeof dirPath !== 'string') return Promise.resolve({ ok: false, error: 'Invalid path' });
    const platform = process.platform;
    const { spawn: spawnProc } = require('child_process');
    try {
      if (platform === 'darwin') {
        const escaped = dirPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const script = `tell application "Terminal" to do script "cd \\"${escaped}\\""`;
        spawnProc('osascript', ['-e', script], { detached: true, stdio: 'ignore' });
      } else if (platform === 'win32') {
        spawnProc('cmd.exe', ['/c', 'start', 'cmd', '/k', 'cd', '/d', dirPath], { detached: true, stdio: 'ignore' });
      } else {
        spawnProc('x-terminal-emulator', ['-e', `cd "${dirPath}" && exec $SHELL`], { detached: true, stdio: 'ignore' }).on('error', () => {
          spawnProc('gnome-terminal', ['--working-directory', dirPath], { detached: true, stdio: 'ignore' });
        });
      }
      return Promise.resolve({ ok: true });
    } catch (e) {
      return Promise.resolve({ ok: false, error: e.message });
    }
  });
  function openInEditorImpl(targetPath) {
    const { spawn: spawnProc } = require('child_process');
    const tryEditor = (cmd, args) =>
      new Promise((resolve) => {
        const child = spawnProc(cmd, args || [targetPath], { detached: true, stdio: 'ignore', shell: true });
        child.on('error', () => resolve(false));
        child.unref();
        setTimeout(() => resolve(true), 500);
      });
    return (async () => {
      if (await tryEditor('cursor', [targetPath])) return { ok: true, editor: 'cursor' };
      if (await tryEditor('code', [targetPath])) return { ok: true, editor: 'code' };
      return { ok: false, error: 'Cursor or VS Code not found in PATH. Install one and ensure the shell command is available.' };
    })();
  }
  ipcMain.handle('rm-open-in-editor', (_e, dirPath) => {
    if (!dirPath || typeof dirPath !== 'string') return Promise.resolve({ ok: false, error: 'Invalid path' });
    return openInEditorImpl(dirPath);
  });
  ipcMain.handle('rm-open-file-in-editor', (_e, dirPath, relativePath) => {
    if (!dirPath || typeof dirPath !== 'string') return Promise.resolve({ ok: false, error: 'Invalid path' });
    const fullPath = path.join(dirPath, (relativePath || '').replace(/^[/\\]+/, ''));
    return openInEditorImpl(fullPath);
  });

  const MAX_FILE_VIEW_SIZE = 512 * 1024;
  ipcMain.handle('rm-get-file-diff', async (_e, dirPath, filePath, isUntracked) => {
    if (!dirPath || typeof filePath !== 'string') return { ok: false, error: 'Invalid path' };
    const fullPath = path.join(dirPath, (filePath || '').replace(/^[/\\]+/, ''));
    try {
      if (isUntracked) {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) return { ok: false, error: 'Cannot view directory' };
        if (stat.size > MAX_FILE_VIEW_SIZE) return { ok: false, error: `File too large to view (${Math.round(stat.size / 1024)} KB). Open in editor instead.` };
        const content = fs.readFileSync(fullPath, 'utf8');
        return { ok: true, type: 'new', content };
      }
      const result = await runInDirCapture(dirPath, 'git', ['diff', 'HEAD', '--', filePath]);
      const content = [result.stdout, result.stderr].filter(Boolean).join('\n').trim() || '(no diff)';
      return { ok: true, type: 'diff', content };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to load file' };
    }
  });
  ipcMain.handle('rm-get-releases-url', (_e, gitRemote) => getReleasesUrl(gitRemote));
  ipcMain.handle('rm-sync-from-remote', (_e, dirPath) => gitFetch(dirPath));
  ipcMain.handle('rm-get-github-releases', async (_e, gitRemote, token = null) => {
    const slug = getRepoSlug(gitRemote);
    if (!slug) return { ok: false, error: 'Not a GitHub repo', releases: [] };
    const authToken = token || getStore().get('githubToken') || null;
    try {
      const releases = await fetchGitHubReleases(slug.owner, slug.repo, authToken);
      return { ok: true, releases };
    } catch (e) {
      return { ok: false, error: formatGitHubError(e.message || 'Failed to fetch releases'), releases: [] };
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
      return { ok: false, error: formatGitHubError(err.message || 'Failed to fetch or download') };
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
  ipcMain.handle('rm-get-changelog', async () => {
    try {
      const changelogPath = path.join(app.getAppPath(), 'CHANGELOG.md');
      const raw = fs.readFileSync(changelogPath, 'utf8');
      const html = marked.parse(raw, { gfm: true });
      const content = sanitizeHtml(html, {
        allowedTags: ['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'code', 'pre', 'br', 'blockquote'],
        allowedAttributes: { a: ['href'] },
        allowedSchemes: ['http', 'https'],
      });
      return { ok: true, content };
    } catch (e) {
      return { ok: false, error: e.message || 'Could not load changelog.' };
    }
  });
  ipcMain.handle('rm-get-preference', (_e, key) => getPreference(key));
  ipcMain.handle('rm-get-available-php-versions', () => getAvailablePhpVersions());
  ipcMain.handle('rm-parse-php-require', (_e, phpRequire) => parsePhpRequireToVersion(phpRequire));
  ipcMain.handle('rm-set-preference', (_e, key, value) => {
    setPreference(key, value);
    return null;
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

app.on('before-quit', () => {
  try {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) saveWindowBounds(w);
  } catch (_) {}
});
app.on('window-all-closed', () => app.quit());
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
