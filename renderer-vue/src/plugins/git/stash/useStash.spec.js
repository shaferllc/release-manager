import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useStash } from './useStash';

describe('useStash', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getStashList: vi.fn(),
        gitStashPush: vi.fn(),
        gitStashPop: vi.fn(),
        stashApply: vi.fn(),
        stashDrop: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns entries, error, includeUntracked, keepIndex, load, stashPush, stashPop, stashApply, stashDrop', () => {
    const result = useStash();
    expect(result).toHaveProperty('entries');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('includeUntracked');
    expect(result).toHaveProperty('keepIndex');
    expect(result).toHaveProperty('load');
    expect(result).toHaveProperty('stashPush');
    expect(result).toHaveProperty('stashPop');
    expect(result).toHaveProperty('stashApply');
    expect(result).toHaveProperty('stashDrop');
  });

  it('load sets entries when API returns ok', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getStashList.mockResolvedValue({ ok: true, entries: [{ ref: 'stash@{0}', message: 'WIP' }] });

    const { entries, load } = useStash();
    await load();
    expect(entries.value).toHaveLength(1);
    expect(entries.value[0].message).toBe('WIP');
  });

  it('load sets error when API returns error', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getStashList.mockResolvedValue({ ok: false, error: 'Not a git repo' });

    const { entries, error, load } = useStash();
    await load();
    expect(entries.value).toEqual([]);
    expect(error.value).toBe('Not a git repo');
  });

  it('stashApply calls API and onRefresh when ok', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const onRefresh = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.stashApply.mockResolvedValue({ ok: true });
    api.getStashList.mockResolvedValue({ ok: true, entries: [] });

    const { stashApply } = useStash({ onRefresh });
    await stashApply(0);
    expect(api.stashApply).toHaveBeenCalledWith('/test', 0);
    expect(onRefresh).toHaveBeenCalled();
  });

  it('stashDrop calls API when confirm accepted', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const origConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    const onRefresh = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.stashDrop.mockResolvedValue({ ok: true });
    api.getStashList.mockResolvedValue({ ok: true, entries: [] });

    const { stashDrop } = useStash({ onRefresh });
    await stashDrop(0);
    expect(api.stashDrop).toHaveBeenCalledWith('/test', 0);
    expect(onRefresh).toHaveBeenCalled();
    window.confirm = origConfirm;
  });

  it('stashPush calls gitStashPush when prompt not cancelled', async () => {
    const originalPrompt = window.prompt;
    window.prompt = vi.fn(() => 'WIP');
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.gitStashPush.mockResolvedValue({ ok: true });
    api.getStashList.mockResolvedValue({ ok: true, entries: [] });
    const onRefresh = vi.fn();

    const { stashPush } = useStash({ onRefresh });
    await stashPush();
    expect(api.gitStashPush).toHaveBeenCalledWith('/test', 'WIP', expect.any(Object));
    expect(onRefresh).toHaveBeenCalled();
    window.prompt = originalPrompt;
  });

  it('stashPop calls gitStashPop when confirmed', async () => {
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.gitStashPop.mockResolvedValue({ ok: true });
    api.getStashList.mockResolvedValue({ ok: true, entries: [] });
    const onRefresh = vi.fn();

    const { stashPop } = useStash({ onRefresh });
    await stashPop();
    expect(api.gitStashPop).toHaveBeenCalledWith('/test');
    expect(onRefresh).toHaveBeenCalled();
    window.confirm = originalConfirm;
  });
});
