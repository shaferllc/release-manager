import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCommandPalette } from './useCommandPalette';
import { registerCommand } from './registry';

describe('useCommandPalette', () => {
  let mockApi;

  beforeEach(() => {
    mockApi = {
      getPreference: vi.fn().mockResolvedValue(null),
      setPreference: vi.fn().mockResolvedValue(undefined),
      sendTelemetry: vi.fn(),
    };
    if (globalThis.window) globalThis.window.releaseManager = mockApi;
  });

  it('returns isOpen, recentIds, open, close, toggle, runCommand, loadRecents', () => {
    const palette = useCommandPalette();
    expect(palette.isOpen).toBeDefined();
    expect(palette.recentIds).toBeDefined();
    expect(typeof palette.open).toBe('function');
    expect(typeof palette.close).toBe('function');
    expect(typeof palette.toggle).toBe('function');
    expect(typeof palette.runCommand).toBe('function');
    expect(typeof palette.loadRecents).toBe('function');
  });

  it('open sets isOpen true and sends telemetry', () => {
    const { open, isOpen } = useCommandPalette();
    open();
    expect(isOpen.value).toBe(true);
    expect(mockApi.sendTelemetry).toHaveBeenCalledWith('command_palette.opened', {});
  });

  it('close sets isOpen false', () => {
    const { open, close, isOpen } = useCommandPalette();
    open();
    close();
    expect(isOpen.value).toBe(false);
  });

  it('toggle flips isOpen', () => {
    const { toggle, isOpen } = useCommandPalette();
    expect(isOpen.value).toBe(false);
    toggle();
    expect(isOpen.value).toBe(true);
    toggle();
    expect(isOpen.value).toBe(false);
  });

  it('loadRecents loads from preference', async () => {
    mockApi.getPreference.mockResolvedValue(['cmd-a', 'cmd-b']);
    const { loadRecents, recentIds } = useCommandPalette();
    await loadRecents();
    expect(recentIds.value).toEqual(['cmd-a', 'cmd-b']);
  });

  it('runCommand executes command and closes', () => {
    const id = `test-cmd-${Date.now()}`;
    const run = vi.fn();
    registerCommand({ id, label: 'Test', run });
    const { open, runCommand, isOpen } = useCommandPalette();
    open();
    runCommand(id);
    expect(run).toHaveBeenCalled();
    expect(isOpen.value).toBe(false);
  });

  it('runCommand adds to recentIds', () => {
    const id = `recent-cmd-${Date.now()}`;
    const run = vi.fn();
    registerCommand({ id, label: 'Recent', run });
    const { runCommand, recentIds } = useCommandPalette();
    runCommand(id);
    expect(recentIds.value).toContain(id);
  });

  it('runCommand does nothing for unknown id', () => {
    const { runCommand, isOpen } = useCommandPalette();
    runCommand('unknown-id');
    expect(isOpen.value).toBe(false);
  });

  it('runCommand handles async command that returns promise', () => {
    const id = `async-cmd-${Date.now()}`;
    const run = vi.fn().mockResolvedValue(undefined);
    registerCommand({ id, label: 'Async', run });
    const { runCommand } = useCommandPalette();
    runCommand(id);
    expect(run).toHaveBeenCalled();
  });

  it('runCommand persists recentIds via setPreference', () => {
    const id = `save-cmd-${Date.now()}`;
    registerCommand({ id, label: 'Save', run: vi.fn() });
    const { runCommand } = useCommandPalette();
    runCommand(id);
    expect(mockApi.setPreference).toHaveBeenCalledWith('commandPalette.recentIds', expect.any(Array));
  });

  it('runCommand logs when command throws', () => {
    const err = new Error('cmd failed');
    const id = `throw-cmd-${Date.now()}`;
    registerCommand({ id, label: 'Throw', run: () => { throw err; } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { runCommand } = useCommandPalette();
    runCommand(id);
    expect(spy).toHaveBeenCalledWith('[commandPalette] command failed:', id, err);
    spy.mockRestore();
  });

  it('runCommand logs when async command rejects', async () => {
    const err = new Error('async failed');
    const id = `reject-cmd-${Date.now()}`;
    registerCommand({ id, label: 'Reject', run: () => Promise.reject(err) });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { runCommand } = useCommandPalette();
    runCommand(id);
    await vi.waitFor(() => expect(spy).toHaveBeenCalledWith('[commandPalette] command failed:', id, err));
    spy.mockRestore();
  });
});
