import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useReflog } from './useReflog';

describe('useReflog', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getReflog: vi.fn(),
        checkoutRef: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns entries, error, load, checkout', () => {
    const result = useReflog();
    expect(result).toHaveProperty('entries');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('load');
    expect(result).toHaveProperty('checkout');
  });

  it('load sets entries when API returns ok', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getReflog.mockResolvedValue({ ok: true, entries: [{ ref: 'HEAD@{0}', sha: 'abc123' }] });

    const { entries, load } = useReflog();
    await load();
    expect(entries.value).toHaveLength(1);
    expect(entries.value[0].ref).toBe('HEAD@{0}');
  });

  it('load sets empty array on error', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getReflog.mockRejectedValue(new Error('Failed'));

    const { entries, load } = useReflog();
    await load();
    expect(entries.value).toEqual([]);
  });

  it('checkout calls checkoutRef when confirmed', async () => {
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.checkoutRef.mockResolvedValue(undefined);
    const onRefresh = vi.fn();

    const { checkout } = useReflog({ onRefresh });
    await checkout({ ref: 'HEAD@{1}', sha: 'abc123' });
    expect(api.checkoutRef).toHaveBeenCalledWith('/test', 'HEAD@{1}');
    expect(onRefresh).toHaveBeenCalled();
    window.confirm = originalConfirm;
  });
});
