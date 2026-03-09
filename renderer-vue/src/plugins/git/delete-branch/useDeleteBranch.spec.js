import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDeleteBranch } from './useDeleteBranch';

describe('useDeleteBranch', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getBranches: vi.fn(),
        renameBranch: vi.fn(),
        deleteBranch: vi.fn(),
        deleteRemoteBranch: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns branches, error, branchToRename, cancelRename, startRename, renameBranch, deleteLocal', () => {
    const result = useDeleteBranch();
    expect(result).toHaveProperty('branches');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('branchToRename');
    expect(result).toHaveProperty('cancelRename');
    expect(result).toHaveProperty('startRename');
    expect(result).toHaveProperty('renameBranch');
    expect(result).toHaveProperty('deleteLocal');
  });

  it('cancelRename clears branchToRename', () => {
    const { branchToRename, startRename, cancelRename } = useDeleteBranch();
    startRename('feature');
    expect(branchToRename.value).toBe('feature');
    cancelRename();
    expect(branchToRename.value).toBe(null);
  });

  it('load sets branches via useBranchesList', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getBranches.mockResolvedValue(['main', 'feature']);

    const { branches, load } = useDeleteBranch();
    await load();
    expect(branches.value).toHaveLength(2);
  });

  it('startRename sets branchToRename and renameNewName', () => {
    const { branchToRename, renameNewName, startRename } = useDeleteBranch();
    startRename('feature');
    expect(branchToRename.value).toBe('feature');
    expect(renameNewName.value).toBe('feature');
  });

  it('renameBranch calls api when valid', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getBranches.mockResolvedValue(['main']);
    api.renameBranch.mockResolvedValue(undefined);

    const { branchToRename, renameNewName, renameBranch, load } = useDeleteBranch();
    await load();
    branchToRename.value = 'old-branch';
    renameNewName.value = 'new-branch';
    await renameBranch();
    expect(api.renameBranch).toHaveBeenCalledWith('/test', 'old-branch', 'new-branch');
  });

  it('deleteLocal calls deleteBranch when confirmed', async () => {
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getBranches.mockResolvedValue(['main']);
    api.deleteBranch.mockResolvedValue(undefined);
    const onRefresh = vi.fn();
    const { deleteLocal } = useDeleteBranch({ onRefresh });
    await deleteLocal('feature');
    expect(api.deleteBranch).toHaveBeenCalledWith('/test', 'feature', false);
    expect(onRefresh).toHaveBeenCalled();
    window.confirm = originalConfirm;
  });

  it('deleteOnRemote calls deleteRemoteBranch when confirmed', async () => {
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.deleteRemoteBranch.mockResolvedValue(undefined);
    const onRefresh = vi.fn();
    const { deleteOnRemote } = useDeleteBranch({ onRefresh });
    await deleteOnRemote('feature');
    expect(api.deleteRemoteBranch).toHaveBeenCalledWith('/test', 'origin', 'feature');
    expect(onRefresh).toHaveBeenCalled();
    window.confirm = originalConfirm;
  });
});
