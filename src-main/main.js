const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, clipboard, screen, Menu, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const terminalService = require('./services/terminal');
const terminalPopoutState = terminalService.createTerminalPopoutState();
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const Store = require('electron-store');
const appRoot = path.join(__dirname, '..');
const { marked } = require(path.join(appRoot, 'node_modules', 'marked'));
const sanitizeHtml = require(path.join(appRoot, 'node_modules', 'sanitize-html'));
const { getReleasesUrl, getActionsUrl, getPullRequestsUrl, getRepoSlug, pickAssetForPlatform } = require('./lib/github');
const { formatGitHubError } = require('./lib/githubErrors');
const { filterValidProjects } = require('./lib/projects');
const debug = require('./debug');
const { THEME_VALUES, getEffectiveTheme: getEffectiveThemeFromSetting } = require('./lib/theme');
const { isValidBump, isPrereleaseBump, formatTag, PRERELEASE_PREID } = require('./lib/version');
const { runInDir: runInDirLib } = require('./lib/runInDir');
const { parseOldConfig } = require('./lib/migration');
const { getProjectNameVersionAndType } = require('./lib/projectDetection');
const { getReleasePlan: getReleasePlanFromStrategy } = require('./lib/releaseStrategy');
const { suggestBumpFromCommits } = require('./lib/conventionalCommits');
const { getShortcutAction } = require('./lib/shortcuts');
const { parsePorcelainLines } = require('./lib/gitPorcelain');
const {
  generate: ollamaGenerate,
  listModels: ollamaListModels,
  buildCommitMessagePrompt,
  buildReleaseNotesPrompt,
  buildTagMessagePrompt,
  buildTestFixPrompt,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
} = require('./lib/ollama');
const { generate: claudeGenerate, DEFAULT_MODEL: CLAUDE_DEFAULT_MODEL } = require('./lib/claude');
const { generate: openaiGenerate, DEFAULT_MODEL: OPENAI_DEFAULT_MODEL } = require('./lib/openai');
const { generate: geminiGenerate, DEFAULT_MODEL: GEMINI_DEFAULT_MODEL } = require('./lib/gemini');
const {
  parseStashList: parseStashListLib,
  parseRemoteBranches: parseRemoteBranchesLib,
  parseCommitLog: parseCommitLogLib,
  parseCommitLogWithBody: parseCommitLogWithBodyLib,
  parseRemotes: parseRemotesLib,
  parseLocalBranches: parseLocalBranchesLib,
} = require('./lib/gitOutputParsers');
const { createGitApi } = require('./lib/git');
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
const { createApiServer } = require('./apiServer');
const { runCli, getCliArgs } = require('./cli');
const { getApiDocs: getApiDocsFromModule, getApiMethodDoc: getApiMethodDocFromModule, getSampleResponseForMethod } = require('./apiDocs');
const { createProcessManager } = require('./services/processManager');
const { createEmailService } = require('./services/email');
const { createTunnelService } = require('./services/tunnels');
const { createFtpClient } = require('./services/ftp');
const { createSshManager } = require('./services/ssh');
const { createDialogsService } = require('./services/dialogs');
const { createLicenseServer } = require('./lib/licenseServer');
const appSettings = require('./lib/appSettings');
const { sendCrashReport: sendCrashReportToIngestion } = require('./lib/crashReports');
const { track: telemetryTrack, flush: telemetryFlush, startFlushTimer: telemetryStartFlushTimer, stopFlushTimer: telemetryStopFlushTimer } = require('./lib/telemetry');
const { SMTPServer } = require(path.join(appRoot, 'node_modules', 'smtp-server'));
const { simpleParser } = require(path.join(appRoot, 'node_modules', 'mailparser'));
const localtunnel = require(path.join(appRoot, 'node_modules', 'localtunnel'));
const { Client: FtpClient } = require(path.join(appRoot, 'node_modules', 'basic-ftp'));

// Use same app name in dev and prod so userData is shared (dev no longer uses "Electron")
const pkg = require(path.join(__dirname, '..', 'package.json'));
if (pkg.productName && !app.isPackaged) {
  app.setName(pkg.productName);
}

let store;
let mcpServerProcess = null;

function getStore() {
  if (!store) store = new Store({ name: 'release-manager' });
  return store;
}

function getProjects() {
  try {
    const raw = getStore().get('projects') || [];
    const filtered = filterValidProjects(raw);
    debug.log(getStore, 'project', 'getProjects', { stored: raw?.length ?? 0, filtered: filtered.length });
    return filtered;
  } catch (e) {
    console.error('[RM] getProjects failed:', e);
    debug.log(getStore, 'project', 'getProjects ERROR', e?.message ?? e);
    return [];
  }
}

function setProjects(projects) {
  const list = Array.isArray(projects) ? projects : [];
  const normalized = list.map((p) => {
    if (!p || typeof p.path !== 'string') return null;
    const rawPath = p.path.trim();
    if (!rawPath) return null;
    const normalizedPath = path.normalize(rawPath).replace(/[/\\]+$/, '') || rawPath;
    return {
      path: normalizedPath,
      name: p.name || path.basename(normalizedPath) || normalizedPath,
      tags: Array.isArray(p.tags) ? p.tags : [],
      starred: !!p.starred,
    };
  }).filter(Boolean);
  const current = getStore().get('projects') || [];
  const skipped = normalized.length === 0 && current.length > 1;
  debug.log(getStore, 'project', 'setProjects', { incoming: list.length, normalized: normalized.length, current: current.length, skipped });
  if (skipped) return { ok: false, saved: current.length, skipped: true };
  getStore().set('projects', normalized);
  debug.log(getStore, 'project', 'setProjects saved', normalized.length, 'projects');
  return { ok: true, saved: normalized.length };
}

function getThemeSetting() {
  const t = getStore().get('theme');
  return THEME_VALUES.includes(t) ? t : 'dark';
}

function setThemeSetting(theme) {
  if (!THEME_VALUES.includes(theme)) return;
  getStore().set('theme', theme);
  nativeTheme.themeSource = theme === 'system' ? 'system' : theme;
  debug.log(getStore, 'theme', 'setTheme', theme);
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
  const isLong = typeof value === 'string' && value.length > 20;
  const isSecret = /token|key|secret|password/i.test(key);
  const safeValue = isSecret ? '(redacted)' : (isLong ? '(string)' : value);
  debug.log(getStore, 'prefs', 'setPreference', key, safeValue);
}

const LICENSE_KEY_PREF = 'licenseKey';

/** Simple validation: non-empty trimmed key. Replace with server/signature check for production. */
function isValidLicenseKey(key) {
  const k = typeof key === 'string' ? key.trim() : '';
  return k.length > 0;
}

function getLicenseStatus() {
  const key = getPreference(LICENSE_KEY_PREF);
  return { hasLicense: isValidLicenseKey(key) };
}

function setLicenseKey(key) {
  const k = typeof key === 'string' ? key.trim() : '';
  setPreference(LICENSE_KEY_PREF, k);
  return { ok: true, hasLicense: isValidLicenseKey(k) };
}

const licenseServer = createLicenseServer({ getPreference, setPreference });

async function getLicenseStatus() {
  const remoteValid = await licenseServer.hasValidRemoteLicense();
  if (remoteValid) {
    const session = await licenseServer.getRemoteSession();
    return { hasLicense: true, source: 'remote', email: session.email || null };
  }
  const key = getPreference(LICENSE_KEY_PREF);
  if (isValidLicenseKey(key)) return { hasLicense: true, source: 'key' };
  return { hasLicense: false, source: null };
}

function getEffectiveTheme() {
  return getEffectiveThemeFromSetting(getThemeSetting(), nativeTheme.shouldUseDarkColors);
}

function getAppZoomFactor() {
  return getPreference('appearanceZoomFactor') ?? 1;
}

function setAppZoomFactor(factor) {
  const f = typeof factor === 'number' && factor > 0 ? factor : 1;
  setPreference('appearanceZoomFactor', f);
  const wins = BrowserWindow.getAllWindows();
  wins.forEach((w) => {
    if (w && !w.isDestroyed() && w.webContents) w.webContents.setZoomFactor(f);
  });
  return null;
}

function sendToAllWindows(channel, ...args) {
  const w = BrowserWindow.getAllWindows()[0];
  if (w && !w.isDestroyed()) w.webContents.send(channel, ...args);
}

const processManager = createProcessManager({
  getStore,
  send: sendToAllWindows,
  spawn,
  getNpmScriptNames,
  getComposerManifestInfo,
});
const emailService = createEmailService({
  getStore,
  send: sendToAllWindows,
  SMTPServer,
  simpleParser,
  sanitizeHtml,
  debug,
});
const tunnelService = createTunnelService({ send: sendToAllWindows, localtunnel });
const ftpService = createFtpClient({ FtpClient });
const sshManager = createSshManager({ getPreference, setPreference });
const dialogsService = createDialogsService({
  dialog,
  getBrowserWindow: () => BrowserWindow.getAllWindows()[0] || null,
});

function runInDir(dirPath, command, args, options = {}) {
  return runInDirLib(dirPath, command, args, options, spawn);
}

function runInDirCapture(dirPath, command, args, options = {}) {
  return terminalService.runInDirCapture(dirPath, command, args, options, spawn);
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

let gitApi = null;
function getGitApi() {
  if (!gitApi) {
    gitApi = createGitApi({
      runInDir,
      runInDirCapture,
      path,
      fs,
      getPreference,
      parseLocalBranches: parseLocalBranchesLib,
      parseRemoteBranches: parseRemoteBranchesLib,
      parseRemotes: parseRemotesLib,
      parseCommitLog: parseCommitLogLib,
      parseCommitLogWithBody: parseCommitLogWithBodyLib,
      parseStashList: parseStashListLib,
      parsePorcelainLines,
      formatTag,
    });
  }
  return gitApi;
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
  let conflictCount = 0;
  let allTags = [];
  let commitsSinceLatestTag = null;

  if (hasGit) {
    const gitInfo = await getGitApi().getProjectInfoFromGit(dirPath);
    latestTag = gitInfo.latestTag;
    allTags = gitInfo.allTags || [];
    commitsSinceLatestTag = gitInfo.commitsSinceLatestTag;
    gitRemote = gitInfo.gitRemote;
    branch = gitInfo.branch;
    ahead = gitInfo.ahead;
    behind = gitInfo.behind;
    uncommittedLines = gitInfo.uncommittedLines || [];
    conflictCount = gitInfo.conflictCount || 0;
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
    conflictCount,
  };
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

async function showDirectoryDialog() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select project folder',
  });
  if (canceled || !filePaths || filePaths.length === 0) return null;
  return filePaths[0];
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

/** state: 'open' | 'closed' | 'all'. Returns list of PRs from GitHub API. */
async function fetchGitHubPullRequests(owner, repo, token, state = 'open') {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=${encodeURIComponent(state)}&per_page=50`;
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': GITHUB_API_USER_AGENT, 'X-GitHub-Api-Version': '2022-11-28' };
  if (token && typeof token === 'string') headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers, redirect: 'follow' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(res.status === 404 ? 'Repo not found' : text || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** head and base are branch names (same repo). Returns created PR or throws. */
async function createGitHubPullRequest(owner, repo, head, base, title, body, token) {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`;
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': GITHUB_API_USER_AGENT, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
  if (token && typeof token === 'string') headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, head, base, body: body || undefined }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

/** mergeMethod: 'merge' | 'squash' | 'rebase'. */
async function mergeGitHubPullRequest(owner, repo, prNumber, mergeMethod, token) {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${encodeURIComponent(prNumber)}/merge`;
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': GITHUB_API_USER_AGENT, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
  if (token && typeof token === 'string') headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ merge_method: mergeMethod }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
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

const DEFAULT_WINDOW_WIDTH = 1600;
const DEFAULT_WINDOW_HEIGHT = 900;

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

function createWindow(opts = {}) {
  const telemetrySource = opts.telemetrySource || 'launch';
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

  // Vue + Vite renderer is the default (built to dist-renderer)
  win.loadFile(path.join(__dirname, '..', 'dist-renderer', 'index.html'));
  win.once('ready-to-show', () => {
    win.show();
    telemetryTrack(getPreference, 'app.opened', { source: telemetrySource });
  });

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
  appSettings.setMainWindowRef(win);
  win.on('close', (e) => {
    if (appSettings.handleWindowClose(win)) {
      e.preventDefault();
      return;
    }
    if (saveBoundsTimeout) clearTimeout(saveBoundsTimeout);
    saveWindowBounds(win);
  });
  const alwaysOnTop = getPreference('alwaysOnTop');
  if (!!alwaysOnTop) win.setAlwaysOnTop(true);

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('rm-theme', getEffectiveTheme());
    const zoom = getPreference('appearanceZoomFactor');
    if (typeof zoom === 'number' && zoom > 0) win.webContents.setZoomFactor(zoom);
    else win.webContents.setZoomFactor(1);
    if (process.env.NODE_ENV === 'development') {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  });
}

function createTerminalPopoutWindow(dirPath) {
  const iconPath = path.join(__dirname, '..', 'assets', 'icons', 'icon.png');
  const indexPath = path.join(__dirname, '..', 'dist-renderer', 'index.html');
  const preloadPath = path.join(__dirname, 'preload.js');
  terminalService.createTerminalPopoutWindow(dirPath, {
    BrowserWindow,
    path,
    fs,
    getEffectiveTheme,
    iconPath,
    indexPath,
    preloadPath,
    state: terminalPopoutState,
    getPreference,
  });
}

app.whenReady().then(() => {
  store = new Store({ name: 'release-manager' });
  appSettings.init(getStore, getPreference, setPreference);
  appSettings.applyProxy();
  // One-time migration from old JSON config so projects survive rebuilds
  const oldConfigPath = path.join(app.getPath('userData'), 'shipwell-config.json');
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

  // Set an explicit app menu to avoid macOS "representedObject is not a WeakPtrToElectronMenuModelAsNSObject" warning
  // (triggered when Electron builds its default menu internally)
  const appMenu = Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu', label: pkg.productName || 'Shipwell' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    { role: 'help', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'toggleDevTools', label: 'Toggle Developer Tools' }] },
  ]);
  Menu.setApplicationMenu(appMenu);

  // API layer: single dispatch for both IPC and HTTP API (register before createWindow so handlers exist when renderer loads)
  function channelToMethod(channel) {
    const k = channel.replace(/^rm-/, '');
    return k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }
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
        const manifest = getComposerManifestInfo(dirPath, fs);
        const { scripts } = getComposerScriptNames(manifest);
        return { ok: true, scripts: scripts || [] };
      }
      return { ok: true, scripts: [] };
    } catch (e) {
      return { ok: false, scripts: [], error: e.message || 'Failed to get test scripts' };
    }
  }
  async function runApiMethod(method, params) {
    const fn = apiRegistry[method];
    if (typeof fn !== 'function') throw new Error('Unknown method: ' + method);
    return fn(...params);
  }
  async function generateWithProvider(prompt) {
    const provider = getStore().get('aiProvider') || 'ollama';
    if (provider === 'ollama') {
      const baseUrl = getStore().get('ollamaBaseUrl') || DEFAULT_BASE_URL;
      const model = getStore().get('ollamaModel') || DEFAULT_MODEL;
      return ollamaGenerate(baseUrl, model, prompt);
    }
    if (provider === 'claude') {
      const apiKey = getStore().get('claudeApiKey') || '';
      const model = getStore().get('claudeModel') || CLAUDE_DEFAULT_MODEL;
      return claudeGenerate(apiKey, model, prompt);
    }
    if (provider === 'openai') {
      const apiKey = getStore().get('openaiApiKey') || '';
      const model = getStore().get('openaiModel') || OPENAI_DEFAULT_MODEL;
      return openaiGenerate(apiKey, model, prompt);
    }
    if (provider === 'gemini') {
      const apiKey = getStore().get('geminiApiKey') || '';
      const model = getStore().get('geminiModel') || GEMINI_DEFAULT_MODEL;
      return geminiGenerate(apiKey, model, prompt);
    }
    const baseUrl = getStore().get('ollamaBaseUrl') || DEFAULT_BASE_URL;
    const model = getStore().get('ollamaModel') || DEFAULT_MODEL;
    return ollamaGenerate(baseUrl, model, prompt);
  }
  const apiRegistry = {
    getProjects: () => getProjects(),
    getAllProjectsInfo: async () => {
      const list = getProjects();
      const results = await Promise.all(
        list.map(async (p) => {
          const info = await getProjectInfoAsync(p.path);
          return { path: p.path, name: p.name, ...info };
        })
      );
      return results;
    },
    setProjects: (projects) => {
      return setProjects(projects);
    },
    showDirectoryDialog: () => showDirectoryDialog(),
    getProjectInfo: (dirPath) => getProjectInfoAsync(dirPath),
    getComposerInfo: (dirPath) => {
      const result = getComposerManifestInfo(dirPath, fs);
      return Promise.resolve(result.ok ? result : { ok: false, error: result.error });
    },
    getComposerOutdated: async (dirPath, direct = false) => {
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
    },
    getComposerValidate: async (dirPath) => {
      try {
        await runInDir(dirPath, 'composer', ['validate', '--no-ansi'], { env: getComposerEnv(dirPath) });
        return { valid: true };
      } catch (e) {
        return parseComposerValidateOutput('', e.message || '', 1);
      }
    },
    getComposerAudit: async (dirPath) => {
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
    },
    composerUpdate: async (dirPath, packageNames) => {
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
    },
    getProjectTestScripts: (dirPath, projectType) => getProjectTestScripts(dirPath, projectType),
    runProjectTests: async (dirPath, projectType, scriptName) => {
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
        return { ok: false, error: e.message || 'Run failed', stdout: '', stderr: '' };
      }
    },
    runProjectCoverage: async (dirPath, projectType) => runProjectCoverageImpl(dirPath, projectType),
    versionBump: (dirPath, bump) => runVersionBump(dirPath, bump),
    gitTagAndPush: (dirPath, tagMessage, options) => getGitApi().gitTagAndPush(dirPath, tagMessage, options || {}),
    release: async (dirPath, bump, force, options = {}) => runReleaseImpl(dirPath, bump, force, options),
    getCommitsSinceTag: (dirPath, sinceTag) => getCommitsSinceTag(dirPath, sinceTag),
    getCommitSubject: (dirPath, ref) => getCommitSubject(dirPath, ref),
    getRecentCommits: (dirPath, n) => getGitApi().getRecentCommits(dirPath, n),
    getSuggestedBump: (commits) => suggestBumpFromCommits(commits),
    getShortcutAction: (viewMode, selectedPath, key, metaKey, ctrlKey, inInput) =>
      getShortcutAction(viewMode, selectedPath, key, metaKey, ctrlKey, inInput),
    getActionsUrl: (gitRemote) => getActionsUrl(gitRemote) || null,
    getGitHubToken: () => getStore().get('githubToken') || '',
    setGitHubToken: (token) => {
      getStore().set('githubToken', token || '');
      return null;
    },
    getOllamaSettings: () => ({
      baseUrl: getStore().get('ollamaBaseUrl') || DEFAULT_BASE_URL,
      model: getStore().get('ollamaModel') || DEFAULT_MODEL,
    }),
    setOllamaSettings: (baseUrl, model) => {
      getStore().set('ollamaBaseUrl', baseUrl || '');
      getStore().set('ollamaModel', model || '');
      return null;
    },
    getClaudeSettings: () => ({
      apiKey: getStore().get('claudeApiKey') || '',
      model: getStore().get('claudeModel') || CLAUDE_DEFAULT_MODEL,
    }),
    setClaudeSettings: (apiKey, model) => {
      getStore().set('claudeApiKey', apiKey || '');
      getStore().set('claudeModel', model || '');
      return null;
    },
    getOpenAISettings: () => ({
      apiKey: getStore().get('openaiApiKey') || '',
      model: getStore().get('openaiModel') || OPENAI_DEFAULT_MODEL,
    }),
    setOpenAISettings: (apiKey, model) => {
      getStore().set('openaiApiKey', apiKey || '');
      getStore().set('openaiModel', model || '');
      return null;
    },
    getGeminiSettings: () => ({
      apiKey: getStore().get('geminiApiKey') || '',
      model: getStore().get('geminiModel') || GEMINI_DEFAULT_MODEL,
    }),
    setGeminiSettings: (apiKey, model) => {
      getStore().set('geminiApiKey', apiKey || '');
      getStore().set('geminiModel', model || '');
      return null;
    },
    getAiProvider: () => getStore().get('aiProvider') || 'ollama',
    setAiProvider: (provider) => {
      getStore().set('aiProvider', provider || 'ollama');
      return null;
    },
    getAiGenerateAvailable: () => {
      const provider = getStore().get('aiProvider') || 'ollama';
      if (provider === 'openai') return !!((getStore().get('openaiApiKey') || '').trim());
      if (provider === 'claude') return !!((getStore().get('claudeApiKey') || '').trim());
      if (provider === 'gemini') return !!((getStore().get('geminiApiKey') || '').trim());
      return true;
    },
    ollamaListModels: async (baseUrl) => ollamaListModels(baseUrl || getStore().get('ollamaBaseUrl') || DEFAULT_BASE_URL),
    ollamaGenerateCommitMessage: async (dirPath) => {
      const diff = await getGitApi().getGitDiffForCommit(dirPath);
      const prompt = buildCommitMessagePrompt(diff);
      return generateWithProvider(prompt);
    },
    ollamaGenerateReleaseNotes: async (dirPath, sinceTag) => {
      const res = await getCommitsSinceTag(dirPath, sinceTag);
      const commits = res.ok ? res.commits : [];
      const prompt = buildReleaseNotesPrompt(commits);
      return generateWithProvider(prompt);
    },
    ollamaGenerateTagMessage: async (dirPath, ref) => {
      const res = await getCommitsSinceTag(dirPath, ref || null);
      const commits = res.ok ? res.commits : [];
      const prompt = buildTagMessagePrompt(commits);
      return generateWithProvider(prompt);
    },
    ollamaSuggestTestFix: async (testScriptName, stdout, stderr) => {
      const prompt = buildTestFixPrompt(testScriptName, stdout, stderr);
      return generateWithProvider(prompt);
    },
    getGitStatus: (dirPath) => getGitApi().getGitStatus(dirPath),
    getTrackedFiles: (dirPath) => getGitApi().getTrackedFiles(dirPath),
    getProjectFiles: (dirPath) => getGitApi().getProjectFiles(dirPath),
    gitPull: (dirPath) => getGitApi().gitPull(dirPath),
    getBranches: (dirPath) => getGitApi().getBranches(dirPath),
    checkoutBranch: (dirPath, branchName) => getGitApi().checkoutBranch(dirPath, branchName),
    createBranch: (dirPath, branchName, checkout) => getGitApi().createBranch(dirPath, branchName, checkout !== false),
    createBranchFrom: (dirPath, newBranchName, fromRef) => getGitApi().createBranchFrom(dirPath, newBranchName, fromRef),
    gitPush: (dirPath) => getGitApi().gitPushWithUpstream(dirPath),
    gitPushForce: (dirPath, withLease) => getGitApi().gitPushForce(dirPath, !!withLease),
    gitFetch: (dirPath) => getGitApi().gitFetch(dirPath),
    gitMerge: (dirPath, branchName, options) => getGitApi().gitMerge(dirPath, branchName, options || {}),
    gitStashPush: (dirPath, message, options) => getGitApi().gitStashPush(dirPath, message, options || {}),
    commitChanges: (dirPath, message, options) => getGitApi().gitCommit(dirPath, message, options || {}),
    gitStashPop: (dirPath) => getGitApi().gitStashPop(dirPath),
    gitDiscardChanges: (dirPath) => getGitApi().gitDiscardChanges(dirPath),
    gitMergeAbort: (dirPath) => getGitApi().gitMergeAbort(dirPath),
    getRemoteBranches: (dirPath) => getGitApi().getRemoteBranches(dirPath),
    checkoutRemoteBranch: (dirPath, ref) => getGitApi().checkoutRemoteBranch(dirPath, ref),
    getStashList: (dirPath) => getGitApi().getStashList(dirPath),
    stashApply: (dirPath, index) => getGitApi().stashApply(dirPath, index),
    stashDrop: (dirPath, index) => getGitApi().stashDrop(dirPath, index),
    getTags: (dirPath) => getGitApi().getTags(dirPath),
    checkoutTag: (dirPath, tagName) => getGitApi().checkoutTag(dirPath, tagName),
    getCommitLog: (dirPath, n) => getGitApi().getCommitLog(dirPath, n),
    getCommitLogWithBody: (dirPath, n) => getGitApi().getCommitLogWithBody(dirPath, n),
    getCommitDetail: (dirPath, sha) => getGitApi().getCommitDetail(dirPath, sha),
    deleteBranch: (dirPath, branchName, force) => getGitApi().deleteBranch(dirPath, branchName, force),
    deleteRemoteBranch: (dirPath, remoteName, branchName) => getGitApi().deleteRemoteBranch(dirPath, remoteName, branchName),
    gitRebase: (dirPath, ontoBranch) => getGitApi().gitRebase(dirPath, ontoBranch),
    gitRebaseAbort: (dirPath) => getGitApi().gitRebaseAbort(dirPath),
    gitRebaseContinue: (dirPath) => getGitApi().gitRebaseContinue(dirPath),
    gitRebaseSkip: (dirPath) => getGitApi().gitRebaseSkip(dirPath),
    gitMergeContinue: (dirPath) => getGitApi().gitMergeContinue(dirPath),
    getRemotes: (dirPath) => getGitApi().getRemotes(dirPath),
    addRemote: (dirPath, name, url) => getGitApi().addRemote(dirPath, name, url),
    removeRemote: (dirPath, name) => getGitApi().removeRemote(dirPath, name),
    renameRemote: (dirPath, oldName, newName) => getGitApi().renameRemote(dirPath, oldName, newName),
    setRemoteUrl: (dirPath, name, url) => getGitApi().setRemoteUrl(dirPath, name, url),
    gitCherryPick: (dirPath, sha) => getGitApi().gitCherryPick(dirPath, sha),
    gitCherryPickAbort: (dirPath) => getGitApi().gitCherryPickAbort(dirPath),
    gitCherryPickContinue: (dirPath) => getGitApi().gitCherryPickContinue(dirPath),
    renameBranch: (dirPath, oldName, newName) => getGitApi().renameBranch(dirPath, oldName, newName),
    createTag: (dirPath, tagName, message, ref) => getGitApi().createTag(dirPath, tagName, message, ref),
    gitInit: (dirPath) => getGitApi().gitInit(dirPath),
    writeGitignore: (dirPath, content) => getGitApi().writeGitignore(dirPath, content),
    writeGitattributes: (dirPath, content) => getGitApi().writeGitattributes(dirPath, content),
    createTestFile: (dirPath, relativePath, content) => createTestFile(dirPath, relativePath, content),
    gitRebaseInteractive: (dirPath, ref) => getGitApi().gitRebaseInteractive(dirPath, ref),
    gitReset: (dirPath, ref, mode) => getGitApi().gitReset(dirPath, ref, mode),
    getBranchRevision: (dirPath, ref) => getGitApi().getBranchRevision(dirPath, ref),
    setBranchUpstream: (dirPath, branchName) => getGitApi().setBranchUpstream(dirPath, branchName),
    getDiffBetween: (dirPath, refA, refB) => getGitApi().getDiffBetween(dirPath, refA, refB),
    getDiffBetweenFull: (dirPath, refA, refB) => getGitApi().getDiffBetweenFull(dirPath, refA, refB),
    getFileDiffStructured: (dirPath, filePath, options) => getGitApi().getFileDiffStructured(dirPath, filePath, options),
    revertFileLine: (dirPath, filePath, op, lineNum, content) => getGitApi().revertFileLine(dirPath, filePath, op, lineNum, content),
    gitRevert: (dirPath, sha) => getGitApi().gitRevert(dirPath, sha),
    gitPruneRemotes: (dirPath) => getGitApi().gitPruneRemotes(dirPath),
    gitAmend: (dirPath, message) => getGitApi().gitAmend(dirPath, message),
    getReflog: (dirPath, n) => getGitApi().getReflog(dirPath, n),
    checkoutRef: (dirPath, ref) => getGitApi().checkoutRef(dirPath, ref),
    getBlame: (dirPath, filePath) => getGitApi().getBlame(dirPath, filePath),
    deleteTag: (dirPath, tagName) => getGitApi().deleteTag(dirPath, tagName),
    pushTag: (dirPath, tagName, remoteName) => getGitApi().pushTag(dirPath, tagName, remoteName),
    stageFile: (dirPath, filePath) => getGitApi().stageFile(dirPath, filePath),
    unstageFile: (dirPath, filePath) => getGitApi().unstageFile(dirPath, filePath),
    discardFile: (dirPath, filePath) => getGitApi().discardFile(dirPath, filePath),
    gitFetchRemote: (dirPath, remoteName, ref) => getGitApi().gitFetchRemote(dirPath, remoteName, ref),
    gitPullRebase: (dirPath) => getGitApi().gitPullRebase(dirPath),
    gitPullFFOnly: (dirPath) => getGitApi().gitPullFFOnly(dirPath),
    getGitignore: (dirPath) => getGitApi().getGitignore(dirPath),
    scanProjectForGitignore: (dirPath) => getGitApi().scanProjectForGitignore(dirPath),
    getFileAtRef: (dirPath, filePath, ref) => getGitApi().getFileAtRef(dirPath, filePath, ref),
    getGitattributes: (dirPath) => getGitApi().getGitattributes(dirPath),
    getSubmodules: (dirPath) => getGitApi().getSubmodules(dirPath),
    submoduleUpdate: (dirPath, init) => getGitApi().submoduleUpdate(dirPath, init),
    getGitState: (dirPath) => getGitApi().getGitState(dirPath),
    getGitUser: (dirPath) => getGitApi().getGitUser(dirPath),
    getWorktrees: (dirPath) => getGitApi().getWorktrees(dirPath),
    worktreeAdd: (dirPath, worktreePath, branch) => getGitApi().worktreeAdd(dirPath, worktreePath, branch),
    worktreeRemove: (dirPath, worktreePath) => getGitApi().worktreeRemove(dirPath, worktreePath),
    getBisectStatus: (dirPath) => getGitApi().getBisectStatus(dirPath),
    bisectStart: (dirPath, badRef, goodRef) => getGitApi().bisectStart(dirPath, badRef, goodRef),
    bisectGood: (dirPath) => getGitApi().bisectGood(dirPath),
    bisectBad: (dirPath) => getGitApi().bisectBad(dirPath),
    bisectSkip: (dirPath) => getGitApi().bisectSkip(dirPath),
    bisectReset: (dirPath) => getGitApi().bisectReset(dirPath),
    bisectRun: (dirPath, commandArgs) => getGitApi().bisectRun(dirPath, commandArgs),
    copyToClipboard: (text) => {
      if (text != null && typeof text === 'string') clipboard.writeText(text);
      return null;
    },
    openPathInFinder: (dirPath) => {
      if (dirPath != null && typeof dirPath === 'string') return shell.openPath(dirPath);
      return Promise.resolve('');
    },
    openInTerminal: (dirPath) => openInTerminalImpl(dirPath),
    runShellCommand: (dirPath, command) => runShellCommand(dirPath, command),
    openInEditor: (dirPath) => openInEditorImpl(dirPath),
    openFileInEditor: (dirPath, relativePath) => openFileInEditorImpl(dirPath, relativePath),
    getFileDiff: async (dirPath, filePath, isUntracked) => getFileDiffImpl(dirPath, filePath, isUntracked),
    getReleasesUrl: (gitRemote) => getReleasesUrl(gitRemote),
    getPullRequestsUrl: (gitRemote) => getPullRequestsUrl(gitRemote),
    syncFromRemote: (dirPath) => getGitApi().gitFetch(dirPath),
    getGitHubReleases: async (gitRemote, token = null) => {
      const slug = getRepoSlug(gitRemote);
      if (!slug) return { ok: false, error: 'Not a GitHub repo', releases: [] };
      const authToken = token || getStore().get('githubToken') || null;
      try {
        const releases = await fetchGitHubReleases(slug.owner, slug.repo, authToken);
        return { ok: true, releases };
      } catch (e) {
        return { ok: false, error: formatGitHubError(e.message || 'Failed to fetch releases'), releases: [] };
      }
    },
    getPullRequests: async (gitRemote, state = 'open', token = null) => {
      const slug = getRepoSlug(gitRemote);
      if (!slug) return { ok: false, error: 'Not a GitHub repo', pullRequests: [] };
      const authToken = token || getStore().get('githubToken') || null;
      try {
        const pullRequests = await fetchGitHubPullRequests(slug.owner, slug.repo, authToken, state);
        return { ok: true, pullRequests };
      } catch (e) {
        return { ok: false, error: formatGitHubError(e.message || 'Failed to fetch pull requests'), pullRequests: [] };
      }
    },
    createPullRequest: async (dirPath, baseBranch, title, body, token = null) => {
      let remoteName;
      try {
        remoteName = await getGitApi().getPushRemote(dirPath);
      } catch (_) {}
      if (!remoteName) return { ok: false, error: 'No push remote configured' };
      let remoteUrl = null;
      try {
        const remotesResult = await getGitApi().getRemotes(dirPath);
        if (remotesResult.ok && remotesResult.remotes) {
          const r = remotesResult.remotes.find((x) => x.name === remoteName);
          if (r) remoteUrl = r.url;
        }
      } catch (_) {}
      const slug = getRepoSlug(remoteUrl);
      if (!slug) return { ok: false, error: 'Not a GitHub repo. Configure a GitHub remote and push branch.' };
      let headBranch = null;
      try {
        const br = await getGitApi().getBranches(dirPath);
        if (br.ok) headBranch = br.current;
      } catch (_) {
        return { ok: false, error: 'Could not get current branch' };
      }
      if (!headBranch) return { ok: false, error: 'Not on a branch' };
      const authToken = token || getStore().get('githubToken') || null;
      if (!authToken) return { ok: false, error: 'GitHub token required to create pull requests. Set it in Settings or the project.' };
      try {
        const pr = await createGitHubPullRequest(slug.owner, slug.repo, headBranch, baseBranch || 'main', title || 'WIP', body || '', authToken);
        return { ok: true, pullRequest: pr };
      } catch (e) {
        return { ok: false, error: formatGitHubError(e.message || 'Failed to create pull request') };
      }
    },
    mergePullRequest: async (gitRemote, prNumber, mergeMethod = 'merge', token = null) => {
      const slug = getRepoSlug(gitRemote);
      if (!slug) return { ok: false, error: 'Not a GitHub repo' };
      const authToken = token || getStore().get('githubToken') || null;
      if (!authToken) return { ok: false, error: 'GitHub token required to merge' };
      try {
        const result = await mergeGitHubPullRequest(slug.owner, slug.repo, Number(prNumber), mergeMethod || 'merge', authToken);
        return { ok: true, result };
      } catch (e) {
        return { ok: false, error: formatGitHubError(e.message || 'Failed to merge pull request') };
      }
    },
    downloadLatestRelease: async (gitRemote) => {
      const slug = getRepoSlug(gitRemote);
      if (!slug) return { ok: false, error: 'Not a GitHub repo' };
      try {
        const releases = await fetchGitHubReleases(slug.owner, slug.repo);
        if (!releases.length) return { ok: false, error: 'No releases found' };
        const release = releases[0];
        const assets = release.assets || [];
        const asset = pickAssetForPlatform(assets, process.platform);
        if (!asset || !asset.browser_download_url) return { ok: false, error: 'No compatible asset for your platform' };
        const win = BrowserWindow.getAllWindows()[0] || null;
        const defaultPath = path.join(app.getPath('downloads'), asset.name);
        return showSaveDialogAndDownload(win, defaultPath, asset.browser_download_url);
      } catch (err) {
        return { ok: false, error: formatGitHubError(err.message || 'Failed to fetch or download') };
      }
    },
    downloadAsset: async (url, suggestedFileName) => {
      if (!url || typeof url !== 'string') return { ok: false, error: 'Invalid URL' };
      const win = BrowserWindow.getAllWindows()[0] || null;
      const defaultPath = path.join(app.getPath('downloads'), suggestedFileName || 'download');
      return showSaveDialogAndDownload(win, defaultPath, url);
    },
    openUrl: (url) => {
      if (url && typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
        shell.openExternal(url);
      }
      return null;
    },
    getAppInfo: () => {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
        return { name: pkg.productName || pkg.name, version: pkg.version };
      } catch {
        return { name: 'Shipwell', version: '0.1.0' };
      }
    },
    getAppPath: () => app.getAppPath(),
    getMcpServerStatus: () => ({
      running: mcpServerProcess != null && !mcpServerProcess.killed,
      pid: mcpServerProcess?.pid ?? undefined,
    }),
    startMcpServer: () => {
      if (mcpServerProcess != null && !mcpServerProcess.killed) {
        return Promise.resolve({ ok: true, pid: mcpServerProcess.pid, alreadyRunning: true });
      }
      const appPath = app.getAppPath();
      const mcpDir = path.join(appPath, 'mcp-server');
      const indexPath = path.join(mcpDir, 'index.mjs');
      if (!fs.existsSync(indexPath)) {
        return Promise.resolve({ ok: false, error: 'MCP server not found (run from app source or install mcp-server).' });
      }
      const nodeModules = path.join(mcpDir, 'node_modules');
      if (!fs.existsSync(nodeModules)) {
        return Promise.resolve({ ok: false, error: 'Run npm run mcp:install from the app folder first.' });
      }
      return new Promise((resolve) => {
        try {
          const child = spawn(process.execPath, ['index.mjs'], {
            cwd: mcpDir,
            stdio: 'pipe',
            env: process.env,
          });
          child.on('error', (err) => {
            mcpServerProcess = null;
            resolve({ ok: false, error: err.message || 'Failed to start MCP server' });
          });
          child.on('exit', (code, signal) => {
            mcpServerProcess = null;
          });
          mcpServerProcess = child;
          resolve({ ok: true, pid: child.pid });
        } catch (e) {
          resolve({ ok: false, error: e.message || 'Failed to start MCP server' });
        }
      });
    },
    stopMcpServer: () => {
      if (mcpServerProcess == null || mcpServerProcess.killed) {
        return Promise.resolve({ ok: true, wasRunning: false });
      }
      try {
        mcpServerProcess.kill('SIGTERM');
        mcpServerProcess = null;
        return Promise.resolve({ ok: true, wasRunning: true });
      } catch (e) {
        return Promise.resolve({ ok: false, error: e.message || 'Failed to stop MCP server' });
      }
    },
    getProcessesConfig: () => processManager.getProcessesConfig(),
    setProcessesConfig: (config) => processManager.setProcessesConfig(config),
    startProcess: (projectPath, processId, name, command) => processManager.startProcess(projectPath, processId, name, command),
    stopProcess: (projectPath, processId) => processManager.stopProcess(projectPath, processId),
    getProcessStatus: () => processManager.getProcessStatus(),
    getProcessOutput: (projectPath, processId, lines) => processManager.getProcessOutput(projectPath, processId, lines),
    startAllProcesses: (projectPath) => processManager.startAllProcesses(projectPath),
    stopAllProcesses: (projectPath) => processManager.stopAllProcesses(projectPath),
    getSuggestedProcesses: (dirPath) => processManager.getSuggestedProcesses(dirPath),
    getEmailSmtpStatus: () => emailService.getEmailSmtpStatus(),
    startEmailSmtpServer: (port) => emailService.startEmailSmtpServer(port),
    stopEmailSmtpServer: () => emailService.stopEmailSmtpServer(),
    getEmails: () => emailService.getEmails(),
    clearEmails: () => emailService.clearEmails(),
    startTunnel: (port, subdomain) => tunnelService.startTunnel(port, subdomain),
    stopTunnel: (id) => tunnelService.stopTunnel(id),
    getTunnels: () => tunnelService.getTunnels(),
    getFtpStatus: () => ftpService.getFtpStatus(),
    ftpConnect: (config) => ftpService.ftpConnect(config),
    ftpDisconnect: () => ftpService.ftpDisconnect(),
    ftpList: (remotePath) => ftpService.ftpList(remotePath),
    ftpDownload: (remotePath, localPath) => ftpService.ftpDownload(remotePath, localPath),
    ftpUpload: (localPath, remotePath) => ftpService.ftpUpload(localPath, remotePath),
    ftpRemove: (remotePath) => ftpService.ftpRemove(remotePath),
    showSaveDialog: (options) => dialogsService.showSaveDialog(options),
    showOpenDialog: (options) => dialogsService.showOpenDialog(options),
    getSshConnections: () => sshManager.getSshConnections(),
    setSshConnections: (connections) => sshManager.setSshConnections(connections),
    openSshInTerminal: (connection) => sshManager.openSshInTerminal(connection),
    getChangelog: async () => {
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
    },
    getPreference: (key) => getPreference(key),
    getLicenseStatus: () => getLicenseStatus(),
    setLicenseKey: (key) => setLicenseKey(key),
    getLicenseServerConfig: () => licenseServer.getConfig(),
    setLicenseServerConfig: (config) => { licenseServer.setConfig(config); return null; },
    loginToLicenseServer: (email, password) => licenseServer.login(email, password),
    logoutFromLicenseServer: () => licenseServer.logout(),
    getLicenseRemoteSession: () => licenseServer.getRemoteSession(),
    getAvailablePhpVersions: () => getAvailablePhpVersions(),
    getPhpVersionFromRequire: (phpRequire) => parsePhpRequireToVersion(phpRequire),
    setPreference: (key, value) => {
      setPreference(key, value);
      return null;
    },
    getTheme: () => ({ theme: getThemeSetting(), effective: getEffectiveTheme() }),
    setTheme: (theme) => {
      setThemeSetting(theme);
      return null;
    },
    getAppZoomFactor: () => getAppZoomFactor(),
    setAppZoomFactor: (factor) => setAppZoomFactor(factor),
    getLaunchAtLogin: () => appSettings.getLaunchAtLogin(),
    setLaunchAtLogin: (open) => appSettings.setLaunchAtLogin(open),
    getConfirmBeforeQuit: () => appSettings.getConfirmBeforeQuit(),
    setConfirmBeforeQuit: (value) => appSettings.setConfirmBeforeQuit(value),
    getProxy: () => appSettings.getProxy(),
    setProxy: (rules) => appSettings.setProxy(rules),
    exportSettings: () => appSettings.exportSettings(),
    importSettings: (json, replace) => appSettings.importSettings(json, replace),
    resetSettings: () => appSettings.resetSettings(),
    getAlwaysOnTop: () => appSettings.getAlwaysOnTop(),
    setAlwaysOnTop: (value) => appSettings.setAlwaysOnTop(value),
    getMinimizeToTray: () => appSettings.getMinimizeToTray(),
    setMinimizeToTray: (value) => appSettings.setMinimizeToTray(value),
    exportSettingsToFile: async () => {
      const result = appSettings.exportSettings();
      if (!result.ok) return result;
      const { canceled, filePath } = await dialogsService.showSaveDialog({ defaultPath: 'shipwell-settings.json', title: 'Export settings' });
      if (canceled || !filePath) return { ok: false, canceled: true };
      fs.writeFileSync(filePath, result.data);
      telemetryTrack(getPreference, 'feature.export_used', { format: 'json', feature: 'settings_export' });
      return { ok: true, filePath };
    },
    importSettingsFromFile: async (replace) => {
      const { canceled, filePaths } = await dialogsService.showOpenDialog({ title: 'Import settings' });
      if (canceled || !filePaths?.length) return { ok: false, canceled: true };
      const content = fs.readFileSync(filePaths[0], 'utf8');
      return appSettings.importSettings(content, !!replace);
    },
    listApiMethods: () => Object.keys(apiRegistry).filter((k) => k !== 'listApiMethods' && k !== 'invokeApi'),
    getApiDocs: () => getApiDocsFromModule(),
    getApiMethodDoc: (methodName) => getApiMethodDocFromModule(methodName),
    getSampleResponse: (methodName) => getSampleResponseForMethod(methodName),
    invokeApi: (method, params) => runApiMethod(method, params),
    sendCrashReport: async (options) => sendCrashReportToIngestion(getPreference, options || {}),
    sendTelemetry: (event, properties) => telemetryTrack(getPreference, event, properties),
    flushTelemetry: () => telemetryFlush(getPreference),
    showSystemNotification: (title, body) => {
      if (!Notification.isSupported()) return null;
      const enabled = getPreference('notificationsEnabled');
      if (enabled === false) return null;
      const onlyWhenNotFocused = getPreference('notificationsOnlyWhenNotFocused');
      if (onlyWhenNotFocused) {
        const win = BrowserWindow.getAllWindows()[0] || null;
        if (win && !win.isDestroyed() && win.isFocused()) return null;
      }
      const playSound = getPreference('notificationSound');
      const n = new Notification({
        title: title || 'Release Manager',
        body: body || '',
        silent: !playSound,
      });
      n.on('click', () => {
        const w = BrowserWindow.getAllWindows()[0] || null;
        if (w && !w.isDestroyed()) w.focus();
      });
      n.show();
      return null;
    },
    runRendererTest: async (filePath) => {
      const rendererVueDir = path.join(appRoot, 'renderer-vue');
      if (filePath && typeof filePath === 'string' && filePath.trim()) {
        const result = await runInDirCapture(rendererVueDir, 'npx', ['vitest', 'run', filePath.trim(), '--reporter=verbose']);
        return result;
      }
      const result = await runInDirCapture(rendererVueDir, 'npm', ['run', 'test:run', '--', '--reporter=verbose']);
      return result;
    },
  };

  // Helpers used by apiRegistry (must be defined after getProjectTestScripts etc.)
  async function runProjectCoverageImpl(dirPath, projectType) {
    const runNpm = (script) => runInDirCapture(dirPath, 'npm', ['run', script, '--no-color']);
    const runComposer = (script) => runInDirCapture(dirPath, 'composer', ['run', script, '--no-ansi'], { env: getComposerEnv(dirPath) });
    const { ok, scripts, error } = getProjectTestScripts(dirPath, projectType);
    debug.log(getStore, 'project', 'runProjectCoverage getProjectTestScripts', {
      ok,
      projectType,
      scripts: Array.isArray(scripts) ? scripts : [],
      error: error || null,
    });
    if (!ok) {
      return { ok: false, error: error || 'Failed to get scripts for coverage.', stdout: '', stderr: '', summary: null };
    }
    let scriptName = null;
    if (projectType === 'npm') {
      const names = Array.isArray(scripts) ? scripts : [];
      // IMPORTANT: getCoverageScriptNameNpm expects package.json "scripts" values (strings),
      // not just a list of names. Read package.json so we can pick the right script.
      let scriptsObj = null;
      try {
        const pkgPath = path.join(dirPath, 'package.json');
        if (fs.existsSync(pkgPath)) {
          const content = fs.readFileSync(pkgPath, 'utf8');
          const parsed = JSON.parse(content);
          scriptsObj = typeof parsed?.scripts === 'object' && parsed.scripts !== null ? parsed.scripts : null;
        }
      } catch (e) {
        debug.log(getStore, 'project', 'runProjectCoverage read package.json failed', e?.message || e);
      }
      scriptName = getCoverageScriptNameNpm(scriptsObj);
      // Fall back to `test` so we still run something useful.
      if (!scriptName && names.includes('test')) scriptName = 'test';
    } else if (projectType === 'php') {
      const names = Array.isArray(scripts) ? scripts : [];
      scriptName = getCoverageScriptNameComposer(names);
      if (!scriptName && names.includes('test')) {
        scriptName = 'test';
      }
      if (!scriptName && names.length > 0) {
        scriptName = names[0];
      }
    }
    debug.log(getStore, 'project', 'runProjectCoverage coverage script', { projectType, scriptName });
    if (!scriptName) {
      return { ok: false, error: 'No coverage or test script found for this project.', stdout: '', stderr: '', summary: null };
    }
    try {
      if (projectType === 'npm') {
        const result = await runNpm(scriptName);
        const summary = parseCoverageSummary(result.stdout);
        return { ok: result.ok, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr, summary: summary || null };
      }
      if (projectType === 'php') {
        const result = await runComposer(scriptName);
        const summary = parseCoverageSummary(result.stdout);
        return { ok: result.ok, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr, summary: summary || null };
      }
      return { ok: false, error: 'Coverage not supported for this project type.', stdout: '', stderr: '', summary: null };
    } catch (e) {
      return { ok: false, error: e.message || 'Coverage run failed', stdout: '', stderr: '', summary: null };
    }
  }
  async function getReleasePlanForRelease(dirPath, bump, force, options) {
    const resolved = getProjectNameVersionAndType(dirPath, path, fs);
    if (!resolved.ok) return { ok: false, error: resolved.error };
    const strategyPlan = getReleasePlanFromStrategy(resolved.projectType, resolved.version);
    if (strategyPlan.action === 'error') return { ok: false, error: strategyPlan.error };
    if (strategyPlan.action === 'bump_and_tag') {
      const res = await getCommitsSinceTag(dirPath, null);
const suggested = (res && res.ok && res.commits) ? suggestBumpFromCommits(res.commits) : null;
const effectiveBump = (force ? bump : (suggested || bump)) || bump;
      const tagMessage = (options && options.tagMessage) || 'chore: release';
      return { ok: true, action: 'bump_and_tag', bump: effectiveBump, tagMessage };
    }
    const tag = formatTag(strategyPlan.versionForTag);
    const tagMessage = (options && options.tagMessage) || `chore: release ${tag}`;
    return { ok: true, action: 'tag_only', tag, versionForTag: strategyPlan.versionForTag, tagMessage };
  }
  async function runReleaseImpl(dirPath, bump, force, options) {
    const plan = await getReleasePlanForRelease(dirPath, bump, force, options);
    if (!plan.ok) return plan;
    if (plan.action === 'bump_and_tag') {
      const bumpResult = await runVersionBump(dirPath, plan.bump, 'npm');
      if (!bumpResult.ok) return { ok: false, error: bumpResult.error };
      const pushResult = await getGitApi().gitTagAndPush(dirPath, plan.tagMessage);
      if (!pushResult.ok) return { ok: false, error: pushResult.error };
      return { ok: true, tag: pushResult.tag, bump: plan.bump };
    }
    const pushResult = await getGitApi().gitTagAndPush(dirPath, plan.tagMessage, { version: plan.versionForTag });
    if (!pushResult.ok) return { ok: false, error: pushResult.error };
    return { ok: true, tag: pushResult.tag, bump: null };
  }
  function openInTerminalImpl(dirPath) {
    return terminalService.openInSystemTerminal(dirPath, spawn);
  }

  function openInEditorImpl(targetPath) {
    const { spawn: spawnProc } = require('child_process');
    const preferred = getPreference('preferredEditor') || '';
    const tryEditor = (cmd, args) =>
      new Promise((resolve) => {
        const child = spawnProc(cmd, args || [targetPath], { detached: true, stdio: 'ignore', shell: true });
        child.on('error', () => resolve(false));
        child.unref();
        setTimeout(() => resolve(true), 500);
      });
    return (async () => {
      if (preferred === 'cursor') {
        if (await tryEditor('cursor', [targetPath])) return { ok: true, editor: 'cursor' };
        if (await tryEditor('code', [targetPath])) return { ok: true, editor: 'code' };
      } else if (preferred === 'code') {
        if (await tryEditor('code', [targetPath])) return { ok: true, editor: 'code' };
        if (await tryEditor('cursor', [targetPath])) return { ok: true, editor: 'cursor' };
      } else {
        if (await tryEditor('cursor', [targetPath])) return { ok: true, editor: 'cursor' };
        if (await tryEditor('code', [targetPath])) return { ok: true, editor: 'code' };
      }
      return { ok: false, error: 'No editor found. Add Cursor or VS Code to PATH.' };
    })();
  }
  function openFileInEditorImpl(dirPath, relativePath) {
    const fullPath = path.isAbsolute(relativePath) ? relativePath : path.join(dirPath, relativePath);
    return openInEditorImpl(fullPath);
  }
  async function getFileDiffImpl(dirPath, filePath, isUntracked) {
    try {
      const fullPath = path.join(dirPath, filePath);
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) return { ok: false, error: 'Not a file' };
      const MAX_FILE_VIEW_SIZE = 512 * 1024;
      const mime = require('mime-types').lookup(filePath) || 'application/octet-stream';
      if (stat.size > MAX_FILE_VIEW_SIZE && /^image\//.test(mime)) {
        const buf = fs.readFileSync(fullPath);
        const base64 = buf.toString('base64');
        const dataUrl = `data:${mime};base64,${base64}`;
        return { ok: true, type: 'image', dataUrl };
      }
      if (isUntracked) {
        if (stat.size > MAX_FILE_VIEW_SIZE) return { ok: false, error: `File too large to view (${Math.round(stat.size / 1024)} KB). Open in editor instead.` };
        const content = fs.readFileSync(fullPath, 'utf8');
        return { ok: true, type: 'new', content };
      }
      const diffResult = await getGitApi().getFileDiffRaw(dirPath, filePath);
      const content = diffResult.ok ? diffResult.diff : '(no diff)';
      return { ok: true, type: 'diff', content };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to load file' };
    }
  }

  // API HTTP server
  let apiServerInstance = null;
  const getApiPort = () => Number(getPreference('apiServerPort')) || 3847;
  const isApiServerEnabled = () => !!getPreference('apiServerEnabled');
  function ensureApiServer() {
    if (apiServerInstance) return;
    apiServerInstance = createApiServer(getApiPort(), async (method, params) => runApiMethod(method, params));
  }
  function startApiServer() {
    ensureApiServer();
    apiServerInstance.start();
    debug.log(getStore, 'api', 'HTTP API server started', getApiPort());
  }
  function stopApiServer() {
    if (apiServerInstance) {
      apiServerInstance.stop();
      apiServerInstance = null;
      debug.log(getStore, 'api', 'HTTP API server stopped');
    }
  }
  if (isApiServerEnabled()) startApiServer();
  ipcMain.handle('rm-get-api-server-status', () => ({
    running: !!apiServerInstance,
    port: getApiPort(),
    enabled: isApiServerEnabled(),
  }));
  ipcMain.handle('rm-set-api-server-enabled', async (_e, enabled) => {
    setPreference('apiServerEnabled', !!enabled);
    if (enabled) startApiServer();
    else stopApiServer();
    return null;
  });
  ipcMain.handle('rm-set-api-server-port', async (_e, port) => {
    const p = Number(port);
    if (!Number.isFinite(p) || p < 1 || p > 65535) return null;
    setPreference('apiServerPort', p);
    if (apiServerInstance) {
      stopApiServer();
      if (isApiServerEnabled()) startApiServer();
    }
    return null;
  });
  ipcMain.handle('rm-list-api-methods', () => apiRegistry.listApiMethods());
  ipcMain.handle('rm-get-api-docs', () => getApiDocsFromModule());
  ipcMain.handle('rm-get-api-method-doc', (_e, methodName) => getApiMethodDocFromModule(methodName));

  // Explicit handler for inline terminal (ensure it is always registered)
  ipcMain.handle('rm-run-shell-command', (_e, dirPath, command) => terminalService.runShellCommand(dirPath, command, spawn));
  ipcMain.handle('rm-open-terminal-popout', (_e, dirPath) => {
    createTerminalPopoutWindow(dirPath);
    return Promise.resolve();
  });
  ipcMain.handle('rm-get-terminal-popout-state', (e) => {
    return Promise.resolve(terminalPopoutState.get(e.sender.id));
  });
  ipcMain.handle('rm-close-terminal-popout-window', (e) => {
    const win = e.sender.getOwnerBrowserWindow();
    if (win && !win.isDestroyed()) win.close();
    return Promise.resolve();
  });

  // IPC handlers delegate to apiRegistry (channel name -> method name, then apiRegistry[method](...args))
  const IPC_TO_METHOD = {
    'rm-invoke-api': 'invokeApi',
    'rm-get-projects': 'getProjects',
    'rm-get-all-projects-info': 'getAllProjectsInfo',
    'rm-set-projects': 'setProjects',
    'rm-show-directory-dialog': 'showDirectoryDialog',
    'rm-get-project-info': 'getProjectInfo',
    'rm-get-composer-info': 'getComposerInfo',
    'rm-get-composer-outdated': 'getComposerOutdated',
    'rm-get-composer-validate': 'getComposerValidate',
    'rm-get-composer-audit': 'getComposerAudit',
    'rm-composer-update': 'composerUpdate',
    'rm-get-project-test-scripts': 'getProjectTestScripts',
    'rm-run-project-tests': 'runProjectTests',
    'rm-run-project-coverage': 'runProjectCoverage',
    'rm-version-bump': 'versionBump',
    'rm-git-tag-and-push': 'gitTagAndPush',
    'rm-release': 'release',
    'rm-get-commits-since-tag': 'getCommitsSinceTag',
    'rm-get-commit-subject': 'getCommitSubject',
    'rm-get-recent-commits': 'getRecentCommits',
    'rm-get-suggested-bump': 'getSuggestedBump',
    'rm-get-shortcut-action': 'getShortcutAction',
    'rm-get-actions-url': 'getActionsUrl',
    'rm-get-github-token': 'getGitHubToken',
    'rm-set-github-token': 'setGitHubToken',
    'rm-get-ollama-settings': 'getOllamaSettings',
    'rm-set-ollama-settings': 'setOllamaSettings',
    'rm-get-claude-settings': 'getClaudeSettings',
    'rm-set-claude-settings': 'setClaudeSettings',
    'rm-get-openai-settings': 'getOpenAISettings',
    'rm-set-openai-settings': 'setOpenAISettings',
    'rm-get-gemini-settings': 'getGeminiSettings',
    'rm-set-gemini-settings': 'setGeminiSettings',
    'rm-get-ai-provider': 'getAiProvider',
    'rm-set-ai-provider': 'setAiProvider',
    'rm-get-ai-generate-available': 'getAiGenerateAvailable',
    'rm-ollama-list-models': 'ollamaListModels',
    'rm-ollama-generate-commit-message': 'ollamaGenerateCommitMessage',
    'rm-ollama-generate-release-notes': 'ollamaGenerateReleaseNotes',
    'rm-ollama-generate-tag-message': 'ollamaGenerateTagMessage',
    'rm-ollama-suggest-test-fix': 'ollamaSuggestTestFix',
    'rm-get-git-status': 'getGitStatus',
    'rm-get-tracked-files': 'getTrackedFiles',
    'rm-get-project-files': 'getProjectFiles',
    'rm-git-pull': 'gitPull',
    'rm-get-branches': 'getBranches',
    'rm-checkout-branch': 'checkoutBranch',
    'rm-create-branch': 'createBranch',
    'rm-create-branch-from': 'createBranchFrom',
    'rm-git-push': 'gitPush',
    'rm-git-push-force': 'gitPushForce',
    'rm-sync-from-remote': 'gitFetch',
    'rm-git-merge': 'gitMerge',
    'rm-git-stash-push': 'gitStashPush',
    'rm-commit-changes': 'commitChanges',
    'rm-git-stash-pop': 'gitStashPop',
    'rm-git-discard-changes': 'gitDiscardChanges',
    'rm-git-merge-abort': 'gitMergeAbort',
    'rm-get-remote-branches': 'getRemoteBranches',
    'rm-checkout-remote-branch': 'checkoutRemoteBranch',
    'rm-get-stash-list': 'getStashList',
    'rm-stash-apply': 'stashApply',
    'rm-stash-drop': 'stashDrop',
    'rm-get-tags': 'getTags',
    'rm-checkout-tag': 'checkoutTag',
    'rm-get-commit-log': 'getCommitLog',
    'rm-get-commit-log-with-body': 'getCommitLogWithBody',
    'rm-get-commit-detail': 'getCommitDetail',
    'rm-delete-branch': 'deleteBranch',
    'rm-delete-remote-branch': 'deleteRemoteBranch',
    'rm-git-rebase': 'gitRebase',
    'rm-git-rebase-abort': 'gitRebaseAbort',
    'rm-git-rebase-continue': 'gitRebaseContinue',
    'rm-git-rebase-skip': 'gitRebaseSkip',
    'rm-git-merge-continue': 'gitMergeContinue',
    'rm-get-remotes': 'getRemotes',
    'rm-add-remote': 'addRemote',
    'rm-remove-remote': 'removeRemote',
    'rm-rename-remote': 'renameRemote',
    'rm-set-remote-url': 'setRemoteUrl',
    'rm-git-cherry-pick': 'gitCherryPick',
    'rm-git-cherry-pick-abort': 'gitCherryPickAbort',
    'rm-git-cherry-pick-continue': 'gitCherryPickContinue',
    'rm-rename-branch': 'renameBranch',
    'rm-create-tag': 'createTag',
    'rm-git-init': 'gitInit',
    'rm-write-gitignore': 'writeGitignore',
    'rm-write-gitattributes': 'writeGitattributes',
    'rm-create-test-file': 'createTestFile',
    'rm-git-rebase-interactive': 'gitRebaseInteractive',
    'rm-git-reset': 'gitReset',
    'rm-get-branch-revision': 'getBranchRevision',
    'rm-set-branch-upstream': 'setBranchUpstream',
    'rm-get-diff-between': 'getDiffBetween',
    'rm-get-diff-between-full': 'getDiffBetweenFull',
    'rm-get-file-diff-structured': 'getFileDiffStructured',
    'rm-revert-file-line': 'revertFileLine',
    'rm-git-revert': 'gitRevert',
    'rm-git-prune-remotes': 'gitPruneRemotes',
    'rm-git-amend': 'gitAmend',
    'rm-get-reflog': 'getReflog',
    'rm-checkout-ref': 'checkoutRef',
    'rm-get-blame': 'getBlame',
    'rm-delete-tag': 'deleteTag',
    'rm-push-tag': 'pushTag',
    'rm-stage-file': 'stageFile',
    'rm-unstage-file': 'unstageFile',
    'rm-discard-file': 'discardFile',
    'rm-git-fetch-remote': 'gitFetchRemote',
    'rm-git-pull-rebase': 'gitPullRebase',
    'rm-git-pull-ff-only': 'gitPullFFOnly',
    'rm-get-gitignore': 'getGitignore',
    'rm-scan-project-gitignore': 'scanProjectForGitignore',
    'rm-get-file-at-ref': 'getFileAtRef',
    'rm-get-gitattributes': 'getGitattributes',
    'rm-get-submodules': 'getSubmodules',
    'rm-submodule-update': 'submoduleUpdate',
    'rm-get-git-state': 'getGitState',
    'rm-get-git-user': 'getGitUser',
    'rm-get-worktrees': 'getWorktrees',
    'rm-worktree-add': 'worktreeAdd',
    'rm-worktree-remove': 'worktreeRemove',
    'rm-get-bisect-status': 'getBisectStatus',
    'rm-bisect-start': 'bisectStart',
    'rm-bisect-good': 'bisectGood',
    'rm-bisect-bad': 'bisectBad',
    'rm-bisect-skip': 'bisectSkip',
    'rm-bisect-reset': 'bisectReset',
    'rm-bisect-run': 'bisectRun',
    'rm-copy-to-clipboard': 'copyToClipboard',
    'rm-open-path-in-finder': 'openPathInFinder',
    'rm-open-in-terminal': 'openInTerminal',
    'rm-open-in-editor': 'openInEditor',
    'rm-open-file-in-editor': 'openFileInEditor',
    'rm-get-file-diff': 'getFileDiff',
    'rm-get-releases-url': 'getReleasesUrl',
    'rm-get-pull-requests-url': 'getPullRequestsUrl',
    'rm-get-pull-requests': 'getPullRequests',
    'rm-create-pull-request': 'createPullRequest',
    'rm-merge-pull-request': 'mergePullRequest',
    'rm-get-github-releases': 'getGitHubReleases',
    'rm-download-latest': 'downloadLatestRelease',
    'rm-download-asset': 'downloadAsset',
    'rm-open-url': 'openUrl',
    'rm-get-app-info': 'getAppInfo',
    'rm-get-app-path': 'getAppPath',
    'rm-get-mcp-server-status': 'getMcpServerStatus',
    'rm-start-mcp-server': 'startMcpServer',
    'rm-stop-mcp-server': 'stopMcpServer',
    'rm-get-processes-config': 'getProcessesConfig',
    'rm-set-processes-config': 'setProcessesConfig',
    'rm-start-process': 'startProcess',
    'rm-stop-process': 'stopProcess',
    'rm-get-process-status': 'getProcessStatus',
    'rm-get-process-output': 'getProcessOutput',
    'rm-start-all-processes': 'startAllProcesses',
    'rm-stop-all-processes': 'stopAllProcesses',
    'rm-get-suggested-processes': 'getSuggestedProcesses',
    'rm-get-email-smtp-status': 'getEmailSmtpStatus',
    'rm-start-email-smtp-server': 'startEmailSmtpServer',
    'rm-stop-email-smtp-server': 'stopEmailSmtpServer',
    'rm-get-emails': 'getEmails',
    'rm-clear-emails': 'clearEmails',
    'rm-start-tunnel': 'startTunnel',
    'rm-stop-tunnel': 'stopTunnel',
    'rm-get-tunnels': 'getTunnels',
    'rm-get-ftp-status': 'getFtpStatus',
    'rm-ftp-connect': 'ftpConnect',
    'rm-ftp-disconnect': 'ftpDisconnect',
    'rm-ftp-list': 'ftpList',
    'rm-ftp-download': 'ftpDownload',
    'rm-ftp-upload': 'ftpUpload',
    'rm-ftp-remove': 'ftpRemove',
    'rm-show-save-dialog': 'showSaveDialog',
    'rm-show-open-dialog': 'showOpenDialog',
    'rm-get-ssh-connections': 'getSshConnections',
    'rm-set-ssh-connections': 'setSshConnections',
    'rm-open-ssh-in-terminal': 'openSshInTerminal',
    'rm-get-changelog': 'getChangelog',
    'rm-get-preference': 'getPreference',
    'rm-get-license-status': 'getLicenseStatus',
    'rm-set-license-key': 'setLicenseKey',
    'rm-get-license-server-config': 'getLicenseServerConfig',
    'rm-set-license-server-config': 'setLicenseServerConfig',
    'rm-login-to-license-server': 'loginToLicenseServer',
    'rm-logout-from-license-server': 'logoutFromLicenseServer',
    'rm-get-license-remote-session': 'getLicenseRemoteSession',
    'rm-get-available-php-versions': 'getAvailablePhpVersions',
    'rm-parse-php-require': 'getPhpVersionFromRequire',
    'rm-set-preference': 'setPreference',
    'rm-get-theme': 'getTheme',
    'rm-set-theme': 'setTheme',
    'rm-get-app-zoom-factor': 'getAppZoomFactor',
    'rm-set-app-zoom-factor': 'setAppZoomFactor',
    'rm-get-launch-at-login': 'getLaunchAtLogin',
    'rm-set-launch-at-login': 'setLaunchAtLogin',
    'rm-get-confirm-before-quit': 'getConfirmBeforeQuit',
    'rm-set-confirm-before-quit': 'setConfirmBeforeQuit',
    'rm-get-proxy': 'getProxy',
    'rm-set-proxy': 'setProxy',
    'rm-export-settings': 'exportSettings',
    'rm-import-settings': 'importSettings',
    'rm-reset-settings': 'resetSettings',
    'rm-get-always-on-top': 'getAlwaysOnTop',
    'rm-set-always-on-top': 'setAlwaysOnTop',
    'rm-get-minimize-to-tray': 'getMinimizeToTray',
    'rm-set-minimize-to-tray': 'setMinimizeToTray',
'rm-export-settings-to-file': 'exportSettingsToFile',
    'rm-import-settings-from-file': 'importSettingsFromFile',
    'rm-send-crash-report': 'sendCrashReport',
    'rm-send-telemetry': 'sendTelemetry',
    'rm-flush-telemetry': 'flushTelemetry',
    'rm-show-system-notification': 'showSystemNotification',
    'rm-run-renderer-test': 'runRendererTest',
  };
  for (const [channel, methodName] of Object.entries(IPC_TO_METHOD)) {
    ipcMain.handle(channel, (_e, ...args) => {
      debug.log(getStore, 'ipc', channel, 'args.length=', args?.length ?? 0);
      return apiRegistry[methodName](...args);
    });
  }

  const cliArgs = getCliArgs();
  if (cliArgs.length > 0) {
    runCli(apiRegistry, cliArgs).then((code) => {
      app.exit(typeof code === 'number' ? code : 0);
    }).catch((e) => {
      console.error(e);
      app.exit(1);
    });
    return;
  }

  createWindow();
  debug.log(getStore, 'app', 'window created');
  telemetryStartFlushTimer(getPreference);

  // In dev, watch renderer build: inject CSS only when styles change, full reload when JS/html changes
  if (process.env.NODE_ENV === 'development') {
    const rendererDir = path.join(appRoot, 'dist-renderer');
    const changedFiles = new Set();
    let applyDebounce;
    function onRendererChange(eventType, filename) {
      if (filename) changedFiles.add(filename.replace(/\\/g, '/'));
      if (applyDebounce) clearTimeout(applyDebounce);
      applyDebounce = setTimeout(() => {
        applyDebounce = null;
        const win = BrowserWindow.getAllWindows()[0];
        if (!win || win.isDestroyed()) { changedFiles.clear(); return; }
        const hasJs = [...changedFiles].some((f) => f.endsWith('.js'));
        changedFiles.clear();
        if (hasJs) {
          win.reload();
          debug.log(getStore, 'app', 'renderer reloaded (js/build changed)');
          return;
        }
        // CSS-only (or html+css): inject new styles without reloading
        const indexPath = path.join(rendererDir, 'index.html');
        if (!fs.existsSync(indexPath)) return;
        const html = fs.readFileSync(indexPath, 'utf8');
        const linkHrefs = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/g);
        if (!linkHrefs || linkHrefs.length === 0) return;
        const cssPaths = linkHrefs.map((tag) => {
          const m = tag.match(/href="([^"]+)"/);
          return m ? path.join(rendererDir, m[1].replace(/^\.\//, '')) : null;
        }).filter(Boolean);
        let injected = 0;
        for (const cssPath of cssPaths) {
          if (!fs.existsSync(cssPath)) continue;
          try {
            const css = fs.readFileSync(cssPath, 'utf8');
            win.webContents.insertCSS(css);
            injected++;
          } catch (e) {
            debug.log(getStore, 'app', 'insertCSS failed', cssPath, e?.message);
          }
        }
        if (injected > 0) debug.log(getStore, 'app', 'styles updated (CSS hot inject)');
      }, 400);
    }
    if (fs.existsSync(rendererDir)) {
      fs.watch(rendererDir, { recursive: true }, onRendererChange);
      debug.log(getStore, 'app', 'watching dist-renderer (CSS hot inject, reload on JS change)');
    }
  }

  // Detect all problems: send crash reports on uncaught errors (when enabled)
  function reportMainError(message, stackTrace, payload = {}) {
    if (!getPreference('crashReports') || !getPreference('crashReportEndpoint')) return;
    sendCrashReportToIngestion(getPreference, {
      message: typeof message === 'string' ? message : (message && message.message) || String(message),
      stack_trace: stackTrace || (message && message.stack),
      payload: { process: 'main', ...payload },
    }).catch(() => {});
  }
  process.on('uncaughtException', (err) => {
    const msg = err?.message || String(err);
    const stack = err?.stack;
    debug.log(getStore, 'app', 'uncaughtException', msg, stack);
    reportMainError(msg, stack, { type: 'uncaughtException' });
    process.exit(1);
  });
  process.on('unhandledRejection', (reason, promise) => {
    const msg = reason?.message || (typeof reason === 'string' ? reason : String(reason));
    const stack = reason?.stack;
    debug.log(getStore, 'app', 'unhandledRejection', msg, stack);
    reportMainError(msg, stack, { type: 'unhandledRejection' });
  });
});

nativeTheme.on('updated', () => {
  if (getThemeSetting() !== 'system') return;
  const effective = getEffectiveTheme();
  for (const w of BrowserWindow.getAllWindows()) {
    if (w && !w.isDestroyed()) w.webContents.send('rm-theme', effective);
  }
});

let confirmQuitHandled = false;
app.on('before-quit', (e) => {
  if (!confirmQuitHandled) {
    telemetryStopFlushTimer();
    telemetryFlush(getPreference).catch(() => {});
  }
  if (!confirmQuitHandled && appSettings.getConfirmBeforeQuit()) {
    e.preventDefault();
    confirmQuitHandled = true;
    const w = BrowserWindow.getAllWindows()[0];
    dialog.showMessageBox(w || null, {
      type: 'question',
      buttons: ['Cancel', 'Quit'],
      defaultId: 1,
      title: 'Quit Shipwell?',
      message: 'Are you sure you want to quit?',
    }).then(({ response }) => {
      if (response === 1) app.quit();
      else confirmQuitHandled = false;
    }).catch(() => { confirmQuitHandled = false; });
    return;
  }
  try {
    processManager.cleanup();
  } catch (_) {}
  try {
    tunnelService.cleanup();
  } catch (_) {}
  try {
    emailService.cleanup();
  } catch (_) {}
  try {
    ftpService.cleanup();
  } catch (_) {}
  try {
    appSettings.destroyTray();
  } catch (_) {}
  try {
    if (mcpServerProcess != null && !mcpServerProcess.killed) mcpServerProcess.kill('SIGTERM');
    mcpServerProcess = null;
  } catch (_) {}
  try {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) saveWindowBounds(w);
  } catch (_) {}
});
app.on('window-all-closed', () => app.quit());
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow({ telemetrySource: 'dock' });
  else telemetryTrack(getPreference, 'app.opened', { source: 'dock' });
});
