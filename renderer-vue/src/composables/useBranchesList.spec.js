import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { useBranchesList } from './useBranchesList';

describe('useBranchesList', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getBranches: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns branches and load', () => {
    const result = useBranchesList();
    expect(result).toHaveProperty('branches');
    expect(result).toHaveProperty('load');
  });

  it('load sets branches when API returns array', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getBranches.mockResolvedValue(['main', 'feature-a', 'develop']);

    const { branches, load } = useBranchesList();
    await load();
    expect(branches.value).toEqual(['main', 'feature-a', 'develop']);
  });

  it('load excludes current ref when excludeCurrentRef provided', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getBranches.mockResolvedValue(['main', 'feature-a', 'develop']);

    const { branches, load } = useBranchesList({ excludeCurrentRef: ref('main') });
    await load();
    expect(branches.value).toEqual(['feature-a', 'develop']);
  });

  it('load handles r.branches format', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getBranches.mockResolvedValue({ branches: ['main', 'dev'] });

    const { branches, load } = useBranchesList();
    await load();
    expect(branches.value).toEqual(['main', 'dev']);
  });

  it('load sets empty array on error', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getBranches.mockRejectedValue(new Error('Failed'));

    const { branches, load } = useBranchesList();
    await load();
    expect(branches.value).toEqual([]);
  });
});
