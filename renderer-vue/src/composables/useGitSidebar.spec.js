import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGitSidebar } from './useGitSidebar';

describe('useGitSidebar', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getBranches: vi.fn(),
        getTags: vi.fn(),
        getRemotes: vi.fn(),
        getWorktrees: vi.fn(),
        getStashList: vi.fn(),
        getSubmodules: vi.fn(),
        getReflog: vi.fn(),
        getRemoteBranches: vi.fn(),
        getPreference: vi.fn(),
        setPreference: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns branches, tags, filteredBranches, branchSelectOptions', () => {
    const store = { selectedPath: null };
    const getInfo = () => ({ path: '/test' });
    const result = useGitSidebar(store, getInfo);
    expect(result).toHaveProperty('branches');
    expect(result).toHaveProperty('tags');
    expect(result).toHaveProperty('filteredBranches');
    expect(result).toHaveProperty('branchSelectOptions');
  });

  it('filteredBranches filters by gitFilter', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { branches, gitFilter, filteredBranches } = useGitSidebar(store, getInfo);
    branches.value = ['main', 'feature-x', 'feature-y'];
    gitFilter.value = 'feature';
    expect(filteredBranches.value).toHaveLength(2);
    expect(filteredBranches.value).toContain('feature-x');
    expect(filteredBranches.value).toContain('feature-y');
  });

  it('branchSelectOptions includes new branch option', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { branches, branchSelectOptions } = useGitSidebar(store, getInfo);
    branches.value = ['main'];
    expect(branchSelectOptions.value).toContainEqual({ value: '__new__', label: '+ New branch…' });
  });

  it('filteredTags filters by gitFilter', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { tags, gitFilter, filteredTags } = useGitSidebar(store, getInfo);
    tags.value = ['v1.0.0', 'v2.0.0', 'dev'];
    gitFilter.value = 'v2';
    expect(filteredTags.value).toHaveLength(1);
    expect(filteredTags.value).toContain('v2.0.0');
  });

  it('loadTagsOnly populates tags when API returns', async () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const api = globalThis.window?.releaseManager;
    api.getTags.mockResolvedValue({ ok: true, tags: ['v1.0.0', 'v2.0.0'] });
    const { loadTagsOnly, tags } = useGitSidebar(store, getInfo);
    await loadTagsOnly();
    expect(tags.value).toEqual(['v1.0.0', 'v2.0.0']);
  });

  it('loadStashList populates stashListEntries', async () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const api = globalThis.window?.releaseManager;
    api.getStashList.mockResolvedValue({ ok: true, entries: [{ message: 'WIP' }] });
    const { loadStashList, stashListEntries } = useGitSidebar(store, getInfo);
    await loadStashList();
    expect(stashListEntries.value).toHaveLength(1);
    expect(stashListEntries.value[0].message).toBe('WIP');
  });

  it('loadRemoteBranches populates remoteBranches', async () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const api = globalThis.window?.releaseManager;
    api.getRemoteBranches = vi.fn().mockResolvedValue({ ok: true, branches: ['origin/main'] });
    const { loadRemoteBranches, remoteBranches } = useGitSidebar(store, getInfo);
    await loadRemoteBranches();
    expect(remoteBranches.value).toEqual(['origin/main']);
  });

  it('worktreeLabel returns base and branch', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { worktreeLabel } = useGitSidebar(store, getInfo);
    expect(worktreeLabel({ path: '/repo/feature', branch: 'feature-x' })).toBe('feature · feature-x');
  });

  it('widgetHasContent returns true for local-branches when branches exist', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { branches, widgetHasContent } = useGitSidebar(store, getInfo);
    branches.value = ['main'];
    expect(widgetHasContent('local-branches')).toBe(true);
    branches.value = [];
    expect(widgetHasContent('local-branches')).toBe(false);
  });

  it('filteredSubmodules filters by gitFilter', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { submodules, gitFilter, filteredSubmodules } = useGitSidebar(store, getInfo);
    submodules.value = [{ path: '/repo/sub', url: 'https://github.com/x/sub' }];
    gitFilter.value = 'sub';
    expect(filteredSubmodules.value).toHaveLength(1);
    gitFilter.value = 'other';
    expect(filteredSubmodules.value).toHaveLength(0);
  });

  it('filteredReflogEntries filters by gitFilter', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { reflogEntries, gitFilter, filteredReflogEntries } = useGitSidebar(store, getInfo);
    reflogEntries.value = [{ sha: 'abc123', ref: 'HEAD', message: 'commit: fix bug' }];
    gitFilter.value = 'abc';
    expect(filteredReflogEntries.value).toHaveLength(1);
    gitFilter.value = 'xyz';
    expect(filteredReflogEntries.value).toHaveLength(0);
  });

  it('reflogByCategory groups entries by message prefix', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { reflogEntries, reflogSearch, reflogByCategory } = useGitSidebar(store, getInfo);
    reflogEntries.value = [
      { message: 'commit: add feature' },
      { message: 'checkout: switch branch' },
    ];
    reflogSearch.value = '';
    const groups = reflogByCategory.value;
    expect(groups.length).toBeGreaterThan(0);
    const commitGroup = groups.find((g) => g.key === 'commit');
    expect(commitGroup?.entries).toHaveLength(1);
  });

  it('worktreesSummary returns count string', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { worktrees, worktreesSummary } = useGitSidebar(store, getInfo);
    worktrees.value = [{ path: '/main' }, { path: '/feature' }];
    expect(worktreesSummary.value).toBe('1 worktree');
    worktrees.value = [{ path: '/main' }, { path: '/a' }, { path: '/b' }];
    expect(worktreesSummary.value).toBe('2 worktrees');
  });

  it('loadReflogOnly populates reflogEntries', async () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const api = globalThis.window?.releaseManager;
    api.getReflog.mockResolvedValue({ ok: true, entries: [{ message: 'commit: x' }] });
    const { loadReflogOnly, reflogEntries } = useGitSidebar(store, getInfo);
    await loadReflogOnly();
    expect(reflogEntries.value).toHaveLength(1);
  });

  it('loadWorktreesOnly populates worktrees', async () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const api = globalThis.window?.releaseManager;
    api.getWorktrees.mockResolvedValue({ ok: true, worktrees: [{ path: '/repo' }] });
    const { loadWorktreesOnly, worktrees } = useGitSidebar(store, getInfo);
    await loadWorktreesOnly();
    expect(worktrees.value).toHaveLength(1);
  });

  it('loadSubmodulesOnly populates submodules', async () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const api = globalThis.window?.releaseManager;
    api.getSubmodules.mockResolvedValue({ ok: true, submodules: [{ path: 'sub' }] });
    const { loadSubmodulesOnly, submodules } = useGitSidebar(store, getInfo);
    await loadSubmodulesOnly();
    expect(submodules.value).toHaveLength(1);
  });

  it('moveWidgetUp swaps widget order', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { sidebarWidgetOrder, moveWidgetUp } = useGitSidebar(store, getInfo);
    const ids = [...sidebarWidgetOrder.value];
    const second = ids[1];
    moveWidgetUp(second);
    expect(sidebarWidgetOrder.value[0]).toBe(second);
  });

  it('moveWidgetDown swaps widget order', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { sidebarWidgetOrder, moveWidgetDown } = useGitSidebar(store, getInfo);
    const ids = [...sidebarWidgetOrder.value];
    const first = ids[0];
    moveWidgetDown(first);
    expect(sidebarWidgetOrder.value[1]).toBe(first);
  });

  it('setWidgetVisible updates visibility and saves', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { setWidgetVisible, sidebarWidgetVisible } = useGitSidebar(store, getInfo);
    setWidgetVisible('tags', false);
    expect(sidebarWidgetVisible.value?.tags).toBe(false);
    expect(globalThis.window.releaseManager.setPreference).toHaveBeenCalled();
  });

  it('onWidgetDragStart sets draggedWidgetId', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { onWidgetDragStart, draggedWidgetId } = useGitSidebar(store, getInfo);
    const e = { dataTransfer: { effectAllowed: '', setData: vi.fn() } };
    onWidgetDragStart(e, 'tags');
    expect(draggedWidgetId.value).toBe('tags');
  });

  it('onWidgetDrop reorders widgets', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { onWidgetDrop, sidebarWidgetOrder, widgetDropTarget, draggedWidgetId } = useGitSidebar(store, getInfo);
    draggedWidgetId.value = 'tags';
    widgetDropTarget.value = { id: 'local-branches', position: 'after' };
    const e = {
      preventDefault: vi.fn(),
      dataTransfer: { getData: vi.fn().mockReturnValue('tags') },
    };
    const beforeOrder = [...sidebarWidgetOrder.value];
    onWidgetDrop(e, 'local-branches');
    expect(sidebarWidgetOrder.value).not.toEqual(beforeOrder);
  });

  it('onBranchDragStart sets branchDragPayload', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { onBranchDragStart, branchDragPayload } = useGitSidebar(store, getInfo);
    const e = { dataTransfer: { effectAllowed: '', setData: vi.fn() } };
    onBranchDragStart(e, 'main', false);
    expect(branchDragPayload.value).toEqual({ ref: 'main', isRemote: false });
  });

  it('isCurrentWorktree compares normalized paths', () => {
    const store = { selectedPath: '/Users/x/repo' };
    const getInfo = () => ({ path: '/test' });
    const { isCurrentWorktree } = useGitSidebar(store, getInfo);
    expect(isCurrentWorktree('/Users/x/repo')).toBe(true);
    expect(isCurrentWorktree('/other')).toBe(false);
  });

  it('toggleReflogCategory toggles category open state', () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const { reflogCategoryOpen, toggleReflogCategory } = useGitSidebar(store, getInfo);
    const was = reflogCategoryOpen.value.commit;
    toggleReflogCategory('commit');
    expect(reflogCategoryOpen.value.commit).toBe(!was);
  });

  it('loadStashList handles API error', async () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const api = globalThis.window?.releaseManager;
    api.getStashList.mockRejectedValue(new Error('fail'));
    const { loadStashList, stashListEntries } = useGitSidebar(store, getInfo);
    await loadStashList();
    expect(stashListEntries.value).toEqual([]);
  });

  it('loadRemoteBranches handles API error', async () => {
    const store = { selectedPath: '/test' };
    const getInfo = () => ({ path: '/test' });
    const api = globalThis.window?.releaseManager;
    api.getRemoteBranches = vi.fn().mockRejectedValue(new Error('fail'));
    const { loadRemoteBranches, remoteBranches } = useGitSidebar(store, getInfo);
    await loadRemoteBranches();
    expect(remoteBranches.value).toEqual([]);
  });
});
