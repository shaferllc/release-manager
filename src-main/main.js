const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, clipboard, screen, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');
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
const { getRecentCommits: getRecentCommitsLib } = require('./lib/gitLog');
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
const { getGitDiffForCommit: getGitDiffForCommitLib } = require('./lib/gitDiff');
const {
  parseStashList: parseStashListLib,
  parseRemoteBranches: parseRemoteBranchesLib,
  parseCommitLog: parseCommitLogLib,
  parseCommitLogWithBody: parseCommitLogWithBodyLib,
  parseRemotes: parseRemotesLib,
  parseLocalBranches: parseLocalBranchesLib,
} = require('./lib/gitOutputParsers');
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
const { getApiDocs: getApiDocsFromModule, getApiMethodDoc: getApiMethodDocFromModule, getSampleResponseForMethod } = require('./apiDocs');
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
      const cleanStdout = stripAnsi(stdout).trim();
      const cleanStderr = stripAnsi(stderr).trim();
      resolve({
        ok: code === 0,
        exitCode: code ?? -1,
        stdout: cleanStdout,
        stderr: cleanStderr,
      });
    });
    proc.on('error', (e) => {
      resolve({ ok: false, exitCode: -1, stdout: '', stderr: e.message || 'Spawn failed' });
    });
  });
}

/** Run a shell command string in dirPath (for inline terminal). Returns { ok, exitCode, stdout, stderr }. */
function runShellCommand(dirPath, command) {
  const cmd = (command || '').trim();
  if (!cmd) return Promise.resolve({ ok: true, exitCode: 0, stdout: '', stderr: '' });
  const isWin = process.platform === 'win32';
  const proc = spawn(isWin ? 'cmd.exe' : process.env.SHELL || '/bin/sh', isWin ? ['/c', command] : ['-c', command], {
    cwd: dirPath || process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  proc.stdout?.on('data', (d) => { stdout += d.toString(); });
  proc.stderr?.on('data', (d) => { stderr += d.toString(); });
  return new Promise((resolve) => {
    proc.on('close', (code) => {
      resolve({
        ok: code === 0,
        exitCode: code ?? -1,
        stdout: stripAnsi(stdout),
        stderr: stripAnsi(stderr),
      });
    });
    proc.on('error', (e) => {
      resolve({ ok: false, exitCode: -1, stdout: '', stderr: e.message || 'Spawn failed' });
    });
  });
}

// ——— Dev stack / process manager (SoloTerm-style) ———
const runningProcesses = new Map(); // key: projectPath + \0 + processId
const MAX_OUTPUT_LINES = 500;

function getProcessesConfig() {
  const prefs = getStore().get('preferences') || {};
  return prefs.processesConfig || {};
}

function setProcessesConfig(config) {
  const prefs = getStore().get('preferences') || {};
  prefs.processesConfig = config && typeof config === 'object' ? config : {};
  getStore().set('preferences', prefs);
  return null;
}

function processKey(projectPath, processId) {
  return `${(projectPath || '').trim()}\0${(processId || '').trim()}`;
}

function notifyProcessStatus() {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) win.webContents.send('rm-process-status-changed');
}

function startProcess(projectPath, processId, name, command) {
  const key = processKey(projectPath, processId);
  if (runningProcesses.has(key)) return { ok: false, error: 'Process already running' };
  const dir = (projectPath || '').trim();
  if (!dir || !fs.existsSync(dir)) return { ok: false, error: 'Project path invalid or missing' };
  const cmd = (command || '').trim();
  if (!cmd) return { ok: false, error: 'Command is required' };
  const isWin = process.platform === 'win32';
  const child = spawn(isWin ? 'cmd.exe' : process.env.SHELL || '/bin/sh', isWin ? ['/c', cmd] : ['-c', cmd], {
    cwd: dir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  const outputLines = [];
  function push(line) {
    if (line == null || line === '') return;
    outputLines.push(String(line).slice(0, 2000));
    if (outputLines.length > MAX_OUTPUT_LINES) outputLines.shift();
  }
  child.stdout?.on('data', (d) => { push(d.toString()); });
  child.stderr?.on('data', (d) => { push(d.toString()); });
  const entry = {
    child,
    projectPath: dir,
    processId,
    name: name || processId,
    command: cmd,
    outputLines,
    status: 'running',
    exitCode: null,
  };
  child.on('exit', (code, signal) => {
    entry.status = code === 0 ? 'stopped' : 'error';
    entry.exitCode = code;
    entry.child = null;
    runningProcesses.delete(key);
    notifyProcessStatus();
  });
  child.on('error', (err) => {
    push(err.message || 'Spawn failed');
    entry.status = 'error';
    entry.exitCode = -1;
    entry.child = null;
    runningProcesses.delete(key);
    notifyProcessStatus();
  });
  runningProcesses.set(key, entry);
  notifyProcessStatus();
  return { ok: true, pid: child.pid };
}

function stopProcess(projectPath, processId) {
  const key = processKey(projectPath, processId);
  const entry = runningProcesses.get(key);
  if (!entry || !entry.child) return { ok: true, wasRunning: false };
  try {
    entry.child.kill('SIGTERM');
    return { ok: true, wasRunning: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to stop' };
  }
}

function getProcessStatus() {
  const config = getProcessesConfig();
  const result = [];
  for (const [projectPath, projectConfig] of Object.entries(config)) {
    const processes = projectConfig?.processes;
    if (!Array.isArray(processes)) continue;
    for (const p of processes) {
      const id = p.id != null ? String(p.id) : (p.name || '').trim();
      const key = processKey(projectPath, id);
      const entry = runningProcesses.get(key);
      result.push({
        projectPath,
        processId: id,
        name: p.name || id,
        command: p.command || '',
        status: entry ? entry.status : 'stopped',
        pid: entry?.child?.pid,
        exitCode: entry?.exitCode,
      });
    }
  }
  return result;
}

function getProcessOutput(projectPath, processId, lines) {
  const key = processKey(projectPath, processId);
  const entry = runningProcesses.get(key);
  if (!entry || !entry.outputLines) return { lines: [] };
  const n = Math.min(Math.max(0, lines || 50), MAX_OUTPUT_LINES);
  const start = Math.max(0, entry.outputLines.length - n);
  return { lines: entry.outputLines.slice(start) };
}

async function startAllProcesses(projectPath) {
  const config = getProcessesConfig();
  const projectConfig = config[(projectPath || '').trim()];
  if (!projectConfig || !Array.isArray(projectConfig.processes)) return { ok: true, started: 0, errors: [] };
  const errors = [];
  let started = 0;
  for (const p of projectConfig.processes) {
    const id = p.id != null ? String(p.id) : (p.name || '').trim();
    const r = startProcess(projectPath, id, p.name, p.command);
    if (r.ok) started += 1; else errors.push({ processId: id, error: r.error });
  }
  return { ok: true, started, errors };
}

async function stopAllProcesses(projectPath) {
  const statuses = getProcessStatus().filter((s) => s.projectPath === (projectPath || '').trim());
  let stopped = 0;
  for (const s of statuses) {
    if (s.status !== 'running') continue;
    const r = stopProcess(s.projectPath, s.processId);
    if (r.wasRunning) stopped += 1;
  }
  return { ok: true, stopped };
}

/** Build suggested dev processes from package.json, composer.json, and Laravel artisan. */
function getSuggestedProcesses(dirPath) {
  const dir = (dirPath || '').trim();
  if (!dir || !fs.existsSync(dir)) return { suggested: [] };
  const suggested = [];
  const seen = new Set();

  function add(id, name, command) {
    const key = (id || name || command || '').toLowerCase().replace(/\s+/g, '-');
    if (!key || seen.has(key)) return;
    seen.add(key);
    suggested.push({ id: id || key, name: name || id, command: command || '' });
  }

  // package.json scripts
  const pkgPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const content = fs.readFileSync(pkgPath, 'utf8');
      const { ok, scripts } = getNpmScriptNames(content);
      if (ok && scripts && scripts.length) {
        const labels = { dev: 'Dev server', start: 'Start', serve: 'Serve', watch: 'Watch', build: 'Build', test: 'Test' };
        const prefer = ['dev', 'start', 'serve', 'watch', 'build', 'test'];
        for (const name of prefer) {
          if (scripts.includes(name)) add(name, labels[name] || name, name === 'start' ? 'npm start' : `npm run ${name}`);
        }
        for (const name of scripts) {
          if (!prefer.includes(name)) add(name, name, `npm run ${name}`);
        }
      }
    } catch (_) {}
  }

  // composer.json scripts + Laravel artisan
  const composerPath = path.join(dir, 'composer.json');
  const artisanPath = path.join(dir, 'artisan');
  if (fs.existsSync(composerPath)) {
    try {
      const manifest = getComposerManifestInfo(dir, fs);
      if (manifest.ok && manifest.scripts && manifest.scripts.length) {
        const prefer = ['dev', 'start', 'serve', 'watch', 'test', 'cs-fix'];
        for (const name of prefer) {
          if (manifest.scripts.includes(name)) add(`composer-${name}`, name, `composer run ${name}`);
        }
        for (const name of manifest.scripts) {
          if (!prefer.includes(name)) add(`composer-${name}`, name, `composer run ${name}`);
        }
      }
    } catch (_) {}
  }
  if (fs.existsSync(artisanPath)) {
    add('artisan-serve', 'Laravel serve', 'php artisan serve');
    add('artisan-queue', 'Queue worker', 'php artisan queue:work');
  }

  return { suggested };
}

// ——— Email / SMTP inbox (Helo-style) ———
const EMAIL_INBOX_MAX = 500;
const DEFAULT_SMTP_PORT = 1025;

let smtpServerInstance = null;
let smtpServerPort = DEFAULT_SMTP_PORT;

function getEmailInbox() {
  try {
    const raw = getStore().get('emailInbox');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveEmailInbox(inbox) {
  const list = Array.isArray(inbox) ? inbox.slice(0, EMAIL_INBOX_MAX) : [];
  getStore().set('emailInbox', list);
}

function getEmailSmtpStatus() {
  const running = smtpServerInstance != null;
  return {
    running,
    port: running ? smtpServerPort : null,
    defaultPort: DEFAULT_SMTP_PORT,
  };
}

function notifyEmailReceived() {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) win.webContents.send('rm-email-received');
}

function startEmailSmtpServer(port) {
  if (smtpServerInstance) {
    return Promise.resolve({ ok: true, port: smtpServerPort, alreadyRunning: true });
  }
  const p = Math.max(1, Math.min(65535, parseInt(port, 10) || DEFAULT_SMTP_PORT));
  return new Promise((resolve) => {
    try {
      const server = new SMTPServer({
        disabledCommands: ['AUTH', 'STARTTLS'],
        size: 25 * 1024 * 1024,
        onConnect(session, callback) {
          callback();
        },
        onMailFrom(address, session, callback) {
          callback();
        },
        onRcptTo(address, session, callback) {
          callback();
        },
        onData(stream, session, callback) {
          const chunks = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('end', async () => {
            try {
              const raw = Buffer.concat(chunks);
              const parsed = await simpleParser(raw);
              const fromText = parsed.from?.text || (parsed.from?.value?.[0]?.address) || '';
              const toText = parsed.to?.text || (parsed.to?.value?.map((v) => v.address).join(', ')) || '';
              const headers = {};
              if (parsed.headers && typeof parsed.headers.forEach === 'function') {
                parsed.headers.forEach((v, k) => { headers[k] = v; });
              }
              const rawHtml = parsed.html || null;
              const sanitizedHtml = rawHtml
                ? sanitizeHtml(rawHtml, {
                    allowedTags: ['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'u', 'code', 'pre', 'br', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'div', 'span'],
                    allowedAttributes: { a: ['href', 'target'], img: ['src', 'alt', 'width', 'height'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'] },
                    allowedSchemes: ['http', 'https', 'cid', 'data'],
                  })
                : null;
              const email = {
                id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                from: fromText,
                to: toText,
                subject: parsed.subject || '(no subject)',
                date: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
                html: rawHtml,
                sanitizedHtml,
                text: parsed.text || null,
                headers: JSON.stringify(headers, null, 2),
                raw: raw.length > 100000 ? raw.slice(0, 100000).toString('utf8') + '\n...[truncated]' : raw.toString('utf8'),
              };
              const inbox = getEmailInbox();
              inbox.unshift(email);
              saveEmailInbox(inbox);
              notifyEmailReceived();
              callback(null, 'OK');
            } catch (err) {
              debug.log(getStore, 'email', 'parse failed', err?.message || err);
              callback(err);
            }
          });
          stream.on('error', (err) => callback(err));
        },
      });
      server.on('error', (err) => {
        debug.log(getStore, 'email', 'smtp server error', err?.message || err);
      });
      server.listen(p, '127.0.0.1', () => {
        smtpServerInstance = server;
        smtpServerPort = p;
        resolve({ ok: true, port: p });
      });
      server.once('error', (err) => {
        if (!smtpServerInstance) resolve({ ok: false, error: err.message || 'SMTP server failed to start' });
      });
    } catch (e) {
      resolve({ ok: false, error: e.message || 'Failed to start SMTP server' });
    }
  });
}

function stopEmailSmtpServer() {
  if (!smtpServerInstance) return Promise.resolve({ ok: true, wasRunning: false });
  return new Promise((resolve) => {
    try {
      const server = smtpServerInstance;
      smtpServerInstance = null;
      server.close(() => resolve({ ok: true, wasRunning: true }));
    } catch (e) {
      smtpServerInstance = null;
      resolve({ ok: false, error: e.message || 'Failed to stop' });
    }
  });
}

function getEmails() {
  return getEmailInbox();
}

function clearEmails() {
  saveEmailInbox([]);
  notifyEmailReceived();
  return null;
}

// ——— Web tunnels (Expose-style, localtunnel) ———
const activeTunnels = new Map(); // id -> { id, port, subdomain, url, tunnel }

function notifyTunnelsChanged() {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) win.webContents.send('rm-tunnels-changed');
}

function startTunnel(port, subdomain) {
  const portNum = Math.max(1, Math.min(65535, parseInt(port, 10) || 0));
  if (!portNum) return Promise.resolve({ ok: false, error: 'Invalid port' });
  return new Promise((resolve) => {
    const opts = {};
    if (subdomain && typeof subdomain === 'string' && subdomain.trim()) opts.subdomain = subdomain.trim();
    localtunnel(portNum, opts, (err, tunnel) => {
      if (err) {
        resolve({ ok: false, error: err.message || 'Tunnel failed to start' });
        return;
      }
      const id = `tunnel-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const entry = { id, port: portNum, subdomain: opts.subdomain || null, url: tunnel.url, tunnel };
      tunnel.once('close', () => {
        activeTunnels.delete(id);
        notifyTunnelsChanged();
      });
      tunnel.once('error', () => {
        activeTunnels.delete(id);
        notifyTunnelsChanged();
      });
      activeTunnels.set(id, entry);
      notifyTunnelsChanged();
      resolve({ ok: true, id, port: portNum, url: tunnel.url });
    });
  });
}

function stopTunnel(id) {
  const entry = activeTunnels.get(id);
  if (!entry) return Promise.resolve({ ok: true, wasRunning: false });
  return new Promise((resolve) => {
    try {
      entry.tunnel.close();
      activeTunnels.delete(id);
      notifyTunnelsChanged();
      resolve({ ok: true, wasRunning: true });
    } catch (e) {
      activeTunnels.delete(id);
      notifyTunnelsChanged();
      resolve({ ok: false, error: e.message || 'Failed to close tunnel' });
    }
  });
}

function getTunnels() {
  return Array.from(activeTunnels.values()).map(({ id, port, subdomain, url }) => ({ id, port, subdomain, url }));
}

// ——— FTP client ———
let ftpClient = null;
let ftpConfig = null;

function getFtpStatus() {
  const connected = ftpClient != null && !ftpClient.closed;
  return {
    connected,
    host: connected && ftpConfig ? ftpConfig.host : null,
  };
}

async function ftpConnect(config) {
  if (ftpClient && !ftpClient.closed) {
    try { ftpClient.close(); } catch (_) {}
    ftpClient = null;
  }
  const host = (config?.host || '').trim() || 'localhost';
  const port = Math.max(1, Math.min(65535, parseInt(config?.port, 10) || 21));
  const user = config?.user != null ? String(config.user) : 'anonymous';
  const password = config?.password != null ? String(config.password) : 'guest';
  const secure = !!config?.secure;
  ftpClient = new FtpClient(30000);
  try {
    await ftpClient.access({
      host,
      port,
      user,
      password,
      secure: secure ? true : false,
    });
    ftpConfig = { host, port, user, secure };
    return { ok: true };
  } catch (e) {
    ftpClient = null;
    ftpConfig = null;
    return { ok: false, error: e.message || 'FTP connection failed' };
  }
}

function ftpDisconnect() {
  if (!ftpClient) return Promise.resolve({ ok: true });
  try {
    ftpClient.close();
  } catch (_) {}
  ftpClient = null;
  ftpConfig = null;
  return Promise.resolve({ ok: true });
}

async function ftpList(remotePath) {
  if (!ftpClient || ftpClient.closed) return { ok: false, error: 'Not connected', list: [] };
  try {
    const path = (remotePath || '').trim() || '.';
    const list = await ftpClient.list(path);
    const items = list.map((f) => ({
      name: f.name,
      size: f.size,
      isDirectory: f.isDirectory,
      modifiedAt: f.modifiedAt ? new Date(f.modifiedAt).toISOString() : null,
    }));
    return { ok: true, list: items };
  } catch (e) {
    return { ok: false, error: e.message || 'List failed', list: [] };
  }
}

async function ftpDownload(remotePath, localPath) {
  if (!ftpClient || ftpClient.closed) return { ok: false, error: 'Not connected' };
  const remote = (remotePath || '').trim();
  const local = (localPath || '').trim();
  if (!remote || !local) return { ok: false, error: 'Invalid path' };
  try {
    await ftpClient.downloadTo(local, remote);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Download failed' };
  }
}

async function ftpUpload(localPath, remotePath) {
  if (!ftpClient || ftpClient.closed) return { ok: false, error: 'Not connected' };
  const local = (localPath || '').trim();
  const remote = (remotePath || '').trim();
  if (!local || !remote) return { ok: false, error: 'Invalid path' };
  if (!fs.existsSync(local)) return { ok: false, error: 'Local file not found' };
  try {
    await ftpClient.uploadFrom(local, remote);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Upload failed' };
  }
}

async function ftpRemove(remotePath) {
  if (!ftpClient || ftpClient.closed) return { ok: false, error: 'Not connected' };
  const remote = (remotePath || '').trim();
  if (!remote) return { ok: false, error: 'Invalid path' };
  try {
    await ftpClient.remove(remote);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Remove failed' };
  }
}

async function showSaveDialog(options) {
  const win = BrowserWindow.getAllWindows()[0] || null;
  const { canceled, filePath } = await dialog.showSaveDialog(win || undefined, {
    defaultPath: options?.defaultPath,
    title: options?.title || 'Save file',
  });
  return { canceled: !!canceled, filePath: canceled ? null : filePath };
}

async function showOpenDialog(options) {
  const win = BrowserWindow.getAllWindows()[0] || null;
  const { canceled, filePaths } = await dialog.showOpenDialog(win || undefined, {
    properties: options?.multiSelect ? ['openFile', 'multiSelections'] : ['openFile'],
    title: options?.title || 'Open file',
  });
  return { canceled: !!canceled, filePaths: canceled ? [] : (filePaths || []) };
}

// ——— end FTP ———

async function getProjectInfoAsync(dirPath) {
  const resolved = getProjectNameVersionAndType(dirPath, path, fs);
  if (!resolved.ok) return { ok: false, error: resolved.error, path: resolved.path };
  const { name, version, projectType } = resolved;
  const hasComposer = fs.existsSync(path.join(dirPath, 'composer.json'));
  const hasWordPress = fs.existsSync(path.join(dirPath, 'wp-config.php')) || fs.existsSync(path.join(dirPath, 'wp-includes', 'version.php'));
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
    try {
      const [tagOut, remoteName, statusOut, porcelainOut, currentBranchOut] = await Promise.all([
        runInDir(dirPath, 'git', ['tag', '-l', '--sort=-version:refname']).catch(() => ({ stdout: '' })),
        getPushRemote(dirPath),
        runInDir(dirPath, 'git', ['status', '-sb']).catch(() => ({ stdout: '' })),
        runInDir(dirPath, 'git', ['status', '--porcelain', '-uall']).catch(() => ({ stdout: '' })),
        runInDir(dirPath, 'git', ['branch', '--show-current']).catch(() => ({ stdout: '' })),
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
      const currentFromBranch = (currentBranchOut.stdout || '').trim();
      if (currentFromBranch) branch = currentFromBranch;
      else {
        const branchMatch = statusLine.match(/^##\s+(.+?)(?:\.\.\.|$)/);
        if (branchMatch) branch = branchMatch[1].trim();
      }
      const aheadMatch = statusLine.match(/ahead\s+(\d+)/);
      if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
      const behindMatch = statusLine.match(/behind\s+(\d+)/);
      if (behindMatch) behind = parseInt(behindMatch[1], 10);
      const porcelain = (porcelainOut.stdout || '').trim();
      const { lines: parsedLines, conflictCount: parsedConflictCount } = parsePorcelainLines(porcelain);
      uncommittedLines = parsedLines;
      conflictCount = parsedConflictCount;
    } catch (_) {}
  }

  return {
    ok: true,
    path: dirPath,
    name,
    version,
    projectType,
    hasComposer,
    hasWordPress,
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

/** List all tracked files (git ls-files). For tree view when not "View all files". */
async function getTrackedFiles(dirPath) {
  try {
    const out = await runInDir(dirPath, 'git', ['ls-files']);
    const files = (out.stdout || '').trim().split(/\r?\n/).filter(Boolean);
    return { ok: true, files };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to list files', files: [] };
  }
}

/** Directories to skip when listing "all project files" (full filesystem tree). */
const PROJECT_FILES_SKIP_DIRS = new Set([
  '.git', 'node_modules', 'vendor', '__pycache__', '.pycache', '.next', '.nuxt', '.output',
  'dist', 'build', 'out', 'coverage', '.turbo', '.cache', '.parcel-cache', '.vite', '.svelte-kit',
  '.idea', '.vscode', 'tmp', 'temp', '.tmp', '.temp', 'cache', '.cache',
]);

/** List every file in the project (filesystem walk). Skips .git, node_modules, vendor, dist, etc. */
function getProjectFiles(dirPath) {
  const files = [];
  const base = path.resolve(dirPath);
  if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) {
    return { ok: true, files: [] };
  }
  function walk(relDir) {
    const fullDir = path.join(base, relDir);
    let entries;
    try {
      entries = fs.readdirSync(fullDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const relPath = relDir ? `${relDir}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (PROJECT_FILES_SKIP_DIRS.has(e.name)) continue;
        walk(relPath);
      } else if (e.isFile()) {
        files.push(relPath);
      }
    }
  }
  walk('');
  return { ok: true, files };
}

/** options: { sign?: boolean } — if sign true, use -S (uses commit.gpgsign or default key) */
async function gitCommit(dirPath, message, options = {}) {
  if (!message || typeof message !== 'string' || !message.trim()) {
    return { ok: false, error: 'Commit message is required' };
  }
  const msg = message.trim();
  const sign = options.sign !== undefined ? options.sign : getPreference('signCommits');
  try {
    await runInDir(dirPath, 'git', ['add', '-A']);
    const commitArgs = ['commit', '-m', msg];
    if (sign) commitArgs.push('-S');
    await runInDir(dirPath, 'git', commitArgs);
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

/** Pull with --ff-only (fail if not fast-forward). */
async function gitPullFFOnly(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['pull', '--ff-only']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Pull (fast-forward only) failed' };
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

/** options: { includeUntracked?: boolean, keepIndex?: boolean } */
async function gitStashPush(dirPath, message, options = {}) {
  if (!dirPath || typeof dirPath !== 'string' || !dirPath.trim()) {
    return { ok: false, error: 'Project path is required' };
  }
  const cwd = path.resolve(dirPath.trim());
  if (!fs.existsSync(path.join(cwd, '.git'))) {
    return { ok: false, error: 'Not a Git repository' };
  }
  try {
    const args = ['stash', 'push'];
    if (options && options.includeUntracked) args.push('--include-untracked');
    if (options && options.keepIndex) args.push('--keep-index');
    if (message && typeof message === 'string' && message.trim()) args.push('-m', message.trim());
    await runInDir(cwd, 'git', args);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'git stash failed' };
  }
}

async function gitStashPop(dirPath) {
  if (!dirPath || typeof dirPath !== 'string' || !dirPath.trim()) {
    return { ok: false, error: 'Project path is required' };
  }
  const cwd = path.resolve(dirPath.trim());
  if (!fs.existsSync(path.join(cwd, '.git'))) {
    return { ok: false, error: 'Not a Git repository' };
  }
  try {
    await runInDir(cwd, 'git', ['stash', 'pop']);
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

/** Get local branch names and current branch. */
async function getBranches(dirPath) {
  try {
    const out = await runInDir(dirPath, 'git', ['branch', '--no-color']);
    const branches = parseLocalBranchesLib(out.stdout || '');
    const currentOut = await runInDir(dirPath, 'git', ['branch', '--show-current']);
    const current = (currentOut.stdout || '').trim() || null;
    return { ok: true, branches, current };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to list branches', branches: [], current: null };
  }
}

/** Checkout an existing branch. */
async function checkoutBranch(dirPath, branchName) {
  const name = (branchName || '').trim();
  if (!name) return { ok: false, error: 'Branch name is required' };
  try {
    await runInDir(dirPath, 'git', ['checkout', name]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Checkout failed' };
  }
}

/** Create a new branch; if checkout is true, check it out. */
async function createBranch(dirPath, branchName, checkout = true) {
  const name = (branchName || '').trim();
  if (!name) return { ok: false, error: 'Branch name is required' };
  try {
    if (checkout) {
      await runInDir(dirPath, 'git', ['checkout', '-b', name]);
    } else {
      await runInDir(dirPath, 'git', ['branch', name]);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Create branch failed' };
  }
}

/** Create a new branch starting from an existing ref (branch or commit) and check it out. */
async function createBranchFrom(dirPath, newBranchName, fromRef) {
  const name = (newBranchName || '').trim();
  const ref = (fromRef || '').trim();
  if (!name) return { ok: false, error: 'Branch name is required' };
  if (!ref) return { ok: false, error: 'Source branch or ref is required' };
  try {
    await runInDir(dirPath, 'git', ['checkout', '-b', name, ref]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Create branch failed' };
  }
}

/** Rename a branch. If newName only, renames current branch. */
async function renameBranch(dirPath, oldName, newName) {
  const n = (newName || '').trim();
  if (!n) return { ok: false, error: 'New branch name is required' };
  try {
    if (oldName && oldName.trim()) {
      await runInDir(dirPath, 'git', ['branch', '-m', oldName.trim(), n]);
    } else {
      await runInDir(dirPath, 'git', ['branch', '-m', n]);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Rename branch failed' };
  }
}

/** Push current branch to its upstream (or origin if none). */
async function gitPush(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['push']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Push failed' };
  }
}

/** Force-push current branch (overwrites remote). Use with care. */
async function gitPushForce(dirPath, withLease = false) {
  try {
    const branchOut = await runInDir(dirPath, 'git', ['branch', '--show-current']);
    const branch = (branchOut.stdout || '').trim();
    if (!branch) return { ok: false, error: 'Not on a branch' };
    const upstreamOut = await runInDir(dirPath, 'git', ['rev-parse', '--abbrev-ref', '@{u}']).catch(() => ({ stdout: '' }));
    const hasUpstream = (upstreamOut.stdout || '').trim().length > 0;
    const args = ['push'];
    if (withLease) args.push('--force-with-lease');
    else args.push('--force');
    if (hasUpstream) {
      await runInDir(dirPath, 'git', args);
    } else {
      args.push('-u', 'origin', branch);
      await runInDir(dirPath, 'git', args);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Force push failed' };
  }
}

/** Merge another branch into the current branch. strategy: 'ours'|'theirs'|null, strategyOption: 'ours'|'theirs'|null for -X */
async function gitMerge(dirPath, branchName, options = {}) {
  const name = (branchName || '').trim();
  if (!name) return { ok: false, error: 'Branch name is required' };
  try {
    const args = ['merge'];
    if (options.strategy === 'ours') args.push('-s', 'ours');
    else if (options.strategy === 'theirs') args.push('-s', 'theirs');
    if (options.strategyOption === 'ours') args.push('-X', 'ours');
    else if (options.strategyOption === 'theirs') args.push('-X', 'theirs');
    args.push(name);
    await runInDir(dirPath, 'git', args);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Merge failed' };
  }
}

// ---------- Phase 1: Remote branches, push -u, stash list ----------
/** Get remote-tracking branch refs (e.g. origin/main). Call after fetch. */
async function getRemoteBranches(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['fetch', '--prune']);
    const out = await runInDir(dirPath, 'git', ['branch', '-r', '--no-color']);
    const branches = parseRemoteBranchesLib(out.stdout || '');
    return { ok: true, branches };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to list remote branches', branches: [] };
  }
}

/** Checkout a remote branch (create local tracking branch). ref e.g. origin/feature. */
async function checkoutRemoteBranch(dirPath, ref) {
  const r = (ref || '').trim();
  if (!r || r.indexOf('/') === -1) return { ok: false, error: 'Remote branch ref required (e.g. origin/feature)' };
  try {
    await runInDir(dirPath, 'git', ['checkout', '--track', r]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Checkout failed' };
  }
}

/** Push with -u origin <current> when branch has no upstream. */
async function gitPushWithUpstream(dirPath) {
  try {
    const branchOut = await runInDir(dirPath, 'git', ['branch', '--show-current']);
    const branch = (branchOut.stdout || '').trim();
    if (!branch) return { ok: false, error: 'Not on a branch' };
    const upstreamOut = await runInDir(dirPath, 'git', ['rev-parse', '--abbrev-ref', '@{u}']).catch(() => ({ stdout: '' }));
    const hasUpstream = (upstreamOut.stdout || '').trim().length > 0;
    if (hasUpstream) {
      await runInDir(dirPath, 'git', ['push']);
    } else {
      await runInDir(dirPath, 'git', ['push', '-u', 'origin', branch]);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Push failed' };
  }
}

/** List stash entries: [{ index, message }]. */
async function getStashList(dirPath) {
  if (!dirPath || typeof dirPath !== 'string' || !dirPath.trim()) {
    return { ok: false, error: 'Project path is required', entries: [] };
  }
  const cwd = path.resolve(dirPath.trim());
  if (!fs.existsSync(path.join(cwd, '.git'))) {
    return { ok: false, error: 'Not a Git repository', entries: [] };
  }
  try {
    const out = await runInDir(cwd, 'git', ['stash', 'list', '--pretty=format:%gd %s']);
    const entries = parseStashListLib(out.stdout || '');
    return { ok: true, entries };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to list stash', entries: [] };
  }
}

async function stashApply(dirPath, index) {
  if (!dirPath || typeof dirPath !== 'string' || !dirPath.trim()) {
    return { ok: false, error: 'Project path is required' };
  }
  const cwd = path.resolve(dirPath.trim());
  if (!fs.existsSync(path.join(cwd, '.git'))) {
    return { ok: false, error: 'Not a Git repository' };
  }
  try {
    const args = index ? ['stash', 'apply', String(index)] : ['stash', 'apply'];
    await runInDir(cwd, 'git', args);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Stash apply failed' };
  }
}

async function stashDrop(dirPath, index) {
  if (!dirPath || typeof dirPath !== 'string' || !dirPath.trim()) {
    return { ok: false, error: 'Project path is required' };
  }
  const cwd = path.resolve(dirPath.trim());
  if (!fs.existsSync(path.join(cwd, '.git'))) {
    return { ok: false, error: 'Not a Git repository' };
  }
  try {
    const args = index ? ['stash', 'drop', String(index)] : ['stash', 'drop'];
    await runInDir(cwd, 'git', args);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Stash drop failed' };
  }
}

// ---------- Phase 2: Tags, commit log ----------
/** Get tag names (sorted by version). */
async function getTags(dirPath) {
  try {
    const out = await runInDir(dirPath, 'git', ['tag', '-l', '--sort=-version:refname']);
    const tags = (out.stdout || '').trim().split(/\r?\n/).filter(Boolean);
    return { ok: true, tags };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to list tags', tags: [] };
  }
}

async function checkoutTag(dirPath, tagName) {
  const name = (tagName || '').trim();
  if (!name) return { ok: false, error: 'Tag name is required' };
  try {
    await runInDir(dirPath, 'git', ['checkout', name]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Checkout failed' };
  }
}

/** Create a tag. ref defaults to HEAD. If message is set, creates an annotated tag. */
async function createTag(dirPath, tagName, message, ref) {
  const name = (tagName || '').trim();
  if (!name) return { ok: false, error: 'Tag name is required' };
  const r = (ref || 'HEAD').trim();
  try {
    if (message != null && String(message).trim()) {
      await runInDir(dirPath, 'git', ['tag', '-a', name, '-m', String(message).trim(), r]);
    } else {
      await runInDir(dirPath, 'git', ['tag', name, r]);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Create tag failed' };
  }
}

/** Initialize a new Git repository in the given directory. */
async function gitInit(dirPath) {
  if (!dirPath || typeof dirPath !== 'string') return { ok: false, error: 'Directory path is required' };
  const gitDir = path.join(dirPath, '.git');
  if (fs.existsSync(gitDir)) return { ok: false, error: 'Repository already exists' };
  try {
    await runInDir(dirPath, 'git', ['init']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'git init failed' };
  }
}

/** Commit log entries: { sha, subject, author, date }. */
async function getCommitLog(dirPath, n = 30) {
  const limit = Math.max(1, Math.min(100, n));
  try {
    const out = await runInDir(dirPath, 'git', [
      'log',
      '-n',
      String(limit),
      '--pretty=format:%h%x00%s%x00%an%x00%ad%x00%ae',
      '--date=short',
      '--no-merges',
    ]);
    const commits = parseCommitLogLib(out.stdout || '');
    return { ok: true, commits };
  } catch (e) {
    return { ok: false, error: e.message || 'git log failed', commits: [] };
  }
}

/** Commit log with body for search (hash, subject, author, date, body). */
async function getCommitLogWithBody(dirPath, n = 30) {
  const limit = Math.max(1, Math.min(100, n));
  try {
    const out = await runInDir(dirPath, 'git', [
      'log',
      '-n',
      String(limit),
      '--pretty=format:%h%x00%s%x00%an%x00%ad%x00%ae%x00%b%x1e',
      '--date=short',
      '--no-merges',
    ]);
    const commits = parseCommitLogWithBodyLib(out.stdout || '');
    return { ok: true, commits };
  } catch (e) {
    return { ok: false, error: e.message || 'git log failed', commits: [] };
  }
}

/** Get one commit detail and diff (for modal). */
async function getCommitDetail(dirPath, sha) {
  const s = (sha || '').trim();
  if (!s) return { ok: false, error: 'SHA required' };
  try {
    const [infoOut, diffOut, namesOut] = await Promise.all([
      runInDir(dirPath, 'git', ['show', '-s', '--format=%s%n%an%n%ad%n%b', '--date=short', s]).catch(() => ({ stdout: '' })),
      runInDir(dirPath, 'git', ['show', '--no-color', s]).catch(() => ({ stdout: '' })),
      runInDir(dirPath, 'git', ['diff-tree', '--no-commit-id', '--name-only', '-r', s]).catch(() => ({ stdout: '' })),
    ]);
    const infoLines = (infoOut.stdout || '').trim().split(/\r?\n/);
    const subject = infoLines[0] || '';
    const author = infoLines[1] || '';
    const date = infoLines[2] || '';
    const body = infoLines.slice(3).join('\n').trim();
    const diff = (diffOut.stdout || '').trim();
    const files = (namesOut.stdout || '').trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return { ok: true, sha: s, subject, author, date, body, diff, files };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to get commit' };
  }
}

// ---------- Phase 3: Branch delete, rebase ----------
async function deleteBranch(dirPath, branchName, force = false) {
  const name = (branchName || '').trim();
  if (!name) return { ok: false, error: 'Branch name is required' };
  try {
    await runInDir(dirPath, 'git', ['branch', force ? '-D' : '-d', name]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Delete branch failed' };
  }
}

async function deleteRemoteBranch(dirPath, remoteName, branchName) {
  const remote = (remoteName || 'origin').trim();
  const name = (branchName || '').trim();
  if (!name) return { ok: false, error: 'Branch name is required' };
  try {
    await runInDir(dirPath, 'git', ['push', remote, '--delete', name]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Delete remote branch failed' };
  }
}

async function gitRebase(dirPath, ontoBranch) {
  const onto = (ontoBranch || '').trim();
  if (!onto) return { ok: false, error: 'Branch name is required' };
  try {
    await runInDir(dirPath, 'git', ['rebase', onto]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Rebase failed' };
  }
}

async function gitRebaseAbort(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['rebase', '--abort']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Rebase abort failed' };
  }
}

/** Start interactive rebase onto ref. Opens the rebase-todo in Cursor or VS Code (--wait). */
async function gitRebaseInteractive(dirPath, ref) {
  const r = (ref || '').trim();
  if (!r) return { ok: false, error: 'Ref is required (e.g. branch name or HEAD~5)' };
  const editors = ['cursor --wait', 'code --wait'];
  for (const editor of editors) {
    try {
      await runInDir(dirPath, 'git', ['rebase', '-i', r], { env: { ...process.env, GIT_EDITOR: editor } });
      return { ok: true };
    } catch (e) {
      try {
        await runInDir(dirPath, 'git', ['rebase', '--abort']).catch(() => {});
      } catch (_) {}
      if (editor === editors[editors.length - 1]) {
        return { ok: false, error: (e.message || 'Interactive rebase failed') + '. Ensure Cursor or VS Code is in PATH with --wait support.' };
      }
    }
  }
  return { ok: false, error: 'Interactive rebase failed. Ensure Cursor or VS Code is in PATH.' };
}

async function gitRebaseContinue(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['rebase', '--continue']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Rebase continue failed' };
  }
}

async function gitRebaseSkip(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['rebase', '--skip']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Rebase skip failed' };
  }
}

async function gitMergeContinue(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['merge', '--continue']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Merge continue failed' };
  }
}

// ---------- Phase 4: Remotes, cherry-pick, reset, compare ----------
async function getRemotes(dirPath) {
  try {
    const out = await runInDir(dirPath, 'git', ['remote', '-v']);
    const remotes = parseRemotesLib(out.stdout || '');
    return { ok: true, remotes };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to list remotes', remotes: [] };
  }
}

async function addRemote(dirPath, name, url) {
  const n = (name || '').trim();
  const u = (url || '').trim();
  if (!n || !u) return { ok: false, error: 'Name and URL required' };
  try {
    await runInDir(dirPath, 'git', ['remote', 'add', n, u]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Add remote failed' };
  }
}

async function removeRemote(dirPath, name) {
  const n = (name || '').trim();
  if (!n) return { ok: false, error: 'Remote name required' };
  try {
    await runInDir(dirPath, 'git', ['remote', 'remove', n]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Remove remote failed' };
  }
}

/** Rename a remote (e.g. origin → upstream). */
async function renameRemote(dirPath, oldName, newName) {
  const oldN = (oldName || '').trim();
  const newN = (newName || '').trim();
  if (!oldN || !newN) return { ok: false, error: 'Current name and new name required' };
  if (oldN === newN) return { ok: true };
  try {
    await runInDir(dirPath, 'git', ['remote', 'rename', oldN, newN]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Rename remote failed' };
  }
}

/** Change a remote's URL (e.g. point origin to a different repo). */
async function setRemoteUrl(dirPath, name, url) {
  const n = (name || '').trim();
  const u = (url || '').trim();
  if (!n || !u) return { ok: false, error: 'Remote name and URL required' };
  try {
    await runInDir(dirPath, 'git', ['remote', 'set-url', n, u]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Set URL failed' };
  }
}

async function gitCherryPick(dirPath, sha) {
  const s = (sha || '').trim();
  if (!s) return { ok: false, error: 'Commit SHA required' };
  try {
    await runInDir(dirPath, 'git', ['cherry-pick', s]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Cherry-pick failed' };
  }
}

async function gitCherryPickAbort(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['cherry-pick', '--abort']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Cherry-pick abort failed' };
  }
}

async function gitCherryPickContinue(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['cherry-pick', '--continue']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Cherry-pick continue failed' };
  }
}

async function gitReset(dirPath, ref, mode) {
  const r = (ref || 'HEAD').trim();
  const m = mode === 'soft' || mode === 'mixed' || mode === 'hard' ? mode : 'mixed';
  try {
    await runInDir(dirPath, 'git', ['reset', `--${m}`, r]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Reset failed' };
  }
}

/** Get full SHA for a ref (branch, tag, or commit). For "Copy commit SHA" in branch menu. */
async function getBranchRevision(dirPath, ref) {
  const r = (ref || 'HEAD').trim();
  if (!r) return { ok: false, error: 'Ref required', sha: '' };
  try {
    const out = await runInDir(dirPath, 'git', ['rev-parse', r]);
    const sha = (out.stdout || '').trim();
    return { ok: true, sha };
  } catch (e) {
    return { ok: false, error: e.message || 'Rev-parse failed', sha: '' };
  }
}

/** Set branch upstream to origin/<branch>. For "Set Upstream" in branch context menu. */
async function setBranchUpstream(dirPath, branchName) {
  const branch = (branchName || '').trim();
  if (!branch) return { ok: false, error: 'Branch name required' };
  try {
    await runInDir(dirPath, 'git', ['branch', '--set-upstream-to=origin/' + branch, branch]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Set upstream failed' };
  }
}

/** Diff summary between two refs: { files: string[], stats: string }. */
async function getDiffBetween(dirPath, refA, refB) {
  try {
    const out = await runInDir(dirPath, 'git', ['diff', '--stat', refA, refB]);
    const stats = (out.stdout || '').trim();
    const nameOut = await runInDir(dirPath, 'git', ['diff', '--name-only', refA, refB]);
    const files = (nameOut.stdout || '').trim().split(/\r?\n/).filter(Boolean);
    return { ok: true, files, stats };
  } catch (e) {
    return { ok: false, error: e.message || 'Diff failed', files: [], stats: '' };
  }
}

/** Full diff text between two refs (for modal). */
async function getDiffBetweenFull(dirPath, refA, refB) {
  try {
    const out = await runInDir(dirPath, 'git', ['diff', '--no-color', refA, refB]);
    return { ok: true, diff: (out.stdout || '').trim() };
  } catch (e) {
    return { ok: false, error: e.message || 'Diff failed', diff: '' };
  }
}

/**
 * Parse unified diff output for a single file into aligned rows for side-by-side view.
 * Each row: { oldLineNum, newLineNum, oldContent, newContent, type: 'context'|'add'|'remove' }.
 */
function parseUnifiedDiffToRows(diffText) {
  const rows = [];
  const lines = (diffText || '').split(/\r?\n/);
  let oldLine = 0;
  let newLine = 0;
  let inHunk = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1], 10);
      newLine = parseInt(hunkMatch[3], 10);
      inHunk = true;
      continue;
    }
    if (!inHunk) continue;
    const first = line.charAt(0);
    const content = first === '-' || first === '+' || first === ' ' ? line.slice(1) : line;
    if (first === '-') {
      rows.push({ oldLineNum: oldLine, newLineNum: null, oldContent: content, newContent: null, type: 'remove' });
      oldLine++;
    } else if (first === '+') {
      rows.push({ oldLineNum: null, newLineNum: newLine, oldContent: null, newContent: content, type: 'add' });
      newLine++;
    } else {
      rows.push({ oldLineNum: oldLine, newLineNum: newLine, oldContent: content, newContent: content, type: 'context' });
      oldLine++;
      newLine++;
    }
  }
  return rows;
}

/**
 * Get structured diff for one file: aligned rows for side-by-side view.
 * options: { commitSha?: string, staged?: boolean }
 *   - commitSha: diff is commit vs parent.
 *   - staged === true: index vs HEAD (staged changes only).
 *   - staged === false: working tree vs index (unstaged changes only).
 *   - staged undefined: working tree vs HEAD, then fallback to --cached if empty.
 */
async function getFileDiffStructured(dirPath, filePath, options = {}) {
  try {
    let diff = '';
    if (options.commitSha) {
      const out = await runInDir(dirPath, 'git', ['show', '--no-color', options.commitSha, '--', filePath]).catch(() => ({ stdout: '' }));
      diff = (out.stdout || '').trim();
    } else if (options.staged === true) {
      const result = await runInDirCapture(dirPath, 'git', ['diff', '--cached', 'HEAD', '--', filePath]);
      diff = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    } else if (options.staged === false) {
      const result = await runInDirCapture(dirPath, 'git', ['diff', '--', filePath]);
      diff = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    } else {
      const result = await runInDirCapture(dirPath, 'git', ['diff', 'HEAD', '--', filePath]);
      diff = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
      if (!diff) {
        const resultCached = await runInDirCapture(dirPath, 'git', ['diff', '--cached', 'HEAD', '--', filePath]);
        diff = [resultCached.stdout, resultCached.stderr].filter(Boolean).join('\n').trim();
      }
    }
    if (diff) {
      const rows = parseUnifiedDiffToRows(diff);
      return { ok: true, filePath, rows, diff };
    }
    if (!options.commitSha) {
      const fullPath = path.join(dirPath, filePath);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split(/\r?\n/);
          const rows = lines.map((line, i) => ({
            oldLineNum: null,
            newLineNum: i + 1,
            oldContent: null,
            newContent: line,
            type: 'add',
          }));
          return { ok: true, filePath, rows, diff: '' };
        } catch (_) {}
      }
    }
    return { ok: true, filePath, rows: [], diff: '' };
  } catch (e) {
    return { ok: false, error: e.message || 'Diff failed', filePath, rows: [] };
  }
}

/**
 * Revert a single line in a file (working copy): replace or delete line, or insert old line.
 * op: 'replace' | 'delete' | 'insert' — replace line at lineNum with content; delete line at lineNum; insert content before lineNum.
 */
async function revertFileLine(dirPath, filePath, op, lineNum, content) {
  const fullPath = path.join(dirPath, filePath);
  if (!fs.existsSync(fullPath)) return { ok: false, error: 'File not found' };
  let text = fs.readFileSync(fullPath, 'utf8');
  const lineEnding = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const oneBased = Math.max(1, parseInt(lineNum, 10));
  const idx = oneBased - 1;
  if (op === 'delete') {
    if (idx < 0 || idx >= lines.length) return { ok: false, error: 'Line number out of range' };
    lines.splice(idx, 1);
  } else if (op === 'replace') {
    if (idx < 0 || idx >= lines.length) return { ok: false, error: 'Line number out of range' };
    lines[idx] = content != null ? content : '';
  } else if (op === 'insert') {
    const insertIdx = Math.max(0, Math.min(idx, lines.length));
    lines.splice(insertIdx, 0, content != null ? content : '');
  } else {
    return { ok: false, error: 'Invalid operation' };
  }
  fs.writeFileSync(fullPath, lines.join(lineEnding), 'utf8');
  return { ok: true };
}

/** Prune remote-tracking branches (remove refs for branches deleted on remote). */
async function gitPruneRemotes(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['fetch', '--prune']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Prune failed' };
  }
}

/** Amend the last commit (optionally with new message). Uses -S if signCommits preference is set. */
async function gitAmend(dirPath, message) {
  const sign = getPreference('signCommits');
  try {
    const args = ['commit', '--amend'];
    if (sign) args.push('-S');
    if (message != null && String(message).trim()) {
      args.push('-m', String(message).trim());
      await runInDir(dirPath, 'git', args);
    } else {
      args.push('--no-edit');
      await runInDir(dirPath, 'git', args);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Amend failed' };
  }
}

/** Get reflog entries (e.g. last 50). */
async function getReflog(dirPath, n = 50) {
  try {
    const out = await runInDir(dirPath, 'git', ['reflog', '-n', String(n), '--format=%h %gD %s']);
    const lines = (out.stdout || '').trim().split(/\r?\n/).filter(Boolean);
    const entries = lines.map((line) => {
      const match = line.match(/^(\S+)\s+(\S+)\s+(.*)$/);
      return match ? { sha: match[1], ref: match[2], message: match[3] } : { sha: line.split(/\s/)[0] || '', ref: '', message: line };
    });
    return { ok: true, entries };
  } catch (e) {
    return { ok: false, error: e.message || 'Reflog failed', entries: [] };
  }
}

/** Checkout any ref (SHA, branch, reflog ref like HEAD@{1}). */
async function checkoutRef(dirPath, ref) {
  const r = (ref || '').trim();
  if (!r) return { ok: false, error: 'Ref required' };
  try {
    await runInDir(dirPath, 'git', ['checkout', r]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Checkout failed' };
  }
}

/** Get blame for a file (first 500 lines of output). */
async function getBlame(dirPath, filePath) {
  const f = (filePath || '').trim();
  if (!f) return { ok: false, error: 'File path required', text: '' };
  try {
    const out = await runInDir(dirPath, 'git', ['blame', '-w', '--no-color', '-L', '1,500', '--', f]);
    return { ok: true, text: (out.stdout || '').trim() };
  } catch (e) {
    return { ok: false, error: e.message || 'Blame failed', text: '' };
  }
}

/** Delete a tag locally. */
async function deleteTag(dirPath, tagName) {
  const t = (tagName || '').trim();
  if (!t) return { ok: false, error: 'Tag name required' };
  try {
    await runInDir(dirPath, 'git', ['tag', '-d', t]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Delete tag failed' };
  }
}

/** Push a single tag to remote (default origin). */
async function pushTag(dirPath, tagName, remoteName = 'origin') {
  const t = (tagName || '').trim();
  const r = (remoteName || 'origin').trim();
  if (!t) return { ok: false, error: 'Tag name required' };
  try {
    await runInDir(dirPath, 'git', ['push', r, 'refs/tags/' + t]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Push tag failed' };
  }
}

/** Stage a single file (or pathspec). */
async function stageFile(dirPath, filePath) {
  const f = (filePath || '').trim();
  if (!f) return { ok: false, error: 'File path required' };
  try {
    await runInDir(dirPath, 'git', ['add', f]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Stage failed' };
  }
}

/** Unstage a single file (reset from index). */
async function unstageFile(dirPath, filePath) {
  const f = (filePath || '').trim();
  if (!f) return { ok: false, error: 'File path required' };
  try {
    await runInDir(dirPath, 'git', ['reset', 'HEAD', '--', f]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Unstage failed' };
  }
}

/** Discard changes in one file (working tree only; not delete). */
async function discardFile(dirPath, filePath) {
  const f = (filePath || '').trim();
  if (!f) return { ok: false, error: 'File path required' };
  try {
    await runInDir(dirPath, 'git', ['checkout', '--', f]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Discard file failed' };
  }
}

/** Fetch from a specific remote (optional ref). */
async function gitFetchRemote(dirPath, remoteName, ref) {
  const remote = (remoteName || 'origin').trim();
  if (!remote) return { ok: false, error: 'Remote name required' };
  try {
    const args = ['fetch', remote];
    if (ref && String(ref).trim()) args.push(String(ref).trim());
    await runInDir(dirPath, 'git', args);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Fetch failed' };
  }
}

// ---------- Phase 5: Pull rebase, gitignore, submodules ----------
async function gitPullRebase(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['pull', '--rebase']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Pull (rebase) failed' };
  }
}

/** Read .gitignore (first 8KB). */
async function getGitignore(dirPath) {
  const p = path.join(dirPath, '.gitignore');
  try {
    if (!fs.existsSync(p)) return { ok: true, content: null, path: p };
    const content = fs.readFileSync(p, 'utf8').slice(0, 8192);
    return { ok: true, content, path: p };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to read .gitignore', content: null, path: p };
  }
}

/** Read .gitattributes (first 8KB). */
/** Get file content at a ref (e.g. HEAD). Returns { ok, content } or { ok: false, error }. */
async function getFileAtRef(dirPath, filePath, ref = 'HEAD') {
  try {
    const out = await runInDir(dirPath, 'git', ['show', `${ref}:${filePath}`]).catch((e) => ({ stdout: null, stderr: e?.message }));
    if (out.stdout == null) return { ok: false, error: 'File not at ref or not found', content: '' };
    return { ok: true, content: out.stdout };
  } catch (e) {
    return { ok: false, error: e?.message || 'Failed to read file at ref', content: '' };
  }
}

async function getGitattributes(dirPath) {
  const p = path.join(dirPath, '.gitattributes');
  try {
    if (!fs.existsSync(p)) return { ok: true, content: null, path: p };
    const content = fs.readFileSync(p, 'utf8').slice(0, 8192);
    return { ok: true, content, path: p };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to read .gitattributes', content: null, path: p };
  }
}

/** Write .gitignore content. Creates file if missing. */
async function writeGitignore(dirPath, content) {
  const p = path.join(dirPath, '.gitignore');
  try {
    fs.writeFileSync(p, typeof content === 'string' ? content : '', 'utf8');
    return { ok: true, path: p };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to write .gitignore', path: p };
  }
}

/**
 * Common paths/files that are typically gitignored. We scan the project root for these
 * and suggest adding them if not already in .gitignore. Based on common templates
 * (e.g. github/gitignore, GitLab, etc.).
 * name: exact dir or file name to look for at top level
 * pattern: the .gitignore pattern to add
 * label: short label for UI
 * category: group for display (Dependencies, Build, Env, etc.)
 */
const COMMON_IGNORABLES = [
  { name: 'node_modules', pattern: 'node_modules/', label: 'Node dependencies', category: 'Dependencies' },
  { name: 'vendor', pattern: 'vendor/', label: 'Composer / PHP deps', category: 'Dependencies' },
  { name: 'dist', pattern: 'dist/', label: 'Build output (dist)', category: 'Build' },
  { name: 'build', pattern: 'build/', label: 'Build output (build)', category: 'Build' },
  { name: 'out', pattern: 'out/', label: 'Build output (out)', category: 'Build' },
  { name: 'target', pattern: 'target/', label: 'Rust/Cargo build', category: 'Build' },
  { name: '.next', pattern: '.next/', label: 'Next.js build', category: 'Build' },
  { name: '.nuxt', pattern: '.nuxt/', label: 'Nuxt build', category: 'Build' },
  { name: '.output', pattern: '.output/', label: 'Nuxt output', category: 'Build' },
  { name: '__pycache__', pattern: '__pycache__/', label: 'Python cache', category: 'Build' },
  { name: '.venv', pattern: '.venv/', label: 'Python venv', category: 'Environment' },
  { name: 'venv', pattern: 'venv/', label: 'Python venv', category: 'Environment' },
  { name: '.env', pattern: '.env', label: 'Environment / secrets', category: 'Environment' },
  { name: '.env.local', pattern: '.env.local', label: 'Local env overrides', category: 'Environment' },
  { name: '.idea', pattern: '.idea/', label: 'JetBrains IDE', category: 'IDE' },
  { name: '.vscode', pattern: '.vscode/', label: 'VS Code', category: 'IDE' },
  { name: '.cache', pattern: '.cache', label: 'Cache directory', category: 'Cache' },
  { name: '.parcel-cache', pattern: '.parcel-cache/', label: 'Parcel cache', category: 'Cache' },
  { name: '.vite', pattern: '.vite/', label: 'Vite cache', category: 'Cache' },
  { name: '.pytest_cache', pattern: '.pytest_cache/', label: 'Pytest cache', category: 'Cache' },
  { name: '.mypy_cache', pattern: '.mypy_cache/', label: 'mypy cache', category: 'Cache' },
  { name: 'coverage', pattern: 'coverage/', label: 'Coverage reports', category: 'Test' },
  { name: 'htmlcov', pattern: 'htmlcov/', label: 'Python coverage html', category: 'Test' },
  { name: '.nyc_output', pattern: '.nyc_output/', label: 'Istanbul/nyc output', category: 'Test' },
  { name: '.DS_Store', pattern: '.DS_Store', label: 'macOS folder metadata', category: 'OS' },
  { name: 'Thumbs.db', pattern: 'Thumbs.db', label: 'Windows thumbnails', category: 'OS' },
  { name: 'logs', pattern: 'logs/', label: 'Logs directory', category: 'Logs' },
  { name: 'tmp', pattern: 'tmp/', label: 'Temporary files', category: 'Temp' },
  { name: 'temp', pattern: 'temp/', label: 'Temporary files', category: 'Temp' },
];

/** Check if .gitignore content already effectively covers this pattern (exact or broader). */
function gitignoreCoversPattern(existingLines, pattern) {
  const normalized = pattern.replace(/\/$/, '');
  for (const line of existingLines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const lineNorm = t.replace(/\/$/, '');
    if (lineNorm === normalized || lineNorm === pattern || t === pattern) return true;
    if (pattern.endsWith('/') && lineNorm === normalized) return true;
    if (t.includes('*') && normalized.includes(lineNorm.replace(/\*/g, ''))) return true;
    if (lineNorm.length > 0 && pattern.startsWith(lineNorm)) return true;
  }
  return false;
}

/** Scan project root for common ignorable paths and return suggestions not already in .gitignore. */
async function scanProjectForGitignore(dirPath) {
  try {
    if (!dirPath || !fs.existsSync(dirPath)) return { ok: true, suggestions: [] };
    let existingContent = '';
    const gitignorePath = path.join(dirPath, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      existingContent = fs.readFileSync(gitignorePath, 'utf8').slice(0, 8192);
    }
    const existingLines = existingContent.split(/\r?\n/);
    const topLevel = fs.readdirSync(dirPath, { withFileTypes: true });
    const names = new Set(topLevel.map((d) => d.name));

    const suggestions = [];
    for (const entry of COMMON_IGNORABLES) {
      if (!names.has(entry.name)) continue;
      if (gitignoreCoversPattern(existingLines, entry.pattern)) continue;
      suggestions.push({
        pattern: entry.pattern,
        label: entry.label,
        category: entry.category,
      });
    }
    return { ok: true, suggestions };
  } catch (e) {
    return { ok: false, error: e.message || 'Scan failed', suggestions: [] };
  }
}

/** Write .gitattributes content. Creates file if missing. */
async function writeGitattributes(dirPath, content) {
  const p = path.join(dirPath, '.gitattributes');
  try {
    fs.writeFileSync(p, typeof content === 'string' ? content : '', 'utf8');
    return { ok: true, path: p };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to write .gitattributes', path: p };
  }
}

/** Create a test file in the project for testing git actions (stage, diff, discard, etc.). */
async function createTestFile(dirPath, relativePath, content) {
  const body = (content && typeof content === 'string') ? content : `Test file created at ${new Date().toISOString()}\n`;
  let name;
  if (relativePath && typeof relativePath === 'string' && relativePath.trim()) {
    name = relativePath.trim();
  } else {
    const base = 'test-file';
    const ext = '.txt';
    name = `${base}${ext}`;
    const resolvedDir = path.resolve(dirPath);
    for (let n = 2; fs.existsSync(path.join(resolvedDir, name)); n++) {
      name = `${base}-${n}${ext}`;
    }
  }
  const fullPath = path.join(dirPath, name);
  try {
    fs.writeFileSync(fullPath, body, 'utf8');
    return { ok: true, path: fullPath, relativePath: name };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to create file', path: fullPath };
  }
}

/** List submodules: [{ path, url, sha }]. */
async function getSubmodules(dirPath) {
  try {
    const out = await runInDir(dirPath, 'git', ['submodule', 'status']);
    const lines = (out.stdout || '').trim().split(/\r?\n/).filter(Boolean);
    const subs = [];
    for (const line of lines) {
      const match = line.match(/^[\s\-+]?([a-f0-9]+)\s+(\S+)(?:\s+\([^)]*\))?$/);
      if (match) {
        const sha = match[1];
        const subPath = match[2];
        let url = '';
        try {
          const cfg = await runInDir(dirPath, 'git', ['config', '--get', `submodule.${subPath}.url`]);
          url = (cfg.stdout || '').trim();
        } catch (_) {}
        subs.push({ path: subPath, url, sha });
      }
    }
    return { ok: true, submodules: subs };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to list submodules', submodules: [] };
  }
}

async function submoduleUpdate(dirPath, init = true) {
  try {
    const args = init ? ['submodule', 'update', '--init', '--recursive'] : ['submodule', 'update', '--recursive'];
    await runInDir(dirPath, 'git', args);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Submodule update failed' };
  }
}

/** Detect rebase/cherry-pick/merge state for showing Abort buttons. */
async function getGitState(dirPath) {
  const gitDir = path.join(dirPath, '.git');
  const rebasing = fs.existsSync(path.join(gitDir, 'rebase-merge')) || fs.existsSync(path.join(gitDir, 'rebase-apply'));
  const cherryPicking = fs.existsSync(path.join(gitDir, 'sequencer'));
  const merging = fs.existsSync(path.join(gitDir, 'MERGE_HEAD'));
  return { ok: true, rebasing, cherryPicking, merging };
}

/** Get configured git user (committer) for the repo: user.name and user.email. */
async function getGitUser(dirPath) {
  try {
    const [nameOut, emailOut] = await Promise.all([
      runInDir(dirPath, 'git', ['config', '--get', 'user.name']).catch(() => ({ stdout: '' })),
      runInDir(dirPath, 'git', ['config', '--get', 'user.email']).catch(() => ({ stdout: '' })),
    ]);
    const name = (nameOut.stdout || '').trim();
    const email = (emailOut.stdout || '').trim();
    return { ok: true, name, email };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to get git user', name: '', email: '' };
  }
}

/** List worktrees: [{ path, head, branch }]. */
async function getWorktrees(dirPath) {
  try {
    const out = await runInDir(dirPath, 'git', ['worktree', 'list', '--porcelain']);
    const lines = (out.stdout || '').trim().split(/\r?\n/).filter(Boolean);
    const worktrees = [];
    let current = {};
    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (current.path) worktrees.push(current);
        current = { path: line.slice(9).trim(), head: '', branch: '' };
      } else if (line.startsWith('HEAD ')) current.head = line.slice(5).trim();
      else if (line.startsWith('branch ')) current.branch = line.slice(7).trim().replace(/^refs\/heads\//, '');
    }
    if (current.path) worktrees.push(current);
    return { ok: true, worktrees };
  } catch (e) {
    return { ok: false, error: e.message || 'Worktree list failed', worktrees: [] };
  }
}

/** Add a linked worktree. */
async function worktreeAdd(dirPath, worktreePath, branch) {
  const wt = (worktreePath || '').trim();
  if (!wt) return { ok: false, error: 'Worktree path required' };
  try {
    const args = ['worktree', 'add', path.isAbsolute(wt) ? wt : path.join(path.dirname(dirPath), wt)];
    if (branch && String(branch).trim()) args.push('-b', String(branch).trim());
    await runInDir(dirPath, 'git', args);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Worktree add failed' };
  }
}

/** Remove a worktree (must be clean and not current). */
async function worktreeRemove(dirPath, worktreePath) {
  const wt = (worktreePath || '').trim();
  if (!wt) return { ok: false, error: 'Worktree path required' };
  try {
    await runInDir(dirPath, 'git', ['worktree', 'remove', wt]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Worktree remove failed' };
  }
}

/** Get bisect status: { active, current, currentSha, good, bad, remaining, raw }. */
async function getBisectStatus(dirPath) {
  try {
    const out = await runInDir(dirPath, 'git', ['bisect', 'status']);
    const text = (out.stdout || '').trim();
    const active = text.includes('bisecting');
    let current = '';
    let currentSha = '';
    let good = '';
    let bad = '';
    let remaining = '';
    const currentMatch = text.match(/Currently at: ([^\n]+)/);
    if (currentMatch) {
      current = currentMatch[1].trim();
      const shaMatch = current.match(/^([0-9a-f]{7,40})/i);
      if (shaMatch) currentSha = shaMatch[1];
    }
    const goodMatch = text.match(/between ([^\n]+) and/);
    if (goodMatch) good = goodMatch[1].trim();
    const badMatch = text.match(/and ([^\n\s]+)/);
    if (badMatch) bad = badMatch[1].trim();
    const remMatch = text.match(/(\d+) revisions left/);
    if (remMatch) remaining = remMatch[1];
    return { ok: true, active, current, currentSha, good, bad, remaining, raw: text };
  } catch (e) {
    return { ok: false, error: e.message || 'Bisect status failed', active: false, raw: '' };
  }
}

async function bisectStart(dirPath, badRef, goodRef) {
  const bad = (badRef || 'HEAD').trim();
  const good = (goodRef || '').trim();
  try {
    const args = ['bisect', 'start'];
    await runInDir(dirPath, 'git', args);
    await runInDir(dirPath, 'git', ['bisect', 'bad', bad]);
    if (good) await runInDir(dirPath, 'git', ['bisect', 'good', good]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Bisect start failed' };
  }
}

async function bisectGood(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['bisect', 'good']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Bisect good failed' };
  }
}

async function bisectBad(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['bisect', 'bad']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Bisect bad failed' };
  }
}

async function bisectSkip(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['bisect', 'skip']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Bisect skip failed' };
  }
}

/** Run automated bisect: git bisect run <cmd...>. commandArgs e.g. ['npm', 'run', 'test']. Exit 0 = good, non-zero = bad. */
async function bisectRun(dirPath, commandArgs) {
  const args = Array.isArray(commandArgs) && commandArgs.length > 0 ? commandArgs : ['true'];
  const result = await runInDirCapture(dirPath, 'git', ['bisect', 'run', ...args]);
  return { ok: true, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

async function bisectReset(dirPath) {
  try {
    await runInDir(dirPath, 'git', ['bisect', 'reset']);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Bisect reset failed' };
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

/** Get the one-line commit subject at the given ref (default HEAD). */
async function getCommitSubject(dirPath, ref) {
  const r = (ref || 'HEAD').trim();
  try {
    const out = await runInDir(dirPath, 'git', ['log', '-1', '--pretty=format:%s', r]);
    return { ok: true, subject: (out.stdout || '').trim() };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to get commit', subject: '' };
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

  // Vue + Vite renderer is the default (built to dist-renderer)
  win.loadFile(path.join(__dirname, '..', 'dist-renderer', 'index.html'));
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
    if (process.env.NODE_ENV === 'development') {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  });
}

/** State for terminal popout windows: webContentsId -> { dirPath } */
const terminalPopoutStateByWebContentsId = new Map();

function createTerminalPopoutWindow(dirPath) {
  const win = new BrowserWindow({
    width: 900,
    height: 560,
    minWidth: 400,
    minHeight: 300,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Terminal',
  });
  const state = { dirPath: dirPath || '' };
  win.webContents.once('did-start-loading', () => {
    terminalPopoutStateByWebContentsId.set(win.webContents.id, state);
  });
  win.on('closed', () => {
    terminalPopoutStateByWebContentsId.delete(win.webContents.id);
  });
  const indexPath = path.join(__dirname, '..', 'dist-renderer', 'index.html');
  const fileUrl = pathToFileURL(indexPath).href + '#terminal-popout';
  win.loadURL(fileUrl);
  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('rm-theme', getEffectiveTheme());
  });
}

app.whenReady().then(() => {
  store = new Store({ name: 'release-manager' });
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
    gitTagAndPush: (dirPath, tagMessage) => gitTagAndPush(dirPath, tagMessage),
    release: async (dirPath, bump, force, options = {}) => runReleaseImpl(dirPath, bump, force, options),
    getCommitsSinceTag: (dirPath, sinceTag) => getCommitsSinceTag(dirPath, sinceTag),
    getCommitSubject: (dirPath, ref) => getCommitSubject(dirPath, ref),
    getRecentCommits: (dirPath, n) => getRecentCommits(dirPath, n),
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
    getAiProvider: () => getStore().get('aiProvider') || 'ollama',
    setAiProvider: (provider) => {
      getStore().set('aiProvider', provider || 'ollama');
      return null;
    },
    getAiGenerateAvailable: () => {
      const provider = getStore().get('aiProvider') || 'ollama';
      if (provider === 'openai') return !!((getStore().get('openaiApiKey') || '').trim());
      if (provider === 'claude') return !!((getStore().get('claudeApiKey') || '').trim());
      return true;
    },
    ollamaListModels: async (baseUrl) => ollamaListModels(baseUrl || getStore().get('ollamaBaseUrl') || DEFAULT_BASE_URL),
    ollamaGenerateCommitMessage: async (dirPath) => {
      const diff = await getGitDiffForCommit(dirPath);
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
    getGitStatus: (dirPath) => getGitStatus(dirPath),
    getTrackedFiles: (dirPath) => getTrackedFiles(dirPath),
    getProjectFiles: (dirPath) => getProjectFiles(dirPath),
    gitPull: (dirPath) => gitPull(dirPath),
    getBranches: (dirPath) => getBranches(dirPath),
    checkoutBranch: (dirPath, branchName) => checkoutBranch(dirPath, branchName),
    createBranch: (dirPath, branchName, checkout) => createBranch(dirPath, branchName, checkout !== false),
    createBranchFrom: (dirPath, newBranchName, fromRef) => createBranchFrom(dirPath, newBranchName, fromRef),
    gitPush: (dirPath) => gitPushWithUpstream(dirPath),
    gitPushForce: (dirPath, withLease) => gitPushForce(dirPath, !!withLease),
    gitFetch: (dirPath) => gitFetch(dirPath),
    gitMerge: (dirPath, branchName, options) => gitMerge(dirPath, branchName, options || {}),
    gitStashPush: (dirPath, message, options) => gitStashPush(dirPath, message, options || {}),
    commitChanges: (dirPath, message, options) => gitCommit(dirPath, message, options || {}),
    gitStashPop: (dirPath) => gitStashPop(dirPath),
    gitDiscardChanges: (dirPath) => gitDiscardChanges(dirPath),
    gitMergeAbort: (dirPath) => gitMergeAbort(dirPath),
    getRemoteBranches: (dirPath) => getRemoteBranches(dirPath),
    checkoutRemoteBranch: (dirPath, ref) => checkoutRemoteBranch(dirPath, ref),
    getStashList: (dirPath) => getStashList(dirPath),
    stashApply: (dirPath, index) => stashApply(dirPath, index),
    stashDrop: (dirPath, index) => stashDrop(dirPath, index),
    getTags: (dirPath) => getTags(dirPath),
    checkoutTag: (dirPath, tagName) => checkoutTag(dirPath, tagName),
    getCommitLog: (dirPath, n) => getCommitLog(dirPath, n),
    getCommitLogWithBody: (dirPath, n) => getCommitLogWithBody(dirPath, n),
    getCommitDetail: (dirPath, sha) => getCommitDetail(dirPath, sha),
    deleteBranch: (dirPath, branchName, force) => deleteBranch(dirPath, branchName, force),
    deleteRemoteBranch: (dirPath, remoteName, branchName) => deleteRemoteBranch(dirPath, remoteName, branchName),
    gitRebase: (dirPath, ontoBranch) => gitRebase(dirPath, ontoBranch),
    gitRebaseAbort: (dirPath) => gitRebaseAbort(dirPath),
    gitRebaseContinue: (dirPath) => gitRebaseContinue(dirPath),
    gitRebaseSkip: (dirPath) => gitRebaseSkip(dirPath),
    gitMergeContinue: (dirPath) => gitMergeContinue(dirPath),
    getRemotes: (dirPath) => getRemotes(dirPath),
    addRemote: (dirPath, name, url) => addRemote(dirPath, name, url),
    removeRemote: (dirPath, name) => removeRemote(dirPath, name),
    renameRemote: (dirPath, oldName, newName) => renameRemote(dirPath, oldName, newName),
    setRemoteUrl: (dirPath, name, url) => setRemoteUrl(dirPath, name, url),
    gitCherryPick: (dirPath, sha) => gitCherryPick(dirPath, sha),
    gitCherryPickAbort: (dirPath) => gitCherryPickAbort(dirPath),
    gitCherryPickContinue: (dirPath) => gitCherryPickContinue(dirPath),
    renameBranch: (dirPath, oldName, newName) => renameBranch(dirPath, oldName, newName),
    createTag: (dirPath, tagName, message, ref) => createTag(dirPath, tagName, message, ref),
    gitInit: (dirPath) => gitInit(dirPath),
    writeGitignore: (dirPath, content) => writeGitignore(dirPath, content),
    writeGitattributes: (dirPath, content) => writeGitattributes(dirPath, content),
    createTestFile: (dirPath, relativePath, content) => createTestFile(dirPath, relativePath, content),
    gitRebaseInteractive: (dirPath, ref) => gitRebaseInteractive(dirPath, ref),
    gitReset: (dirPath, ref, mode) => gitReset(dirPath, ref, mode),
    getBranchRevision: (dirPath, ref) => getBranchRevision(dirPath, ref),
    setBranchUpstream: (dirPath, branchName) => setBranchUpstream(dirPath, branchName),
    getDiffBetween: (dirPath, refA, refB) => getDiffBetween(dirPath, refA, refB),
    getDiffBetweenFull: (dirPath, refA, refB) => getDiffBetweenFull(dirPath, refA, refB),
    getFileDiffStructured: (dirPath, filePath, options) => getFileDiffStructured(dirPath, filePath, options),
    revertFileLine: (dirPath, filePath, op, lineNum, content) => revertFileLine(dirPath, filePath, op, lineNum, content),
    gitRevert: (dirPath, sha) => gitRevert(dirPath, sha),
    gitPruneRemotes: (dirPath) => gitPruneRemotes(dirPath),
    gitAmend: (dirPath, message) => gitAmend(dirPath, message),
    getReflog: (dirPath, n) => getReflog(dirPath, n),
    checkoutRef: (dirPath, ref) => checkoutRef(dirPath, ref),
    getBlame: (dirPath, filePath) => getBlame(dirPath, filePath),
    deleteTag: (dirPath, tagName) => deleteTag(dirPath, tagName),
    pushTag: (dirPath, tagName, remoteName) => pushTag(dirPath, tagName, remoteName),
    stageFile: (dirPath, filePath) => stageFile(dirPath, filePath),
    unstageFile: (dirPath, filePath) => unstageFile(dirPath, filePath),
    discardFile: (dirPath, filePath) => discardFile(dirPath, filePath),
    gitFetchRemote: (dirPath, remoteName, ref) => gitFetchRemote(dirPath, remoteName, ref),
    gitPullRebase: (dirPath) => gitPullRebase(dirPath),
    gitPullFFOnly: (dirPath) => gitPullFFOnly(dirPath),
    getGitignore: (dirPath) => getGitignore(dirPath),
    scanProjectForGitignore: (dirPath) => scanProjectForGitignore(dirPath),
    getFileAtRef: (dirPath, filePath, ref) => getFileAtRef(dirPath, filePath, ref),
    getGitattributes: (dirPath) => getGitattributes(dirPath),
    getSubmodules: (dirPath) => getSubmodules(dirPath),
    submoduleUpdate: (dirPath, init) => submoduleUpdate(dirPath, init),
    getGitState: (dirPath) => getGitState(dirPath),
    getGitUser: (dirPath) => getGitUser(dirPath),
    getWorktrees: (dirPath) => getWorktrees(dirPath),
    worktreeAdd: (dirPath, worktreePath, branch) => worktreeAdd(dirPath, worktreePath, branch),
    worktreeRemove: (dirPath, worktreePath) => worktreeRemove(dirPath, worktreePath),
    getBisectStatus: (dirPath) => getBisectStatus(dirPath),
    bisectStart: (dirPath, badRef, goodRef) => bisectStart(dirPath, badRef, goodRef),
    bisectGood: (dirPath) => bisectGood(dirPath),
    bisectBad: (dirPath) => bisectBad(dirPath),
    bisectSkip: (dirPath) => bisectSkip(dirPath),
    bisectReset: (dirPath) => bisectReset(dirPath),
    bisectRun: (dirPath, commandArgs) => bisectRun(dirPath, commandArgs),
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
    syncFromRemote: (dirPath) => gitFetch(dirPath),
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
        remoteName = await getPushRemote(dirPath);
      } catch (_) {}
      if (!remoteName) return { ok: false, error: 'No push remote configured' };
      let remoteUrl;
      try {
        const out = await runInDir(dirPath, 'git', ['remote', 'get-url', remoteName]);
        remoteUrl = (out.stdout || '').trim() || null;
      } catch (_) {}
      const slug = getRepoSlug(remoteUrl);
      if (!slug) return { ok: false, error: 'Not a GitHub repo. Configure a GitHub remote and push branch.' };
      let headBranch;
      try {
        const out = await runInDir(dirPath, 'git', ['branch', '--show-current']);
        headBranch = (out.stdout || '').trim();
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
    getProcessesConfig: () => getProcessesConfig(),
    setProcessesConfig: (config) => setProcessesConfig(config),
    startProcess: (projectPath, processId, name, command) => startProcess(projectPath, processId, name, command),
    stopProcess: (projectPath, processId) => stopProcess(projectPath, processId),
    getProcessStatus: () => getProcessStatus(),
    getProcessOutput: (projectPath, processId, lines) => getProcessOutput(projectPath, processId, lines),
    startAllProcesses: (projectPath) => startAllProcesses(projectPath),
    stopAllProcesses: (projectPath) => stopAllProcesses(projectPath),
    getSuggestedProcesses: (dirPath) => getSuggestedProcesses(dirPath),
    getEmailSmtpStatus: () => getEmailSmtpStatus(),
    startEmailSmtpServer: (port) => startEmailSmtpServer(port),
    stopEmailSmtpServer: () => stopEmailSmtpServer(),
    getEmails: () => getEmails(),
    clearEmails: () => clearEmails(),
    startTunnel: (port, subdomain) => startTunnel(port, subdomain),
    stopTunnel: (id) => stopTunnel(id),
    getTunnels: () => getTunnels(),
    getFtpStatus: () => getFtpStatus(),
    ftpConnect: (config) => ftpConnect(config),
    ftpDisconnect: () => ftpDisconnect(),
    ftpList: (remotePath) => ftpList(remotePath),
    ftpDownload: (remotePath, localPath) => ftpDownload(remotePath, localPath),
    ftpUpload: (localPath, remotePath) => ftpUpload(localPath, remotePath),
    ftpRemove: (remotePath) => ftpRemove(remotePath),
    showSaveDialog: (options) => showSaveDialog(options),
    showOpenDialog: (options) => showOpenDialog(options),
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
    listApiMethods: () => Object.keys(apiRegistry).filter((k) => k !== 'listApiMethods' && k !== 'invokeApi'),
    getApiDocs: () => getApiDocsFromModule(),
    getApiMethodDoc: (methodName) => getApiMethodDocFromModule(methodName),
    getSampleResponse: (methodName) => getSampleResponseForMethod(methodName),
    invokeApi: (method, params) => runApiMethod(method, params),
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
      const pushResult = await gitTagAndPush(dirPath, plan.tagMessage);
      if (!pushResult.ok) return { ok: false, error: pushResult.error };
      return { ok: true, tag: pushResult.tag, bump: plan.bump };
    }
    const pushResult = await gitTagAndPush(dirPath, plan.tagMessage, { version: plan.versionForTag });
    if (!pushResult.ok) return { ok: false, error: pushResult.error };
    return { ok: true, tag: pushResult.tag, bump: null };
  }
  function openInTerminalImpl(dirPath) {
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
      const result = await runInDirCapture(dirPath, 'git', ['diff', 'HEAD', '--', filePath]);
      const content = [result.stdout, result.stderr].filter(Boolean).join('\n').trim() || '(no diff)';
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
  ipcMain.handle('rm-run-shell-command', (_e, dirPath, command) => runShellCommand(dirPath, command));
  ipcMain.handle('rm-open-terminal-popout', (_e, dirPath) => {
    createTerminalPopoutWindow(dirPath);
    return Promise.resolve();
  });
  ipcMain.handle('rm-get-terminal-popout-state', (e) => {
    const state = terminalPopoutStateByWebContentsId.get(e.sender.id);
    return Promise.resolve(state || { dirPath: '' });
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
    'rm-get-changelog': 'getChangelog',
    'rm-get-preference': 'getPreference',
    'rm-get-available-php-versions': 'getAvailablePhpVersions',
    'rm-parse-php-require': 'getPhpVersionFromRequire',
    'rm-set-preference': 'setPreference',
    'rm-get-theme': 'getTheme',
    'rm-set-theme': 'setTheme',
  };
  for (const [channel, methodName] of Object.entries(IPC_TO_METHOD)) {
    ipcMain.handle(channel, (_e, ...args) => {
      debug.log(getStore, 'ipc', channel, 'args.length=', args?.length ?? 0);
      return apiRegistry[methodName](...args);
    });
  }

  createWindow();
  debug.log(getStore, 'app', 'window created');
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
    for (const [, entry] of runningProcesses) {
      if (entry?.child && !entry.child.killed) entry.child.kill('SIGTERM');
    }
    runningProcesses.clear();
  } catch (_) {}
  try {
    for (const [, entry] of activeTunnels) {
      if (entry.tunnel && typeof entry.tunnel.close === 'function') entry.tunnel.close();
    }
    activeTunnels.clear();
  } catch (_) {}
  try {
    if (smtpServerInstance) {
      smtpServerInstance.close();
      smtpServerInstance = null;
    }
  } catch (_) {}
  try {
    ftpDisconnect();
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
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
