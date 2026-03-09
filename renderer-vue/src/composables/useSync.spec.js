import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSync } from './useSync';

describe('useSync', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getReleasesUrl: vi.fn(),
        syncFromRemote: vi.fn(),
        downloadLatestRelease: vi.fn(),
        copyToClipboard: vi.fn(),
        downloadAsset: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns syncStatus, releasesUrl, copyFeedback, openDocs, sync, etc.', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const modals = { openModal: vi.fn() };
    const notifications = { add: vi.fn() };
    const runWithOverlay = (p) => p;
    const result = useSync(store, () => ({}), modals, notifications, runWithOverlay);
    expect(result).toHaveProperty('syncStatus');
    expect(result).toHaveProperty('releasesUrl');
    expect(result).toHaveProperty('copyFeedback');
    expect(result).toHaveProperty('openDocs');
    expect(result).toHaveProperty('openChooseVersion');
    expect(result).toHaveProperty('sync');
    expect(result).toHaveProperty('downloadLatest');
    expect(result).toHaveProperty('copyStatus');
  });

  it('openDocs opens docs modal', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const modals = { openModal: vi.fn() };
    const notifications = { add: vi.fn() };
    const runWithOverlay = (p) => p;
    const { openDocs } = useSync(store, () => ({}), modals, notifications, runWithOverlay);
    openDocs('branch-sync');
    expect(modals.openModal).toHaveBeenCalledWith('docs', { docKey: 'branch-sync' });
  });

  it('openChooseVersion sets status when no remote', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const modals = { openModal: vi.fn() };
    const notifications = { add: vi.fn() };
    const runWithOverlay = (p) => p;
    const { syncStatus, openChooseVersion } = useSync(store, () => ({}), modals, notifications, runWithOverlay);
    openChooseVersion();
    expect(syncStatus.value).toBe('Select a project with a GitHub remote.');
  });

  it('sync sets error status on failure', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.syncFromRemote.mockRejectedValue(new Error('Network error'));
    const modals = { openModal: vi.fn() };
    const notifications = { add: vi.fn() };
    const runWithOverlay = (p) => p;
    const { syncStatus, sync } = useSync(store, () => ({}), modals, notifications, runWithOverlay);
    await sync();
    expect(syncStatus.value).toBe('Network error');
    expect(notifications.add).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('sync calls syncFromRemote and sets status', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.syncFromRemote.mockResolvedValue(undefined);
    const modals = { openModal: vi.fn() };
    const notifications = { add: vi.fn() };
    const runWithOverlay = (p) => p;
    const { sync } = useSync(store, () => ({}), modals, notifications, runWithOverlay);
    await sync();
    expect(api.syncFromRemote).toHaveBeenCalledWith('/test');
    expect(notifications.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Sync complete', type: 'success' })
    );
  });

  it('downloadLatest sets status when API returns ok', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.downloadLatestRelease = vi.fn().mockResolvedValue({ ok: true, filePath: '/tmp/release.zip' });
    const modals = { openModal: vi.fn() };
    const notifications = { add: vi.fn() };
    const runWithOverlay = (p) => p;
    const { syncStatus, downloadLatest } = useSync(store, () => ({ gitRemote: 'https://github.com/x/y' }), modals, notifications, runWithOverlay);
    await downloadLatest();
    expect(syncStatus.value).toContain('Saved to');
    expect(notifications.add).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('releasesUrl is set by watch when getInfo returns gitRemote', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const api = globalThis.window?.releaseManager;
    api.getReleasesUrl.mockResolvedValue('https://github.com/owner/repo/releases');
    const modals = { openModal: vi.fn() };
    const notifications = { add: vi.fn() };
    const runWithOverlay = (p) => p;
    const getInfo = vi.fn().mockReturnValue({ gitRemote: 'https://github.com/owner/repo' });
    const { releasesUrl } = useSync(store, getInfo, modals, notifications, runWithOverlay);
    await new Promise((r) => setTimeout(r, 20));
    expect(releasesUrl.value).toContain('releases');
  });

  it('downloadLatest sets error on catch', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.downloadLatestRelease.mockRejectedValue(new Error('Network error'));
    const modals = { openModal: vi.fn() };
    const notifications = { add: vi.fn() };
    const runWithOverlay = (p) => p;
    const { syncStatus, downloadLatest } = useSync(
      store,
      () => ({ gitRemote: 'https://github.com/x/y' }),
      modals,
      notifications,
      runWithOverlay
    );
    await downloadLatest();
    expect(syncStatus.value).toBe('Network error');
    expect(notifications.add).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('copyStatus copies to clipboard', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const api = globalThis.window?.releaseManager;
    const modals = { openModal: vi.fn() };
    const notifications = { add: vi.fn() };
    const runWithOverlay = (p) => p;
    const { syncStatus, copyStatus, copyFeedback } = useSync(store, () => ({}), modals, notifications, runWithOverlay);
    syncStatus.value = 'Synced.';
    await copyStatus();
    expect(api.copyToClipboard).toHaveBeenCalledWith('Synced.');
    expect(copyFeedback.value).toBe(true);
  });

  it('openChooseVersion onSelect with single asset downloads and shows success', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const api = globalThis.window?.releaseManager;
    api.downloadAsset.mockResolvedValue({ ok: true, filePath: '/tmp/x.zip' });
    const modals = { openModal: vi.fn() };
    const notifications = { add: vi.fn() };
    const runWithOverlay = (p) => p;
    const getInfo = () => ({ gitRemote: 'https://github.com/x/y' });
    const { syncStatus, openChooseVersion } = useSync(store, getInfo, modals, notifications, runWithOverlay);
    openChooseVersion();
    const opts = modals.openModal.mock.calls[0][1];
    opts.onSelect({ assets: [{ browser_download_url: 'https://x.com/a.zip', name: 'a.zip' }] });
    await new Promise((r) => setTimeout(r, 50));
    expect(syncStatus.value).toContain('Saved to');
    expect(notifications.add).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('openChooseVersion onSelect with single asset handles download error', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const api = globalThis.window?.releaseManager;
    api.downloadAsset.mockResolvedValue({ ok: false, error: 'Failed' });
    const modals = { openModal: vi.fn() };
    const notifications = { add: vi.fn() };
    const runWithOverlay = (p) => p;
    const getInfo = () => ({ gitRemote: 'https://github.com/x/y' });
    const { syncStatus, openChooseVersion } = useSync(store, getInfo, modals, notifications, runWithOverlay);
    openChooseVersion();
    const opts = modals.openModal.mock.calls[0][1];
    opts.onSelect({ assets: [{ browser_download_url: 'https://x.com/a.zip', name: 'a.zip' }] });
    await new Promise((r) => setTimeout(r, 50));
    expect(syncStatus.value).toBe('Failed');
    expect(notifications.add).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('openChooseVersion onSelect with multiple assets opens pickAsset', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const modals = { openModal: vi.fn() };
    const notifications = { add: vi.fn() };
    const runWithOverlay = (p) => p;
    const getInfo = () => ({ gitRemote: 'https://github.com/x/y' });
    const { openChooseVersion } = useSync(store, getInfo, modals, notifications, runWithOverlay);
    openChooseVersion();
    const opts = modals.openModal.mock.calls[0][1];
    opts.onSelect({ assets: [{ name: 'a.zip' }, { name: 'b.zip' }] });
    expect(modals.openModal).toHaveBeenCalledWith('pickAsset', expect.any(Object));
  });

  it('downloadLatest sets status when canceled', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.downloadLatestRelease = vi.fn().mockResolvedValue({ ok: false, canceled: true });
    const modals = { openModal: vi.fn() };
    const notifications = { add: vi.fn() };
    const runWithOverlay = (p) => p;
    const { syncStatus, downloadLatest } = useSync(store, () => ({ gitRemote: 'https://github.com/x/y' }), modals, notifications, runWithOverlay);
    await downloadLatest();
    expect(syncStatus.value).toBe('Canceled.');
  });
});
