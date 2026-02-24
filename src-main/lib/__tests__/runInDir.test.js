const { runInDir } = require('../runInDir');

describe('runInDir', () => {
  it('resolves with stdout on exit 0', async () => {
    const mockSpawn = () => ({
      stdout: { on: (ev, fn) => { if (ev === 'data') fn(Buffer.from('hello\n')); } },
      stderr: { on: () => {} },
      on: (ev, fn) => { if (ev === 'close') fn(0); },
    });
    const result = await runInDir('/tmp', 'git', ['status'], {}, mockSpawn);
    expect(result.stdout).toBe('hello');
    expect(result.stderr).toBe('');
  });

  it('rejects with stderr on non-zero exit', async () => {
    const mockSpawn = () => ({
      stdout: { on: () => {} },
      stderr: { on: (ev, fn) => { if (ev === 'data') fn(Buffer.from('fatal: not a repo')); } },
      on: (ev, fn) => { if (ev === 'close') fn(1); },
    });
    await expect(runInDir('/tmp', 'git', ['status'], {}, mockSpawn)).rejects.toThrow(
      /not a repo|Exit code 1/
    );
  });

  it('rejects with stdout when stderr empty and non-zero exit', async () => {
    const mockSpawn = () => ({
      stdout: { on: (ev, fn) => { if (ev === 'data') fn(Buffer.from('something')); } },
      stderr: { on: () => {} },
      on: (ev, fn) => { if (ev === 'close') fn(1); },
    });
    await expect(runInDir('/tmp', 'git', ['x'], {}, mockSpawn)).rejects.toThrow(/something|Exit code 1/);
  });

  it('rejects with "Exit code N" when both stdout and stderr empty', async () => {
    const mockSpawn = () => ({
      stdout: { on: () => {} },
      stderr: { on: () => {} },
      on: (ev, fn) => { if (ev === 'close') fn(2); },
    });
    await expect(runInDir('/tmp', 'git', ['x'], {}, mockSpawn)).rejects.toThrow('Exit code 2');
  });

  it('rejects on spawn error', async () => {
    const mockSpawn = () => {
      const proc = {
        stdout: { on: () => {} },
        stderr: { on: () => {} },
        on: (ev, fn) => { if (ev === 'error') fn(new Error('spawn ENOENT')); },
      };
      return proc;
    };
    await expect(runInDir('/tmp', 'nonexistent', [], {}, mockSpawn)).rejects.toThrow('spawn ENOENT');
  });

  it('uses default spawn when spawnImpl not passed', async () => {
    const result = await runInDir(process.cwd(), 'node', ['-e', "console.log('hi')"]);
    expect(result.stdout).toBe('hi');
  });

  it('uses cmd.exe and /c when platform is win32', async () => {
    const originalPlatform = process.platform;
    let capturedCmd;
    let capturedArgs;
    const mockSpawn = (cmd, args) => {
      capturedCmd = cmd;
      capturedArgs = args;
      return {
        stdout: { on: (ev, fn) => { if (ev === 'data') fn(Buffer.from('ok')); } },
        stderr: { on: () => {} },
        on: (ev, fn) => { if (ev === 'close') fn(0); },
      };
    };
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    try {
      const result = await runInDir('/tmp', 'git', ['status'], {}, mockSpawn);
      expect(capturedCmd).toBe('cmd.exe');
      expect(capturedArgs).toEqual(['/c', 'git', 'status']);
      expect(result.stdout).toBe('ok');
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    }
  });
});
