import { describe, it, expect, vi } from 'vitest';
import { registerCommand, unregisterCommand, getCommands, useCommands } from './registry';

describe('commandPalette registry', () => {
  it('registerCommand adds command', () => {
    const run = vi.fn();
    const id = `cmd-${Date.now()}`;
    registerCommand({ id, label: 'Test', run });
    const cmds = getCommands();
    expect(cmds).toContainEqual(
      expect.objectContaining({ id, label: 'Test', run }),
    );
  });

  it('registerCommand warns when required fields missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registerCommand({ id: 'x' });
    registerCommand({ label: 'Y' });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('registerCommand warns on duplicate id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const id = `dup-${Date.now()}`;
    registerCommand({ id, label: 'A', run: () => {} });
    registerCommand({ id, label: 'B', run: () => {} });
    expect(warn).toHaveBeenCalledWith(expect.any(String), id);
    warn.mockRestore();
  });

  it('unregisterCommand removes by id', () => {
    const id = `del-${Date.now()}`;
    registerCommand({ id, label: 'Delete me', run: () => {} });
    expect(getCommands().some((c) => c.id === id)).toBe(true);
    unregisterCommand(id);
    expect(getCommands().some((c) => c.id === id)).toBe(false);
  });

  it('useCommands returns computed', () => {
    const commands = useCommands();
    expect(commands.value).toBeInstanceOf(Array);
  });
});
