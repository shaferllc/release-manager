import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useBranchSync } from './useBranchSync';

describe('useBranchSync', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getRemoteBranches: vi.fn(),
        gitPull: vi.fn(),
        gitPush: vi.fn(),
        gitFetch: vi.fn(),
        gitPushForce: vi.fn(),
        checkoutRemoteBranch: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns status, remoteBranches, remoteBranch, remoteBranchOptions, loadRemoteBranches, run', () => {
    const result = useBranchSync();
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('remoteBranches');
    expect(result).toHaveProperty('remoteBranch');
    expect(result).toHaveProperty('remoteBranchOptions');
    expect(result).toHaveProperty('loadRemoteBranches');
    expect(result).toHaveProperty('run');
  });

  it('loadRemoteBranches sets remoteBranches when API returns ok', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getRemoteBranches.mockResolvedValue({ ok: true, branches: ['main', 'develop'] });

    const { remoteBranches, loadRemoteBranches } = useBranchSync();
    await loadRemoteBranches();
    expect(remoteBranches.value).toEqual(['main', 'develop']);
  });

  it('run calls api method and sets status', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const onRefresh = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.gitPull.mockResolvedValue(undefined);

    const { status, run } = useBranchSync({ onRefresh });
    await run('gitPull');
    expect(api.gitPull).toHaveBeenCalledWith('/test');
    expect(status.value).toBe('Done.');
    expect(onRefresh).toHaveBeenCalled();
  });

  it('remoteBranchOptions includes empty option', () => {
    const { remoteBranchOptions } = useBranchSync();
    expect(remoteBranchOptions.value[0]).toEqual({ value: '', label: '—' });
  });

  it('run sets status on error', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.gitPull.mockRejectedValue(new Error('Conflict'));

    const { status, run } = useBranchSync();
    await run('gitPull');
    expect(status.value).toBe('Conflict');
  });

  it('runForcePush calls gitPushForce when confirmed', async () => {
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.gitPushForce.mockResolvedValue(undefined);
    const onRefresh = vi.fn();

    const { status, runForcePush } = useBranchSync({ onRefresh });
    await runForcePush();
    expect(api.gitPushForce).toHaveBeenCalledWith('/test', true);
    expect(status.value).toBe('Done.');
    expect(onRefresh).toHaveBeenCalled();
    window.confirm = originalConfirm;
  });

  it('checkoutRemote calls checkoutRemoteBranch when confirmed', async () => {
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.checkoutRemoteBranch.mockResolvedValue({ ok: true });
    const onRefresh = vi.fn();

    const { remoteBranch, status, checkoutRemote } = useBranchSync({ onRefresh });
    remoteBranch.value = 'origin/feature';
    await checkoutRemote();
    expect(api.checkoutRemoteBranch).toHaveBeenCalledWith('/test', 'origin/feature');
    expect(status.value).toBe('Checked out.');
    expect(onRefresh).toHaveBeenCalled();
    window.confirm = originalConfirm;
  });
});
