import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDetailTabOrder } from './useDetailTabOrder';

describe('useDetailTabOrder', () => {
  beforeEach(async () => {
    vi.resetModules();
    const mockApi = {
      getPreference: vi.fn().mockResolvedValue(null),
      setPreference: vi.fn().mockResolvedValue(undefined),
    };
    if (globalThis.window) globalThis.window.releaseManager = mockApi;
    await import('./useDetailTabOrder');
  });

  it('returns detailTabOrder, setDetailTabOrder, loadOrder', () => {
    const { detailTabOrder, setDetailTabOrder, loadOrder } = useDetailTabOrder();
    expect(detailTabOrder).toBeDefined();
    expect(typeof setDetailTabOrder).toBe('function');
    expect(typeof loadOrder).toBe('function');
  });

  it('loadOrder loads order from preference', async () => {
    const mockApi = globalThis.window?.releaseManager;
    mockApi.getPreference.mockResolvedValue(['api', 'dashboard', 'git']);
    const { loadOrder, detailTabOrder } = useDetailTabOrder();
    await loadOrder();
    expect(detailTabOrder.value).toEqual(['api', 'dashboard', 'git']);
  });

  it('loadOrder sets null for invalid preference', async () => {
    const mockApi = globalThis.window?.releaseManager;
    mockApi.getPreference.mockResolvedValue('not-an-array');
    const { loadOrder, detailTabOrder } = useDetailTabOrder();
    await loadOrder();
    expect(detailTabOrder.value).toBeNull();
  });

  it('setDetailTabOrder updates order and persists', async () => {
    const { setDetailTabOrder, detailTabOrder } = useDetailTabOrder();
    await setDetailTabOrder(['git', 'dashboard']);
    expect(detailTabOrder.value).toEqual(['git', 'dashboard']);
    expect(globalThis.window?.releaseManager?.setPreference).toHaveBeenCalledWith(
      'state.detailTabOrder',
      ['git', 'dashboard'],
    );
  });

  it('setDetailTabOrder ignores setPreference rejection', async () => {
    const mockApi = globalThis.window?.releaseManager;
    mockApi.setPreference.mockRejectedValue(new Error('pref error'));
    const { setDetailTabOrder, detailTabOrder } = useDetailTabOrder();
    await setDetailTabOrder(['a', 'b']);
    expect(detailTabOrder.value).toEqual(['a', 'b']);
  });

  it('setDetailTabOrder ignores non-array', async () => {
    const { setDetailTabOrder, detailTabOrder } = useDetailTabOrder();
    detailTabOrder.value = ['a'];
    await setDetailTabOrder(null);
    expect(detailTabOrder.value).toEqual(['a']);
  });

  it('loadOrder does nothing when getPreference not available', async () => {
    const mockApi = globalThis.window?.releaseManager;
    delete mockApi.getPreference;
    const { loadOrder, detailTabOrder } = useDetailTabOrder();
    await loadOrder();
    expect(detailTabOrder.value).toBeNull();
  });

  it('loadOrder sets null when getPreference rejects', async () => {
    const mockApi = globalThis.window?.releaseManager;
    mockApi.getPreference.mockRejectedValue(new Error('pref error'));
    const { loadOrder, detailTabOrder } = useDetailTabOrder();
    await loadOrder();
    expect(detailTabOrder.value).toBeNull();
  });
});
