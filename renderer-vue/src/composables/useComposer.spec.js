import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { useComposer } from './useComposer';

describe('useComposer', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getComposerInfo: vi.fn(),
        getComposerValidate: vi.fn(),
        getComposerOutdated: vi.fn(),
        getComposerAudit: vi.fn(),
        composerUpdate: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns summary, validateMsg, scripts, outdated, load, updateOne, updateAll', () => {
    const result = useComposer({ hasComposerRef: ref(true) });
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('validateMsg');
    expect(result).toHaveProperty('scripts');
    expect(result).toHaveProperty('outdated');
    expect(result).toHaveProperty('load');
    expect(result).toHaveProperty('updateOne');
    expect(result).toHaveProperty('updateAll');
  });

  it('load sets summary when getComposerInfo returns ok', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getComposerInfo.mockResolvedValue({
      ok: true,
      requireCount: 5,
      requireDevCount: 2,
      hasLock: true,
      scripts: ['test'],
    });
    api.getComposerValidate.mockResolvedValue({ valid: true });
    api.getComposerOutdated.mockResolvedValue({ ok: true, packages: [] });
    api.getComposerAudit.mockResolvedValue({ ok: true, advisories: [] });

    const { summary, load } = useComposer({ hasComposerRef: ref(true) });
    await load();
    expect(summary.value).toContain('5 require');
    expect(summary.value).toContain('2 require-dev');
    expect(summary.value).toContain('composer.lock present');
  });

  it('updateOne calls composerUpdate and reloads', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.composerUpdate = vi.fn().mockResolvedValue(undefined);
    api.getComposerInfo = vi.fn().mockResolvedValue({ ok: true, requireCount: 5, requireDevCount: 2, hasLock: true });
    api.getComposerValidate = vi.fn().mockResolvedValue({ valid: true });
    api.getComposerOutdated = vi.fn().mockResolvedValue({ ok: true, packages: [] });
    api.getComposerAudit = vi.fn().mockResolvedValue({ ok: true, advisories: [] });

    const { updateOne } = useComposer({ hasComposerRef: ref(true) });
    await updateOne('vendor/package');
    expect(api.composerUpdate).toHaveBeenCalledWith('/test', ['vendor/package']);
  });

  it('load sets validateMsg when getComposerValidate returns invalid', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getComposerInfo.mockResolvedValue({ ok: true, requireCount: 0, requireDevCount: 0, hasLock: true });
    api.getComposerValidate.mockResolvedValue({ valid: false, message: 'The requested package could not be found' });
    api.getComposerOutdated.mockResolvedValue({ ok: true, packages: [] });
    api.getComposerAudit.mockResolvedValue({ ok: true, advisories: [] });

    const { validateMsg, load } = useComposer({ hasComposerRef: ref(true) });
    await load();
    expect(validateMsg.value).toContain('Invalid');
  });

  it('load sets summary error when getComposerInfo fails', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getComposerInfo.mockResolvedValue({ ok: false, error: 'Not found' });
    api.getComposerValidate.mockResolvedValue({ valid: false });
    api.getComposerOutdated.mockResolvedValue({ ok: true, packages: [] });
    api.getComposerAudit.mockResolvedValue({ ok: true, advisories: [] });

    const { summary, load } = useComposer({ hasComposerRef: ref(true) });
    await load();
    expect(summary.value).toBe('Not found');
  });

  it('load sets lockWarning when lockOutOfDate', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getComposerInfo.mockResolvedValue({ ok: true, requireCount: 0, requireDevCount: 0, hasLock: true });
    api.getComposerValidate.mockResolvedValue({ valid: true, lockOutOfDate: true });
    api.getComposerOutdated.mockResolvedValue({ ok: true, packages: [] });
    api.getComposerAudit.mockResolvedValue({ ok: true, advisories: [] });
    const { lockWarning, load } = useComposer({ hasComposerRef: ref(true) });
    await load();
    expect(lockWarning.value).toContain('out of date');
  });

  it('load sets outdatedError when getComposerOutdated returns error', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getComposerInfo.mockResolvedValue({ ok: true, requireCount: 0, requireDevCount: 0, hasLock: true });
    api.getComposerValidate.mockResolvedValue({ valid: true });
    api.getComposerOutdated.mockResolvedValue({ ok: false, error: 'Composer not found' });
    api.getComposerAudit.mockResolvedValue({ ok: true, advisories: [] });
    const { outdatedError, load } = useComposer({ hasComposerRef: ref(true) });
    await load();
    expect(outdatedError.value).toBe('Composer not found');
  });

  it('updateAll calls composerUpdate with empty array', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.composerUpdate = vi.fn().mockResolvedValue(undefined);
    api.getComposerInfo = vi.fn().mockResolvedValue({ ok: true, requireCount: 0, requireDevCount: 0, hasLock: true });
    api.getComposerValidate = vi.fn().mockResolvedValue({ valid: true });
    api.getComposerOutdated = vi.fn().mockResolvedValue({ ok: true, packages: [{ name: 'a/b' }] });
    api.getComposerAudit = vi.fn().mockResolvedValue({ ok: true, advisories: [] });
    const { updateAll } = useComposer({ hasComposerRef: ref(true) });
    await new Promise((r) => setTimeout(r, 50));
    await updateAll();
    expect(api.composerUpdate).toHaveBeenCalledWith('/test', []);
  });
});
