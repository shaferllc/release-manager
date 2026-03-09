import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useShipwellProjects } from './useShipwellProjects';

describe('useShipwellProjects', () => {
  let mockApi;
  let loadProjects;

  beforeEach(async () => {
    setActivePinia(createPinia());
    loadProjects = vi.fn().mockResolvedValue(undefined);
    mockApi = {
      fetchShipwellProjects: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      cloneGitHubRepo: vi.fn().mockResolvedValue({ ok: true, path: '/cloned/repo' }),
      setProjects: vi.fn().mockResolvedValue(undefined),
      setPreference: vi.fn().mockResolvedValue(undefined),
      getLicenseStatus: vi.fn().mockResolvedValue({
        hasLicense: true,
        permissions: { tabs: [] },
        limits: { max_projects: 10, max_extensions: 5 },
      }),
    };
    if (globalThis.window) globalThis.window.releaseManager = mockApi;
    const { useLicense } = await import('./useLicense');
    const license = useLicense();
    await license.loadStatus();
  });

  it('returns all expected refs and functions', () => {
    const result = useShipwellProjects(loadProjects);
    expect(result.shipwellProjectsVisible).toBeDefined();
    expect(result.shipwellProjectsLoading).toBeDefined();
    expect(result.shipwellProjectsError).toBeDefined();
    expect(result.shipwellProjectsList).toBeDefined();
    expect(result.shipwellCloningRepo).toBeDefined();
    expect(typeof result.isProjectAlreadyAdded).toBe('function');
    expect(typeof result.addFromShipwell).toBe('function');
    expect(typeof result.cloneAndAddProject).toBe('function');
  });

  it('isProjectAlreadyAdded returns false when not in list', () => {
    const { isProjectAlreadyAdded } = useShipwellProjects(loadProjects);
    expect(isProjectAlreadyAdded({ github_repo: 'owner/new-repo' })).toBe(false);
  });

  it('isProjectAlreadyAdded returns true when repo name matches path basename', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([{ path: '/dev/my-repo', name: 'my-repo', tags: [], starred: false }]);
    const { isProjectAlreadyAdded } = useShipwellProjects(loadProjects);
    expect(isProjectAlreadyAdded({ github_repo: 'owner/my-repo' })).toBe(true);
  });

  it('addFromShipwell fetches and populates list', async () => {
    const projects = [
      { github_repo: 'owner/proj1', name: 'Proj1', clone_url: 'https://github.com/owner/proj1.git' },
    ];
    mockApi.fetchShipwellProjects.mockResolvedValue({ ok: true, data: projects });
    const { addFromShipwell, shipwellProjectsList, shipwellProjectsLoading } = useShipwellProjects(loadProjects);
    await addFromShipwell();
    expect(shipwellProjectsList.value).toEqual(projects);
    expect(shipwellProjectsLoading.value).toBe(false);
  });

  it('addFromShipwell sets error when fetch fails', async () => {
    mockApi.fetchShipwellProjects.mockResolvedValue({ ok: false, error: 'Network error' });
    const { addFromShipwell, shipwellProjectsError } = useShipwellProjects(loadProjects);
    await addFromShipwell();
    expect(shipwellProjectsError.value).toBe('Network error');
  });

  it('addFromShipwell sets error when fetch throws', async () => {
    mockApi.fetchShipwellProjects.mockRejectedValue(new Error('Connection refused'));
    const { addFromShipwell, shipwellProjectsError } = useShipwellProjects(loadProjects);
    await addFromShipwell();
    expect(shipwellProjectsError.value).toBe('Connection refused');
  });

  it('cloneAndAddProject adds project and closes dialog', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    const proj = { github_repo: 'owner/new-repo', clone_url: 'https://github.com/owner/new-repo.git' };
    const { cloneAndAddProject, shipwellProjectsVisible } = useShipwellProjects(loadProjects);
    await cloneAndAddProject(proj);
    expect(store.projects.some((p) => p.path === '/cloned/repo')).toBe(true);
    expect(store.selectedPath).toBe('/cloned/repo');
    expect(shipwellProjectsVisible.value).toBe(false);
  });

  it('cloneAndAddProject uses github_repo when clone_url missing', async () => {
    mockApi.cloneGitHubRepo.mockResolvedValue({ ok: true, path: '/cloned/path' });
    const proj = { github_repo: 'owner/repo-only' };
    const { cloneAndAddProject } = useShipwellProjects(loadProjects);
    await cloneAndAddProject(proj);
    expect(mockApi.cloneGitHubRepo).toHaveBeenCalledWith('https://github.com/owner/repo-only.git');
  });

  it('cloneAndAddProject does nothing when already added', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([{ path: '/x/existing', name: 'existing', tags: [], starred: false }]);
    const proj = { github_repo: 'owner/existing' };
    const { cloneAndAddProject } = useShipwellProjects(loadProjects);
    await cloneAndAddProject(proj);
    expect(mockApi.cloneGitHubRepo).not.toHaveBeenCalled();
  });

  it('addFromShipwell shows limit notification when at max', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects(Array(10).fill({ path: '/x', name: 'X', tags: [], starred: false }));
    mockApi.getLicenseStatus.mockResolvedValue({
      hasLicense: true,
      permissions: { tabs: [] },
      limits: { max_projects: 10, max_extensions: 5 },
    });
    const { useLicense } = await import('./useLicense');
    const license = useLicense();
    await license.loadStatus();
    const { addFromShipwell, shipwellProjectsVisible } = useShipwellProjects(loadProjects);
    await addFromShipwell();
    expect(shipwellProjectsVisible.value).toBe(false);
  });

  it('cloneAndAddProject sets error when clone fails', async () => {
    mockApi.cloneGitHubRepo.mockResolvedValue({ ok: false, error: 'Clone failed' });
    const proj = { github_repo: 'owner/fail-repo' };
    const { cloneAndAddProject, shipwellProjectsError } = useShipwellProjects(loadProjects);
    await cloneAndAddProject(proj);
    expect(shipwellProjectsError.value).toBe('Clone failed');
  });

  it('cloneAndAddProject does not set error when user cancels', async () => {
    mockApi.cloneGitHubRepo.mockResolvedValue({ ok: false, error: 'Cancelled' });
    const proj = { github_repo: 'owner/cancelled' };
    const { cloneAndAddProject, shipwellProjectsError } = useShipwellProjects(loadProjects);
    await cloneAndAddProject(proj);
    expect(shipwellProjectsError.value).toBe('');
  });

  it('cloneAndAddProject sets error when clone throws', async () => {
    mockApi.cloneGitHubRepo.mockRejectedValue(new Error('Git not found'));
    const proj = { github_repo: 'owner/throw-repo' };
    const { cloneAndAddProject, shipwellProjectsError } = useShipwellProjects(loadProjects);
    await cloneAndAddProject(proj);
    expect(shipwellProjectsError.value).toBe('Git not found');
  });
});
