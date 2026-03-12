const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, clipboard, screen, Menu, Notification } = require('electron');
const os = require('os');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const terminalService = require('./services/terminal');
const terminalPopoutState = terminalService.createTerminalPopoutState();
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const crypto = require('crypto');
const Store = require('electron-store');
const appRoot = path.join(__dirname, '..');
const { marked } = require(path.join(appRoot, 'node_modules', 'marked'));
const sanitizeHtml = require(path.join(appRoot, 'node_modules', 'sanitize-html'));
const { getReleasesUrl, getActionsUrl, getPullRequestsUrl, getIssuesUrl, getRepoSlug, pickAssetForPlatform } = require('./lib/github');
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
  buildGenerateTestsPrompt,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
} = require('./lib/ollama');
const { generate: claudeGenerate, DEFAULT_MODEL: CLAUDE_DEFAULT_MODEL } = require('./lib/claude');
const { generate: openaiGenerate, DEFAULT_MODEL: OPENAI_DEFAULT_MODEL } = require('./lib/openai');
const { generate: geminiGenerate, DEFAULT_MODEL: GEMINI_DEFAULT_MODEL } = require('./lib/gemini');
const { generate: groqGenerate, DEFAULT_MODEL: GROQ_DEFAULT_MODEL } = require('./lib/groq');
const { generate: mistralGenerate, DEFAULT_MODEL: MISTRAL_DEFAULT_MODEL } = require('./lib/mistral');
const {
  generate: lmStudioGenerate,
  listModels: lmStudioListModels,
  DEFAULT_BASE_URL: LMSTUDIO_DEFAULT_BASE_URL,
  DEFAULT_MODEL: LMSTUDIO_DEFAULT_MODEL,
} = require('./lib/lmstudio');
const {
  parseStashList: parseStashListLib,
  parseRemoteBranches: parseRemoteBranchesLib,
  parseCommitLog: parseCommitLogLib,
  parseCommitLogWithBody: parseCommitLogWithBodyLib,
  parseRemotes: parseRemotesLib,
  parseLocalBranches: parseLocalBranchesLib,
} = require('./lib/gitOutputParsers');
const { getGitPlugin } = require('./plugins');
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
const { createBookmarksReceiver, DEFAULT_BOOKMARKS_RECEIVER_PORT } = require('./bookmarksReceiver');
const { runCli, getCliArgs } = require('./cli');
const { getApiDocs: getApiDocsFromModule, getApiMethodDoc: getApiMethodDocFromModule, getSampleResponseForMethod } = require('./apiDocs');
const { createProcessManager } = require('./services/processManager');
const { createEmailService } = require('./services/email');
const { createTunnelService } = require('./services/tunnels');
const { createFtpClient } = require('./services/ftp');
const { createSshManager } = require('./services/ssh');
const { createDialogsService } = require('./services/dialogs');
const { createLicenseServer } = require('./lib/licenseServer');
const codeseerTcpServer = require('./codeseer/tcp-server');
const codeseerMessageStore = require('./codeseer/message-store');
const codeseerProxyServer = require('./codeseer/proxy-server');
const codeseerSshServer = require('./codeseer/ssh-server');
const codeseerMcpServer = require('./codeseer/mcp-server');
const { generateSamples: codeseerGenerateSamples } = require('./codeseer/debug-samples');
const { detectProject: codeseerDetectProject, runInstallForProject: codeseerRunInstall } = require('./codeseer/project-detect');
const appSettings = require('./lib/appSettings');
const updater = require('./lib/updater');
const { sendCrashReport: sendCrashReportToIngestion, setBaseUrlProvider: setCrashReportsBaseUrl, setAccessTokenProvider: setCrashReportsTokenProvider } = require('./lib/crashReports');
const { track: telemetryTrack, flush: telemetryFlush, startFlushTimer: telemetryStartFlushTimer, stopFlushTimer: telemetryStopFlushTimer, setBaseUrlProvider: setTelemetryBaseUrl } = require('./lib/telemetry');
const extractZip = require(path.join(appRoot, 'node_modules', 'extract-zip'));
const { SMTPServer } = require(path.join(appRoot, 'node_modules', 'smtp-server'));
const { simpleParser } = require(path.join(appRoot, 'node_modules', 'mailparser'));
const localtunnel = require(path.join(appRoot, 'node_modules', 'localtunnel'));
const { Client: FtpClient } = require(path.join(appRoot, 'node_modules', 'basic-ftp'));

// Register extension handlers immediately so they exist before whenReady and after renderer reload
function getInstalledUserExtensionsSync() {
  const extensionsDir = path.join(app.getPath('userData'), 'extensions');
  if (!fs.existsSync(extensionsDir)) return [];
  const list = [];
  const dirs = fs.readdirSync(extensionsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const d of dirs) {
    const manifestPath = path.join(extensionsDir, d.name, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      list.push({ id: manifest.id ?? d.name, name: manifest.name ?? d.name, version: manifest.version ?? '', description: manifest.description ?? '' });
    } catch (_) {}
  }
  return list;
}
function buildExtensionSync(extDir) {
  const hasPkg = fs.existsSync(path.join(extDir, 'package.json'));
  const hasViteConfig = fs.existsSync(path.join(extDir, 'vite.config.js')) || fs.existsSync(path.join(extDir, 'vite.config.ts'));
  if (!hasPkg || !hasViteConfig) return false;
  try {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    if (!fs.existsSync(path.join(extDir, 'node_modules'))) {
      execFileSync(npmCmd, ['install', '--production=false', '--ignore-scripts'], { cwd: extDir, timeout: 120000, stdio: 'pipe' });
    }
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    execFileSync(npxCmd, ['vite', 'build'], { cwd: extDir, timeout: 60000, stdio: 'pipe' });
    const distIndex = path.join(extDir, 'dist', 'index.js');
    if (fs.existsSync(distIndex)) {
      fs.copyFileSync(distIndex, path.join(extDir, 'index.js'));
      return true;
    }
  } catch (e) {
    console.error('[extensions] buildExtensionSync failed:', extDir, e.message || e);
  }
  return false;
}

function getExtensionScriptContentSync(extensionId) {
  const extensionsDir = path.join(app.getPath('userData'), 'extensions');
  const extDir = path.join(extensionsDir, extensionId);
  const entryPath = path.join(extDir, 'index.js');
  if (!fs.existsSync(entryPath)) {
    buildExtensionSync(extDir);
  }
  if (!fs.existsSync(entryPath)) return null;
  try {
    return fs.readFileSync(entryPath, 'utf8');
  } catch (_) {
    return null;
  }
}
function expandPathSync(p) {
  if (!p || typeof p !== 'string') return p;
  const home = os.homedir();
  if (p === '~') return home;
  if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(home, p.slice(2));
  return p;
}
ipcMain.handle('rm-get-installed-user-extensions', () => getInstalledUserExtensionsSync());
ipcMain.handle('rm-get-extension-script-content', (_e, extensionId) => getExtensionScriptContentSync(extensionId));
ipcMain.handle('rm-get-extension-css-content', (_e, extensionId) => {
  const extensionsDir = path.join(app.getPath('userData'), 'extensions');
  const distDir = path.join(extensionsDir, extensionId, 'dist');
  if (!fs.existsSync(distDir)) return null;
  try {
    const cssFiles = fs.readdirSync(distDir).filter((f) => f.endsWith('.css'));
    if (cssFiles.length === 0) return null;
    return cssFiles.map((f) => fs.readFileSync(path.join(distDir, f), 'utf8')).join('\n');
  } catch (_) {
    return null;
  }
});
ipcMain.handle('rm-build-all-extensions', () => {
  const extensionsDir = path.join(app.getPath('userData'), 'extensions');
  if (!fs.existsSync(extensionsDir)) return { built: 0 };
  let built = 0;
  const dirs = fs.readdirSync(extensionsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const d of dirs) {
    const extDir = path.join(extensionsDir, d.name);
    if (!fs.existsSync(path.join(extDir, 'index.js'))) {
      if (buildExtensionSync(extDir)) built++;
    }
  }
  return { built };
});
ipcMain.handle('rm-expand-path', (_e, p) => expandPathSync(p));

// CodeSeer extension IPC (PHP debugging)
ipcMain.handle('codeseer-get-messages', (_e, opts) => codeseerMessageStore.getMessages(opts || {}));
ipcMain.handle('codeseer-clear', () => {
  codeseerMessageStore.clear();
  for (const w of BrowserWindow.getAllWindows()) {
    if (w && !w.isDestroyed()) w.webContents.send('codeseer-clear-request');
  }
  return null;
});
ipcMain.handle('codeseer-get-connections-status', () => {
  const port = codeseerTcpServer.getPort();
  const tcpPort = (typeof getPreference('codeseerTcpPort') === 'number' ? getPreference('codeseerTcpPort') : null) || 23523;
  const proxyPorts = codeseerProxyServer.getPorts ? codeseerProxyServer.getPorts() : { tcp: 23524, http: 23525, listening: false };
  const sshPort = codeseerSshServer.getPort ? codeseerSshServer.getPort() : null;
  const mcpPort = codeseerMcpServer.getPort ? codeseerMcpServer.getPort() : null;
  return {
    tcp: { port: port ?? tcpPort, listening: port != null },
    proxy: { tcp: proxyPorts.tcp, http: proxyPorts.http, listening: !!proxyPorts.listening },
    ssh: { port: sshPort ?? ((typeof getPreference('codeseerSshPort') === 'number' ? getPreference('codeseerSshPort') : null) || 23526), listening: sshPort != null },
    mcp: { port: mcpPort ?? ((typeof getPreference('codeseerMcpPort') === 'number' ? getPreference('codeseerMcpPort') : null) || 3000), listening: mcpPort != null },
  };
});
ipcMain.handle('codeseer-open-api-dashboard', () => {
  const tcpPort = (typeof getPreference('codeseerTcpPort') === 'number' ? getPreference('codeseerTcpPort') : null) || 23523;
  const proxyTcp = (typeof getPreference('codeseerProxyTcpPort') === 'number' ? getPreference('codeseerProxyTcpPort') : null) || 23524;
  const proxyHttp = (typeof getPreference('codeseerProxyHttpPort') === 'number' ? getPreference('codeseerProxyHttpPort') : null) || 23525;
  codeseerProxyServer.start(
    () => BrowserWindow.getAllWindows(),
    () => ({ mainPort: codeseerTcpServer.getPort() ?? tcpPort, version: app.getVersion?.() }),
    () => ({ version: require(path.join(__dirname, '..', 'package.json')).version }),
    { tcpPort: proxyTcp, httpPort: proxyHttp }
  );
  const ports = codeseerProxyServer.getPorts();
  const url = 'http://127.0.0.1:' + (ports?.http ?? 23525);
  setTimeout(() => shell.openExternal(url), 150);
  return null;
});
ipcMain.handle('codeseer-restart-server', () => {
  codeseerTcpServer.stop();
  const port = (typeof getPreference('codeseerTcpPort') === 'number' ? getPreference('codeseerTcpPort') : null) || 23523;
  codeseerTcpServer.start(() => BrowserWindow.getAllWindows(), port);
  const p = codeseerTcpServer.getPort();
  for (const w of BrowserWindow.getAllWindows()) {
    if (w && !w.isDestroyed()) w.webContents.send('codeseer-server-ready', { port: p ?? port });
  }
  return null;
});

function getCodeseerDemoScriptPath() {
  return path.join(__dirname, '..', 'scripts', 'codeseer-demo.js');
}

ipcMain.handle('codeseer-get-demo-list', () => {
  const scriptPath = getCodeseerDemoScriptPath();
  if (!fs.existsSync(scriptPath)) {
    return { ok: false, error: 'Demo script not found', demos: [] };
  }
  return new Promise((resolve) => {
    const proc = spawn('node', [scriptPath, '--list'], { cwd: path.dirname(scriptPath) });
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('close', (code) => {
      if (code !== 0) {
        resolve({ ok: false, error: err || `Exit ${code}`, demos: [] });
        return;
      }
      try {
        const demos = JSON.parse(out.trim());
        resolve({ ok: true, demos });
      } catch (e) {
        resolve({ ok: false, error: e.message || 'Invalid JSON', demos: [] });
      }
    });
    proc.on('error', (e) => {
      resolve({ ok: false, error: e.message || 'Failed to run demo', demos: [] });
    });
  });
});

ipcMain.handle('codeseer-run-demo', (_e, id) => {
  const scriptPath = getCodeseerDemoScriptPath();
  const port = (typeof getPreference('codeseerTcpPort') === 'number' ? getPreference('codeseerTcpPort') : null) || 23523;
  if (!fs.existsSync(scriptPath)) {
    return Promise.resolve({ ok: false, error: 'Demo script not found' });
  }
  return new Promise((resolve) => {
    const proc = spawn('node', [scriptPath, `--demo=${id}`], {
      cwd: path.dirname(scriptPath),
      env: { ...process.env, CODESEER_PORT: String(port) },
    });
    let err = '';
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('close', (code) => {
      resolve(code === 0 ? { ok: true } : { ok: false, error: err || `Exit ${code}` });
    });
    proc.on('error', (e) => {
      resolve({ ok: false, error: e.message || 'Failed to run demo' });
    });
  });
});

ipcMain.handle('codeseer-show-directory-dialog', async () => {
  const win = BrowserWindow.getFocusedWindow();
  const { canceled, filePaths } = await dialog.showOpenDialog(win || undefined, {
    properties: ['openDirectory'],
    title: 'Select project directory',
  });
  if (canceled || !filePaths || filePaths.length === 0) return null;
  return filePaths[0];
});

ipcMain.handle('codeseer-detect-project', (_e, dirPath) => codeseerDetectProject(dirPath));

ipcMain.handle('codeseer-install-for-project', async (_e, dirPath, option) => codeseerRunInstall(dirPath, option));

ipcMain.handle('codeseer-send-test-data', async (_e, opts) => {
  const samples = codeseerGenerateSamples();
  const screen = opts?.screen;
  const windows = BrowserWindow.getAllWindows();
  for (const msg of samples) {
    const m = { ...msg };
    if (screen != null && screen !== '') {
      if (!m.meta) m.meta = {};
      m.meta.screen = screen;
    }
    codeseerMessageStore.add(m);
    for (const w of windows) {
      if (w && !w.isDestroyed()) w.webContents.send('codeseer-message', m);
    }
  }
  return null;
});

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

const DEFAULT_PLAN_LIMITS = { max_projects: 3, max_extensions: 3 };

function getPlanLimits() {
  const stored = appAuthServer.getStoredToken();
  return stored.userLimits && typeof stored.userLimits === 'object'
    ? stored.userLimits
    : DEFAULT_PLAN_LIMITS;
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

  const limits = getPlanLimits();
  const max = limits.max_projects ?? 3;
  if (max > 0 && normalized.length > max) {
    debug.log(getStore, 'project', 'setProjects exceeds plan limit', { count: normalized.length, max });
    return { ok: false, saved: current.length, limitExceeded: true, max };
  }

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

const TELEMETRY_DEVICE_ID_PREF = 'telemetryDeviceId';

function getPreference(key) {
  const prefs = getStore().get('preferences');
  let value = typeof prefs === 'object' && prefs !== null && key in prefs ? prefs[key] : undefined;
  // Lazy-init per-device / per-install ID for telemetry (stable UUID, not user-facing).
  if (key === TELEMETRY_DEVICE_ID_PREF) {
    const valid = typeof value === 'string' && value.trim().length >= 16;
    if (!valid) {
      value = crypto.randomUUID();
      setPreference(TELEMETRY_DEVICE_ID_PREF, value);
    }
    return value;
  }
  return value;
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

let bundledLicenseConfig = null;
try {
  const bundledPath = path.join(appRoot, 'license-server.bundled.json');
  if (fs.existsSync(bundledPath)) {
    const raw = fs.readFileSync(bundledPath, 'utf8');
    bundledLicenseConfig = JSON.parse(raw);
  }
} catch (_) {}

const appAuthServer = createLicenseServer({ getPreference, setPreference, bundledConfig: bundledLicenseConfig });

const getBackendBaseUrl = () => appAuthServer.getConfig().url;
setTelemetryBaseUrl(getBackendBaseUrl);
setCrashReportsBaseUrl(getBackendBaseUrl);
setCrashReportsTokenProvider(() => {
  const stored = appAuthServer.getStoredToken();
  return stored?.accessToken || null;
});

/** Login status: remote controls plan and permissions; hasLicense means logged in with valid token.
 *  When offline (network unreachable or offline mode), falls back to cached license within grace period. */
async function getLicenseStatus() {
  debug.log(getStore, 'license', 'getLicenseStatus called');
  const stored = appAuthServer.getStoredToken();
  const hasToken = stored && typeof stored.accessToken === 'string' && stored.accessToken.length > 0;
  if (!hasToken) {
    debug.log(getStore, 'license', 'getLicenseStatus no stored token');
    return { hasLicense: false, source: null };
  }

  const isOfflineMode = !!getPreference('offlineMode');

  if (isOfflineMode) {
    debug.log(getStore, 'license', 'getLicenseStatus offline mode, using cache');
    const result = getLicenseStatusFromCache();
    return result;
  }

  debug.log(getStore, 'license', 'getLicenseStatus has token, checking remote');
  const remoteResult = await appAuthServer.hasValidRemoteLicense();

  if (remoteResult.networkError) {
    debug.log(getStore, 'license', 'getLicenseStatus network error, trying offline cache');
    const result = getLicenseStatusFromCache();
    return result;
  }

  if (!remoteResult.valid) {
    const grace = appAuthServer.checkOfflineGrace();
    if (grace.valid) {
      debug.log(getStore, 'license', 'getLicenseStatus remote invalid but within grace', { daysRemaining: grace.daysRemaining });
      const result = getLicenseStatusFromCache();
      return result;
    }
    debug.log(getStore, 'license', 'getLicenseStatus remote invalid and grace expired, clearing token');
    appAuthServer.clearStoredToken();
    return { hasLicense: false, source: null };
  }

  appAuthServer.stampLastVerified();
  const session = await appAuthServer.getRemoteSession();
  const tier = session?.tier ?? 'free';
  const plan = session?.plan ?? null;
  const plan_label = session?.plan_label ?? null;
  const permissions = session?.permissions ?? null;
  const features = session?.features ?? null;
  const limits = session?.limits ?? null;
  const email = session?.email ?? null;
  debug.log(getStore, 'license', 'getLicenseStatus ok', { email, tier, plan, hasPermissions: !!permissions?.tabs });
  return {
    hasLicense: true,
    source: 'remote',
    email,
    tier,
    plan,
    plan_label,
    permissions,
    features,
    limits,
    team: session?.team ?? null,
    profile: session?.profile ?? null,
    serverUrl: appAuthServer.getConfig().url || null,
  };
}

/** Log login event: telemetry + POST to backend /api/desktop/login */
function logLoginEvent(email, method) {
  const appVersion = require('../package.json').version || 'unknown';
  const stored = appAuthServer.getStoredToken();
  const userEmail = email || stored.userEmail || undefined;
  telemetryTrack(getPreference, 'user.login', {
    method,
    email: userEmail,
    tier: stored.userTier || undefined,
    plan: stored.userPlanLabel || undefined,
    app_version: appVersion,
  });
  debug.log(getStore, 'auth', 'logLoginEvent', {
    method,
    email: userEmail,
    tier: stored.userTier,
    plan: stored.userPlanLabel,
    team: stored.userTeam?.name || null,
    hasGitHubToken: !!(getStore().get('githubToken')),
  });
  const { url } = appAuthServer.getConfig();
  if (!url || !stored.accessToken) return;
  fetch(`${url}/api/desktop/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${stored.accessToken}`,
    },
    body: JSON.stringify({
      method,
      email: userEmail,
      tier: stored.userTier || null,
      plan_label: stored.userPlanLabel || null,
      team: stored.userTeam?.name || null,
      has_github_token: !!(getStore().get('githubToken')),
      app_version: appVersion,
      electron_version: process.versions.electron || null,
      node_version: process.versions.node || null,
      chrome_version: process.versions.chrome || null,
      platform: process.platform,
      arch: process.arch,
      os_version: os.release(),
      os_type: os.type(),
      hostname: os.hostname(),
      locale: app.getLocale(),
      system_locale: app.getSystemLocale?.() || null,
      machine_id: machineFingerprint(),
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
}

function machineFingerprint() {
  const raw = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.cpus()[0]?.model || ''}-${os.totalmem()}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

function getLicenseStatusFromCache() {
  const cached = appAuthServer.getCachedLicense();
  if (!cached) return { hasLicense: false, source: null };
  const grace = appAuthServer.checkOfflineGrace();
  if (!grace.valid) {
    debug.log(getStore, 'license', 'getLicenseStatusFromCache grace expired');
    return {
      hasLicense: false,
      source: null,
      offlineGraceExpired: true,
      daysExpired: grace.daysExpired,
    };
  }
  const tier = cached.tier ?? 'free';
  const plan_label = cached.planLabel ?? null;
  const permissions = cached.allowedTabs != null ? { tabs: cached.allowedTabs } : null;
  const features = cached.features ?? null;
  const limits = cached.limits ?? null;
  return {
    hasLicense: true,
    source: 'offline-cache',
    email: cached.email ?? null,
    tier,
    plan_label,
    permissions,
    features,
    limits,
    team: cached.team ?? null,
    profile: cached.profile ?? null,
    serverUrl: appAuthServer.getConfig().url || null,
    offlineGrace: {
      daysRemaining: grace.daysRemaining,
      graceDays: grace.graceDays,
      lastVerifiedAt: cached.lastVerifiedAt,
    },
  };
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
  getPreference,
  send: sendToAllWindows,
  SMTPServer,
  simpleParser,
  sanitizeHtml,
  debug,
});
const tunnelService = createTunnelService({ send: sendToAllWindows, localtunnel });
const ftpService = createFtpClient({ FtpClient });
const sshManager = createSshManager({
  getPreference,
  setPreference,
  runCommandInSystemTerminal: (command) =>
    terminalService.runCommandInSystemTerminal(command, require('child_process').spawn, getPreference('preferredTerminal') || 'default'),
});
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
  if (gitApi != null) return gitApi;
  const plugin = getGitPlugin();
  if (!plugin) {
    const { createGitStub } = require('./plugins/git/stub');
    gitApi = createGitStub();
    return gitApi;
  }
  if (!plugin.isEnabled(getStore())) {
    gitApi = plugin.createStub();
    return gitApi;
  }
  const deps = {
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
  };
  gitApi = plugin.createApi(deps);
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
    if (gitInfo && gitInfo.ok !== false) {
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

const PROJECT_MARKERS = ['package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml', 'composer.json', '.git'];

function isProjectDir(dirPath) {
  return PROJECT_MARKERS.some((m) => fs.existsSync(path.join(dirPath, m)));
}

async function scanDirectoryForProjects(parentDir) {
  const found = [];
  if (!fs.existsSync(parentDir)) return found;
  if (isProjectDir(parentDir)) {
    found.push(parentDir);
  }
  let entries;
  try {
    entries = fs.readdirSync(parentDir, { withFileTypes: true });
  } catch (_) {
    return found;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'vendor') continue;
    const sub = path.join(parentDir, entry.name);
    if (isProjectDir(sub)) {
      found.push(sub);
    }
  }
  return found;
}

async function bulkImportProjects() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select a folder to scan for projects',
  });
  if (canceled || !filePaths?.length) return { ok: false, canceled: true };
  const parentDir = filePaths[0];
  const found = await scanDirectoryForProjects(parentDir);
  const existing = getProjects().map((p) => p.path);
  const projects = found
    .filter((p) => !existing.includes(p))
    .map((p) => {
      let name = path.basename(p);
      let projectType = null;
      try {
        const info = getProjectNameVersionAndType(p, path, fs);
        if (info.ok) {
          name = info.name || name;
          projectType = info.projectType || null;
        }
      } catch (_) {}
      return { path: p, name, projectType };
    });
  return { ok: true, parentDir, projects, totalFound: found.length, alreadyAdded: found.length - projects.length };
}

async function showDirectoryDialog() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select project folder',
  });
  if (canceled || !filePaths || filePaths.length === 0) return null;
  return filePaths[0];
}

async function fetchShipwellProjects() {
  if (getPreference('offlineMode')) return { ok: false, error: 'Offline mode enabled', data: [] };
  const { url } = appAuthServer.getConfig();
  if (!url) return { ok: false, error: 'Not configured', data: [] };
  const stored = appAuthServer.getStoredToken();
  const headers = { Accept: 'application/json' };
  if (stored.accessToken) headers.Authorization = `Bearer ${stored.accessToken}`;
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/api/projects`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, data: [] };
    const json = await res.json();
    return { ok: true, data: Array.isArray(json.data) ? json.data : [] };
  } catch (e) {
    return { ok: false, error: e?.message ?? 'Fetch failed', data: [] };
  }
}

async function cloneGitHubRepo(repoOrUrl, targetDir) {
  if (getPreference('offlineMode')) return { ok: false, error: 'Offline mode enabled' };
  const cloneUrl = repoOrUrl.startsWith('http') ? repoOrUrl : `https://github.com/${repoOrUrl}.git`;
  const repoName = repoOrUrl.replace(/\.git$/, '').split('/').pop();

  let destDir = targetDir;
  if (!destDir) {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: `Choose folder to clone "${repoName}" into`,
    });
    if (canceled || !filePaths?.length) return { ok: false, error: 'Cancelled' };
    destDir = path.join(filePaths[0], repoName);
  }

  if (fs.existsSync(destDir) && fs.existsSync(path.join(destDir, '.git'))) {
    return { ok: true, path: destDir, alreadyExists: true };
  }

  try {
    await runInDir(path.dirname(destDir), 'git', ['clone', cloneUrl, path.basename(destDir)]);
    return { ok: true, path: destDir };
  } catch (e) {
    return { ok: false, error: e?.message ?? 'Clone failed' };
  }
}

function extractGitHubRepo(remoteUrl) {
  if (!remoteUrl) return null;
  const m = remoteUrl.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/i);
  return m ? m[1] : null;
}

async function syncProjectsToShipwell() {
  if (getPreference('offlineMode')) return { ok: false, error: 'Offline mode enabled' };
  const { url } = appAuthServer.getConfig();
  if (!url) return { ok: false, error: 'Not configured' };
  const stored = appAuthServer.getStoredToken();
  if (!stored.accessToken) return { ok: false, error: 'Not logged in' };

  const list = getProjects();
  if (!list.length) return { ok: false, error: 'No projects to sync' };

  const projectsPayload = [];
  for (const p of list) {
    try {
      const info = await getProjectInfoAsync(p.path);
      const repo = extractGitHubRepo(info.gitRemote);
      projectsPayload.push({
        name: info.name || p.name || path.basename(p.path),
        github_repo: repo || null,
        language: info.projectType || null,
        version: info.version || null,
        branch: info.branch || null,
        local_path: p.path,
      });
    } catch (_) {
      projectsPayload.push({
        name: p.name || path.basename(p.path),
        github_repo: null,
        language: null,
        version: null,
        branch: null,
        local_path: p.path,
      });
    }
  }

  if (!projectsPayload.length) return { ok: false, error: 'No projects to sync' };

  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/api/projects/sync`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${stored.accessToken}`,
      },
      body: JSON.stringify({ projects: projectsPayload }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const json = await res.json();
    return { ok: true, ...json };
  } catch (e) {
    return { ok: false, error: e?.message ?? 'Sync failed' };
  }
}


async function syncReleasesToShipwell() {
  if (getPreference('offlineMode')) return { ok: false, error: 'Offline mode enabled' };
  const { url } = appAuthServer.getConfig();
  if (!url) return { ok: false, error: 'Not configured' };
  const stored = appAuthServer.getStoredToken();
  if (!stored.accessToken) return { ok: false, error: 'Not logged in' };

  const list = getProjects();
  if (!list.length) return { ok: false, error: 'No projects to sync' };

  const ghToken = getStore().get('githubToken') || null;
  let totalCreated = 0;
  let totalUpdated = 0;
  let projectsSynced = 0;
  const errors = [];

  for (const p of list) {
    try {
      const info = await getProjectInfoAsync(p.path);
      const repo = extractGitHubRepo(info.gitRemote);
      if (!repo) continue;

      const slug = getRepoSlug(info.gitRemote);
      if (!slug) continue;

      const projectRes = await fetch(`${url.replace(/\/+$/, '')}/api/projects`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${stored.accessToken}`,
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!projectRes.ok) continue;
      const projectData = await projectRes.json();
      const projects = projectData.data || projectData || [];
      const webProject = projects.find(
        (wp) => wp.github_repo && wp.github_repo.toLowerCase() === repo.toLowerCase()
      );
      if (!webProject) continue;

      let releases = [];
      try {
        releases = await fetchGitHubReleases(slug.owner, slug.repo, ghToken);
      } catch (_) {
        continue;
      }
      if (!releases.length) continue;

      const releasesPayload = releases.slice(0, 100).map((r) => ({
        version: (r.tag_name || r.name || '').replace(/^v/i, '') || r.tag_name || 'unknown',
        tag_name: r.tag_name || null,
        title: r.name || null,
        notes: r.body || null,
        is_draft: !!r.draft,
        is_prerelease: !!r.prerelease,
        published_at: r.published_at || r.created_at || null,
        github_url: r.html_url || null,
        commit_sha: r.target_commitish || null,
        author: r.author?.login || null,
        released_at: r.published_at || r.created_at || null,
      }));

      try {
        const syncRes = await fetch(
          `${url.replace(/\/+$/, '')}/api/projects/${webProject.id}/releases/sync`,
          {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: `Bearer ${stored.accessToken}`,
            },
            body: JSON.stringify({ releases: releasesPayload }),
            signal: AbortSignal.timeout(30000),
          }
        );
        if (syncRes.ok) {
          const result = await syncRes.json();
          totalCreated += result.created || 0;
          totalUpdated += result.updated || 0;
          projectsSynced++;
        }
      } catch (e) {
        errors.push(`${repo}: ${e?.message || 'Sync failed'}`);
      }
    } catch (_) {
      // skip projects that fail info lookup
    }
  }

  return {
    ok: true,
    projects_synced: projectsSynced,
    created: totalCreated,
    updated: totalUpdated,
    errors: errors.length ? errors : undefined,
  };
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

/** state: 'open' | 'closed' | 'all'. labels: optional string (comma-separated) or array. Returns list of issues (excludes pull_request entries from API). */
async function fetchGitHubIssues(owner, repo, token, state = 'open', labels = null) {
  const params = new URLSearchParams({ state, per_page: '50' });
  if (labels) params.set('labels', Array.isArray(labels) ? labels.join(',') : String(labels));
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?${params}`;
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': GITHUB_API_USER_AGENT, 'X-GitHub-Api-Version': '2022-11-28' };
  if (token && typeof token === 'string') headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers, redirect: 'follow' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(res.status === 404 ? 'Repo not found' : text || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : [];
  return list.filter((i) => !i.pull_request);
}

/** Returns list of labels for the repo. */
async function fetchGitHubLabels(owner, repo, token) {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/labels?per_page=100`;
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
    const csPort = codeseerTcpServer.getPort();
    if (csPort != null) win.webContents.send('codeseer-server-ready', { port: csPort });
    const sshP = codeseerSshServer.getPort ? codeseerSshServer.getPort() : null;
    if (sshP != null) win.webContents.send('codeseer-ssh-ready', { port: sshP });
    const mcpP = codeseerMcpServer.getPort ? codeseerMcpServer.getPort() : null;
    if (mcpP != null) win.webContents.send('codeseer-mcp-ready', { port: mcpP });
    const zoom = getPreference('appearanceZoomFactor');
    if (typeof zoom === 'number' && zoom > 0) win.webContents.setZoomFactor(zoom);
    else win.webContents.setZoomFactor(1);
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

// Deep link protocol: shipwell://oauth/callback?token=...&email=...
const PROTOCOL = 'shipwell';
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

let pendingDeepLinkUrl = null;

function handleOAuthParams({ token, email, error, github_token }) {
  if (error) {
    console.warn('[oauth] error:', error);
    sendToAllWindows('rm-github-oauth-error', error);
    return;
  }
  if (token) {
    appAuthServer.loginWithToken(token, email || null).then((result) => {
      if (result.ok) {
        if (github_token) {
          getStore().set('githubToken', github_token);
          debug.log(getStore, 'oauth', 'GitHub access token saved from OAuth');
        }
        logLoginEvent(email, 'github');
        sendToAllWindows('rm-license-status-changed');
        sendToAllWindows('rm-github-oauth-success');
      } else {
        sendToAllWindows('rm-github-oauth-error', result.error || 'Login failed');
      }
    });
  }
}

function handleDeepLink(url) {
  if (!url || typeof url !== 'string' || !url.startsWith(`${PROTOCOL}://`)) return;
  try {
    const parsed = new URL(url);
    // Custom protocols put the first segment into hostname, not pathname.
    // e.g. shipwell://oauth/callback  -> host="oauth", pathname="/callback"
    //      shipwell://install-extension?repo=... -> host="install-extension", pathname=""
    const route = '/' + (parsed.hostname || '') + (parsed.pathname || '').replace(/^\/\//, '');

    if (route === '/oauth/callback') {
      handleOAuthParams({
        token: parsed.searchParams.get('token'),
        email: parsed.searchParams.get('email'),
        error: parsed.searchParams.get('error'),
        github_token: parsed.searchParams.get('github_token'),
      });
    } else if (route === '/install-extension') {
      const repo = parsed.searchParams.get('repo');
      if (repo) {
        console.log('[deepLink] install-extension request for repo:', repo);
        const w = BrowserWindow.getAllWindows()[0];
        if (w) {
          if (w.isMinimized()) w.restore();
          if (!w.isVisible()) w.show();
          w.focus();
          w.webContents.send('install-extension-from-deeplink', { repo });
        }
      }
    }
  } catch (e) {
    console.warn('[deepLink] Failed to parse URL:', url, e?.message);
  }
}

// Local HTTP server to receive OAuth callback (works in dev and production)
const http = require('http');
let oauthCallbackServer = null;
let oauthCallbackPort = null;

function startOAuthCallbackServer() {
  return new Promise((resolve) => {
    if (oauthCallbackServer) {
      resolve(oauthCallbackPort);
      return;
    }
    const server = http.createServer((req, res) => {
      try {
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (req.method === 'OPTIONS') {
          res.writeHead(204, corsHeaders);
          res.end();
          return;
        }

        const url = new URL(req.url, `http://localhost`);
        if (url.pathname === '/oauth/callback') {
          const token = url.searchParams.get('token');
          const email = url.searchParams.get('email');
          const error = url.searchParams.get('error');
          const github_token = url.searchParams.get('github_token');

          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/html' });
          res.end(`<html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0"><div style="text-align:center"><h1>${error ? 'Sign-in failed' : 'Signed in!'}</h1><p>${error || 'You can close this tab and return to Shipwell.'}</p></div></body></html>`);

          handleOAuthParams({ token, email, error, github_token });

          const w = BrowserWindow.getAllWindows()[0];
          if (w) {
            if (w.isMinimized()) w.restore();
            w.focus();
          }

          setTimeout(() => stopOAuthCallbackServer(), 5000);
        } else {
          res.writeHead(404, corsHeaders);
          res.end('Not found');
        }
      } catch (e) {
        console.warn('[oauthServer] request error:', e?.message);
        res.writeHead(500);
        res.end('Error');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      oauthCallbackPort = server.address().port;
      oauthCallbackServer = server;
      console.log('[oauthServer] listening on port', oauthCallbackPort);
      resolve(oauthCallbackPort);
    });
    server.on('error', (err) => {
      console.warn('[oauthServer] failed to start:', err?.message);
      resolve(null);
    });
  });
}

function stopOAuthCallbackServer() {
  if (oauthCallbackServer) {
    oauthCallbackServer.close();
    oauthCallbackServer = null;
    oauthCallbackPort = null;
  }
}

// macOS: open-url fires when app is already running or launched via protocol
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (app.isReady()) {
    handleDeepLink(url);
  } else {
    pendingDeepLinkUrl = url;
  }
});

// Windows/Linux: second-instance fires when another instance tries to launch
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const deepLinkUrl = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (deepLinkUrl) handleDeepLink(deepLinkUrl);
    const w = BrowserWindow.getAllWindows()[0];
    if (w) {
      if (!w.isVisible()) w.show();
      if (w.isMinimized()) w.restore();
      w.focus();
    }
  });
}

app.whenReady().then(() => {
  store = new Store({ name: 'release-manager' });
  appSettings.init(getStore, getPreference, setPreference);
  appSettings.applyProxy();

  // Process any deep link that arrived before the app was ready
  if (pendingDeepLinkUrl) {
    handleDeepLink(pendingDeepLinkUrl);
    pendingDeepLinkUrl = null;
  }
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
  function getAiParams() {
    const prefs = getStore().get('preferences') || {};
    return {
      temperature: typeof prefs.aiTemperature === 'number' ? prefs.aiTemperature : 0.7,
      max_tokens: typeof prefs.aiMaxTokens === 'number' && prefs.aiMaxTokens > 0 ? prefs.aiMaxTokens : 2048,
      top_p: typeof prefs.aiTopP === 'number' && prefs.aiTopP >= 0 && prefs.aiTopP <= 1 ? prefs.aiTopP : 0.9,
    };
  }

  async function generateWithProvider(prompt) {
    const provider = getStore().get('aiProvider') || 'ollama';
    const params = getAiParams();
    if (provider === 'ollama') {
      const baseUrl = getStore().get('ollamaBaseUrl') || DEFAULT_BASE_URL;
      const model = getStore().get('ollamaModel') || DEFAULT_MODEL;
      return ollamaGenerate(baseUrl, model, prompt, params);
    }
    if (provider === 'lmstudio') {
      const baseUrl = getStore().get('lmStudioBaseUrl') || LMSTUDIO_DEFAULT_BASE_URL;
      const model = getStore().get('lmStudioModel') || LMSTUDIO_DEFAULT_MODEL;
      return lmStudioGenerate(baseUrl, model, prompt, params);
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
    if (provider === 'groq') {
      const apiKey = getStore().get('groqApiKey') || '';
      const model = getStore().get('groqModel') || GROQ_DEFAULT_MODEL;
      return groqGenerate(apiKey, model, prompt);
    }
    if (provider === 'mistral') {
      const apiKey = getStore().get('mistralApiKey') || '';
      const model = getStore().get('mistralModel') || MISTRAL_DEFAULT_MODEL;
      return mistralGenerate(apiKey, model, prompt);
    }
    const baseUrl = getStore().get('ollamaBaseUrl') || DEFAULT_BASE_URL;
    const model = getStore().get('ollamaModel') || DEFAULT_MODEL;
    return ollamaGenerate(baseUrl, model, prompt, params);
  }

  // ── GitHub Extension Helpers ──────────────────────────────────────────────

  function getGitHubHeaders() {
    const ghToken = getStore().get('githubToken') || '';
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'Shipwell-Desktop' };
    if (ghToken) headers.Authorization = `Bearer ${ghToken}`;
    return headers;
  }

  function getShipwellApiHeaders() {
    const stored = appAuthServer.getStoredToken();
    const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
    if (stored.accessToken) headers.Authorization = `Bearer ${stored.accessToken}`;
    return headers;
  }

  async function switchPlan(plan) {
    const { url } = appAuthServer.getConfig();
    if (!url) return { ok: false, error: 'Not configured' };
    try {
      const res = await fetch(`${url.replace(/\/+$/, '')}/api/user/plan`, {
        method: 'PUT',
        headers: getShipwellApiHeaders(),
        body: JSON.stringify({ plan }),
        signal: AbortSignal.timeout(10000),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: json.message || `HTTP ${res.status}` };

      // Re-fetch the license so the desktop picks up the new plan immediately
      const session = await appAuthServer.getRemoteSession();
      const w = BrowserWindow.getAllWindows()[0];
      if (w) w.webContents.send('license-status-changed');

      return { ok: true, plan: json.plan, plan_label: json.plan_label, limits: json.limits };
    } catch (e) {
      return { ok: false, error: e?.message ?? 'Failed to switch plan' };
    }
  }

  /**
   * Fetch the extension registry from the Shipwell API.
   * Returns { ok, data: [...] } where each item has id, slug, name, description,
   * version, download_url, github_repo, installed, installed_version.
   */
  async function fetchGitHubExtensionRegistry() {
    if (getPreference('offlineMode')) return { ok: true, data: [] };
    const { url } = appAuthServer.getConfig();
    if (!url) return { ok: false, error: 'License server not configured', data: [] };

    const installed = getInstalledUserExtensionsSync();
    const installedMap = {};
    for (const u of installed) installedMap[u.id] = u;

    try {
      const apiUrl = `${url.replace(/\/+$/, '')}/api/extensions`;
      const res = await fetch(apiUrl, { headers: getShipwellApiHeaders(), signal: AbortSignal.timeout(15000) });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, data: [] };
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      const results = list.map((item) => ({
        id: item.slug || item.id,
        name: item.name || item.slug || item.id,
        description: item.description || '',
        version: item.version || null,
        download_url: item.download_url || null,
        github_repo: item.github_repo || null,
        homepage: item.homepage || null,
        author: item.author || null,
        icon: item.icon || null,
        required_plan: item.required_plan || 'free',
        accessible: item.accessible !== false,
        installed: !!installedMap[item.slug || item.id],
        installed_version: installedMap[item.slug || item.id]?.version || null,
      }));
      return { ok: true, data: results };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to fetch extension registry', data: [] };
    }
  }

  /**
   * Register a GitHub repo as an extension on the Shipwell API.
   * POST /api/extensions/github { repo: "owner/repo" }
   */
  async function registerGitHubExtension(repo) {
    if (getPreference('offlineMode')) return { ok: false, error: 'Offline mode enabled' };
    const { url } = appAuthServer.getConfig();
    if (!url) return { ok: false, error: 'License server not configured' };
    if (!repo || !/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo)) {
      return { ok: false, error: 'Invalid repo format. Use "owner/repo".' };
    }
    try {
      const apiUrl = `${url.replace(/\/+$/, '')}/api/extensions/github`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: getShipwellApiHeaders(),
        body: JSON.stringify({ repo }),
        signal: AbortSignal.timeout(20000),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: json.error || json.message || `HTTP ${res.status}` };
      return { ok: true, data: json.data || json };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to register extension' };
    }
  }

  /**
   * Install an extension from a GitHub repo.
   * Accepts either: { repo: "owner/repo" } or { slug, download_url, github_repo, name, description }
   */
  async function installExtensionFromGitHub(extensionIdOrInfo, { skipLimitCheck = false } = {}) {
    if (getPreference('offlineMode')) return { ok: false, error: 'Offline mode enabled' };
    let extensionId, repo, name, description;
    if (typeof extensionIdOrInfo === 'object') {
      extensionId = extensionIdOrInfo.slug || extensionIdOrInfo.id;
      repo = extensionIdOrInfo.github_repo || extensionIdOrInfo.repo;
      name = extensionIdOrInfo.name;
      description = extensionIdOrInfo.description;
    } else {
      extensionId = extensionIdOrInfo;
    }
    if (!extensionId) return { ok: false, error: 'Extension ID required' };
    if (!repo) return { ok: false, error: 'GitHub repo not available for this extension' };

    if (!skipLimitCheck) {
      const limits = getPlanLimits();
      const maxExt = limits.max_extensions ?? 3;
      if (maxExt > 0) {
        const installed = getInstalledUserExtensionsSync();
        const alreadyInstalled = installed.some((e) => e.id === extensionId);
        if (!alreadyInstalled && installed.length >= maxExt) {
          return { ok: false, error: `You've reached the limit of ${maxExt} extensions on your plan. Upgrade to install more.`, limitExceeded: true, max: maxExt };
        }
      }
    }

    telemetryTrack(getPreference, 'extension.installed', { extension_id: extensionId, source: 'github', repo });
    const extensionsDir = path.join(app.getPath('userData'), 'extensions');
    const targetDir = path.join(extensionsDir, extensionId);
    const tempDir = app.getPath('temp');
    const headers = getGitHubHeaders();

    let downloadUrl = null;
    let version = null;
    try {
      const relUrl = `https://api.github.com/repos/${repo}/releases/latest`;
      const relRes = await fetch(relUrl, { headers, signal: AbortSignal.timeout(10000) });
      if (relRes.ok) {
        const rel = await relRes.json();
        version = (rel.tag_name || '').replace(/^v/, '') || '1.0.0';
        const zipAsset = (rel.assets || []).find((a) => a.name.endsWith('.zip'));
        downloadUrl = zipAsset ? zipAsset.browser_download_url : rel.zipball_url;
      }
    } catch (_) {}
    if (!downloadUrl) downloadUrl = `https://api.github.com/repos/${repo}/zipball`;

    try {
      const res = await fetch(downloadUrl, { headers, signal: AbortSignal.timeout(60000), redirect: 'follow' });
      if (!res.ok) return { ok: false, error: `Download failed: HTTP ${res.status}` };
      const buf = Buffer.from(await res.arrayBuffer());
      const tempFile = path.join(tempDir, `rm-ext-${extensionId}-${Date.now()}.zip`);
      fs.writeFileSync(tempFile, buf);
      try {
        if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true });
        fs.mkdirSync(targetDir, { recursive: true });

        const tmpExtract = path.join(tempDir, `rm-ext-extract-${extensionId}-${Date.now()}`);
        fs.mkdirSync(tmpExtract, { recursive: true });
        await extractZip(tempFile, { dir: tmpExtract });

        // GitHub zipballs have a top-level directory — flatten it
        const entries = fs.readdirSync(tmpExtract, { withFileTypes: true });
        let sourceDir = tmpExtract;
        if (entries.length === 1 && entries[0].isDirectory()) {
          sourceDir = path.join(tmpExtract, entries[0].name);
        }
        const files = fs.readdirSync(sourceDir);
        for (const f of files) {
          fs.renameSync(path.join(sourceDir, f), path.join(targetDir, f));
        }
        try { fs.rmSync(tmpExtract, { recursive: true }); } catch (_) {}

        // Build the extension and promote dist/index.js to root
        buildExtensionSync(targetDir);

        // Ensure manifest.json exists
        const manifestPath = path.join(targetDir, 'manifest.json');
        let manifest = {};
        if (fs.existsSync(manifestPath)) {
          try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (_) {}
        }
        const pkgPath = path.join(targetDir, 'package.json');
        if (!version && fs.existsSync(pkgPath)) {
          try { const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); version = pkg.version || null; } catch (_) {}
        }
        manifest = {
          id: extensionId,
          name: manifest.name || name || extensionId,
          version: manifest.version || version || '1.0.0',
          description: manifest.description || description || '',
          repo,
          ...manifest,
          id: extensionId,
        };
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
        reportExtensionInstalled(extensionId, repo, manifest.version);
        return { ok: true, path: targetDir };
      } finally {
        try { fs.unlinkSync(tempFile); } catch (_) {}
      }
    } catch (e) {
      return { ok: false, error: e.message || 'Install from GitHub failed' };
    }
  }

  function reportExtensionInstalled(slug, githubRepo, version) {
    const { url } = appAuthServer.getConfig();
    if (!url) return;
    const headers = getShipwellApiHeaders();
    fetch(`${url.replace(/\/+$/, '')}/api/extensions/installed`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ slug, github_repo: githubRepo, version }),
      signal: AbortSignal.timeout(10000),
    }).catch(() => {});
  }

  async function syncPlanExtensions() {
    if (getPreference('offlineMode')) return { ok: false, error: 'Offline mode enabled', installed: 0, removed: 0 };
    const { url } = appAuthServer.getConfig();
    if (!url) return { ok: false, error: 'License server not configured', installed: 0, removed: 0 };
    const baseUrl = url.replace(/\/+$/, '');
    const headers = getShipwellApiHeaders();

    try {
      const localExtensions = getInstalledUserExtensionsSync();
      const localSlugs = localExtensions.map((e) => e.id);

      let toInstallFromWeb = [];
      let toRemoveFromWeb = [];
      let notAccessible = [];
      try {
        const syncRes = await fetch(`${baseUrl}/api/extensions/sync-installed`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ installed_slugs: localSlugs }),
          signal: AbortSignal.timeout(15000),
        });
        if (syncRes.ok) {
          const syncJson = await syncRes.json();
          toInstallFromWeb = Array.isArray(syncJson.to_install) ? syncJson.to_install : [];
          toRemoveFromWeb = Array.isArray(syncJson.to_remove) ? syncJson.to_remove : [];
          notAccessible = Array.isArray(syncJson.not_accessible) ? syncJson.not_accessible : [];
        }
      } catch (_) {}

      let planExtensions = [];
      try {
        const planRes = await fetch(`${baseUrl}/api/extensions-auto-install`, { headers, signal: AbortSignal.timeout(15000) });
        if (planRes.ok) {
          const planJson = await planRes.json();
          planExtensions = Array.isArray(planJson.data) ? planJson.data : [];
        }
      } catch (_) {}

      const installedIds = new Set(localSlugs);
      const toInstall = new Map();

      for (const ext of planExtensions) {
        const slug = ext.slug || ext.id;
        if (slug && !installedIds.has(slug) && ext.github_repo) {
          toInstall.set(slug, ext);
        }
      }
      for (const ext of toInstallFromWeb) {
        const slug = ext.slug || ext.id;
        if (slug && !installedIds.has(slug) && ext.github_repo) {
          toInstall.set(slug, ext);
        }
      }

      let installed = 0;
      let removed = 0;
      let failed = 0;

      // Install extensions enabled from web or plan
      for (const [slug, ext] of toInstall) {
        try {
          const result = await installExtensionFromGitHub(
            { slug, id: slug, github_repo: ext.github_repo, name: ext.name, description: ext.description },
            { skipLimitCheck: true }
          );
          if (result?.ok) { installed++; } else { failed++; }
        } catch (_) { failed++; }
      }

      // Remove extensions disabled from web or no longer accessible by plan
      const extensionsDir = path.join(app.getPath('userData'), 'extensions');
      const toRemoveAll = [...new Set([...toRemoveFromWeb, ...notAccessible])];
      for (const slug of toRemoveAll) {
        if (!slug || typeof slug !== 'string') continue;
        const targetDir = path.join(extensionsDir, slug);
        if (!targetDir.startsWith(extensionsDir) || !fs.existsSync(targetDir)) continue;
        try {
          fs.rmSync(targetDir, { recursive: true });
          removed++;
        } catch (_) {}
      }

      // Re-report the final state if anything changed
      if (installed > 0 || removed > 0) {
        const updatedSlugs = getInstalledUserExtensionsSync().map((e) => e.id);
        fetch(`${baseUrl}/api/extensions/sync-installed`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ installed_slugs: updatedSlugs }),
          signal: AbortSignal.timeout(10000),
        }).catch(() => {});
      }

      let disabledSlugs = [];
      try {
        const userExtRes = await fetch(`${baseUrl}/api/user/extensions`, { headers, signal: AbortSignal.timeout(10000) });
        if (userExtRes.ok) {
          const userExtJson = await userExtRes.json();
          const userExts = Array.isArray(userExtJson.data) ? userExtJson.data : [];
          disabledSlugs = userExts.filter((e) => e.enabled === false).map((e) => e.slug);
        }
      } catch (_) {}

      return { ok: true, installed, removed, failed, total: toInstall.size + toRemoveFromWeb.length, disabledSlugs };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to sync plan extensions', installed: 0, removed: 0 };
    }
  }

  async function installExtensionFromUrl(extensionId, extensionInfo, downloadUrl, extensionsDir, targetDir, tempDir) {
    const res = await fetch(downloadUrl, { signal: AbortSignal.timeout(60000), redirect: 'follow' });
    if (!res.ok) return { ok: false, error: `Download failed: HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = path.extname(new URL(res.url).pathname).toLowerCase() || (buf[0] === 0x50 && buf[1] === 0x4b ? '.zip' : '.js');
    const tempFile = path.join(tempDir, `rm-ext-${extensionId}-${Date.now()}${ext}`);
    fs.writeFileSync(tempFile, buf);
    try {
      if (ext === '.zip') {
        if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true });
        fs.mkdirSync(targetDir, { recursive: true });
        await extractZip(tempFile, { dir: targetDir });
      } else {
        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(path.join(targetDir, 'index.js'), buf);
      }
      const manifest = {
        id: extensionId,
        name: extensionInfo?.name ?? extensionId,
        version: extensionInfo?.version ?? '1.0.0',
        description: extensionInfo?.description ?? '',
      };
      fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
      return { ok: true, path: targetDir };
    } finally {
      try { fs.unlinkSync(tempFile); } catch (_) {}
    }
  }

  const apiRegistry = {
    getProjects: () => getProjects(),
    getAllProjectsInfo: async () => {
      const list = getProjects();
      const lastOpened = getPreference('projectLastOpened') || {};
      const results = await Promise.all(
        list.map(async (p) => {
          const info = await getProjectInfoAsync(p.path);
          const lastOpenedAt = lastOpened[p.path] ?? null;
          return { path: p.path, name: p.name, lastOpenedAt, ...info };
        })
      );
      return results;
    },
    touchProjectOpened: (dirPath) => {
      if (!dirPath || typeof dirPath !== 'string') return;
      const prefs = getStore().get('preferences') || {};
      const current = prefs.projectLastOpened || {};
      const next = { ...current, [dirPath]: Date.now() };
      setPreference('projectLastOpened', next);
    },
    setProjects: (projects) => {
      const prev = getProjects().length;
      const result = setProjects(projects);
      const curr = (Array.isArray(projects) ? projects : []).length;
      if (curr > prev) telemetryTrack(getPreference, 'project.added', { total: curr });
      else if (curr < prev) telemetryTrack(getPreference, 'project.removed', { total: curr });
      return result;
    },
    showDirectoryDialog: () => showDirectoryDialog(),
    bulkImportProjects: () => bulkImportProjects(),
    fetchShipwellProjects: () => fetchShipwellProjects(),
    cloneGitHubRepo: (repoOrUrl, targetDir) => cloneGitHubRepo(repoOrUrl, targetDir),
    syncProjectsToShipwell: () => syncProjectsToShipwell(),
    syncReleasesToShipwell: () => syncReleasesToShipwell(),
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
      telemetryTrack(getPreference, 'tests.run', { project_type: projectType });
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
    runProjectCoverage: async (dirPath, projectType) => { telemetryTrack(getPreference, 'tests.coverage', { project_type: projectType }); return runProjectCoverageImpl(dirPath, projectType); },
    versionBump: (dirPath, bump) => { telemetryTrack(getPreference, 'release.version_bump', { bump }); return runVersionBump(dirPath, bump); },
    gitTagAndPush: (dirPath, tagMessage, options) => { telemetryTrack(getPreference, 'git.tag_and_push', {}); return getGitApi().gitTagAndPush(dirPath, tagMessage, options || {}); },
    release: async (dirPath, bump, force, options = {}) => {
      telemetryTrack(getPreference, 'release.created', { bump, force: !!force });
      return runReleaseImpl(dirPath, bump, force, options);
    },
    getCommitsSinceTag: (dirPath, sinceTag) => getGitApi().getCommitsSinceTag(dirPath, sinceTag),
    getCommitSubject: (dirPath, ref) => getGitApi().getCommitSubject(dirPath, ref),
    getRecentCommits: (dirPath, n) => getGitApi().getRecentCommits(dirPath, n),
    getSuggestedBump: (commits) => suggestBumpFromCommits(commits),
    getShortcutAction: (viewMode, selectedPath, key, metaKey, ctrlKey, inInput, detailTab, altKey) =>
      getShortcutAction(viewMode, selectedPath, key, metaKey, ctrlKey, inInput, detailTab, altKey),
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
    getGroqSettings: () => ({
      apiKey: getStore().get('groqApiKey') || '',
      model: getStore().get('groqModel') || GROQ_DEFAULT_MODEL,
    }),
    setGroqSettings: (apiKey, model) => {
      getStore().set('groqApiKey', apiKey || '');
      getStore().set('groqModel', model || '');
      return null;
    },
    getMistralSettings: () => ({
      apiKey: getStore().get('mistralApiKey') || '',
      model: getStore().get('mistralModel') || MISTRAL_DEFAULT_MODEL,
    }),
    setMistralSettings: (apiKey, model) => {
      getStore().set('mistralApiKey', apiKey || '');
      getStore().set('mistralModel', model || '');
      return null;
    },
    getLmStudioSettings: () => ({
      baseUrl: getStore().get('lmStudioBaseUrl') || LMSTUDIO_DEFAULT_BASE_URL,
      model: getStore().get('lmStudioModel') || LMSTUDIO_DEFAULT_MODEL,
    }),
    setLmStudioSettings: (baseUrl, model) => {
      getStore().set('lmStudioBaseUrl', baseUrl || '');
      getStore().set('lmStudioModel', model || '');
      return null;
    },
    getAiParams: () => getAiParams(),
    setAiParams: (temperature, maxTokens, topP) => {
      const prefs = getStore().get('preferences') || {};
      if (typeof temperature === 'number') prefs.aiTemperature = temperature;
      if (typeof maxTokens === 'number') prefs.aiMaxTokens = maxTokens;
      if (typeof topP === 'number') prefs.aiTopP = topP;
      getStore().set('preferences', prefs);
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
      if (provider === 'groq') return !!((getStore().get('groqApiKey') || '').trim());
      if (provider === 'mistral') return !!((getStore().get('mistralApiKey') || '').trim());
      if (provider === 'lmstudio') return true;
      return true;
    },
    ollamaListModels: async (baseUrl) => ollamaListModels(baseUrl || getStore().get('ollamaBaseUrl') || DEFAULT_BASE_URL),
    lmStudioListModels: async (baseUrl) => lmStudioListModels(baseUrl || getStore().get('lmStudioBaseUrl') || LMSTUDIO_DEFAULT_BASE_URL),
    ollamaGenerateCommitMessage: async (dirPath) => {
      telemetryTrack(getPreference, 'ai.generate', { feature: 'commit_message' });
      const diff = await getGitApi().getGitDiffForCommit(dirPath);
      const prompt = buildCommitMessagePrompt(diff);
      return generateWithProvider(prompt);
    },
    ollamaGenerateReleaseNotes: async (dirPath, sinceTag) => {
      telemetryTrack(getPreference, 'ai.generate', { feature: 'release_notes' });
      const res = await getGitApi().getCommitsSinceTag(dirPath, sinceTag);
      const commits = res.ok ? res.commits : [];
      const prompt = buildReleaseNotesPrompt(commits);
      return generateWithProvider(prompt);
    },
    ollamaGenerateTagMessage: async (dirPath, ref) => {
      telemetryTrack(getPreference, 'ai.generate', { feature: 'tag_message' });
      const res = await getGitApi().getCommitsSinceTag(dirPath, ref || null);
      const commits = res.ok ? res.commits : [];
      const prompt = buildTagMessagePrompt(commits);
      return generateWithProvider(prompt);
    },
    ollamaSuggestTestFix: async (testScriptName, stdout, stderr) => {
      telemetryTrack(getPreference, 'ai.generate', { feature: 'test_fix' });
      const prompt = buildTestFixPrompt(testScriptName, stdout, stderr);
      return generateWithProvider(prompt);
    },
    generateTestsForFile: async (dirPath, relativePath) => {
      telemetryTrack(getPreference, 'ai.generate', { feature: 'generate_tests' });
      const read = readProjectFileImpl(dirPath, relativePath);
      if (!read.ok) return { ok: false, error: read.error || 'Failed to read file' };
      const prompt = buildGenerateTestsPrompt(relativePath, read.content);
      const result = await generateWithProvider(prompt);
      if (!result.ok) return { ok: false, error: result.error || 'AI generation failed' };
      return { ok: true, text: result.text || '' };
    },
    getGitStatus: (dirPath) => getGitApi().getGitStatus(dirPath),
    getTrackedFiles: (dirPath) => getGitApi().getTrackedFiles(dirPath),
    getProjectFiles: (dirPath) => getGitApi().getProjectFiles(dirPath),
    gitPull: (dirPath) => { telemetryTrack(getPreference, 'git.pull', {}); return getGitApi().gitPull(dirPath); },
    getBranches: (dirPath) => getGitApi().getBranches(dirPath),
    checkoutBranch: (dirPath, branchName) => { telemetryTrack(getPreference, 'git.checkout_branch', {}); return getGitApi().checkoutBranch(dirPath, branchName); },
    createBranch: (dirPath, branchName, checkout) => { telemetryTrack(getPreference, 'git.create_branch', {}); return getGitApi().createBranch(dirPath, branchName, checkout !== false); },
    createBranchFrom: (dirPath, newBranchName, fromRef) => { telemetryTrack(getPreference, 'git.create_branch', { from_ref: true }); return getGitApi().createBranchFrom(dirPath, newBranchName, fromRef); },
    gitPush: (dirPath) => { telemetryTrack(getPreference, 'git.push', {}); return getGitApi().gitPushWithUpstream(dirPath); },
    gitPushForce: (dirPath, withLease) => { telemetryTrack(getPreference, 'git.push_force', { with_lease: !!withLease }); return getGitApi().gitPushForce(dirPath, !!withLease); },
    gitFetch: (dirPath) => { telemetryTrack(getPreference, 'git.fetch', {}); return getGitApi().gitFetch(dirPath); },
    gitMerge: (dirPath, branchName, options) => { telemetryTrack(getPreference, 'git.merge', {}); return getGitApi().gitMerge(dirPath, branchName, options || {}); },
    gitStashPush: (dirPath, message, options) => { telemetryTrack(getPreference, 'git.stash_push', {}); return getGitApi().gitStashPush(dirPath, message, options || {}); },
    commitChanges: (dirPath, message, options) => { telemetryTrack(getPreference, 'git.commit', {}); return getGitApi().gitCommit(dirPath, message, options || {}); },
    gitStashPop: (dirPath) => { telemetryTrack(getPreference, 'git.stash_pop', {}); return getGitApi().gitStashPop(dirPath); },
    gitDiscardChanges: (dirPath) => { telemetryTrack(getPreference, 'git.discard_changes', {}); return getGitApi().gitDiscardChanges(dirPath); },
    gitMergeAbort: (dirPath) => { telemetryTrack(getPreference, 'git.merge_abort', {}); return getGitApi().gitMergeAbort(dirPath); },
    getRemoteBranches: (dirPath) => getGitApi().getRemoteBranches(dirPath),
    checkoutRemoteBranch: (dirPath, ref) => { telemetryTrack(getPreference, 'git.checkout_remote_branch', {}); return getGitApi().checkoutRemoteBranch(dirPath, ref); },
    getStashList: (dirPath) => getGitApi().getStashList(dirPath),
    stashApply: (dirPath, index) => { telemetryTrack(getPreference, 'git.stash_apply', {}); return getGitApi().stashApply(dirPath, index); },
    stashDrop: (dirPath, index) => { telemetryTrack(getPreference, 'git.stash_drop', {}); return getGitApi().stashDrop(dirPath, index); },
    getTags: (dirPath) => getGitApi().getTags(dirPath),
    checkoutTag: (dirPath, tagName) => { telemetryTrack(getPreference, 'git.checkout_tag', {}); return getGitApi().checkoutTag(dirPath, tagName); },
    getCommitLog: (dirPath, n) => getGitApi().getCommitLog(dirPath, n),
    getCommitLogWithBody: (dirPath, n) => getGitApi().getCommitLogWithBody(dirPath, n),
    getCommitDetail: (dirPath, sha) => getGitApi().getCommitDetail(dirPath, sha),
    deleteBranch: (dirPath, branchName, force) => { telemetryTrack(getPreference, 'git.delete_branch', { force: !!force }); return getGitApi().deleteBranch(dirPath, branchName, force); },
    deleteRemoteBranch: (dirPath, remoteName, branchName) => { telemetryTrack(getPreference, 'git.delete_remote_branch', {}); return getGitApi().deleteRemoteBranch(dirPath, remoteName, branchName); },
    gitRebase: (dirPath, ontoBranch) => { telemetryTrack(getPreference, 'git.rebase', {}); return getGitApi().gitRebase(dirPath, ontoBranch); },
    gitRebaseAbort: (dirPath) => { telemetryTrack(getPreference, 'git.rebase_abort', {}); return getGitApi().gitRebaseAbort(dirPath); },
    gitRebaseContinue: (dirPath) => { telemetryTrack(getPreference, 'git.rebase_continue', {}); return getGitApi().gitRebaseContinue(dirPath); },
    gitRebaseSkip: (dirPath) => { telemetryTrack(getPreference, 'git.rebase_skip', {}); return getGitApi().gitRebaseSkip(dirPath); },
    gitMergeContinue: (dirPath) => { telemetryTrack(getPreference, 'git.merge_continue', {}); return getGitApi().gitMergeContinue(dirPath); },
    getRemotes: (dirPath) => getGitApi().getRemotes(dirPath),
    addRemote: (dirPath, name, url) => { telemetryTrack(getPreference, 'git.add_remote', {}); return getGitApi().addRemote(dirPath, name, url); },
    removeRemote: (dirPath, name) => { telemetryTrack(getPreference, 'git.remove_remote', {}); return getGitApi().removeRemote(dirPath, name); },
    renameRemote: (dirPath, oldName, newName) => { telemetryTrack(getPreference, 'git.rename_remote', {}); return getGitApi().renameRemote(dirPath, oldName, newName); },
    setRemoteUrl: (dirPath, name, url) => getGitApi().setRemoteUrl(dirPath, name, url),
    gitCherryPick: (dirPath, sha) => { telemetryTrack(getPreference, 'git.cherry_pick', {}); return getGitApi().gitCherryPick(dirPath, sha); },
    gitCherryPickAbort: (dirPath) => { telemetryTrack(getPreference, 'git.cherry_pick_abort', {}); return getGitApi().gitCherryPickAbort(dirPath); },
    gitCherryPickContinue: (dirPath) => { telemetryTrack(getPreference, 'git.cherry_pick_continue', {}); return getGitApi().gitCherryPickContinue(dirPath); },
    renameBranch: (dirPath, oldName, newName) => { telemetryTrack(getPreference, 'git.rename_branch', {}); return getGitApi().renameBranch(dirPath, oldName, newName); },
    createTag: (dirPath, tagName, message, ref) => { telemetryTrack(getPreference, 'git.create_tag', {}); return getGitApi().createTag(dirPath, tagName, message, ref); },
    gitInit: (dirPath) => { telemetryTrack(getPreference, 'git.init', {}); return getGitApi().gitInit(dirPath); },
    writeGitignore: (dirPath, content) => getGitApi().writeGitignore(dirPath, content),
    writeGitattributes: (dirPath, content) => getGitApi().writeGitattributes(dirPath, content),
    createTestFile: (dirPath, relativePath, content) => createTestFile(dirPath, relativePath, content),
    gitRebaseInteractive: (dirPath, ref) => { telemetryTrack(getPreference, 'git.rebase_interactive', {}); return getGitApi().gitRebaseInteractive(dirPath, ref); },
    gitReset: (dirPath, ref, mode) => { telemetryTrack(getPreference, 'git.reset', { mode: mode || 'mixed' }); return getGitApi().gitReset(dirPath, ref, mode); },
    getBranchRevision: (dirPath, ref) => getGitApi().getBranchRevision(dirPath, ref),
    setBranchUpstream: (dirPath, branchName) => getGitApi().setBranchUpstream(dirPath, branchName),
    getDiffBetween: (dirPath, refA, refB) => getGitApi().getDiffBetween(dirPath, refA, refB),
    getDiffBetweenFull: (dirPath, refA, refB) => getGitApi().getDiffBetweenFull(dirPath, refA, refB),
    getFileDiffStructured: (dirPath, filePath, options) => getGitApi().getFileDiffStructured(dirPath, filePath, options),
    revertFileLine: (dirPath, filePath, op, lineNum, content) => getGitApi().revertFileLine(dirPath, filePath, op, lineNum, content),
    gitRevert: (dirPath, sha) => { telemetryTrack(getPreference, 'git.revert', {}); return getGitApi().gitRevert(dirPath, sha); },
    gitPruneRemotes: (dirPath) => { telemetryTrack(getPreference, 'git.prune_remotes', {}); return getGitApi().gitPruneRemotes(dirPath); },
    gitAmend: (dirPath, message) => { telemetryTrack(getPreference, 'git.amend', {}); return getGitApi().gitAmend(dirPath, message); },
    getReflog: (dirPath, n) => getGitApi().getReflog(dirPath, n),
    checkoutRef: (dirPath, ref) => getGitApi().checkoutRef(dirPath, ref),
    getBlame: (dirPath, filePath) => getGitApi().getBlame(dirPath, filePath),
    deleteTag: (dirPath, tagName) => { telemetryTrack(getPreference, 'git.delete_tag', {}); return getGitApi().deleteTag(dirPath, tagName); },
    pushTag: (dirPath, tagName, remoteName) => { telemetryTrack(getPreference, 'git.push_tag', {}); return getGitApi().pushTag(dirPath, tagName, remoteName); },
    stageFile: (dirPath, filePath) => { telemetryTrack(getPreference, 'git.stage_file', {}); return getGitApi().stageFile(dirPath, filePath); },
    unstageFile: (dirPath, filePath) => { telemetryTrack(getPreference, 'git.unstage_file', {}); return getGitApi().unstageFile(dirPath, filePath); },
    discardFile: (dirPath, filePath) => { telemetryTrack(getPreference, 'git.discard_file', {}); return getGitApi().discardFile(dirPath, filePath); },
    gitFetchRemote: (dirPath, remoteName, ref) => { telemetryTrack(getPreference, 'git.fetch_remote', {}); return getGitApi().gitFetchRemote(dirPath, remoteName, ref); },
    gitPullRebase: (dirPath) => { telemetryTrack(getPreference, 'git.pull_rebase', {}); return getGitApi().gitPullRebase(dirPath); },
    gitPullFFOnly: (dirPath) => { telemetryTrack(getPreference, 'git.pull_ff_only', {}); return getGitApi().gitPullFFOnly(dirPath); },
    getGitignore: (dirPath) => getGitApi().getGitignore(dirPath),
    scanProjectForGitignore: (dirPath) => getGitApi().scanProjectForGitignore(dirPath),
    getFileAtRef: (dirPath, filePath, ref) => getGitApi().getFileAtRef(dirPath, filePath, ref),
    getGitattributes: (dirPath) => getGitApi().getGitattributes(dirPath),
    getSubmodules: (dirPath) => getGitApi().getSubmodules(dirPath),
    submoduleUpdate: (dirPath, init) => { telemetryTrack(getPreference, 'git.submodule_update', { init: !!init }); return getGitApi().submoduleUpdate(dirPath, init); },
    getGitState: (dirPath) => getGitApi().getGitState(dirPath),
    getGitUser: (dirPath) => getGitApi().getGitUser(dirPath),
    getWorktrees: (dirPath) => getGitApi().getWorktrees(dirPath),
    worktreeAdd: (dirPath, worktreePath, branch) => { telemetryTrack(getPreference, 'git.worktree_add', {}); return getGitApi().worktreeAdd(dirPath, worktreePath, branch); },
    worktreeRemove: (dirPath, worktreePath) => { telemetryTrack(getPreference, 'git.worktree_remove', {}); return getGitApi().worktreeRemove(dirPath, worktreePath); },
    getBisectStatus: (dirPath) => getGitApi().getBisectStatus(dirPath),
    bisectStart: (dirPath, badRef, goodRef) => { telemetryTrack(getPreference, 'git.bisect_start', {}); return getGitApi().bisectStart(dirPath, badRef, goodRef); },
    bisectGood: (dirPath) => { telemetryTrack(getPreference, 'git.bisect_good', {}); return getGitApi().bisectGood(dirPath); },
    bisectBad: (dirPath) => { telemetryTrack(getPreference, 'git.bisect_bad', {}); return getGitApi().bisectBad(dirPath); },
    bisectSkip: (dirPath) => { telemetryTrack(getPreference, 'git.bisect_skip', {}); return getGitApi().bisectSkip(dirPath); },
    bisectReset: (dirPath) => { telemetryTrack(getPreference, 'git.bisect_reset', {}); return getGitApi().bisectReset(dirPath); },
    bisectRun: (dirPath, commandArgs) => { telemetryTrack(getPreference, 'git.bisect_run', {}); return getGitApi().bisectRun(dirPath, commandArgs); },
    copyToClipboard: (text) => {
      if (text != null && typeof text === 'string') clipboard.writeText(text);
      telemetryTrack(getPreference, 'feature.copy_to_clipboard', {});
      return null;
    },
    openPathInFinder: (dirPath) => {
      telemetryTrack(getPreference, 'feature.open_in_finder', {});
      if (dirPath != null && typeof dirPath === 'string') return shell.openPath(dirPath);
      return Promise.resolve('');
    },
    openInTerminal: (dirPath) => { telemetryTrack(getPreference, 'feature.open_in_terminal', {}); return openInTerminalImpl(dirPath); },
    runShellCommand: (dirPath, command) => runShellCommand(dirPath, command),
    openInEditor: (dirPath) => { telemetryTrack(getPreference, 'feature.open_in_editor', {}); return openInEditorImpl(dirPath); },
    openFileInEditor: (dirPath, relativePath) => { telemetryTrack(getPreference, 'feature.open_file_in_editor', {}); return openFileInEditorImpl(dirPath, relativePath); },
    getFileDiff: async (dirPath, filePath, isUntracked) => getFileDiffImpl(dirPath, filePath, isUntracked),
    readProjectFile: (dirPath, relativePath) => readProjectFileImpl(dirPath, relativePath),
    writeProjectFile: (dirPath, relativePath, content) => writeProjectFileImpl(dirPath, relativePath, content),
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
    getIssuesUrl: (gitRemote) => getIssuesUrl(gitRemote),
    getGitHubIssues: async (gitRemote, token = null, options = {}) => {
      const slug = getRepoSlug(gitRemote);
      if (!slug) return { ok: false, error: 'Not a GitHub repo', issues: [] };
      const authToken = token || getStore().get('githubToken') || null;
      if (!authToken) return { ok: false, error: 'GitHub token required. Set it in Settings.', issues: [] };
      const state = options.state || 'open';
      const labels = options.labels ?? null;
      try {
        const issues = await fetchGitHubIssues(slug.owner, slug.repo, authToken, state, labels);
        return { ok: true, issues };
      } catch (e) {
        return { ok: false, error: formatGitHubError(e.message || 'Failed to fetch issues'), issues: [] };
      }
    },
    getGitHubLabels: async (gitRemote, token = null) => {
      const slug = getRepoSlug(gitRemote);
      if (!slug) return { ok: false, error: 'Not a GitHub repo', labels: [] };
      const authToken = token || getStore().get('githubToken') || null;
      if (!authToken) return { ok: false, error: 'GitHub token required.', labels: [] };
      try {
        const labels = await fetchGitHubLabels(slug.owner, slug.repo, authToken);
        return { ok: true, labels };
      } catch (e) {
        return { ok: false, error: formatGitHubError(e.message || 'Failed to fetch labels'), labels: [] };
      }
    },
    createPullRequest: async (dirPath, baseBranch, title, body, token = null) => {
      telemetryTrack(getPreference, 'github.create_pull_request', {});
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
      telemetryTrack(getPreference, 'github.merge_pull_request', { merge_method: mergeMethod });
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
      telemetryTrack(getPreference, 'release.download_latest', {});
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
    writeEmlDraftAndOpen: (emlContent) => {
      if (!emlContent || typeof emlContent !== 'string') return Promise.resolve({ ok: false, error: 'No content' });
      const tempDir = app.getPath('temp');
      const filename = `release-manager-draft-${Date.now()}.eml`;
      const filePath = path.join(tempDir, filename);
      try {
        fs.writeFileSync(filePath, emlContent, 'utf8');
        shell.openPath(filePath);
        return Promise.resolve({ ok: true, path: filePath });
      } catch (e) {
        return Promise.resolve({ ok: false, error: e?.message || 'Write failed' });
      }
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
    expandPath: (p) => {
      if (!p || typeof p !== 'string') return p;
      const home = os.homedir();
      if (p === '~') return home;
      if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(home, p.slice(2));
      return p;
    },
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
    getEmailSmtpStatus: (projectPath) => emailService.getEmailSmtpStatus(projectPath),
    startEmailSmtpServer: (port, projectPath) => emailService.startEmailSmtpServer(port, projectPath),
    stopEmailSmtpServer: (projectPath) => emailService.stopEmailSmtpServer(projectPath),
    getEmails: (projectPath) => emailService.getEmails(projectPath),
    clearEmails: (projectPath) => emailService.clearEmails(projectPath),
    deleteEmails: (ids) => emailService.deleteEmails(ids),
    sendTestEmail: (port, projectPath) => emailService.sendTestEmail(port, projectPath),
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
    getAppReleases: async () => {
      const repoEnv = (process.env.GITHUB_REPO || '').trim();
      if (!repoEnv) {
        return {
          ok: false,
          error: 'GITHUB_REPO is not set in .env',
          hint: 'Set GITHUB_REPO=owner/repo in .env',
          releases: [],
        };
      }
      const parts = repoEnv.split('/').map((p) => p.trim()).filter(Boolean);
      if (parts.length < 2) {
        return { ok: false, error: 'GITHUB_REPO must be owner/repo (e.g. shaferllc/shipwell)', releases: [] };
      }
      const owner = parts[0];
      const repo = parts[1].replace(/\.git$/, '');
      const token = getStore().get('githubToken') || null;
      try {
        const releases = await fetchGitHubReleases(owner, repo, token);
        return { ok: true, releases };
      } catch (e) {
        return {
          ok: false,
          error: e.message || 'Could not load releases',
          releases: [],
        };
      }
    },
    getExtensionsDir: () => path.join(app.getPath('userData'), 'extensions'),
    getGitHubExtensionRegistry: () => fetchGitHubExtensionRegistry(),
    installExtensionFromGitHub: (extensionIdOrInfo) => installExtensionFromGitHub(extensionIdOrInfo),
    syncPlanExtensions: () => syncPlanExtensions(),
    switchPlan: (plan) => switchPlan(plan),
    registerGitHubExtension: (repo) => registerGitHubExtension(repo),
    getMarketplaceExtensions: async (baseUrl) => {
      const url = (baseUrl || '').replace(/\/$/, '') + '/api/extensions';
      const headers = { Accept: 'application/json' };
      const stored = appAuthServer.getStoredToken();
      if (stored?.accessToken) headers.Authorization = `Bearer ${stored.accessToken}`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, data: [] };
        const json = await res.json();
        const data = json.data ?? json ?? [];
        return { ok: true, data: Array.isArray(data) ? data : [] };
      } catch (e) {
        return { ok: false, error: e.message || 'Failed to fetch marketplace', data: [] };
      }
    },
    getAutoInstallExtensions: async () => {
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured', data: [] };
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in', data: [] };
      const url = base.replace(/\/+$/, '') + '/api/extensions-auto-install';
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(15000),
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, data: [] };
        const json = await res.json();
        return { ok: true, data: json.data ?? [] };
      } catch (e) {
        return { ok: false, error: e.message || 'Failed', data: [] };
      }
    },
    installExtension: async (extensionId, extensionInfo, downloadUrlOrBaseUrl) => {
      telemetryTrack(getPreference, 'extension.installed', { extension_id: extensionId });
      const extensionsDir = path.join(app.getPath('userData'), 'extensions');
      const targetDir = path.join(extensionsDir, extensionId);
      const tempDir = app.getPath('temp');
      let downloadUrl = typeof downloadUrlOrBaseUrl === 'string' ? downloadUrlOrBaseUrl : null;
      if (!downloadUrl && extensionInfo?.download_url) downloadUrl = extensionInfo.download_url;
      if (!downloadUrl) {
        const base = (extensionInfo?.baseUrl || downloadUrlOrBaseUrl || '').replace(/\/$/, '');
        if (base) downloadUrl = base + '/api/extensions/' + encodeURIComponent(extensionId) + '/download';
      }
      if (!downloadUrl) return { ok: false, error: 'No download URL' };
      const fetchHeaders = { Accept: 'application/json' };
      const stored = appAuthServer.getStoredToken();
      if (stored?.accessToken) fetchHeaders.Authorization = `Bearer ${stored.accessToken}`;
      try {
        const res = await fetch(downloadUrl, { signal: AbortSignal.timeout(60000), redirect: 'follow', headers: fetchHeaders });
        if (!res.ok) {
          const text = await res.text();
          try {
            const j = JSON.parse(text);
            if (j.required_plan) return { ok: false, error: j.error || `Requires ${j.required_plan} plan`, required_plan: j.required_plan };
            if (j.download_url) return installExtensionFromUrl(extensionId, extensionInfo, j.download_url, extensionsDir, targetDir, tempDir);
          } catch (_) {}
          return { ok: false, error: `Download failed: HTTP ${res.status}` };
        }
        const contentType = res.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        if (isJson) {
          const j = await res.json();
          if (j.download_url) return installExtensionFromUrl(extensionId, extensionInfo, j.download_url, extensionsDir, targetDir, tempDir);
          return { ok: false, error: 'No download_url in response' };
        }
        const buf = Buffer.from(await res.arrayBuffer());
        const ext = path.extname(new URL(res.url).pathname).toLowerCase() || (buf[0] === 0x50 && buf[1] === 0x4b ? '.zip' : '.js');
        const tempFile = path.join(tempDir, `rm-ext-${extensionId}-${Date.now()}${ext}`);
        fs.mkdirSync(extensionsDir, { recursive: true });
        fs.writeFileSync(tempFile, buf);
        try {
          if (ext === '.zip') {
            if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true });
            fs.mkdirSync(targetDir, { recursive: true });
            await extractZip(tempFile, { dir: targetDir });
          } else {
            fs.mkdirSync(targetDir, { recursive: true });
            fs.writeFileSync(path.join(targetDir, 'index.js'), buf);
          }
          const manifest = {
            id: extensionId,
            name: extensionInfo?.name ?? extensionId,
            version: extensionInfo?.version ?? '1.0.0',
            description: extensionInfo?.description ?? '',
          };
          fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
          return { ok: true, path: targetDir };
        } finally {
          try { fs.unlinkSync(tempFile); } catch (_) {}
        }
      } catch (e) {
        return { ok: false, error: e.message || 'Install failed' };
      }
    },
    getInstalledUserExtensions: () => {
      const extensionsDir = path.join(app.getPath('userData'), 'extensions');
      if (!fs.existsSync(extensionsDir)) return [];
      const list = [];
      const dirs = fs.readdirSync(extensionsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
      for (const d of dirs) {
        const manifestPath = path.join(extensionsDir, d.name, 'manifest.json');
        if (!fs.existsSync(manifestPath)) continue;
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          list.push({ id: manifest.id ?? d.name, name: manifest.name ?? d.name, version: manifest.version ?? '', description: manifest.description ?? '' });
        } catch (_) {}
      }
      return list;
    },
    getExtensionScriptContent: (extensionId) => {
      const extensionsDir = path.join(app.getPath('userData'), 'extensions');
      const entryPath = path.join(extensionsDir, extensionId, 'index.js');
      if (!fs.existsSync(entryPath)) return null;
      try {
        return fs.readFileSync(entryPath, 'utf8');
      } catch (_) {
        return null;
      }
    },
    uninstallExtension: (extensionId) => {
      telemetryTrack(getPreference, 'extension.uninstalled', { extension_id: extensionId });
      if (!extensionId || typeof extensionId !== 'string') return { ok: false, error: 'Invalid extension id' };
      const extensionsDir = path.join(app.getPath('userData'), 'extensions');
      const targetDir = path.join(extensionsDir, extensionId);
      if (!targetDir.startsWith(extensionsDir)) return { ok: false, error: 'Invalid path' };
      if (!fs.existsSync(targetDir)) return { ok: false, error: 'Extension not found' };
      try {
        fs.rmSync(targetDir, { recursive: true });
        const { url: srvUrl } = appAuthServer.getConfig();
        if (srvUrl) {
          const headers = getShipwellApiHeaders();
          const base = srvUrl.replace(/\/+$/, '');
          // Toggle off on web so it doesn't get re-installed on next sync
          fetch(`${base}/api/extensions/${extensionId}/toggle-user`, {
            method: 'POST',
            headers,
            signal: AbortSignal.timeout(10000),
          }).catch(() => {});
          // Also report the updated installed list
          const updatedSlugs = getInstalledUserExtensionsSync().map((e) => e.id);
          fetch(`${base}/api/extensions/sync-installed`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ installed_slugs: updatedSlugs }),
            signal: AbortSignal.timeout(10000),
          }).catch(() => {});
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message || 'Uninstall failed' };
      }
    },
    getExtensionEnabledState: async () => {
      if (getPreference('offlineMode')) return { ok: true, data: [] };
      const { url } = appAuthServer.getConfig();
      if (!url) return { ok: false, error: 'Not configured' };
      try {
        const res = await fetch(`${url.replace(/\/+$/, '')}/api/user/extensions`, {
          headers: getShipwellApiHeaders(),
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : [];
        return { ok: true, data: data.map((e) => ({ slug: e.slug, enabled: e.enabled ?? true })) };
      } catch (e) {
        return { ok: false, error: e.message || 'Failed to fetch' };
      }
    },
    syncExtensionEnabled: async (extensionId, enabled) => {
      if (getPreference('offlineMode')) return { ok: true };
      const { url } = appAuthServer.getConfig();
      if (!url) return { ok: false, error: 'Not configured' };
      try {
        const base = url.replace(/\/+$/, '');
        const headers = getShipwellApiHeaders();
        const res = await fetch(`${base}/api/extensions/${extensionId}/toggle-enabled`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ enabled: !!enabled }),
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        const json = await res.json();
        return { ok: true, enabled: json.enabled };
      } catch (e) {
        return { ok: false, error: e.message || 'Failed to sync' };
      }
    },
    uploadExtensionToMarketplace: async (baseUrl, filePath) => {
      telemetryTrack(getPreference, 'extension.uploaded', {});
      if (!baseUrl || !filePath) return { ok: false, error: 'Base URL and file path are required' };
      const url = baseUrl.replace(/\/$/, '') + '/api/extensions/upload';
      if (!fs.existsSync(filePath)) return { ok: false, error: 'File not found: ' + filePath };
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        const boundary = '----RMExtUpload' + Date.now();
        const CRLF = '\r\n';
        const parts = [];
        parts.push(`--${boundary}${CRLF}`);
        parts.push(`Content-Disposition: form-data; name="extension"; filename="${fileName}"${CRLF}`);
        parts.push(`Content-Type: application/zip${CRLF}${CRLF}`);
        const header = Buffer.from(parts.join(''));
        const footer = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
        const body = Buffer.concat([header, fileBuffer, footer]);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
          body,
          signal: AbortSignal.timeout(120000),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          return { ok: false, error: `Upload failed: HTTP ${res.status}${text ? ' - ' + text : ''}` };
        }
        const json = await res.json().catch(() => ({}));
        return { ok: true, ...json };
      } catch (e) {
        return { ok: false, error: e.message || 'Upload failed' };
      }
    },
    getPreference: (key) => getPreference(key),
    getLicenseStatus: () => getLicenseStatus(),
    getOfflineGraceConfig: () => ({
      graceDays: appAuthServer.getOfflineGraceDays(),
      lastVerifiedAt: appAuthServer.getLastVerifiedAt(),
      grace: appAuthServer.checkOfflineGrace(),
    }),
    setOfflineGraceDays: (days) => { appAuthServer.setOfflineGraceDays(days); return null; },
    checkConnectivity: async () => {
      if (getPreference('offlineMode')) return { online: false, error: 'Offline mode enabled' };
      const { url } = appAuthServer.getConfig();
      if (!url) return { online: false, error: 'No server URL configured' };
      try {
        const res = await fetch(`${url}/api/ping`, { method: 'HEAD', signal: AbortSignal.timeout(5000) }).catch(() => null);
        if (res && res.ok) return { online: true };
        const fallback = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) }).catch(() => null);
        return { online: !!(fallback && fallback.ok) };
      } catch { return { online: false }; }
    },
    getLicenseServerConfig: () => appAuthServer.getConfig(),
    getLicenseServerEnvironments: () => appAuthServer.getEnvironments(),
    setLicenseServerConfig: (config) => { appAuthServer.setConfig(config); return null; },
    loginToLicenseServer: async (email, password) => {
      const result = await appAuthServer.login(email, password);
      if (result.ok) logLoginEvent(email, 'password');
      return result;
    },
    loginWithGitHub: async () => {
      const baseOAuthUrl = appAuthServer.getGitHubOAuthUrl();
      if (!baseOAuthUrl) return { ok: false, error: 'Sign-in server URL not configured.' };
      const port = await startOAuthCallbackServer();
      if (!port) return { ok: false, error: 'Could not start local OAuth listener.' };
      const url = `${baseOAuthUrl}?callback_port=${port}`;

      const win = BrowserWindow.getAllWindows()[0];
      const wasOnTop = win && !win.isDestroyed() && win.isAlwaysOnTop();
      if (wasOnTop) win.setAlwaysOnTop(false);

      shell.openExternal(url);

      if (wasOnTop && win && !win.isDestroyed()) {
        const restore = () => {
          if (win && !win.isDestroyed()) win.setAlwaysOnTop(true);
          win?.removeListener('focus', restore);
        };
        win.once('focus', restore);
      }

      return { ok: true };
    },
    registerToLicenseServer: (name, email, password, passwordConfirmation) => {
      telemetryTrack(getPreference, 'user.register', {});
      return appAuthServer.register(name, email, password, passwordConfirmation);
    },
    requestPasswordReset: (email) => { telemetryTrack(getPreference, 'user.password_reset_requested', {}); return appAuthServer.requestPasswordReset(email); },
    logoutFromLicenseServer: () => { telemetryTrack(getPreference, 'user.logout', {}); return appAuthServer.logout(); },
    getLicenseRemoteSession: () => appAuthServer.getRemoteSession(),
    getAvailablePhpVersions: () => getAvailablePhpVersions(),
    getPhpVersionFromRequire: (phpRequire) => parsePhpRequireToVersion(phpRequire),
    setPreference: (key, value) => {
      setPreference(key, value);
      return null;
    },
    getTheme: () => ({ theme: getThemeSetting(), effective: getEffectiveTheme() }),
    setTheme: (theme) => {
      telemetryTrack(getPreference, 'settings.theme_changed', { theme });
      setThemeSetting(theme);
      return null;
    },
    getAppZoomFactor: () => getAppZoomFactor(),
    setAppZoomFactor: (factor) => { telemetryTrack(getPreference, 'settings.zoom_changed', { factor }); return setAppZoomFactor(factor); },
    getLaunchAtLogin: () => appSettings.getLaunchAtLogin(),
    setLaunchAtLogin: (open) => { telemetryTrack(getPreference, 'settings.launch_at_login', { enabled: !!open }); return appSettings.setLaunchAtLogin(open); },
    checkForUpdatesNow: async () => updater.checkForUpdatesNow({ getPreference }),
    downloadUpdate: () => { updater.downloadUpdate(); return null; },
    quitAndInstall: () => { updater.quitAndInstall(); return null; },
    stopAutoUpdateCheck: () => { updater.stopAutoCheck(); return null; },
    startAutoUpdateCheck: () => {
      updater.runAutoCheckIfEnabled({
        getPreference,
        checkForUpdatesNow: () => updater.checkForUpdatesNow({ getPreference }),
      });
      return null;
    },
    getConfirmBeforeQuit: () => appSettings.getConfirmBeforeQuit(),
    setConfirmBeforeQuit: (value) => appSettings.setConfirmBeforeQuit(value),
    getProxy: () => appSettings.getProxy(),
    setProxy: (rules) => appSettings.setProxy(rules),
    exportSettings: () => appSettings.exportSettings(),
    importSettings: (json, replace) => appSettings.importSettings(json, replace),
    resetSettings: () => { telemetryTrack(getPreference, 'settings.reset', {}); return appSettings.resetSettings(); },
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
    getCustomTelemetryEvents: () => {
      const stored = getPreference('customTelemetryEvents');
      return Array.isArray(stored) ? stored : [];
    },
    setCustomTelemetryEvents: (events) => {
      const safe = Array.isArray(events) ? events.filter((e) => e && typeof e.event === 'string').slice(0, 50) : [];
      setPreference('customTelemetryEvents', safe);
      return { ok: true };
    },
    downloadExtensionTemplate: async () => {
      const templateDir = path.join(__dirname, '..', 'scripts', 'extension-template');
      if (!fs.existsSync(templateDir)) return { ok: false, error: 'Template not found' };
      const { canceled, filePath: destDir } = await dialogsService.showSaveDialog({
        title: 'Save extension template',
        defaultPath: path.join(app.getPath('downloads'), 'my-shipwell-extension'),
        buttonLabel: 'Save',
      });
      if (canceled || !destDir) return { ok: false, canceled: true };
      try {
        const copyDir = (src, dest) => {
          fs.mkdirSync(dest, { recursive: true });
          for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) copyDir(srcPath, destPath);
            else fs.copyFileSync(srcPath, destPath);
          }
        };
        copyDir(templateDir, destDir);
        return { ok: true, filePath: destDir };
      } catch (e) {
        return { ok: false, error: e?.message || 'Failed to copy template' };
      }
    },
    getWebhooks: async () => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/webhooks`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        return { ok: true, ...(await res.json()) };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    createWebhook: async (data) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/webhooks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) return { ok: false, error: json.error || json.message || `HTTP ${res.status}` };
        return { ok: true, ...json };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    updateWebhook: async (id, data) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/webhooks/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) return { ok: false, error: json.error || json.message || `HTTP ${res.status}` };
        return { ok: true, ...json };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    deleteWebhook: async (id) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/webhooks/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          return { ok: false, error: json.error || json.message || `HTTP ${res.status}` };
        }
        return { ok: true };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    testWebhook: async (id) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/webhooks/${encodeURIComponent(id)}/test`, {
          method: 'POST',
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, error: json.error || json.message || `HTTP ${res.status}` };
        return { ok: true, ...json };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    getTeamInfo: async () => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { team: null };
      const base = appAuthServer.getConfig().url;
      if (!base) return { team: null };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/team`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (!res.ok) return { team: null };
        return await res.json();
      } catch { return { team: null }; }
    },
    getSharedNotes: async (projectPath) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { notes: [] };
      const base = appAuthServer.getConfig().url;
      if (!base) return { notes: [] };
      const qs = projectPath ? `?project_path=${encodeURIComponent(projectPath)}` : '';
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/shared-notes${qs}`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (!res.ok) return { notes: [] };
        return await res.json();
      } catch { return { notes: [] }; }
    },
    createSharedNote: async (title, content, projectPath) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/shared-notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
          body: JSON.stringify({ title, content, project_path: projectPath || null }),
        });
        if (!res.ok) { const t = await res.text().catch(() => ''); return { ok: false, error: t || `HTTP ${res.status}` }; }
        const data = await res.json();
        telemetryTrack(getPreference, 'team.note_shared', {});
        return { ok: true, ...data };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    deleteSharedNote: async (noteId) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/shared-notes/${noteId}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        return { ok: true };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    updateSharedNote: async (noteId, title, content) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/shared-notes/${noteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
          body: JSON.stringify({ title: title ?? undefined, content: content ?? undefined }),
        });
        if (!res.ok) { const t = await res.text().catch(() => ''); return { ok: false, error: t || `HTTP ${res.status}` }; }
        return { ok: true, ...(await res.json().catch(() => ({}))) };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    getTeams: async () => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { teams: [] };
      const base = appAuthServer.getConfig().url;
      if (!base) return { teams: [] };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/teams`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (res.ok) return await res.json();
        const teamRes = await fetch(`${base.replace(/\/+$/, '')}/api/team`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (!teamRes.ok) return { teams: [] };
        const data = await teamRes.json();
        const team = data?.team;
        return { teams: team ? [team] : [] };
      } catch { return { teams: [] }; }
    },
    getActiveTeamId: () => Promise.resolve(getPreference('activeTeamId') || null),
    setActiveTeamId: async (teamId) => {
      setPreference('activeTeamId', teamId || null);
      sendToAllWindows('rm-active-team-changed');
      return { ok: true };
    },
    getSharedWikiPages: async (projectPath) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { pages: [] };
      const base = appAuthServer.getConfig().url;
      if (!base) return { pages: [] };
      const qs = projectPath ? `?project_path=${encodeURIComponent(projectPath)}` : '';
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/shared-wiki${qs}`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (!res.ok) return { pages: [] };
        return await res.json();
      } catch { return { pages: [] }; }
    },
    createSharedWikiPage: async (page, projectPath) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/shared-wiki`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
          body: JSON.stringify({ ...page, project_path: projectPath || null }),
        });
        if (!res.ok) { const t = await res.text().catch(() => ''); return { ok: false, error: t || `HTTP ${res.status}` }; }
        return { ok: true, ...(await res.json()) };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    updateSharedWikiPage: async (pageId, page, projectPath) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/shared-wiki/${pageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
          body: JSON.stringify({ ...page, project_path: projectPath || null }),
        });
        if (!res.ok) { const t = await res.text().catch(() => ''); return { ok: false, error: t || `HTTP ${res.status}` }; }
        return { ok: true, ...(await res.json().catch(() => ({}))) };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    deleteSharedWikiPage: async (pageId) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/shared-wiki/${pageId}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        return { ok: true };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    fetchRemoteSettings: async () => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/settings`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        return { ok: true, ...(await res.json()) };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    pushRemoteSettings: async (settings) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
          body: JSON.stringify({ settings }),
        });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        return { ok: true, ...(await res.json()) };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    fetchGitHubHealth: async () => {
      if (getPreference('offlineMode')) return { ok: false, error: 'Offline mode enabled' };
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/github/health`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        return { ok: true, ...(await res.json()) };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    fetchNotificationPreferences: async () => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/notification-preferences`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        return { ok: true, ...(await res.json()) };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    updateNotificationPreferences: async (preferences) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/notification-preferences`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
          body: JSON.stringify({ preferences }),
        });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        return { ok: true, ...(await res.json()) };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    getExtensionAnalyticsOverview: async () => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/extension-analytics/overview`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        return { ok: true, ...(await res.json()) };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    getExtensionAnalyticsChartData: async (extensionId, range) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      const qs = new URLSearchParams();
      if (extensionId) qs.set('extension_id', extensionId);
      if (range) qs.set('range', range);
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/extension-analytics/chart-data?${qs}`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        return { ok: true, ...(await res.json()) };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    createTeam: async (name) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/team`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` };
        telemetryTrack(getPreference, 'team.created', {});
        return { ok: true, ...data };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    updateTeam: async (name) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/team`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` };
        return { ok: true, ...data };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    inviteTeamMember: async (email, role) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/team/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
          body: JSON.stringify({ email, role: role || 'member' }),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` };
        telemetryTrack(getPreference, 'team.member_invited', {});
        return { ok: true, ...data };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    cancelTeamInvite: async (inviteId) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/team/invites/${inviteId}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` };
        return { ok: true, ...data };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    removeTeamMember: async (userId) => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/team/members/${userId}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` };
        telemetryTrack(getPreference, 'team.member_removed', {});
        return { ok: true, ...data };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    leaveTeam: async () => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { ok: false, error: 'Not signed in' };
      const base = appAuthServer.getConfig().url;
      if (!base) return { ok: false, error: 'No backend configured' };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/team/leave`, {
          method: 'POST',
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` };
        return { ok: true, ...data };
      } catch (e) { return { ok: false, error: e.message || 'Failed' }; }
    },
    getTeamInvites: async () => {
      const stored = appAuthServer.getStoredToken();
      if (!stored?.accessToken) return { invites: [] };
      const base = appAuthServer.getConfig().url;
      if (!base) return { invites: [] };
      try {
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/team/invites`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${stored.accessToken}` },
        });
        if (!res.ok) return { invites: [] };
        return await res.json();
      } catch { return { invites: [] }; }
    },
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
    listGpgKeys: async () => {
      try {
        const { execFile } = require('child_process');
        const { promisify } = require('util');
        const execFileP = promisify(execFile);
        const { stdout } = await execFileP('gpg', ['--list-secret-keys', '--keyid-format', 'long', '--with-colons'], { timeout: 10000 });
        const keys = [];
        let current = null;
        for (const line of stdout.split('\n')) {
          const parts = line.split(':');
          if (parts[0] === 'sec') {
            current = { id: parts[4], algo: parts[3], created: parts[5], expires: parts[6] || null, uids: [] };
            keys.push(current);
          } else if (parts[0] === 'uid' && current) {
            current.uids.push(parts[9] || '');
          }
        }
        return { ok: true, keys };
      } catch (e) {
        if (e?.code === 'ENOENT') return { ok: false, error: 'GPG is not installed. Install it with: brew install gnupg' };
        return { ok: false, error: e?.message || 'Failed to list GPG keys' };
      }
    },
    generateGpgKey: async (name, email) => {
      if (!name || !email) return { ok: false, error: 'Name and email are required' };
      try {
        const { execFile } = require('child_process');
        const { promisify } = require('util');
        const execFileP = promisify(execFile);
        const batch = `%no-protection\nKey-Type: eddsa\nKey-Curve: Ed25519\nSubkey-Type: ecdh\nSubkey-Curve: Curve25519\nName-Real: ${name}\nName-Email: ${email}\nExpire-Date: 2y\n%commit\n`;
        await execFileP('gpg', ['--batch', '--gen-key'], { input: batch, timeout: 30000 });
        const { stdout } = await execFileP('gpg', ['--list-secret-keys', '--keyid-format', 'long', '--with-colons', email], { timeout: 10000 });
        let keyId = null;
        for (const line of stdout.split('\n')) {
          const parts = line.split(':');
          if (parts[0] === 'sec') { keyId = parts[4]; break; }
        }
        return { ok: true, keyId };
      } catch (e) {
        if (e?.code === 'ENOENT') return { ok: false, error: 'GPG is not installed. Install it with: brew install gnupg' };
        return { ok: false, error: e?.message || 'Failed to generate GPG key' };
      }
    },
    getGitGlobalConfig: async () => {
      try {
        const { execFile } = require('child_process');
        const { promisify } = require('util');
        const execFileP = promisify(execFile);
        const get = async (key) => {
          try { const { stdout } = await execFileP('git', ['config', '--global', key], { timeout: 5000 }); return stdout.trim(); } catch { return ''; }
        };
        return {
          ok: true,
          userName: await get('user.name'),
          userEmail: await get('user.email'),
          gpgSign: (await get('commit.gpgsign')) === 'true',
          gpgKeyId: await get('user.signingkey'),
          gpgFormat: await get('gpg.format') || 'openpgp',
          pullRebase: await get('pull.rebase'),
          autoStash: (await get('rebase.autostash')) === 'true',
          commitTemplate: await get('commit.template'),
          defaultBranch: await get('init.defaultBranch') || 'main',
        };
      } catch (e) { return { ok: false, error: e?.message || 'Failed to read git config' }; }
    },
    setGitGlobalConfig: async (key, value) => {
      if (!key || typeof key !== 'string') return { ok: false, error: 'Invalid key' };
      try {
        const { execFile } = require('child_process');
        const { promisify } = require('util');
        const execFileP = promisify(execFile);
        if (value === '' || value == null) {
          await execFileP('git', ['config', '--global', '--unset', key], { timeout: 5000 }).catch(() => {});
        } else {
          await execFileP('git', ['config', '--global', key, String(value)], { timeout: 5000 });
        }
        return { ok: true };
      } catch (e) { return { ok: false, error: e?.message || 'Failed to set git config' }; }
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
      const res = await getGitApi().getCommitsSinceTag(dirPath, null);
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
    const preferred = getPreference('preferredTerminal') || 'default';
    return terminalService.openInSystemTerminal(dirPath, spawn, preferred);
  }

  function openInEditorImpl(targetPath, line) {
    const { spawn: spawnProc } = require('child_process');
    const preferred = getPreference('preferredEditor') || '';
    const lineNum = line != null && line !== '' ? parseInt(String(line), 10) || 1 : null;
    const gotoArg = lineNum != null ? `${targetPath}:${lineNum}` : targetPath;
    const tryEditor = (cmd, args) =>
      new Promise((resolve) => {
        const child = spawnProc(cmd, args || [targetPath], { detached: true, stdio: 'ignore', shell: true });
        child.on('error', () => resolve(false));
        child.unref();
        setTimeout(() => resolve(true), 500);
      });
    const tryEditorGoto = (cmd) =>
      new Promise((resolve) => {
        const child = spawnProc(cmd, ['--goto', gotoArg], { detached: true, stdio: 'ignore', shell: true });
        child.on('error', () => resolve(false));
        child.unref();
        setTimeout(() => resolve(true), 500);
      });
    return (async () => {
      const tryOrder = preferred === 'code' ? ['code', 'cursor'] : ['cursor', 'code'];
      for (const editor of tryOrder) {
        const cmd = editor === 'cursor' ? 'cursor' : 'code';
        const ok = lineNum != null ? await tryEditorGoto(cmd) : await tryEditor(cmd, [targetPath]);
        if (ok) return { ok: true, editor };
      }
      return { ok: false, error: 'No editor found. Add Cursor or VS Code to PATH.' };
    })();
  }
  function openFileInEditorImpl(dirPath, relativePath, line) {
    const fullPath = path.isAbsolute(relativePath) ? relativePath : path.join(dirPath, relativePath);
    return openInEditorImpl(fullPath, line);
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

  const MAX_PROJECT_FILE_SIZE = 1024 * 1024; // 1MB for read/write
  function readProjectFileImpl(dirPath, relativePath) {
    try {
      const fullPath = path.join(dirPath, relativePath);
      const norm = path.normalize(fullPath);
      const dirNorm = path.normalize(path.resolve(dirPath));
      if (!norm.startsWith(dirNorm + path.sep) && norm !== dirNorm) return { ok: false, error: 'Path outside project' };
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) return { ok: false, error: 'Not a file' };
      if (stat.size > MAX_PROJECT_FILE_SIZE) return { ok: false, error: `File too large (max ${MAX_PROJECT_FILE_SIZE / 1024} KB)` };
      const content = fs.readFileSync(fullPath, 'utf8');
      return { ok: true, content };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to read file' };
    }
  }
  function writeProjectFileImpl(dirPath, relativePath, content) {
    try {
      if (typeof content !== 'string') return { ok: false, error: 'Content must be a string' };
      if (Buffer.byteLength(content, 'utf8') > MAX_PROJECT_FILE_SIZE) return { ok: false, error: `Content too large (max ${MAX_PROJECT_FILE_SIZE / 1024} KB)` };
      const fullPath = path.join(dirPath, relativePath);
      const norm = path.normalize(fullPath);
      const dirNorm = path.normalize(path.resolve(dirPath));
      if (!norm.startsWith(dirNorm + path.sep) && norm !== dirNorm) return { ok: false, error: 'Path outside project' };
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf8');
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to write file' };
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

  // Bookmarks receiver (for browser extension: POST /bookmarks to add current page to selected project)
  const bookmarksReceiver = createBookmarksReceiver({ getPreference, setPreference });
  bookmarksReceiver.start();
  ipcMain.handle('rm-get-bookmarks-receiver-port', () => bookmarksReceiver.getPort());
  ipcMain.handle('rm-get-bookmarks-extension-path', () => path.join(app.getAppPath(), 'browser-extension'));
  ipcMain.handle('rm-open-bookmarks-extension-setup', async (_e, extensionPath) => {
    if (extensionPath && typeof extensionPath === 'string') shell.openPath(extensionPath);
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileP = promisify(execFile);
    if (process.platform === 'darwin') {
      try {
        await execFileP('open', ['-a', 'Google Chrome', 'chrome://extensions']);
      } catch {
        try {
          await execFileP('open', ['-a', 'Microsoft Edge', 'edge://extensions']);
        } catch {
          shell.openExternal('chrome://extensions');
        }
      }
    } else {
      shell.openExternal('chrome://extensions');
    }
    return null;
  });

  /** 1-click install: launch Chrome/Edge with a dedicated profile and --load-extension so the extension always loads (no need to quit the user's browser). */
  ipcMain.handle('rm-launch-browser-with-bookmarks-extension', async (_e, extensionPath) => {
    if (!extensionPath || typeof extensionPath !== 'string') return { ok: false, error: 'No extension path' };
    if (!fs.existsSync(extensionPath)) return { ok: false, error: 'Extension folder not found' };
    const normalizedPath = path.resolve(extensionPath);
    const userDataDir = path.join(app.getPath('userData'), 'rm-chrome-extension-profile');

    if (process.platform === 'darwin') {
      const chromeBinary = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      const edgeBinary = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
      if (fs.existsSync(chromeBinary)) {
        try {
          spawn(chromeBinary, ['--user-data-dir=' + userDataDir, '--load-extension=' + normalizedPath], { detached: true, stdio: 'ignore' });
          return { ok: true, browser: 'Chrome' };
        } catch (e) {
          return { ok: false, error: (e && e.message) || 'Failed to launch Chrome' };
        }
      }
      if (fs.existsSync(edgeBinary)) {
        try {
          spawn(edgeBinary, ['--user-data-dir=' + userDataDir, '--load-extension=' + normalizedPath], { detached: true, stdio: 'ignore' });
          return { ok: true, browser: 'Edge' };
        } catch (e) {
          return { ok: false, error: (e && e.message) || 'Failed to launch Edge' };
        }
      }
      return { ok: false, error: 'Chrome and Edge not found. Install Chrome or Edge.' };
    }
    if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || '';
      const programFiles = process.env['ProgramFiles(x86)'] || process.env.ProgramFiles || 'C:\\Program Files';
      const chromePaths = [
        path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      ];
      const edgePaths = [
        path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      ];
      const args = ['--user-data-dir=' + userDataDir, '--load-extension=' + normalizedPath];
      for (const chromePath of chromePaths) {
        if (fs.existsSync(chromePath)) {
          try {
            spawn(chromePath, args, { detached: true, stdio: 'ignore' });
            return { ok: true, browser: 'Chrome' };
          } catch (e) {
            return { ok: false, error: (e && e.message) || 'Failed to launch Chrome' };
          }
        }
      }
      for (const edgePath of edgePaths) {
        if (fs.existsSync(edgePath)) {
          try {
            spawn(edgePath, args, { detached: true, stdio: 'ignore' });
            return { ok: true, browser: 'Edge' };
          } catch (e) {
            return { ok: false, error: (e && e.message) || 'Failed to launch Edge' };
          }
        }
      }
      return { ok: false, error: 'Chrome or Edge not found' };
    }
    return { ok: false, error: 'Unsupported platform' };
  });

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
  ipcMain.handle('rm-read-project-file', (_e, dirPath, relativePath) => readProjectFileImpl(dirPath, relativePath));
  ipcMain.handle('rm-write-project-file', (_e, dirPath, relativePath, content) => writeProjectFileImpl(dirPath, relativePath, content));
  ipcMain.handle('rm-generate-tests-for-file', (_e, dirPath, relativePath) => apiRegistry.generateTestsForFile(dirPath, relativePath));

  ipcMain.handle('rm-send-test-email', (_e, port, projectPath) => emailService.sendTestEmail(port, projectPath));
  ipcMain.handle('rm-clear-emails', (_e, projectPath) => Promise.resolve(emailService.clearEmails(projectPath)));
  ipcMain.handle('rm-delete-emails', (_e, ids) => emailService.deleteEmails(ids));

  // Markdown extension: link preview (fetch og:meta) and export (HTML/PDF)
  ipcMain.handle('rm-fetch-link-preview', async (_e, url) => {
    try {
      const res = await fetch(String(url), {
        headers: { 'User-Agent': 'ReleaseManager/1.0 (Link Preview)' },
        signal: AbortSignal.timeout(5000),
      });
      const html = await res.text();
      const title = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]
        || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
      const description = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1];
      const image = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
      return { title: title || null, description: description || null, image: image || null };
    } catch (e) {
      return { error: e?.message || 'Failed to fetch' };
    }
  });
  // Minimal CSS for exported markdown HTML/PDF (no app CSS vars in standalone file)
  const MARKDOWN_EXPORT_CSS = `
body { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.5; color: #e2e8f0; background: #1e293b; margin: 0; padding: 1.5rem; max-width: 720px; margin-left: auto; margin-right: auto; }
h1 { font-size: 1.5rem; font-weight: 600; margin: 1rem 0 0.5rem; }
h2 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid #475569; }
h3, h4, h5, h6 { font-size: 1.1rem; font-weight: 600; margin: 0.75rem 0 0.4rem; }
h1:first-child { margin-top: 0; }
p { margin: 0.5rem 0; }
a { color: #7dd3fc; text-decoration: none; }
a:hover { text-decoration: underline; }
code { font-size: 0.9em; font-family: ui-monospace, monospace; background: rgba(51, 65, 85, 0.8); padding: 0.15em 0.35em; border-radius: 4px; }
pre { background: #334155; padding: 0.75rem 1rem; border-radius: 6px; overflow-x: auto; margin: 0.5rem 0; }
pre code { padding: 0; background: transparent; }
table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; }
th, td { border: 1px solid #475569; padding: 0.5rem 0.75rem; text-align: left; }
th { background: rgba(51, 65, 85, 0.5); font-weight: 600; }
ul, ol { margin: 0.5rem 0; padding-left: 1.5rem; }
img { max-width: 100%; height: auto; }
blockquote { border-left: 4px solid #475569; margin: 0.5rem 0; padding-left: 1rem; color: #94a3b8; }
`;

  function escapeHtmlForTitle(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  ipcMain.handle('rm-export-markdown', async (_e, options) => {
    const { format, html, defaultFileName } = options || {};
    if (!html || typeof html !== 'string' || !defaultFileName) return { error: 'Missing html or defaultFileName' };
    const safeTitle = escapeHtmlForTitle(defaultFileName.replace(/\.\w+$/, ''));
    const styleBlock = `<style>${MARKDOWN_EXPORT_CSS}</style>`;
    const filters = format === 'pdf'
      ? [{ name: 'PDF', extensions: ['pdf'] }]
      : [{ name: 'HTML', extensions: ['html', 'htm'] }];
    const { canceled, filePath } = await dialogsService.showSaveDialog({
      defaultPath: defaultFileName,
      title: 'Export document',
      filters,
    });
    if (canceled || !filePath) return { canceled: true };
    try {
      if (format === 'html') {
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title>${styleBlock}</head><body>${html}</body></html>`;
        fs.writeFileSync(filePath, fullHtml, 'utf8');
        return { ok: true, filePath };
      }
      if (format === 'pdf') {
        const tmpFile = path.join(app.getPath('temp'), `rm-export-${Date.now()}.html`);
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">${styleBlock}</head><body>${html}</body></html>`;
        fs.writeFileSync(tmpFile, fullHtml, 'utf8');
        const resolvedPath = path.resolve(tmpFile);
        const fileUrl = 'file:///' + resolvedPath.replace(/\\/g, '/');
        const pdfWin = new BrowserWindow({
          width: 800,
          height: 600,
          show: false,
          webPreferences: { nodeIntegration: false, contextIsolation: true },
        });
        await pdfWin.loadURL(fileUrl);
        await new Promise((resolve) => {
          pdfWin.webContents.once('did-finish-load', () => {
            setTimeout(resolve, 200);
          });
        });
        const data = await pdfWin.webContents.printToPDF({
          printBackground: true,
          margins: { marginType: 'default' },
        });
        pdfWin.close();
        try { fs.unlinkSync(tmpFile); } catch (_) {}
        fs.writeFileSync(filePath, data);
        return { ok: true, filePath };
      }
      return { error: 'Unsupported format' };
    } catch (e) {
      return { error: e?.message || 'Export failed' };
    }
  });

  // Theme and preferences are used on load / frequently; register explicitly to avoid any race with IPC_TO_METHOD iteration
  ipcMain.handle('rm-get-theme', () => ({ theme: getThemeSetting(), effective: getEffectiveTheme() }));
  ipcMain.handle('rm-set-theme', (_e, theme) => {
    setThemeSetting(theme);
    return null;
  });
  ipcMain.handle('rm-get-preference', (_e, key) => getPreference(key));
  ipcMain.handle('rm-set-preference', (_e, key, value) => {
    setPreference(key, value);
    return null;
  });

  // IPC handlers delegate to apiRegistry (channel name -> method name, then apiRegistry[method](...args))
  const IPC_TO_METHOD = {
    'rm-invoke-api': 'invokeApi',
    'rm-get-projects': 'getProjects',
    'rm-get-all-projects-info': 'getAllProjectsInfo',
    'rm-touch-project-opened': 'touchProjectOpened',
    'rm-set-projects': 'setProjects',
    'rm-show-directory-dialog': 'showDirectoryDialog',
    'rm-bulk-import-projects': 'bulkImportProjects',
    'rm-fetch-shipwell-projects': 'fetchShipwellProjects',
    'rm-clone-github-repo': 'cloneGitHubRepo',
    'rm-sync-projects-to-shipwell': 'syncProjectsToShipwell',
    'rm-sync-releases-to-shipwell': 'syncReleasesToShipwell',
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
    'rm-get-groq-settings': 'getGroqSettings',
    'rm-set-groq-settings': 'setGroqSettings',
    'rm-get-mistral-settings': 'getMistralSettings',
    'rm-set-mistral-settings': 'setMistralSettings',
    'rm-get-lmstudio-settings': 'getLmStudioSettings',
    'rm-set-lmstudio-settings': 'setLmStudioSettings',
    'rm-get-ai-params': 'getAiParams',
    'rm-set-ai-params': 'setAiParams',
    'rm-get-ai-provider': 'getAiProvider',
    'rm-set-ai-provider': 'setAiProvider',
    'rm-get-ai-generate-available': 'getAiGenerateAvailable',
    'rm-ollama-list-models': 'ollamaListModels',
    'rm-lmstudio-list-models': 'lmStudioListModels',
    'rm-ollama-generate-commit-message': 'ollamaGenerateCommitMessage',
    'rm-ollama-generate-release-notes': 'ollamaGenerateReleaseNotes',
    'rm-ollama-generate-tag-message': 'ollamaGenerateTagMessage',
    'rm-ollama-suggest-test-fix': 'ollamaSuggestTestFix',
    'rm-generate-tests-for-file': 'generateTestsForFile',
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
    'rm-list-gpg-keys': 'listGpgKeys',
    'rm-generate-gpg-key': 'generateGpgKey',
    'rm-get-git-global-config': 'getGitGlobalConfig',
    'rm-set-git-global-config': 'setGitGlobalConfig',
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
    'rm-read-project-file': 'readProjectFile',
    'rm-write-project-file': 'writeProjectFile',
    'rm-get-releases-url': 'getReleasesUrl',
    'rm-get-pull-requests-url': 'getPullRequestsUrl',
    'rm-get-pull-requests': 'getPullRequests',
    'rm-get-issues-url': 'getIssuesUrl',
    'rm-get-github-issues': 'getGitHubIssues',
    'rm-get-github-labels': 'getGitHubLabels',
    'rm-create-pull-request': 'createPullRequest',
    'rm-merge-pull-request': 'mergePullRequest',
    'rm-get-github-releases': 'getGitHubReleases',
    'rm-download-latest': 'downloadLatestRelease',
    'rm-download-asset': 'downloadAsset',
    'rm-open-url': 'openUrl',
    'rm-write-eml-draft-and-open': 'writeEmlDraftAndOpen',
    'rm-get-app-info': 'getAppInfo',
    'rm-get-app-path': 'getAppPath',
    'rm-expand-path': 'expandPath',
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
    'rm-delete-emails': 'deleteEmails',
    'rm-send-test-email': 'sendTestEmail',
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
    'rm-get-offline-grace-config': 'getOfflineGraceConfig',
    'rm-set-offline-grace-days': 'setOfflineGraceDays',
    'rm-check-connectivity': 'checkConnectivity',
    'rm-get-license-server-config': 'getLicenseServerConfig',
    'rm-get-license-server-environments': 'getLicenseServerEnvironments',
    'rm-set-license-server-config': 'setLicenseServerConfig',
    'rm-login-to-license-server': 'loginToLicenseServer',
    'rm-login-with-github': 'loginWithGitHub',
    'rm-register-to-license-server': 'registerToLicenseServer',
    'rm-request-password-reset': 'requestPasswordReset',
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
    'rm-check-for-updates-now': 'checkForUpdatesNow',
    'rm-download-update': 'downloadUpdate',
    'rm-quit-and-install': 'quitAndInstall',
    'rm-stop-auto-update-check': 'stopAutoUpdateCheck',
    'rm-start-auto-update-check': 'startAutoUpdateCheck',
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
    'rm-get-extensions-dir': 'getExtensionsDir',
    'rm-get-github-extension-registry': 'getGitHubExtensionRegistry',
    'rm-install-extension-from-github': 'installExtensionFromGitHub',
    'rm-sync-plan-extensions': 'syncPlanExtensions',
    'rm-switch-plan': 'switchPlan',
    'rm-register-github-extension': 'registerGitHubExtension',
    'rm-get-marketplace-extensions': 'getMarketplaceExtensions',
    'rm-get-auto-install-extensions': 'getAutoInstallExtensions',
    'rm-install-extension': 'installExtension',
    'rm-get-installed-user-extensions': 'getInstalledUserExtensions',
    'rm-get-extension-script-content': 'getExtensionScriptContent',
    'rm-uninstall-extension': 'uninstallExtension',
    'rm-get-extension-enabled-state': 'getExtensionEnabledState',
    'rm-sync-extension-enabled': 'syncExtensionEnabled',
    'rm-upload-extension-to-marketplace': 'uploadExtensionToMarketplace',
    'rm-send-crash-report': 'sendCrashReport',
    'rm-send-telemetry': 'sendTelemetry',
    'rm-flush-telemetry': 'flushTelemetry',
    'rm-get-custom-telemetry-events': 'getCustomTelemetryEvents',
    'rm-set-custom-telemetry-events': 'setCustomTelemetryEvents',
    'rm-download-extension-template': 'downloadExtensionTemplate',
    'rm-get-webhooks': 'getWebhooks',
    'rm-create-webhook': 'createWebhook',
    'rm-update-webhook': 'updateWebhook',
    'rm-delete-webhook': 'deleteWebhook',
    'rm-test-webhook': 'testWebhook',
    'rm-get-team-info': 'getTeamInfo',
    'rm-create-team': 'createTeam',
    'rm-update-team': 'updateTeam',
    'rm-invite-team-member': 'inviteTeamMember',
    'rm-cancel-team-invite': 'cancelTeamInvite',
    'rm-remove-team-member': 'removeTeamMember',
    'rm-leave-team': 'leaveTeam',
    'rm-get-team-invites': 'getTeamInvites',
    'rm-get-shared-notes': 'getSharedNotes',
    'rm-create-shared-note': 'createSharedNote',
    'rm-delete-shared-note': 'deleteSharedNote',
    'rm-update-shared-note': 'updateSharedNote',
    'rm-get-teams': 'getTeams',
    'rm-get-active-team-id': 'getActiveTeamId',
    'rm-set-active-team-id': 'setActiveTeamId',
    'rm-get-shared-wiki-pages': 'getSharedWikiPages',
    'rm-create-shared-wiki-page': 'createSharedWikiPage',
    'rm-update-shared-wiki-page': 'updateSharedWikiPage',
    'rm-delete-shared-wiki-page': 'deleteSharedWikiPage',
    'rm-fetch-remote-settings': 'fetchRemoteSettings',
    'rm-push-remote-settings': 'pushRemoteSettings',
    'rm-fetch-github-health': 'fetchGitHubHealth',
    'rm-fetch-notification-preferences': 'fetchNotificationPreferences',
    'rm-update-notification-preferences': 'updateNotificationPreferences',
    'rm-get-extension-analytics-overview': 'getExtensionAnalyticsOverview',
    'rm-get-extension-analytics-chart-data': 'getExtensionAnalyticsChartData',
    'rm-show-system-notification': 'showSystemNotification',
    'rm-run-renderer-test': 'runRendererTest',
  };
  const explicitlyHandled = new Set([
    'rm-get-theme', 'rm-set-theme', 'rm-get-preference', 'rm-set-preference',
    'rm-read-project-file', 'rm-write-project-file',
    'rm-generate-tests-for-file',
    'rm-send-test-email',
    'rm-clear-emails',
    'rm-delete-emails',
    'rm-get-installed-user-extensions',
    'rm-get-extension-script-content',
    'rm-expand-path',
    'rm-logout-from-license-server',
  ]);
  ipcMain.handle('rm-logout-from-license-server', async () => {
    appAuthServer.logout();
    sendToAllWindows('rm-license-status-changed');
    return { ok: true };
  });
  for (const [channel, methodName] of Object.entries(IPC_TO_METHOD)) {
    if (explicitlyHandled.has(channel)) continue;
    ipcMain.handle(channel, async (_e, ...args) => {
      debug.log(getStore, 'ipc', channel, 'args.length=', args?.length ?? 0);
      const result = await apiRegistry[methodName](...args);
      if (result === null || result === undefined || typeof result !== 'object') return result;
      try {
        return JSON.parse(JSON.stringify(result));
      } catch (serErr) {
        console.error(`[ipc] ${channel}: result not serializable`, serErr.message);
        return { ok: false, error: 'Result could not be serialized' };
      }
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

  updater.initUpdater({ getPreference, sendToRenderer: sendToAllWindows });
  updater.runAutoCheckIfEnabled({
    getPreference,
    checkForUpdatesNow: () => updater.checkForUpdatesNow({ getPreference }),
  });

  // CodeSeer TCP server: receives PHP dumps on port 23523, forwards to codeseer extension
  const codeseerPort = (typeof getPreference('codeseerTcpPort') === 'number' ? getPreference('codeseerTcpPort') : null) || 23523;
  codeseerTcpServer.start(() => BrowserWindow.getAllWindows(), codeseerPort);

  // CodeSeer SSH server (optional)
  if (getPreference('codeseerSshEnabled') && codeseerSshServer.available) {
    const sshPort = (typeof getPreference('codeseerSshPort') === 'number' ? getPreference('codeseerSshPort') : null) || 23526;
    codeseerSshServer.start(() => BrowserWindow.getAllWindows(), app.getPath('userData'), sshPort);
  }

  // CodeSeer MCP server (optional)
  if (getPreference('codeseerMcpEnabled')) {
    const mcpPort = (typeof getPreference('codeseerMcpPort') === 'number' ? getPreference('codeseerMcpPort') : null) || 3000;
    const mcpLimit = (typeof getPreference('codeseerMcpLimit') === 'number' ? getPreference('codeseerMcpLimit') : null) || codeseerMcpServer.DEFAULT_LIMIT;
    codeseerMcpServer.start(codeseerMessageStore, mcpPort, mcpLimit, {
      onConfetti: () => {
        for (const w of BrowserWindow.getAllWindows()) {
          if (w && !w.isDestroyed()) w.webContents.send('codeseer-confetti');
        }
      },
      onActivity: (entry) => {
        for (const w of BrowserWindow.getAllWindows()) {
          if (w && !w.isDestroyed()) w.webContents.send('codeseer-mcp-activity', entry);
        }
      },
    }).then((addr) => {
      if (addr) {
        const win = BrowserWindow.getAllWindows()[0];
        if (win && !win.isDestroyed()) win.webContents.send('codeseer-mcp-ready', { port: addr.port });
      }
    }).catch(() => {});
  }

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
    if (!getPreference('crashReports')) return;
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
    telemetryTrack(getPreference, 'app.closed', {});
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
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow({ telemetrySource: 'dock' });
  } else {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) {
      w.show();
      w.focus();
    }
    telemetryTrack(getPreference, 'app.opened', { source: 'dock' });
  }
});
