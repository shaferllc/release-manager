import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDashboard } from './useDashboard';

describe('useDashboard', () => {
  let mockApi;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockApi = {
      getAllProjectsInfo: vi.fn().mockResolvedValue([]),
    };
    if (globalThis.window) globalThis.window.releaseManager = mockApi;
  });

  it('returns filterOptions, sortOptions, filter, sort, rows, summary, unreleasedLabel, aheadBehindLabel, selectProject, load', () => {
    const dashboard = useDashboard();
    expect(dashboard.filterOptions).toBeDefined();
    expect(dashboard.sortOptions).toBeDefined();
    expect(dashboard.filter).toBeDefined();
    expect(dashboard.sort).toBeDefined();
    expect(dashboard.rows).toBeDefined();
    expect(dashboard.summary).toBeDefined();
    expect(typeof dashboard.unreleasedLabel).toBe('function');
    expect(typeof dashboard.aheadBehindLabel).toBe('function');
    expect(typeof dashboard.selectProject).toBe('function');
    expect(typeof dashboard.load).toBe('function');
  });

  it('load fetches getAllProjectsInfo and populates data', async () => {
    const data = [
      { path: '/p1', name: 'P1', ahead: 0, behind: 0 },
      { path: '/p2', name: 'P2', ahead: 2, behind: 1, commitsSinceLatestTag: 3 },
    ];
    mockApi.getAllProjectsInfo.mockResolvedValue(data);
    const { load, rows, summary } = useDashboard();
    await load();
    expect(rows.value).toHaveLength(2);
    expect(summary.value.total).toBe(2);
    expect(summary.value.needsRelease).toBe(1);
    expect(summary.value.totalAhead).toBe(2);
  });

  it('load sets empty data when getAllProjectsInfo throws', async () => {
    mockApi.getAllProjectsInfo.mockRejectedValue(new Error('Network error'));
    const { load, rows } = useDashboard();
    await load();
    expect(rows.value).toEqual([]);
  });

  it('unreleasedLabel returns commit count or —', () => {
    const { unreleasedLabel } = useDashboard();
    expect(unreleasedLabel({ commitsSinceLatestTag: 3 })).toBe('3 commits');
    expect(unreleasedLabel({ commitsSinceLatestTag: 1 })).toBe('1 commit');
    expect(unreleasedLabel({ commitsSinceLatestTag: 0 })).toBe('—');
    expect(unreleasedLabel({ commitsSinceLatestTag: null })).toBe('—');
  });

  it('aheadBehindLabel returns formatAheadBehind or —', () => {
    const { aheadBehindLabel } = useDashboard();
    expect(aheadBehindLabel({ ahead: 2, behind: 0 })).toBe('2 ahead');
    expect(aheadBehindLabel({ ahead: 0, behind: 1 })).toBe('1 behind');
    expect(aheadBehindLabel({ ahead: 0, behind: 0 })).toBe('—');
  });

  it('filter needs-release filters rows', async () => {
    const data = [
      { path: '/p1', name: 'P1', ahead: 0, behind: 0, commitsSinceLatestTag: 0 },
      { path: '/p2', name: 'P2', ahead: 1, behind: 0, commitsSinceLatestTag: 0 },
    ];
    mockApi.getAllProjectsInfo.mockResolvedValue(data);
    const { load, filter, rows } = useDashboard();
    await load();
    expect(rows.value).toHaveLength(2);
    filter.value = 'needs-release';
    expect(rows.value).toHaveLength(1);
    expect(rows.value[0].name).toBe('P2');
  });

  it('selectProject sets view mode and selected path', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    mockApi.getAllProjectsInfo.mockResolvedValue([{ path: '/my/proj', name: 'MyProj' }]);
    const { load, selectProject } = useDashboard();
    await load();
    selectProject('/my/proj');
    expect(store.viewMode).toBe('detail');
    expect(store.selectedPath).toBe('/my/proj');
  });

  it('sort needs-release orders by needsRelease first', async () => {
    const data = [
      { path: '/a', name: 'A', ahead: 0, behind: 0, commitsSinceLatestTag: 0 },
      { path: '/b', name: 'B', ahead: 1, behind: 0, commitsSinceLatestTag: 0 },
    ];
    mockApi.getAllProjectsInfo.mockResolvedValue(data);
    const { load, sort, rows } = useDashboard();
    await load();
    sort.value = 'needs-release';
    expect(rows.value[0].name).toBe('B');
    expect(rows.value[1].name).toBe('A');
  });
});
