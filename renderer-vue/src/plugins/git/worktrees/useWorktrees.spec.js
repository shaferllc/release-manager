import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWorktrees } from './useWorktrees';

describe('useWorktrees', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getWorktrees: vi.fn(),
        worktreeRemove: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns worktrees, error, load, openAddWorktreeModal, remove', () => {
    const result = useWorktrees();
    expect(result).toHaveProperty('worktrees');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('load');
    expect(result).toHaveProperty('openAddWorktreeModal');
    expect(result).toHaveProperty('remove');
  });

  it('load sets worktrees when API returns ok', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getWorktrees.mockResolvedValue({ ok: true, worktrees: [{ path: '/test', head: 'main' }] });

    const { worktrees, load } = useWorktrees();
    await load();
    expect(worktrees.value).toHaveLength(1);
    expect(worktrees.value[0].path).toBe('/test');
  });

  it('openAddWorktreeModal opens addWorktree modal when path exists', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const { activeModal } = await import('../../../composables/useModals');
    const store = useAppStore();
    store.selectedPath = '/test';
    const { openAddWorktreeModal } = useWorktrees();
    openAddWorktreeModal();
    expect(activeModal.value).toBe('addWorktree');
  });

  it('remove calls worktreeRemove when confirmed', async () => {
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getWorktrees.mockResolvedValue({ ok: true, worktrees: [] });
    api.worktreeRemove.mockResolvedValue(undefined);
    const onRefresh = vi.fn();
    const { remove } = useWorktrees({ onRefresh });
    await remove('/test/worktree');
    expect(api.worktreeRemove).toHaveBeenCalledWith('/test', '/test/worktree');
    expect(onRefresh).toHaveBeenCalled();
    window.confirm = originalConfirm;
  });
});
