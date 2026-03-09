import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useBulkImport } from './useBulkImport';

describe('useBulkImport', () => {
  let mockApi;
  let loadProjects;

  beforeEach(async () => {
    setActivePinia(createPinia());
    loadProjects = vi.fn().mockResolvedValue(undefined);
    mockApi = {
      bulkImportProjects: vi.fn().mockResolvedValue({
        ok: true,
        parentDir: '/scan',
        projects: [
          { path: '/scan/proj1', name: 'proj1' },
          { path: '/scan/proj2', name: 'proj2' },
        ],
        alreadyAdded: 0,
      }),
      setProjects: vi.fn().mockResolvedValue(undefined),
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
    const result = useBulkImport(loadProjects);
    expect(result.bulkImportVisible).toBeDefined();
    expect(result.bulkImportScanning).toBeDefined();
    expect(result.bulkImportResults).toBeDefined();
    expect(result.bulkImportSelected).toBeDefined();
    expect(result.bulkImportSelectedCount).toBeDefined();
    expect(typeof result.bulkImportSelectAll).toBe('function');
    expect(typeof result.bulkImport).toBe('function');
    expect(typeof result.confirmBulkImport).toBe('function');
  });

  it('bulkImport fetches and populates results', async () => {
    const { bulkImport, bulkImportResults, bulkImportSelected, bulkImportScanning } = useBulkImport(loadProjects);
    await bulkImport();
    expect(bulkImportResults.value).toBeTruthy();
    expect(bulkImportResults.value.projects).toHaveLength(2);
    expect(bulkImportSelected.value).toEqual([true, true]);
    expect(bulkImportScanning.value).toBe(false);
  });

  it('bulkImport closes and notifies on scan error', async () => {
    mockApi.bulkImportProjects.mockRejectedValue(new Error('Scan failed'));
    const { bulkImport, bulkImportVisible } = useBulkImport(loadProjects);
    await bulkImport();
    expect(bulkImportVisible.value).toBe(false);
  });

  it('bulkImport closes when result not ok', async () => {
    mockApi.bulkImportProjects.mockResolvedValue({ ok: false });
    const { bulkImport, bulkImportVisible, bulkImportResults } = useBulkImport(loadProjects);
    await bulkImport();
    expect(bulkImportVisible.value).toBe(false);
    expect(bulkImportResults.value).toBeNull();
  });

  it('bulkImportSelectAll toggles selection', async () => {
    const { bulkImport, bulkImportSelectAll, bulkImportSelected, bulkImportSelectedCount } = useBulkImport(loadProjects);
    await bulkImport();
    expect(bulkImportSelectedCount.value).toBe(2);
    bulkImportSelectAll(false);
    expect(bulkImportSelectedCount.value).toBe(0);
    bulkImportSelectAll(true);
    expect(bulkImportSelectedCount.value).toBe(2);
  });

  it('confirmBulkImport adds selected projects', async () => {
    const { bulkImport, confirmBulkImport } = useBulkImport(loadProjects);
    await bulkImport();
    await confirmBulkImport();
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    expect(store.projects).toHaveLength(2);
    expect(store.projects.some((p) => p.path === '/scan/proj1')).toBe(true);
  });

  it('confirmBulkImport does nothing when no results', async () => {
    const { confirmBulkImport } = useBulkImport(loadProjects);
    await confirmBulkImport();
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    expect(store.projects).toHaveLength(0);
  });

  it('confirmBulkImport respects partial selection', async () => {
    const instance = useBulkImport(loadProjects);
    await instance.bulkImport();
    instance.bulkImportSelected.value = [true, false];
    await instance.confirmBulkImport();
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    expect(store.projects).toHaveLength(1);
  });

  it('confirmBulkImport handles limitExceeded from setProjects', async () => {
    mockApi.setProjects.mockResolvedValue({ limitExceeded: true, max: 5 });
    const { bulkImport, confirmBulkImport, bulkImportVisible } = useBulkImport(loadProjects);
    await bulkImport();
    await confirmBulkImport();
    expect(bulkImportVisible.value).toBe(false);
    expect(loadProjects).toHaveBeenCalled();
  });

  it('confirmBulkImport shows project limit when available is 0', async () => {
    mockApi.getLicenseStatus.mockResolvedValue({
      hasLicense: true,
      permissions: { tabs: [] },
      limits: { max_projects: 2, max_extensions: 5 },
    });
    const { useLicense } = await import('./useLicense');
    const license = useLicense();
    await license.loadStatus();
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([
      { path: '/p1', name: 'P1', tags: [], starred: false },
      { path: '/p2', name: 'P2', tags: [], starred: false },
    ]);
    mockApi.bulkImportProjects.mockResolvedValue({
      ok: true,
      parentDir: '/scan',
      projects: [
        { path: '/scan/a', name: 'a' },
        { path: '/scan/b', name: 'b' },
      ],
      alreadyAdded: 0,
    });
    const { bulkImport, confirmBulkImport } = useBulkImport(loadProjects);
    await bulkImport();
    await confirmBulkImport();
    const { useNotifications } = await import('./useNotifications');
    const { toasts } = useNotifications();
    expect(toasts.value.some((t) => t.title === 'Project limit reached')).toBe(true);
    expect(store.projects).toHaveLength(2);
  });

  it('confirmBulkImport shows partial import when over limit', async () => {
    mockApi.getLicenseStatus.mockResolvedValue({
      hasLicense: true,
      permissions: { tabs: [] },
      limits: { max_projects: 3, max_extensions: 5 },
    });
    const { useLicense } = await import('./useLicense');
    const license = useLicense();
    await license.loadStatus();
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([{ path: '/existing', name: 'Existing', tags: [], starred: false }]);
    mockApi.bulkImportProjects.mockResolvedValue({
      ok: true,
      parentDir: '/scan',
      projects: [
        { path: '/scan/a', name: 'a' },
        { path: '/scan/b', name: 'b' },
        { path: '/scan/c', name: 'c' },
      ],
      alreadyAdded: 0,
    });
    const { bulkImport, confirmBulkImport } = useBulkImport(loadProjects);
    await bulkImport();
    await confirmBulkImport();
    const { useNotifications } = await import('./useNotifications');
    const { toasts } = useNotifications();
    expect(toasts.value.some((t) => t.title === 'Partial import')).toBe(true);
    expect(store.projects).toHaveLength(3);
  });

  it('confirmBulkImport handles setProjects rejection', async () => {
    mockApi.setProjects.mockRejectedValue(new Error('save failed'));
    const { bulkImport, confirmBulkImport } = useBulkImport(loadProjects);
    await bulkImport();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await confirmBulkImport();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
