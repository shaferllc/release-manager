import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAddProject } from './useAddProject';

describe('useAddProject', () => {
  let mockApi;
  let loadProjects;

  beforeEach(() => {
    setActivePinia(createPinia());
    loadProjects = vi.fn().mockResolvedValue(undefined);
    mockApi = {
      showDirectoryDialog: vi.fn().mockResolvedValue('/new/project'),
      setProjects: vi.fn().mockResolvedValue({ ok: true, saved: 1 }),
      setPreference: vi.fn().mockResolvedValue(undefined),
    };
    if (globalThis.window) globalThis.window.releaseManager = mockApi;
  });

  it('returns addProject function', () => {
    const { addProject } = useAddProject(loadProjects);
    expect(typeof addProject).toBe('function');
  });

  it('adds project when dialog returns path', async () => {
    const { addProject } = useAddProject(loadProjects);
    addProject();
    await new Promise((r) => setTimeout(r, 50));
    expect(mockApi.showDirectoryDialog).toHaveBeenCalled();
    expect(mockApi.setProjects).toHaveBeenCalled();
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    expect(store.projects.some((p) => p.path === '/new/project')).toBe(true);
    expect(store.selectedPath).toBe('/new/project');
  });

  it('skips when path already in list', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([{ path: '/new/project', name: 'project', tags: [], starred: false }]);
    const { addProject } = useAddProject(loadProjects);
    addProject();
    await new Promise((r) => setTimeout(r, 50));
    expect(mockApi.showDirectoryDialog).toHaveBeenCalled();
    expect(mockApi.setProjects).not.toHaveBeenCalled();
  });

  it('handles result as filePaths array', async () => {
    mockApi.showDirectoryDialog.mockResolvedValue({ filePaths: ['/from/array'] });
    const { addProject } = useAddProject(loadProjects);
    addProject();
    await new Promise((r) => setTimeout(r, 50));
    expect(mockApi.setProjects).toHaveBeenCalled();
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    expect(store.projects.some((p) => p.path === '/from/array')).toBe(true);
  });

  it('does nothing when dialog returns null/canceled', async () => {
    mockApi.showDirectoryDialog.mockResolvedValue(null);
    const { addProject } = useAddProject(loadProjects);
    addProject();
    await new Promise((r) => setTimeout(r, 50));
    expect(mockApi.showDirectoryDialog).toHaveBeenCalled();
    expect(mockApi.setProjects).not.toHaveBeenCalled();
  });

  it('reverts and notifies when setProjects returns limitExceeded', async () => {
    mockApi.setProjects.mockResolvedValue({ limitExceeded: true, max: 5 });
    const { addProject } = useAddProject(loadProjects);
    addProject();
    await new Promise((r) => setTimeout(r, 50));
    expect(mockApi.setProjects).toHaveBeenCalled();
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    expect(store.projects.some((p) => p.path === '/new/project')).toBe(false);
  });

  it('does nothing when showDirectoryDialog not available', () => {
    delete mockApi.showDirectoryDialog;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { addProject } = useAddProject(loadProjects);
    addProject();
    expect(mockApi.setProjects).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('handles setProjects rejection', async () => {
    mockApi.setProjects.mockRejectedValue(new Error('save failed'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { addProject } = useAddProject(loadProjects);
    addProject();
    await new Promise((r) => setTimeout(r, 50));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('handles missing setProjects', async () => {
    delete mockApi.setProjects;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { addProject } = useAddProject(loadProjects);
    addProject();
    await new Promise((r) => setTimeout(r, 50));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('warns when showDirectoryDialog returns non-promise', () => {
    mockApi.showDirectoryDialog.mockReturnValue(null);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { addProject } = useAddProject(loadProjects);
    addProject();
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls.some((c) => c.some((a) => String(a).includes('did not return a promise')))).toBe(true);
    warn.mockRestore();
  });

  it('handles dialog rejection', async () => {
    mockApi.showDirectoryDialog.mockRejectedValue(new Error('dialog cancelled'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { addProject } = useAddProject(loadProjects);
    addProject();
    await new Promise((r) => setTimeout(r, 50));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('shows limit notification when at max projects', async () => {
    mockApi.getLicenseStatus = vi.fn().mockResolvedValue({
      hasLicense: true,
      limits: { max_projects: 2 },
    });
    if (globalThis.window) globalThis.window.releaseManager = mockApi;
    const { useLicense } = await import('./useLicense');
    const license = useLicense();
    await license.loadStatus();
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([
      { path: '/p1', name: 'p1', tags: [], starred: false },
      { path: '/p2', name: 'p2', tags: [], starred: false },
    ]);
    const { useNotifications } = await import('./useNotifications');
    const { addProject } = useAddProject(loadProjects);
    addProject();
    await new Promise((r) => setTimeout(r, 50));
    expect(mockApi.showDirectoryDialog).not.toHaveBeenCalled();
    expect(mockApi.setProjects).not.toHaveBeenCalled();
    const { useNotifications: getNotifications } = await import('./useNotifications');
    const notifications = getNotifications();
    expect(notifications.toasts.value.some((n) => n.title === 'Project limit reached')).toBe(true);
  });
});
