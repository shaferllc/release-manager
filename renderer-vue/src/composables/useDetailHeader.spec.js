import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { useDetailHeader } from './useDetailHeader';

describe('useDetailHeader', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        setProjects: vi.fn().mockResolvedValue(undefined),
        openInTerminal: vi.fn(),
        openInEditor: vi.fn(),
        openPathInFinder: vi.fn(),
        copyToClipboard: vi.fn(),
        runProjectCoverage: vi.fn(),
        getAvailablePhpVersions: vi.fn(),
        getComposerInfo: vi.fn(),
        getPhpVersionFromRequire: vi.fn(),
      };
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  async function createStore() {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test/project';
    store.projects = [
      { path: '/test/project', name: 'Test', tags: ['v1'], phpPath: '' },
      { path: '/other', name: 'Other', tags: [], phpPath: '' },
    ];
    store.setProjects = vi.fn();
    return store;
  }

  it('returns expected keys', async () => {
    const store = await createStore();
    const getInfo = () => ({ path: '/test/project', projectType: 'npm' });
    const result = useDetailHeader(store, getInfo);
    expect(result).toHaveProperty('tagsInput');
    expect(result).toHaveProperty('copyFeedback');
    expect(result).toHaveProperty('saveTags');
    expect(result).toHaveProperty('openTerminal');
    expect(result).toHaveProperty('openEditor');
    expect(result).toHaveProperty('openFinder');
    expect(result).toHaveProperty('copyPath');
    expect(result).toHaveProperty('removeProject');
    expect(result).toHaveProperty('runCoverageHeader');
    expect(result).toHaveProperty('showPhpSelector');
    expect(result).toHaveProperty('showCoverageHeader');
  });

  it('showCoverageHeader true for npm', async () => {
    const store = await createStore();
    const getInfo = () => ({ path: '/test/project', projectType: 'npm' });
    const { showCoverageHeader } = useDetailHeader(store, getInfo);
    await vi.runAllTimersAsync();
    expect(showCoverageHeader.value).toBe(true);
  });

  it('showCoverageHeader true for php', async () => {
    const store = await createStore();
    const getInfo = () => ({ path: '/test/project', projectType: 'php' });
    const { showCoverageHeader } = useDetailHeader(store, getInfo);
    await vi.runAllTimersAsync();
    expect(showCoverageHeader.value).toBe(true);
  });

  it('openTerminal calls openInTerminal when selectedPath exists', async () => {
    const store = await createStore();
    const getInfo = () => ({ path: '/test/project' });
    const { openTerminal } = useDetailHeader(store, getInfo);
    openTerminal();
    expect(globalThis.window.releaseManager.openInTerminal).toHaveBeenCalledWith('/test/project');
  });

  it('openEditor calls openInEditor when selectedPath exists', async () => {
    const store = await createStore();
    const getInfo = () => ({ path: '/test/project' });
    const { openEditor } = useDetailHeader(store, getInfo);
    openEditor();
    expect(globalThis.window.releaseManager.openInEditor).toHaveBeenCalledWith('/test/project');
  });

  it('openFinder calls openPathInFinder when selectedPath exists', async () => {
    const store = await createStore();
    const getInfo = () => ({ path: '/test/project' });
    const { openFinder } = useDetailHeader(store, getInfo);
    openFinder();
    expect(globalThis.window.releaseManager.openPathInFinder).toHaveBeenCalledWith('/test/project');
  });

  it('copyPath calls copyToClipboard and sets copyFeedback', async () => {
    const store = await createStore();
    const getInfo = () => ({ path: '/test/project' });
    const { copyPath, copyFeedback } = useDetailHeader(store, getInfo);
    expect(copyFeedback.value).toBe(false);
    copyPath();
    expect(globalThis.window.releaseManager.copyToClipboard).toHaveBeenCalledWith('/test/project');
    expect(copyFeedback.value).toBe(true);
    vi.advanceTimersByTime(1600);
    expect(copyFeedback.value).toBe(false);
  });

  it('copyPath does nothing when selectedPath is empty', async () => {
    const store = await createStore();
    store.selectedPath = '';
    const getInfo = () => ({ path: '' });
    const { copyPath } = useDetailHeader(store, getInfo);
    copyPath();
    expect(globalThis.window.releaseManager.copyToClipboard).not.toHaveBeenCalled();
  });

  it('saveTags calls setProjects with updated tags', async () => {
    const store = await createStore();
    const getInfo = () => ({ path: '/test/project' });
    const { tagsInput, saveTags } = useDetailHeader(store, getInfo);
    await vi.runAllTimersAsync();
    tagsInput.value = 'v1, v2, v3';
    saveTags();
    expect(globalThis.window.releaseManager.setProjects).toHaveBeenCalled();
  });

  it('removeProject filters out project and emits remove', async () => {
    const emit = vi.fn();
    const store = await createStore();
    globalThis.window.releaseManager.setProjects.mockResolvedValue(undefined);
    const getInfo = () => ({ path: '/test/project' });
    const { removeProject } = useDetailHeader(store, getInfo, emit);
    removeProject();
    await vi.runAllTimersAsync();
    expect(globalThis.window.releaseManager.setProjects).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith('remove');
  });

  it('runCoverageHeader calls runProjectCoverage for npm', async () => {
    const store = await createStore();
    const getInfo = () => ({ path: '/test/project', projectType: 'npm' });
    globalThis.window.releaseManager.runProjectCoverage.mockResolvedValue({
      ok: true,
      summary: '80%',
    });
    const { runCoverageHeader, coverageSummary } = useDetailHeader(store, getInfo);
    await runCoverageHeader();
    expect(globalThis.window.releaseManager.runProjectCoverage).toHaveBeenCalledWith(
      '/test/project',
      'npm'
    );
    expect(coverageSummary.value).toBe('80%');
  });

  it('runCoverageHeader sets error message when API fails', async () => {
    const store = await createStore();
    const getInfo = () => ({ path: '/test/project', projectType: 'npm' });
    globalThis.window.releaseManager.runProjectCoverage.mockResolvedValue({
      ok: false,
      error: 'Tests failed',
    });
    const { runCoverageHeader, coverageSummary } = useDetailHeader(store, getInfo);
    await runCoverageHeader();
    expect(coverageSummary.value).toBe('Tests failed');
  });

  it('runCoverageHeader does nothing when path is empty', async () => {
    const store = await createStore();
    const getInfo = () => ({ path: '', projectType: 'npm' });
    const { runCoverageHeader } = useDetailHeader(store, getInfo);
    await runCoverageHeader();
    expect(globalThis.window.releaseManager.runProjectCoverage).not.toHaveBeenCalled();
  });
});
