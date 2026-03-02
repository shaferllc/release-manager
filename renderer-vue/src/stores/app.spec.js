import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAppStore } from './app';

describe('useAppStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('has default state', () => {
    const store = useAppStore();
    expect(store.projects).toEqual([]);
    expect(store.selectedPath).toBe(null);
    expect(store.viewMode).toBe('detail');
    expect(store.detailTab).toBe('dashboard');
    expect(store.useDetailTabs).toBe(true);
  });

  it('setProjects sets projects array', () => {
    const store = useAppStore();
    const list = [{ path: '/a', name: 'A' }, { path: '/b', name: 'B' }];
    store.setProjects(list);
    expect(store.projects).toHaveLength(2);
    expect(store.projects[0].path).toBe('/a');
  });

  it('setProjects ignores non-array', () => {
    const store = useAppStore();
    store.setProjects(null);
    expect(store.projects).toEqual([]);
  });

  it('setSelectedPath updates selectedPath', () => {
    const store = useAppStore();
    store.setSelectedPath('/foo');
    expect(store.selectedPath).toBe('/foo');
  });

  it('setCurrentInfo updates currentInfo', () => {
    const store = useAppStore();
    store.setCurrentInfo({ version: '1.0.0' });
    expect(store.currentInfo).toEqual({ version: '1.0.0' });
  });

  it('selectedProject is null when no selection', () => {
    const store = useAppStore();
    store.setProjects([{ path: '/a', name: 'A' }]);
    expect(store.selectedProject).toBe(null);
  });

  it('selectedProject returns project when path matches', () => {
    const store = useAppStore();
    const list = [{ path: '/a', name: 'A' }, { path: '/b', name: 'B' }];
    store.setProjects(list);
    store.setSelectedPath('/b');
    expect(store.selectedProject).toEqual({ path: '/b', name: 'B' });
  });

  it('setViewMode updates viewMode', () => {
    const store = useAppStore();
    store.setViewMode('settings');
    expect(store.viewMode).toBe('settings');
  });

  it('setTheme updates theme', () => {
    const store = useAppStore();
    store.setTheme('dark');
    expect(store.theme).toBe('dark');
  });

  it('setFilterByTag updates filterByTag', () => {
    const store = useAppStore();
    store.setFilterByTag('v1');
    expect(store.filterByTag).toBe('v1');
  });

  it('setUseDetailTabs updates useDetailTabs', () => {
    const store = useAppStore();
    store.setUseDetailTabs(false);
    expect(store.useDetailTabs).toBe(false);
  });

  it('setDetailTab updates detailTab', () => {
    const store = useAppStore();
    store.setDetailTab('git');
    expect(store.detailTab).toBe('git');
  });

  it('filteredProjects returns sorted list', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/b', name: 'B' },
      { path: '/a', name: 'A' },
    ]);
    expect(store.filteredProjects).toHaveLength(2);
    expect(store.filteredProjects[0].name).toBe('A');
    expect(store.filteredProjects[1].name).toBe('B');
  });

  it('filteredProjects filters by filterByType', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/a', name: 'A', type: 'npm' },
      { path: '/b', name: 'B', type: 'php' },
    ]);
    store.setFilterByType('npm');
    expect(store.filteredProjects).toHaveLength(1);
    expect(store.filteredProjects[0].type).toBe('npm');
  });

  it('filteredProjects filters by filterByTag', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/a', name: 'A', tags: ['v1', 'v2'] },
      { path: '/b', name: 'B', tags: ['v2', 'v3'] },
    ]);
    store.setFilterByTag('v1');
    expect(store.filteredProjects).toHaveLength(1);
    expect(store.filteredProjects[0].path).toBe('/a');
  });

  it('setFilterByType(null) sets empty string', () => {
    const store = useAppStore();
    store.setFilterByType('npm');
    store.setFilterByType(null);
    expect(store.filterByType).toBe('');
  });

  it('setFilterByTag(null) sets empty string', () => {
    const store = useAppStore();
    store.setFilterByTag('v1');
    store.setFilterByTag(null);
    expect(store.filterByTag).toBe('');
  });

  it('filteredProjects sorts starred first then by name', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/b', name: 'B', starred: false },
      { path: '/a', name: 'A', starred: true },
    ]);
    const list = store.filteredProjects;
    expect(list[0].name).toBe('A');
    expect(list[1].name).toBe('B');
  });

  it('filteredProjects uses path basename when name missing', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/some/path/project-one' },
      { path: '/other/project-two' },
    ]);
    const list = store.filteredProjects;
    expect(list[0].name || list[0].path).toContain('project-one');
    expect(list[1].name || list[1].path).toContain('project-two');
  });

  it('allTags returns unique sorted tags', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/a', tags: ['x', 'y'] },
      { path: '/b', tags: ['y', 'z'] },
    ]);
    expect(store.allTags).toEqual(['x', 'y', 'z']);
  });

  it('toggleStar flips starred', () => {
    const store = useAppStore();
    store.setProjects([{ path: '/a', name: 'A', starred: false }]);
    store.toggleStar('/a');
    expect(store.projects[0].starred).toBe(true);
    store.toggleStar('/a');
    expect(store.projects[0].starred).toBe(false);
  });

  it('removeProject removes and clears selection if needed', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/a', name: 'A' },
      { path: '/b', name: 'B' },
    ]);
    store.setSelectedPath('/a');
    store.removeProject('/a');
    expect(store.projects).toHaveLength(1);
    expect(store.projects[0].path).toBe('/b');
    expect(store.selectedPath).toBe('/b');
  });

  it('toggleProjectSelection adds and removes from set', () => {
    const store = useAppStore();
    store.toggleProjectSelection('/p1');
    expect(store.selectedPaths.has('/p1')).toBe(true);
    store.toggleProjectSelection('/p1');
    expect(store.selectedPaths.has('/p1')).toBe(false);
  });

  it('clearProjectSelection empties set', () => {
    const store = useAppStore();
    store.toggleProjectSelection('/p1');
    store.clearProjectSelection();
    expect(store.selectedPaths.size).toBe(0);
  });
});
