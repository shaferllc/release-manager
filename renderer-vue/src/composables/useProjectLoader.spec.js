import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useProjectLoader } from './useProjectLoader';

describe('useProjectLoader', () => {
  let mockApi;
  let runWithOverlay;

  beforeEach(() => {
    setActivePinia(createPinia());
    runWithOverlay = vi.fn((arg) => arg);
    mockApi = {
      getProjects: vi.fn().mockResolvedValue([]),
      getPreference: vi.fn().mockResolvedValue(null),
    };
    if (globalThis.window) globalThis.window.releaseManager = mockApi;
  });

  it('returns loadProjects, onModalRefresh, onRefresh, syncAllProjects, syncExtensions', () => {
    const loader = useProjectLoader({ runWithOverlay });
    expect(typeof loader.loadProjects).toBe('function');
    expect(typeof loader.onModalRefresh).toBe('function');
    expect(typeof loader.onRefresh).toBe('function');
    expect(typeof loader.syncAllProjects).toBe('function');
    expect(typeof loader.syncExtensions).toBe('function');
  });

  it('loadProjects loads projects and sets store', async () => {
    const projects = [{ path: '/foo', name: 'Foo', tags: [], starred: false }];
    mockApi.getProjects.mockResolvedValue(projects);
    const { loadProjects } = useProjectLoader({ runWithOverlay });
    await loadProjects();
    const store = (await import('../stores/app')).useAppStore();
    expect(store.projects).toHaveLength(1);
    expect(store.projects[0].path).toBe('/foo');
  });

  it('loadProjects restores selectedPath from preference', async () => {
    mockApi.getProjects.mockResolvedValue([{ path: '/saved', name: 'Saved', tags: [], starred: false }]);
    mockApi.getPreference.mockImplementation((key) => {
      if (key === 'selectedProjectPath') return Promise.resolve('/saved');
      return Promise.resolve(null);
    });
    const { loadProjects } = useProjectLoader({ runWithOverlay });
    await loadProjects();
    const store = (await import('../stores/app')).useAppStore();
    expect(store.selectedPath).toBe('/saved');
  });

  it('onRefresh calls runWithOverlay', () => {
    const { onRefresh } = useProjectLoader({ runWithOverlay });
    onRefresh();
    expect(runWithOverlay).toHaveBeenCalled();
  });

  it('loadProjects merges getAllProjectsInfo when available', async () => {
    const projects = [{ path: '/foo', name: 'Foo', tags: [], starred: false }];
    const allInfo = [{ path: '/foo', projectType: 'npm', hasComposer: true }];
    mockApi.getProjects.mockResolvedValue(projects);
    mockApi.getAllProjectsInfo = vi.fn().mockResolvedValue(allInfo);
    const { loadProjects } = useProjectLoader({ runWithOverlay });
    await loadProjects();
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    expect(store.projects[0].projectType).toBe('npm');
    expect(store.projects[0].hasComposer).toBe(true);
  });

  it('loadProjects restores savedView from preference', async () => {
    mockApi.getProjects.mockResolvedValue([{ path: '/x', name: 'X', tags: [], starred: false }]);
    mockApi.getPreference.mockImplementation((key) => {
      if (key === 'state.viewMode') return Promise.resolve('dashboard');
      return Promise.resolve(null);
    });
    const { loadProjects } = useProjectLoader({ runWithOverlay });
    await loadProjects();
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    expect(store.viewMode).toBe('dashboard');
  });

  it('syncExtensions adds notification when extensions installed', async () => {
    mockApi.syncPlanExtensions = vi.fn().mockResolvedValue({ installed: 2 });
    const { syncExtensions } = useProjectLoader({ runWithOverlay });
    await syncExtensions();
    const { useNotifications } = await import('./useNotifications');
    const { toasts } = useNotifications();
    expect(toasts.value.some((t) => t.title === 'Extensions synced')).toBe(true);
  });

  it('syncExtensions swallows errors', async () => {
    mockApi.syncPlanExtensions = vi.fn().mockRejectedValue(new Error('sync failed'));
    const { syncExtensions } = useProjectLoader({ runWithOverlay });
    await expect(syncExtensions()).resolves.toBeUndefined();
  });

  it('syncAllProjects does nothing when no projects', async () => {
    const { syncAllProjects } = useProjectLoader({ runWithOverlay });
    mockApi.syncFromRemote = vi.fn();
    await syncAllProjects();
    expect(mockApi.syncFromRemote).not.toHaveBeenCalled();
  });

  it('syncAllProjects calls finishSync on navBarRef', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([{ path: '/p1', name: 'P1', tags: [], starred: false }]);
    mockApi.syncFromRemote = vi.fn().mockResolvedValue(undefined);
    mockApi.getProjects.mockResolvedValue(store.projects);
    const navBarRef = { value: { finishSync: vi.fn() } };
    const { syncAllProjects } = useProjectLoader({ runWithOverlay });
    await syncAllProjects(navBarRef);
    expect(navBarRef.value.finishSync).toHaveBeenCalled();
  });

  it('syncAllProjects uses gitFetch when syncFromRemote not available', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([{ path: '/p1', name: 'P1', tags: [], starred: false }]);
    delete mockApi.syncFromRemote;
    mockApi.gitFetch = vi.fn().mockResolvedValue(undefined);
    mockApi.getProjects.mockResolvedValue(store.projects);
    const { syncAllProjects } = useProjectLoader({ runWithOverlay });
    await syncAllProjects();
    expect(mockApi.gitFetch).toHaveBeenCalledWith('/p1');
  });

  it('syncAllProjects calls syncFromRemote for each project', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([
      { path: '/p1', name: 'P1', tags: [], starred: false },
      { path: '/p2', name: 'P2', tags: [], starred: false },
    ]);
    mockApi.syncFromRemote = vi.fn().mockResolvedValue(undefined);
    mockApi.getProjects.mockResolvedValue(store.projects);
    const { syncAllProjects } = useProjectLoader({ runWithOverlay });
    await syncAllProjects();
    expect(mockApi.syncFromRemote).toHaveBeenCalledWith('/p1');
    expect(mockApi.syncFromRemote).toHaveBeenCalledWith('/p2');
  });

  it('syncAllProjects continues when one project sync fails', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([
      { path: '/fail', name: 'Fail', tags: [], starred: false },
      { path: '/ok', name: 'Ok', tags: [], starred: false },
    ]);
    mockApi.syncFromRemote = vi.fn().mockImplementation((path) => {
      if (path === '/fail') return Promise.reject(new Error('sync failed'));
      return Promise.resolve();
    });
    mockApi.getProjects.mockResolvedValue(store.projects);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { syncAllProjects } = useProjectLoader({ runWithOverlay });
    await syncAllProjects();
    expect(mockApi.syncFromRemote).toHaveBeenCalledWith('/fail');
    expect(mockApi.syncFromRemote).toHaveBeenCalledWith('/ok');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('loadProjects warns when getAllProjectsInfo throws', async () => {
    mockApi.getProjects.mockResolvedValue([{ path: '/x', name: 'X', tags: [], starred: false }]);
    mockApi.getAllProjectsInfo = vi.fn().mockRejectedValue(new Error('info failed'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { loadProjects } = useProjectLoader({ runWithOverlay });
    await loadProjects();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
