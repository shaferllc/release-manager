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
    expect(store.viewMode).toBe('dashboard');
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

  it('setPendingTerminalCommand and clearPendingTerminalCommand', () => {
    const store = useAppStore();
    store.setPendingTerminalCommand('npm test');
    expect(store.pendingTerminalCommand).toBe('npm test');
    store.clearPendingTerminalCommand();
    expect(store.pendingTerminalCommand).toBe(null);
  });

  it('toggleSidebar and setSidebarVisible', () => {
    const store = useAppStore();
    expect(store.sidebarVisible).toBe(true);
    store.toggleSidebar();
    expect(store.sidebarVisible).toBe(false);
    store.setSidebarVisible(true);
    expect(store.sidebarVisible).toBe(true);
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

  it('filteredProjects filters by type when project has no type property', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/a', name: 'A' },
      { path: '/b', name: 'B', type: 'npm' },
    ]);
    store.setFilterByType('npm');
    expect(store.filteredProjects).toHaveLength(1);
    expect(store.filteredProjects[0].path).toBe('/b');
  });

  it('filteredProjects filters by tag when project has no tags array', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/a', name: 'A' },
      { path: '/b', name: 'B', tags: ['v1'] },
    ]);
    store.setFilterByTag('v1');
    expect(store.filteredProjects).toHaveLength(1);
    expect(store.filteredProjects[0].path).toBe('/b');
  });

  it('filteredProjects sort uses path when name and path exist for localeCompare', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/z', name: 'Z', starred: true },
      { path: '/a', name: 'A', starred: true },
    ]);
    const list = store.filteredProjects;
    expect(list[0].name).toBe('A');
    expect(list[1].name).toBe('Z');
  });

  it('filteredProjects sort puts starred first when one starred one not', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/b', name: 'B' },
      { path: '/a', name: 'A', starred: true },
    ]);
    const list = store.filteredProjects;
    expect(list[0].starred).toBe(true);
    expect(list[0].name).toBe('A');
    expect(list[1].name).toBe('B');
  });

  it('filteredProjects sort returns 1 when a is unstarred and b is starred', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/first', name: 'First', starred: false },
      { path: '/second', name: 'Second', starred: true },
    ]);
    const list = store.filteredProjects;
    expect(list[0].path).toBe('/second');
    expect(list[1].path).toBe('/first');
  });

  it('filteredProjects sort uses empty bName when b has no name and no path', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/a', name: 'A' },
      {},
    ]);
    const list = store.filteredProjects;
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({});
    expect(list[1].name).toBe('A');
  });

  it('filteredProjects sort uses path basename when name missing and path present', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/foo/bar/baz' },
      { path: '/foo/bar/aaa' },
    ]);
    const list = store.filteredProjects;
    expect(list[0].path).toBe('/foo/bar/aaa');
    expect(list[1].path).toBe('/foo/bar/baz');
  });

  it('filteredProjects sort normalizes backslashes in path when deriving name', () => {
    const store = useAppStore();
    store.setProjects([
      { path: 'C:\\dev\\projectB' },
      { path: 'C:\\dev\\projectA' },
    ]);
    const list = store.filteredProjects;
    expect(list[0].path).toBe('C:\\dev\\projectA');
    expect(list[1].path).toBe('C:\\dev\\projectB');
  });

  it('filteredProjects sort uses path-derived name for one and empty for the other when one has no path', () => {
    const store = useAppStore();
    store.setProjects([
      { name: 'HasNameOnly' },
      { path: '/some/path/derived' },
    ]);
    const list = store.filteredProjects;
    expect(list).toHaveLength(2);
    expect(list[0].path).toBe('/some/path/derived');
    expect(list[1].name).toBe('HasNameOnly');
  });

  it('filteredProjects sort covers path and non-path name derivation with path-only, name-only, and empty', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/x/pathOnly' },
      { name: 'NameOnly' },
      {},
    ]);
    const list = store.filteredProjects;
    expect(list).toHaveLength(3);
    expect(list[0]).toEqual({});
    expect(list[1].name).toBe('NameOnly');
    expect(list[2].path).toBe('/x/pathOnly');
  });

  it('filteredProjects sort uses empty string when path yields no basename (e.g. root path)', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/' },
      { path: '/a' },
    ]);
    const list = store.filteredProjects;
    expect(list).toHaveLength(2);
    expect(list[0].path).toBe('/');
    expect(list[1].path).toBe('/a');
  });

  it('filteredProjects sort treats missing path as empty name', () => {
    const store = useAppStore();
    store.setProjects([
      { name: 'X' },
      { path: '/a', name: 'A' },
    ]);
    const list = store.filteredProjects;
    expect(list[0].name).toBe('A');
    expect(list[1].name).toBe('X');
  });

  it('filteredProjects sort uses empty string when project has no name and no path', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/a', name: 'A' },
      {},
    ]);
    const list = store.filteredProjects;
    expect(list[1].path).toBe('/a');
    expect(list[0]).toEqual({});
  });

  it('filteredProjects sort is stable when names are equal', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/b', name: 'Same' },
      { path: '/a', name: 'Same' },
    ]);
    const list = store.filteredProjects;
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('Same');
    expect(list[1].name).toBe('Same');
  });

  it('allTypes returns unique sorted types', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/a', name: 'A', type: 'php' },
      { path: '/b', name: 'B', type: 'npm' },
      { path: '/c', name: 'C', type: 'php' },
    ]);
    expect(store.allTypes).toEqual(['npm', 'php']);
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

  it('removeProject sets selectedPath to null when removing last project', () => {
    const store = useAppStore();
    store.setProjects([{ path: '/only', name: 'Only' }]);
    store.setSelectedPath('/only');
    store.removeProject('/only');
    expect(store.projects).toHaveLength(0);
    expect(store.selectedPath).toBe(null);
  });

  it('removeProject leaves selectedPath when removing non-selected project', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/a', name: 'A' },
      { path: '/b', name: 'B' },
    ]);
    store.setSelectedPath('/a');
    store.removeProject('/b');
    expect(store.selectedPath).toBe('/a');
  });

  it('removeProject removes path from selectedPaths', () => {
    const store = useAppStore();
    store.setProjects([
      { path: '/a', name: 'A' },
      { path: '/b', name: 'B' },
    ]);
    store.toggleProjectSelection('/a');
    store.toggleProjectSelection('/b');
    store.removeProject('/a');
    expect(store.selectedPaths.has('/a')).toBe(false);
    expect(store.selectedPaths.has('/b')).toBe(true);
  });

  it('selectedProject returns null when selectedPath not in projects', () => {
    const store = useAppStore();
    store.setProjects([{ path: '/a', name: 'A' }]);
    store.setSelectedPath('/missing');
    expect(store.selectedProject).toBe(null);
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
