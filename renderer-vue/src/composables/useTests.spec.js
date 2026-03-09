import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTests } from './useTests';

describe('useTests', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getProjectTestScripts: vi.fn(),
        runProjectTests: vi.fn(),
        ollamaSuggestTestFix: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns scripts, running, output, ollamaSuggestAvailable, run, runAndSuggestFix', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const result = useTests(store, () => ({ projectType: 'npm' }), modals, runWithOverlay);
    expect(result).toHaveProperty('scripts');
    expect(result).toHaveProperty('running');
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('ollamaSuggestAvailable');
    expect(result).toHaveProperty('run');
    expect(result).toHaveProperty('runAndSuggestFix');
  });

  it('load sets scripts when API returns ok', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getProjectTestScripts.mockResolvedValue({ ok: true, scripts: ['test', 'test:watch'] });
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const { scripts } = useTests(store, () => ({ projectType: 'npm' }), modals, runWithOverlay);
    await new Promise((r) => setTimeout(r, 0));
    expect(scripts.value).toEqual(['test', 'test:watch']);
  });

  it('run sets output from result', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.runProjectTests.mockResolvedValue({ stdout: 'PASS 1 test' });
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const { run, output } = useTests(store, () => ({ projectType: 'npm' }), modals, runWithOverlay);
    await run('test');
    expect(output.value).toContain('PASS');
  });

  it('ollamaSuggestAvailable is true when api has ollamaSuggestTestFix', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const { ollamaSuggestAvailable } = useTests(store, () => ({ projectType: 'npm' }), modals, runWithOverlay);
    expect(ollamaSuggestAvailable.value).toBe(true);
  });

  it('run sets output from stderr when stdout empty', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.runProjectTests.mockResolvedValue({ stderr: 'Error: test failed' });
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const { run, output } = useTests(store, () => ({ projectType: 'npm' }), modals, runWithOverlay);
    await run('test');
    expect(output.value).toContain('Error');
  });

  it('run sets output on catch', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.runProjectTests.mockRejectedValue(new Error('Run failed.'));
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const { run, output } = useTests(store, () => ({ projectType: 'npm' }), modals, runWithOverlay);
    await run('test');
    expect(output.value).toBe('Run failed.');
  });

  it('runAndSuggestFix opens diffFull when test fails', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getProjectTestScripts.mockResolvedValue({ ok: true, scripts: ['test'] });
    api.runProjectTests.mockResolvedValue({ ok: false, stdout: 'fail', stderr: '', exitCode: 1 });
    api.ollamaSuggestTestFix = vi.fn().mockResolvedValue({ ok: true, text: 'suggested fix' });
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const { runAndSuggestFix } = useTests(store, () => ({ projectType: 'npm' }), modals, runWithOverlay);
    await new Promise((r) => setTimeout(r, 10));
    await runAndSuggestFix();
    expect(modals.openModal).toHaveBeenCalledWith('diffFull', expect.objectContaining({ title: 'Suggested fix (AI)' }));
  });
});
