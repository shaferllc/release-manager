import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTags } from './useTags';

describe('useTags', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getTags: vi.fn(),
        pushTag: vi.fn(),
        deleteTag: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns tags, error, load, pushTag, deleteTag', () => {
    const result = useTags();
    expect(result).toHaveProperty('tags');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('load');
    expect(result).toHaveProperty('pushTag');
    expect(result).toHaveProperty('deleteTag');
  });

  it('load sets tags when API returns ok', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getTags.mockResolvedValue({ ok: true, tags: ['v1.0.0', 'v0.9.0'] });

    const { tags, load } = useTags();
    await load();
    expect(tags.value).toEqual(['v1.0.0', 'v0.9.0']);
  });

  it('pushTag calls api and onRefresh', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const onRefresh = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.pushTag.mockResolvedValue(undefined);

    const { pushTag } = useTags({ onRefresh });
    await pushTag('v1.0.0');
    expect(api.pushTag).toHaveBeenCalledWith('/test', 'v1.0.0', 'origin');
    expect(onRefresh).toHaveBeenCalled();
  });

  it('deleteTag calls API when confirmed', async () => {
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getTags.mockResolvedValue({ ok: true, tags: [] });
    api.deleteTag.mockResolvedValue(undefined);
    const onRefresh = vi.fn();

    const { deleteTag } = useTags({ onRefresh });
    await deleteTag('v1.0.0');
    expect(api.deleteTag).toHaveBeenCalledWith('/test', 'v1.0.0');
    expect(onRefresh).toHaveBeenCalled();
    window.confirm = originalConfirm;
  });
});
