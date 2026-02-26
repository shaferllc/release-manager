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
const { parsePorcelainLines } = require('./lib/gitPorcelain');
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
  parseStashList: parseStashListLib,
  parseRemoteBranches: parseRemoteBranchesLib,
  parseCommitLog: parseCommitLogLib,
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
  let conflictCount = 0;
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
  try {
    const args = ['stash', 'push'];
    if (options.includeUntracked) args.push('--include-untracked');
    if (options.keepIndex) args.push('--keep-index');
    if (message && message.trim()) args.push('-m', message.trim());
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
  try {
    const out = await runInDir(dirPath, 'git', ['stash', 'list', '--pretty=format:%gd %s']);
    const entries = parseStashListLib(out.stdout || '');
    return { ok: true, entries };
  } catch (e) {
    return { ok: false, error: e.message || 'Failed to list stash', entries: [] };
  }
}

async function stashApply(dirPath, index) {
  try {
    const args = index ? ['stash', 'apply', index] : ['stash', 'apply'];
    await runInDir(dirPath, 'git', args);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Stash apply failed' };
  }
}

async function stashDrop(dirPath, index) {
  try {
    const args = index ? ['stash', 'drop', index] : ['stash', 'drop'];
    await runInDir(dirPath, 'git', args);
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

/** Commit log entries: { sha, subject, author, date }. */
async function getCommitLog(dirPath, n = 30) {
  const limit = Math.max(1, Math.min(100, n));
  try {
    const out = await runInDir(dirPath, 'git', [
      'log',
      '-n',
      String(limit),
      '--pretty=format:%h%x00%s%x00%an%x00%ad',
      '--date=short',
      '--no-merges',
    ]);
    const commits = parseCommitLogLib(out.stdout || '');
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
    const [infoOut, diffOut] = await Promise.all([
      runInDir(dirPath, 'git', ['show', '-s', '--format=%s%n%an%n%ad%n%b', '--date=short', s]).catch(() => ({ stdout: '' })),
      runInDir(dirPath, 'git', ['show', '--no-color', s]).catch(() => ({ stdout: '' })),
    ]);
    const infoLines = (infoOut.stdout || '').trim().split(/\r?\n/);
    const subject = infoLines[0] || '';
    const author = infoLines[1] || '';
    const date = infoLines[2] || '';
    const body = infoLines.slice(3).join('\n').trim();
    const diff = (diffOut.stdout || '').trim();
    return { ok: true, sha: s, subject, author, date, body, diff };
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

/** Revert a commit by SHA (creates a new commit that undoes it). */
async function gitRevert(dirPath, sha) {
  try {
    await runInDir(dirPath, 'git', ['revert', '--no-edit', sha]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'Revert failed' };
  }
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

/** List worktrees: [{ path, head, branch }]. */
async function getWorktrees(dirPath) {
  try {
    const out = await runInDir(dirPath, 'git', ['worktree', 'list', '--porcelain']);
    const lines = (out.stdout || '').trim().split(/\r?\n/).filter(Boolean);
    const worktrees = [];
    let current = {};
    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (current.worktree) worktrees.push(current);
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
  ipcMain.handle('rm-commit-changes', (_e, dirPath, message, options) => gitCommit(dirPath, message, options || {}));
  ipcMain.handle('rm-git-pull', (_e, dirPath) => gitPull(dirPath));
  ipcMain.handle('rm-git-stash-push', (_e, dirPath, message, options) => gitStashPush(dirPath, message, options || {}));
  ipcMain.handle('rm-git-stash-pop', (_e, dirPath) => gitStashPop(dirPath));
  ipcMain.handle('rm-git-discard-changes', (_e, dirPath) => gitDiscardChanges(dirPath));
  ipcMain.handle('rm-git-merge-abort', (_e, dirPath) => gitMergeAbort(dirPath));
  ipcMain.handle('rm-get-branches', (_e, dirPath) => getBranches(dirPath));
  ipcMain.handle('rm-checkout-branch', (_e, dirPath, branchName) => checkoutBranch(dirPath, branchName));
  ipcMain.handle('rm-create-branch', (_e, dirPath, branchName, checkout) => createBranch(dirPath, branchName, checkout !== false));
  ipcMain.handle('rm-git-push', (_e, dirPath) => gitPushWithUpstream(dirPath));
  ipcMain.handle('rm-git-push-force', (_e, dirPath, withLease) => gitPushForce(dirPath, !!withLease));
  ipcMain.handle('rm-git-merge', (_e, dirPath, branchName, options) => gitMerge(dirPath, branchName, options || {}));
  ipcMain.handle('rm-rename-branch', (_e, dirPath, oldName, newName) => renameBranch(dirPath, oldName, newName));
  ipcMain.handle('rm-create-tag', (_e, dirPath, tagName, message, ref) => createTag(dirPath, tagName, message, ref));
  ipcMain.handle('rm-git-cherry-pick-continue', (_e, dirPath) => gitCherryPickContinue(dirPath));
  ipcMain.handle('rm-write-gitignore', (_e, dirPath, content) => writeGitignore(dirPath, content));
  ipcMain.handle('rm-write-gitattributes', (_e, dirPath, content) => writeGitattributes(dirPath, content));
  ipcMain.handle('rm-git-rebase-interactive', (_e, dirPath, ref) => gitRebaseInteractive(dirPath, ref));
  // Phase 1
  ipcMain.handle('rm-get-remote-branches', (_e, dirPath) => getRemoteBranches(dirPath));
  ipcMain.handle('rm-checkout-remote-branch', (_e, dirPath, ref) => checkoutRemoteBranch(dirPath, ref));
  ipcMain.handle('rm-get-stash-list', (_e, dirPath) => getStashList(dirPath));
  ipcMain.handle('rm-stash-apply', (_e, dirPath, index) => stashApply(dirPath, index));
  ipcMain.handle('rm-stash-drop', (_e, dirPath, index) => stashDrop(dirPath, index));
  // Phase 2
  ipcMain.handle('rm-get-tags', (_e, dirPath) => getTags(dirPath));
  ipcMain.handle('rm-checkout-tag', (_e, dirPath, tagName) => checkoutTag(dirPath, tagName));
  ipcMain.handle('rm-get-commit-log', (_e, dirPath, n) => getCommitLog(dirPath, n));
  ipcMain.handle('rm-get-commit-detail', (_e, dirPath, sha) => getCommitDetail(dirPath, sha));
  // Phase 3
  ipcMain.handle('rm-delete-branch', (_e, dirPath, branchName, force) => deleteBranch(dirPath, branchName, force));
  ipcMain.handle('rm-delete-remote-branch', (_e, dirPath, remoteName, branchName) => deleteRemoteBranch(dirPath, remoteName, branchName));
  ipcMain.handle('rm-git-rebase', (_e, dirPath, ontoBranch) => gitRebase(dirPath, ontoBranch));
  ipcMain.handle('rm-git-rebase-abort', (_e, dirPath) => gitRebaseAbort(dirPath));
  ipcMain.handle('rm-git-rebase-continue', (_e, dirPath) => gitRebaseContinue(dirPath));
  ipcMain.handle('rm-git-rebase-skip', (_e, dirPath) => gitRebaseSkip(dirPath));
  ipcMain.handle('rm-git-merge-continue', (_e, dirPath) => gitMergeContinue(dirPath));
  // Phase 4
  ipcMain.handle('rm-get-remotes', (_e, dirPath) => getRemotes(dirPath));
  ipcMain.handle('rm-add-remote', (_e, dirPath, name, url) => addRemote(dirPath, name, url));
  ipcMain.handle('rm-remove-remote', (_e, dirPath, name) => removeRemote(dirPath, name));
  ipcMain.handle('rm-git-cherry-pick', (_e, dirPath, sha) => gitCherryPick(dirPath, sha));
  ipcMain.handle('rm-git-cherry-pick-abort', (_e, dirPath) => gitCherryPickAbort(dirPath));
  ipcMain.handle('rm-git-reset', (_e, dirPath, ref, mode) => gitReset(dirPath, ref, mode));
  ipcMain.handle('rm-get-diff-between', (_e, dirPath, refA, refB) => getDiffBetween(dirPath, refA, refB));
  ipcMain.handle('rm-get-diff-between-full', (_e, dirPath, refA, refB) => getDiffBetweenFull(dirPath, refA, refB));
  ipcMain.handle('rm-git-revert', (_e, dirPath, sha) => gitRevert(dirPath, sha));
  ipcMain.handle('rm-git-prune-remotes', (_e, dirPath) => gitPruneRemotes(dirPath));
  ipcMain.handle('rm-git-amend', (_e, dirPath, message) => gitAmend(dirPath, message));
  ipcMain.handle('rm-get-reflog', (_e, dirPath, n) => getReflog(dirPath, n));
  ipcMain.handle('rm-checkout-ref', (_e, dirPath, ref) => checkoutRef(dirPath, ref));
  ipcMain.handle('rm-get-blame', (_e, dirPath, filePath) => getBlame(dirPath, filePath));
  ipcMain.handle('rm-delete-tag', (_e, dirPath, tagName) => deleteTag(dirPath, tagName));
  ipcMain.handle('rm-push-tag', (_e, dirPath, tagName, remoteName) => pushTag(dirPath, tagName, remoteName));
  ipcMain.handle('rm-stage-file', (_e, dirPath, filePath) => stageFile(dirPath, filePath));
  ipcMain.handle('rm-unstage-file', (_e, dirPath, filePath) => unstageFile(dirPath, filePath));
  ipcMain.handle('rm-discard-file', (_e, dirPath, filePath) => discardFile(dirPath, filePath));
  ipcMain.handle('rm-git-fetch-remote', (_e, dirPath, remoteName, ref) => gitFetchRemote(dirPath, remoteName, ref));
  // Phase 5
  ipcMain.handle('rm-git-pull-rebase', (_e, dirPath) => gitPullRebase(dirPath));
  ipcMain.handle('rm-get-gitignore', (_e, dirPath) => getGitignore(dirPath));
  ipcMain.handle('rm-get-gitattributes', (_e, dirPath) => getGitattributes(dirPath));
  ipcMain.handle('rm-get-submodules', (_e, dirPath) => getSubmodules(dirPath));
  ipcMain.handle('rm-submodule-update', (_e, dirPath, init) => submoduleUpdate(dirPath, init));
  ipcMain.handle('rm-get-git-state', (_e, dirPath) => getGitState(dirPath));
  ipcMain.handle('rm-get-worktrees', (_e, dirPath) => getWorktrees(dirPath));
  ipcMain.handle('rm-worktree-add', (_e, dirPath, worktreePath, branch) => worktreeAdd(dirPath, worktreePath, branch));
  ipcMain.handle('rm-worktree-remove', (_e, dirPath, worktreePath) => worktreeRemove(dirPath, worktreePath));
  ipcMain.handle('rm-get-bisect-status', (_e, dirPath) => getBisectStatus(dirPath));
  ipcMain.handle('rm-bisect-start', (_e, dirPath, badRef, goodRef) => bisectStart(dirPath, badRef, goodRef));
  ipcMain.handle('rm-bisect-good', (_e, dirPath) => bisectGood(dirPath));
  ipcMain.handle('rm-bisect-bad', (_e, dirPath) => bisectBad(dirPath));
  ipcMain.handle('rm-bisect-reset', (_e, dirPath) => bisectReset(dirPath));
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
