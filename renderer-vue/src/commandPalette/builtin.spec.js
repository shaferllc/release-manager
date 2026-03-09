import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerBuiltinCommands, BUILTIN_IDS } from './builtin';
import { getCommands, unregisterCommand } from './registry';

describe('builtin commands', () => {
  beforeEach(() => {
    BUILTIN_IDS.forEach((id) => unregisterCommand(id));
  });

  it('registers built-in commands and run invokes store', () => {
    const store = { setViewMode: vi.fn() };
    const onRefresh = vi.fn();
    const onAddProject = vi.fn();
    const onSyncAll = vi.fn().mockResolvedValue(undefined);
    const openSetupWizard = vi.fn();
    registerBuiltinCommands({
      store,
      onRefresh,
      onAddProject,
      onSyncAll,
      openSetupWizard,
    });
    const cmds = getCommands();
    expect(cmds.some((c) => c.id === 'app.go-to-dashboard')).toBe(true);
    const dashCmd = cmds.find((c) => c.id === 'app.go-to-dashboard');
    dashCmd?.run();
    expect(store.setViewMode).toHaveBeenCalledWith('dashboard');
  });

  it('runs navigation and project commands', () => {
    const store = { setViewMode: vi.fn() };
    const onRefresh = vi.fn();
    const onAddProject = vi.fn();
    const onSyncAll = vi.fn().mockResolvedValue(undefined);
    const openSetupWizard = vi.fn();
    registerBuiltinCommands({
      store,
      onRefresh,
      onAddProject,
      onSyncAll,
      openSetupWizard,
    });
    const cmds = getCommands();
    const run = (id) => cmds.find((c) => c.id === id)?.run?.();
    run('app.go-to-project');
    run('app.go-to-settings');
    run('app.go-to-extensions');
    run('app.go-to-docs');
    run('app.go-to-changelog');
    run('app.go-to-api');
    expect(store.setViewMode).toHaveBeenCalledWith('detail');
    expect(store.setViewMode).toHaveBeenCalledWith('settings');
    expect(store.setViewMode).toHaveBeenCalledWith('extensions');
    expect(store.setViewMode).toHaveBeenCalledWith('docs');
    expect(store.setViewMode).toHaveBeenCalledWith('changelog');
    expect(store.setViewMode).toHaveBeenCalledWith('api');
    run('app.refresh');
    expect(onRefresh).toHaveBeenCalled();
    run('app.add-project');
    expect(onAddProject).toHaveBeenCalled();
    run('app.sync-all');
    expect(onSyncAll).toHaveBeenCalled();
    run('app.setup-wizard');
    expect(openSetupWizard).toHaveBeenCalled();
  });
});
