import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRemotes } from './useRemotes';

describe('useRemotes', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getRemotes: vi.fn(),
        addRemote: vi.fn(),
        removeRemote: vi.fn(),
        renameRemote: vi.fn(),
        setRemoteUrl: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns remotes, error, newName, newUrl, load, addRemote, remove, rename, changeUrl', () => {
    const result = useRemotes();
    expect(result).toHaveProperty('remotes');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('newName');
    expect(result).toHaveProperty('newUrl');
    expect(result).toHaveProperty('load');
    expect(result).toHaveProperty('addRemote');
    expect(result).toHaveProperty('remove');
    expect(result).toHaveProperty('rename');
    expect(result).toHaveProperty('changeUrl');
  });

  it('load sets remotes when API returns ok', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getRemotes.mockResolvedValue({ ok: true, remotes: [{ name: 'origin', url: 'https://github.com/x/y' }] });

    const { remotes, load } = useRemotes();
    await load();
    expect(remotes.value).toHaveLength(1);
    expect(remotes.value[0].name).toBe('origin');
  });

  it('addRemote calls API and onRefresh when ok', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const onRefresh = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.addRemote.mockResolvedValue(undefined);
    api.getRemotes.mockResolvedValue({ ok: true, remotes: [] });

    const { newName, newUrl, addRemote } = useRemotes({ onRefresh });
    newName.value = 'upstream';
    newUrl.value = 'https://github.com/other/repo';
    await addRemote();
    expect(api.addRemote).toHaveBeenCalledWith('/test', 'upstream', 'https://github.com/other/repo');
    expect(onRefresh).toHaveBeenCalled();
  });

  it('remove calls API when confirm accepted', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const origConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    const onRefresh = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.removeRemote.mockResolvedValue(undefined);
    api.getRemotes.mockResolvedValue({ ok: true, remotes: [] });

    const { remove } = useRemotes({ onRefresh });
    await remove('upstream');
    expect(api.removeRemote).toHaveBeenCalledWith('/test', 'upstream');
    expect(onRefresh).toHaveBeenCalled();
    window.confirm = origConfirm;
  });

  it('rename calls renameRemote when prompt returns new name', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const origPrompt = window.prompt;
    window.prompt = vi.fn(() => 'upstream2');
    const onRefresh = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.renameRemote.mockResolvedValue({});
    api.getRemotes.mockResolvedValue({ ok: true, remotes: [] });

    const { rename } = useRemotes({ onRefresh });
    await rename({ name: 'upstream', url: 'https://x.com' });
    expect(api.renameRemote).toHaveBeenCalledWith('/test', 'upstream', 'upstream2');
    expect(onRefresh).toHaveBeenCalled();
    window.prompt = origPrompt;
  });

  it('changeUrl calls setRemoteUrl when prompt returns url', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const origPrompt = window.prompt;
    window.prompt = vi.fn(() => 'https://github.com/new/repo');
    const onRefresh = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.setRemoteUrl.mockResolvedValue({});
    api.getRemotes.mockResolvedValue({ ok: true, remotes: [] });

    const { changeUrl } = useRemotes({ onRefresh });
    await changeUrl({ name: 'origin', url: 'https://old.com' });
    expect(api.setRemoteUrl).toHaveBeenCalledWith('/test', 'origin', 'https://github.com/new/repo');
    expect(onRefresh).toHaveBeenCalled();
    window.prompt = origPrompt;
  });
});
