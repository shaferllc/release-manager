import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { shortSha, useSubmodules } from './useSubmodules';

describe('useSubmodules', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getSubmodules: vi.fn(),
        submoduleUpdate: vi.fn(),
        openPathInFinder: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  describe('load', () => {
    it('sets submodules when API returns ok', async () => {
      const { useAppStore } = await import('../../../stores/app');
      const store = useAppStore();
      store.selectedPath = '/test';

      const api = globalThis.window?.releaseManager;
      api.getSubmodules.mockResolvedValue({ ok: true, submodules: [{ path: 'vendor', url: 'https://x.com' }] });

      const { submodules, load } = useSubmodules();
      await load();
      expect(submodules.value).toHaveLength(1);
      expect(submodules.value[0].path).toBe('vendor');
    });
  });

  describe('update', () => {
    it('calls submoduleUpdate and sets success', async () => {
      const { useAppStore } = await import('../../../stores/app');
      const store = useAppStore();
      store.selectedPath = '/test';

      const onRefresh = vi.fn();
      const api = globalThis.window?.releaseManager;
      api.submoduleUpdate = vi.fn().mockResolvedValue({ ok: true });
      api.getSubmodules = vi.fn().mockResolvedValue({ ok: true, submodules: [] });

      const { success, update } = useSubmodules({ onRefresh });
      await update(false);
      expect(api.submoduleUpdate).toHaveBeenCalledWith('/test', false);
      expect(success.value).toContain('updated');
      expect(onRefresh).toHaveBeenCalled();
    });

    it('update with init sets initialized message', async () => {
      const { useAppStore } = await import('../../../stores/app');
      const store = useAppStore();
      store.selectedPath = '/test';
      const api = globalThis.window?.releaseManager;
      api.submoduleUpdate.mockResolvedValue({ ok: true });
      api.getSubmodules.mockResolvedValue({ ok: true, submodules: [] });

      const { success, update } = useSubmodules();
      await update(true);
      expect(success.value).toContain('initialized');
    });

    it('update sets error on API failure', async () => {
      const { useAppStore } = await import('../../../stores/app');
      const store = useAppStore();
      store.selectedPath = '/test';
      const api = globalThis.window?.releaseManager;
      api.submoduleUpdate.mockResolvedValue({ ok: false, error: 'Submodule failed' });

      const { error, update } = useSubmodules();
      await update(false);
      expect(error.value).toBe('Submodule failed');
    });
  });

  it('reveal calls openPathInFinder', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test/repo';
    const api = globalThis.window?.releaseManager;

    const { reveal } = useSubmodules();
    reveal('vendor');
    expect(api.openPathInFinder).toHaveBeenCalledWith('/test/repo/vendor');
  });

  describe('shortSha', () => {
    it('returns first 7 chars for long sha', () => {
      expect(shortSha('abcdef1234567890')).toBe('abcdef1');
      expect(shortSha('a1b2c3d4e5f6')).toBe('a1b2c3d');
    });

    it('returns full string for short sha (<= 7 chars)', () => {
      expect(shortSha('abc123')).toBe('abc123');
      expect(shortSha('1234567')).toBe('1234567');
    });

    it('returns empty string for null or undefined', () => {
      expect(shortSha(null)).toBe('');
      expect(shortSha(undefined)).toBe('');
    });

    it('returns empty string for non-string', () => {
      expect(shortSha(123)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(shortSha('')).toBe('');
    });
  });
});
