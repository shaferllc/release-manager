/**
 * Terminal service: run shell commands, open system terminal, terminal popout window.
 * Uses child_process.spawn (injected) for testability. For a real PTY experience in-app,
 * consider integrating node-pty + xterm.js in the renderer.
 */

const { pathToFileURL } = require('url');

/** Remove ANSI escape codes for parsing/display. */
function stripAnsi(text) {
  if (text == null || typeof text !== 'string') return '';
  return text
    .replace(/\x1b\[[\d;]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[?[\d;]*[a-zA-Z]/g, '');
}

/**
 * Run a command and return { ok, exitCode, stdout, stderr } without rejecting on non-zero exit.
 * @param {string} dirPath - Working directory
 * @param {string} command - Executable name
 * @param {string[]} args - Arguments
 * @param {object} options - Spawn options (merged with cwd, stdio)
 * @param {Function} spawnImpl - spawn(cmd, args, opts)
 */
function runInDirCapture(dirPath, command, args, options = {}, spawnImpl) {
  const spawn = spawnImpl || require('child_process').spawn;
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
        stdout: stripAnsi(stdout).trim(),
        stderr: stripAnsi(stderr).trim(),
      });
    });
    proc.on('error', (e) => {
      resolve({ ok: false, exitCode: -1, stdout: '', stderr: e.message || 'Spawn failed' });
    });
  });
}

/**
 * Run a shell command string in dirPath (for inline terminal). Returns { ok, exitCode, stdout, stderr }.
 */
function runShellCommand(dirPath, command, spawnImpl) {
  const spawn = spawnImpl || require('child_process').spawn;
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

/**
 * Open the system terminal (Terminal.app, cmd.exe, or Linux terminal) in dirPath.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
function openInSystemTerminal(dirPath, spawnImpl) {
  const spawn = spawnImpl || require('child_process').spawn;
  if (!dirPath || typeof dirPath !== 'string') return Promise.resolve({ ok: false, error: 'Invalid path' });
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      const escaped = dirPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const script = `tell application "Terminal" to do script "cd \\"${escaped}\\""`;
      spawn('osascript', ['-e', script], { detached: true, stdio: 'ignore' });
    } else if (platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', 'cmd', '/k', 'cd', '/d', dirPath], { detached: true, stdio: 'ignore' });
    } else {
      spawn('x-terminal-emulator', ['-e', `cd "${dirPath}" && exec $SHELL`], { detached: true, stdio: 'ignore' }).on('error', () => {
        spawn('gnome-terminal', ['--working-directory', dirPath], { detached: true, stdio: 'ignore' });
      });
    }
    return Promise.resolve({ ok: true });
  } catch (e) {
    return Promise.resolve({ ok: false, error: e.message });
  }
}

/** Create a state holder for terminal popout windows: webContentsId -> { dirPath }. */
function createTerminalPopoutState() {
  const map = new Map();
  return {
    get(webContentsId) {
      return map.get(webContentsId) || { dirPath: '' };
    },
    set(webContentsId, state) {
      map.set(webContentsId, state);
    },
    delete(webContentsId) {
      map.delete(webContentsId);
    },
  };
}

/** Terminal popout size presets (Electron BrowserWindow width/height). */
const TERMINAL_POPOUT_SIZES = {
  compact: { width: 700, height: 450, minWidth: 360, minHeight: 260 },
  default: { width: 900, height: 560, minWidth: 400, minHeight: 300 },
  spacious: { width: 1200, height: 760, minWidth: 500, minHeight: 380 },
};

/**
 * Create the terminal popout BrowserWindow and register its state.
 * Uses getPreference (optional) for: terminalPopoutSize, terminalPopoutAlwaysOnTop, terminalPopoutFullscreenable.
 * Electron options used: width, height, minWidth, minHeight, center, alwaysOnTop, fullscreenable, backgroundColor, resizable, title, icon, show.
 * @param {string} dirPath - Project directory for the terminal
 * @param {object} deps - { BrowserWindow, path, fs, getEffectiveTheme, iconPath, indexPath, preloadPath, state, getPreference? }
 */
function createTerminalPopoutWindow(dirPath, deps) {
  const {
    BrowserWindow,
    path,
    fs,
    getEffectiveTheme,
    iconPath,
    indexPath,
    preloadPath,
    state,
    getPreference,
  } = deps;
  const sizeKey = (getPreference && getPreference('terminalPopoutSize')) || 'default';
  const size = TERMINAL_POPOUT_SIZES[sizeKey] || TERMINAL_POPOUT_SIZES.default;
  const alwaysOnTop = !!(getPreference && getPreference('terminalPopoutAlwaysOnTop'));
  const fullscreenable = getPreference ? getPreference('terminalPopoutFullscreenable') !== false : true;
  const theme = getEffectiveTheme?.() ?? 'dark';
  const backgroundColor = theme === 'light' ? '#f5f5f5' : '#1e1e1e';

  const win = new BrowserWindow({
    width: size.width,
    height: size.height,
    minWidth: size.minWidth,
    minHeight: size.minHeight,
    center: true,
    resizable: true,
    alwaysOnTop,
    fullscreenable,
    backgroundColor,
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Terminal',
  });
  const stateValue = { dirPath: dirPath || '' };
  win.webContents.once('did-start-loading', () => {
    state.set(win.webContents.id, stateValue);
  });
  win.on('closed', () => {
    state.delete(win.webContents.id);
  });
  const fileUrl = pathToFileURL(indexPath).href + '#terminal-popout';
  win.loadURL(fileUrl);
  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('rm-theme', getEffectiveTheme());
  });
}

module.exports = {
  stripAnsi,
  runInDirCapture,
  runShellCommand,
  openInSystemTerminal,
  createTerminalPopoutState,
  createTerminalPopoutWindow,
};
