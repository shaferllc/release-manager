import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useInlineTerminal } from './useInlineTerminal';

describe('useInlineTerminal', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        copyToClipboard: vi.fn(),
        runShellCommand: vi.fn(),
        getProjectInfo: vi.fn(),
        getProjectTestScripts: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });
  it('returns input, blocks, running, clear, displayPath, etc.', () => {
    const result = useInlineTerminal(() => '/path', () => false);
    expect(result).toHaveProperty('input');
    expect(result).toHaveProperty('blocks');
    expect(result).toHaveProperty('running');
    expect(result).toHaveProperty('clear');
    expect(result).toHaveProperty('displayPath');
  });

  it('clear empties blocks', () => {
    const { blocks, clear } = useInlineTerminal(() => '', () => false);
    blocks.value = [{ command: 'ls', stdout: 'x' }];
    clear();
    expect(blocks.value).toEqual([]);
  });

  it('copyOutput calls copyToClipboard when blocks exist', () => {
    const { blocks, copyOutput } = useInlineTerminal(() => '/path', () => false);
    blocks.value = [{ cwd: '/path', command: 'ls', stdout: 'file.txt' }];
    copyOutput();
    expect(globalThis.window.releaseManager.copyToClipboard).toHaveBeenCalled();
  });

  it('promptLine returns dir name with $ prefix/suffix', () => {
    const { promptLine } = useInlineTerminal(() => '/path', () => false);
    expect(promptLine('/repo/project')).toBe('$ project $');
  });

  it('historyUp cycles through history', async () => {
    const api = globalThis.window?.releaseManager;
    api.runShellCommand.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
    const { input, historyUp, runCommandText } = useInlineTerminal(() => '/path', () => false);
    await runCommandText('cmd1');
    await runCommandText('cmd2');
    input.value = 'current';
    const e = { preventDefault: vi.fn() };
    historyUp(e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(input.value).toBe('cmd2');
    historyUp(e);
    expect(input.value).toBe('cmd1');
  });

  it('historyDown restores temp when at end', async () => {
    const api = globalThis.window?.releaseManager;
    api.runShellCommand.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
    const { input, historyUp, historyDown, runCommandText } = useInlineTerminal(() => '/path', () => false);
    await runCommandText('cmd1');
    input.value = 'typed';
    const e = { preventDefault: vi.fn() };
    historyUp(e);
    expect(input.value).toBe('cmd1');
    historyDown(e);
    expect(input.value).toBe('typed');
  });

  it('runCommandText adds block and calls runShellCommand', async () => {
    const api = globalThis.window?.releaseManager;
    api.runShellCommand.mockResolvedValue({ stdout: 'ok', stderr: '', exitCode: 0 });
    const { blocks, runCommandText } = useInlineTerminal(() => '/path', () => false);
    await runCommandText('ls -la');
    expect(blocks.value).toHaveLength(1);
    expect(blocks.value[0].command).toBe('ls -la');
    expect(blocks.value[0].stdout).toBe('ok');
    expect(blocks.value[0].exitCode).toBe(0);
  });

  it('runCommandText sets error on API failure', async () => {
    const api = globalThis.window?.releaseManager;
    api.runShellCommand.mockRejectedValue(new Error('Permission denied'));
    const { blocks, runCommandText } = useInlineTerminal(() => '/path', () => false);
    await runCommandText('bad');
    expect(blocks.value[0].stderr).toBe('Permission denied');
    expect(blocks.value[0].exitCode).toBe(-1);
  });

  it('runScript runs npm command', async () => {
    const api = globalThis.window?.releaseManager;
    api.getProjectInfo.mockResolvedValue({ projectType: 'npm' });
    api.getProjectTestScripts.mockResolvedValue({ scripts: ['test'] });
    api.runShellCommand.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
    const { blocks, runScript } = useInlineTerminal(() => '/path', () => true);
    await runScript('test');
    await new Promise((r) => setTimeout(r, 50));
    expect(blocks.value.some((b) => b.command?.includes('npm run test'))).toBe(true);
  });

  it('runScript runs composer for php', async () => {
    const api = globalThis.window?.releaseManager;
    api.getProjectInfo.mockResolvedValue({ projectType: 'php' });
    api.getProjectTestScripts.mockResolvedValue({ scripts: ['test'] });
    api.runShellCommand.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
    const { blocks, runScript } = useInlineTerminal(() => '/path', () => true);
    await new Promise((r) => setTimeout(r, 80));
    await runScript('test');
    await new Promise((r) => setTimeout(r, 80));
    expect(blocks.value.some((b) => b.command?.includes('composer run-script test'))).toBe(true);
  });

  it('displayPath truncates long paths', () => {
    const longPath = 'a'.repeat(60);
    const { displayPath } = useInlineTerminal(() => longPath, () => false);
    expect(displayPath.value).toContain('…');
    expect(displayPath.value.length).toBe(39);
  });
});
