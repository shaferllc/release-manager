import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { useBisect } from './useBisect';

describe('useBisect', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getBisectStatus: vi.fn(),
        getProjectTestScripts: vi.fn(),
        bisectGood: vi.fn(),
        bisectBad: vi.fn(),
        bisectSkip: vi.fn(),
        bisectReset: vi.fn(),
        bisectRun: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns status, error, load, startBisect, markGood, markBad, resetBisect', () => {
    const projectTypeRef = ref('npm');
    const result = useBisect({ projectTypeRef });
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('load');
    expect(result).toHaveProperty('startBisect');
    expect(result).toHaveProperty('markGood');
    expect(result).toHaveProperty('markBad');
    expect(result).toHaveProperty('resetBisect');
  });

  it('load sets status when API returns', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getBisectStatus.mockResolvedValue({
      active: true,
      current: 'abc123',
      remaining: '5',
      good: 'v1.0',
      bad: 'HEAD',
    });
    const projectTypeRef = ref('npm');
    const { status, load } = useBisect({ projectTypeRef });
    await load();
    expect(status.value.active).toBe(true);
    expect(status.value.current).toBe('abc123');
  });

  it('testScripts populated when bisect active and npm (via watch)', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getBisectStatus.mockResolvedValue({ active: true });
    api.getProjectTestScripts.mockResolvedValue({ ok: true, scripts: ['test', 'test:unit'] });
    const projectTypeRef = ref('npm');
    const { testScripts, load } = useBisect({ projectTypeRef });
    await load();
    await new Promise((r) => setTimeout(r, 80));
    expect(testScripts.value).toEqual(['test', 'test:unit']);
  });

  it('startBisect opens bisectRefPicker modal', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const { activeModal } = await import('../../../composables/useModals');
    const store = useAppStore();
    store.selectedPath = '/test';
    const projectTypeRef = ref('npm');
    const { startBisect } = useBisect({ projectTypeRef });
    startBisect();
    expect(activeModal.value).toBe('bisectRefPicker');
  });

  it('markGood calls bisectGood and refreshes', async () => {
    const onRefresh = vi.fn();
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.bisectGood.mockResolvedValue(undefined);
    api.getBisectStatus.mockResolvedValue({ active: true, current: 'abc', remaining: '3' });
    const projectTypeRef = ref('npm');
    const { markGood, load } = useBisect({ projectTypeRef, onRefresh });
    await load();
    await markGood();
    expect(api.bisectGood).toHaveBeenCalledWith('/test');
    expect(onRefresh).toHaveBeenCalled();
  });

  it('markBad calls bisectBad and refreshes', async () => {
    const onRefresh = vi.fn();
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.bisectBad.mockResolvedValue(undefined);
    api.getBisectStatus.mockResolvedValue({ active: true });
    const projectTypeRef = ref('npm');
    const { markBad, load } = useBisect({ projectTypeRef, onRefresh });
    await load();
    await markBad();
    expect(api.bisectBad).toHaveBeenCalledWith('/test');
    expect(onRefresh).toHaveBeenCalled();
  });

  it('markSkip calls bisectSkip and refreshes', async () => {
    const onRefresh = vi.fn();
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.bisectSkip.mockResolvedValue(undefined);
    api.getBisectStatus.mockResolvedValue({ active: true });
    const projectTypeRef = ref('npm');
    const { markSkip, load } = useBisect({ projectTypeRef, onRefresh });
    await load();
    await markSkip();
    expect(api.bisectSkip).toHaveBeenCalledWith('/test');
    expect(onRefresh).toHaveBeenCalled();
  });

  it('resetBisect calls bisectReset and refreshes', async () => {
    const onRefresh = vi.fn();
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.bisectReset.mockResolvedValue(undefined);
    api.getBisectStatus.mockResolvedValue({ active: false });
    const projectTypeRef = ref('npm');
    const { resetBisect, load } = useBisect({ projectTypeRef, onRefresh });
    await load();
    await resetBisect();
    expect(api.bisectReset).toHaveBeenCalledWith('/test');
    expect(onRefresh).toHaveBeenCalled();
  });

  it('markGood sets error on failure', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.bisectGood.mockRejectedValue(new Error('Git error'));
    api.getBisectStatus.mockResolvedValue({ active: true });
    const projectTypeRef = ref('npm');
    const { markGood, error, load } = useBisect({ projectTypeRef });
    await load();
    await markGood();
    expect(error.value).toBe('Git error');
  });

  it('runAutomatedBisect calls bisectRun and refreshes', async () => {
    const onRefresh = vi.fn();
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.bisectRun.mockResolvedValue(undefined);
    api.getBisectStatus.mockResolvedValue({ active: true });
    api.getProjectTestScripts.mockResolvedValue({ ok: true, scripts: ['test'] });
    const projectTypeRef = ref('npm');
    const { runAutomatedBisect, load } = useBisect({ projectTypeRef, onRefresh });
    await load();
    await new Promise((r) => setTimeout(r, 80));
    await runAutomatedBisect();
    expect(api.bisectRun).toHaveBeenCalledWith('/test', ['npm', 'run', 'test', '--no-color']);
    expect(onRefresh).toHaveBeenCalled();
  });
});
