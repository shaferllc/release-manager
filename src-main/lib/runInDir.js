/**
 * Run a command in a directory. Accepts optional spawn impl for testing.
 */

function runInDir(dirPath, command, args, options = {}, spawnImpl) {
  const spawn = spawnImpl || require('child_process').spawn;
  return new Promise((resolve, reject) => {
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
    proc.stdout?.on('data', (d) => {
      stdout += d.toString();
    });
    proc.stderr?.on('data', (d) => {
      stderr += d.toString();
    });
    proc.on('close', (code) => {
      if (code === 0) resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      else reject(new Error(stderr || stdout || `Exit code ${code}`));
    });
    proc.on('error', reject);
  });
}

module.exports = { runInDir };
