/**
 * Project detection and install runner for "Install for project" (Node, PHP, Rust, Ruby).
 * Used by main process; testable without Electron.
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

/** Detect project type(s) in dirPath. Returns { path, detected: [{ id, label, installCommand }] } */
function detectProject(dirPath) {
  const result = { path: dirPath, detected: [] };
  if (!dirPath || !fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return result;
  }
  const dir = path.resolve(dirPath);

  try {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps.express) {
        result.detected.push({
          id: 'node-express',
          language: 'node',
          label: 'Node.js (Express)',
          installCommand: 'npm install express-codeseer codeseer-node',
        });
      } else if (deps.react || deps['react-dom']) {
        result.detected.push({
          id: 'node-react',
          language: 'node',
          label: 'Node.js (React)',
          installCommand: 'npm install react-codeseer',
        });
      } else if (deps.vue) {
        result.detected.push({
          id: 'node-vue',
          language: 'node',
          label: 'Node.js (Vue)',
          installCommand: 'npm install vue-codeseer',
        });
      } else if (deps.alpinejs || deps['@alpinejs/collapse']) {
        result.detected.push({
          id: 'node-alpine',
          language: 'node',
          label: 'Node.js (Alpine.js)',
          installCommand: 'npm install alpinejs-codeseer',
        });
      }
      if (!result.detected.some((d) => d.language === 'node')) {
        result.detected.push({
          id: 'node',
          language: 'node',
          label: 'Node.js',
          installCommand: 'npm install codeseer-node',
        });
      }
    }
  } catch (_) {}

  if (fs.existsSync(path.join(dir, 'composer.json'))) {
    result.detected.push({
      id: 'php',
      language: 'php',
      label: 'PHP',
      installCommand: 'composer require shaferllc/codeseer-php && php vendor/bin/codeseer-install.php install',
    });
  }

  if (fs.existsSync(path.join(dir, 'Cargo.toml'))) {
    result.detected.push({
      id: 'rust',
      language: 'rust',
      label: 'Rust',
      installCommand: 'cargo add codeseer',
    });
  }

  if (fs.existsSync(path.join(dir, 'Gemfile'))) {
    result.detected.push({
      id: 'ruby',
      language: 'ruby',
      label: 'Ruby',
      installCommand: 'bundle add codeseer',
    });
  } else if (fs.existsSync(path.join(dir, 'Gemfile.lock')) || fs.existsSync(path.join(dir, '.ruby-version'))) {
    result.detected.push({
      id: 'ruby',
      language: 'ruby',
      label: 'Ruby',
      installCommand: 'gem install codeseer',
    });
  }

  return result;
}

/** Run install for a detected language. Returns Promise<{ ok, stdout, stderr, error }> */
function runInstallForProject(dirPath, option) {
  const dir = path.resolve(dirPath);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return Promise.resolve({ ok: false, error: 'Invalid directory' });
  }

  const isWin = process.platform === 'win32';
  const run = (command, args, opts = {}) => {
    return new Promise((resolve) => {
      const proc = spawn(command, args, {
        cwd: dir,
        shell: isWin,
        stdio: ['ignore', 'pipe', 'pipe'],
        ...opts,
      });
      let stdout = '';
      let stderr = '';
      proc.stdout?.on('data', (d) => { stdout += d.toString(); });
      proc.stderr?.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        resolve({ ok: code === 0, stdout, stderr, code });
      });
      proc.on('error', (err) => {
        resolve({ ok: false, stdout, stderr, error: err.message });
      });
    });
  };

  const optionId = option.id || option;
  if (optionId === 'php' || (typeof option === 'object' && option.language === 'php')) {
    return run('composer', ['require', 'shaferllc/codeseer-php', '--no-interaction']).then((r1) => {
      if (!r1.ok) return r1;
      return run('php', [path.join(dir, 'vendor', 'bin', 'codeseer-install.php'), 'install', '--no-php-ini']);
    });
  }
  if (optionId === 'rust' || (typeof option === 'object' && option.language === 'rust')) {
    return run('cargo', ['add', 'codeseer']);
  }
  if (optionId === 'ruby' || (typeof option === 'object' && option.language === 'ruby')) {
    if (fs.existsSync(path.join(dir, 'Gemfile'))) {
      return run('bundle', ['add', 'codeseer']);
    }
    return run('gem', ['install', 'codeseer']);
  }
  if (optionId.startsWith('node') || (typeof option === 'object' && option.language === 'node')) {
    const pkg = optionId === 'node-express' ? ['express-codeseer', 'codeseer-node']
      : optionId === 'node-react' ? ['react-codeseer']
      : optionId === 'node-vue' ? ['vue-codeseer']
      : optionId === 'node-alpine' ? ['alpinejs-codeseer']
      : ['codeseer-node'];
    return run('npm', ['install', ...pkg, '--no-audit', '--no-fund']);
  }

  return Promise.resolve({ ok: false, error: 'Unknown option' });
}

module.exports = { detectProject, runInstallForProject };
