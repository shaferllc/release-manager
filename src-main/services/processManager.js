const path = require('path');
const fs = require('fs');

const MAX_OUTPUT_LINES = 500;

/**
 * Create the process manager service (SoloTerm-style dev stack).
 * @param {Object} deps
 * @param {Function} deps.getStore
 * @param {Function} deps.send - (channel, ...args) => void to notify renderer
 * @param {Function} deps.spawn - child_process.spawn
 * @param {Function} deps.getNpmScriptNames - (content) => { ok, scripts }
 * @param {Function} deps.getComposerManifestInfo - (dirPath, fs) => { ok, scripts }
 */
function createProcessManager(deps) {
  const { getStore, send, spawn, getNpmScriptNames, getComposerManifestInfo } = deps;
  const runningProcesses = new Map();

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
    send('rm-process-status-changed');
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

  function cleanup() {
    try {
      for (const [, entry] of runningProcesses) {
        if (entry?.child && !entry.child.killed) entry.child.kill('SIGTERM');
      }
      runningProcesses.clear();
    } catch (_) {}
  }

  return {
    getProcessesConfig,
    setProcessesConfig,
    startProcess,
    stopProcess,
    getProcessStatus,
    getProcessOutput,
    startAllProcesses,
    stopAllProcesses,
    getSuggestedProcesses,
    cleanup,
  };
}

module.exports = { createProcessManager };
