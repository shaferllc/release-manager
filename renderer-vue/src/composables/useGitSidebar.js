import { ref, computed, watch, onMounted } from 'vue';
import { useApi } from './useApi';
import {
  GIT_SIDEBAR_WIDGET_IDS,
  GIT_SIDEBAR_WIDGET_LABELS,
  GIT_SIDEBAR_WIDGET_ORDER_KEY,
  GIT_SIDEBAR_WIDGET_VISIBLE_KEY,
  REFLOG_CATEGORY_ORDER,
  reflogCategoryFromMessage,
  reflogCategoryLabel,
} from '../constants/gitSidebar';

const BRANCH_DRAG_TYPE = 'application/x-rm-branch';

/**
 * Composable for the Git tab sidebar: branches, tags, remotes, worktrees, stash,
 * submodules, reflog, widget order/visibility, and drag-drop state.
 * Call with (store, getInfo) where getInfo() returns props.info.
 * @returns Sidebar refs, computeds, and methods for DetailGitSection.
 */
export function useGitSidebar(store, getInfo) {
  const api = useApi();

  const branches = ref([]);
  const tags = ref([]);
  const remoteBranches = ref([]);
  const remoteBranchesLoaded = ref(false);
  const remoteBranchesLoading = ref(false);
  const worktrees = ref([]);
  const selectedBranch = ref('');
  const gitFilter = ref('');
  const stashListEntries = ref([]);
  const submodules = ref([]);
  const reflogEntries = ref([]);
  const reflogLoaded = ref(false);
  const reflogLoading = ref(false);
  const reflogCategoryOpen = ref({ commit: true, checkout: true, merge: true, rebase: true, reset: true, other: true });
  const reflogSearch = ref('');
  const submoduleSearch = ref('');
  const sidebarLocalOpen = ref(true);
  const sidebarRemoteOpen = ref(true);
  const sidebarWorktreesOpen = ref(true);
  const sidebarTagsOpen = ref(true);
  const sidebarSubmodulesOpen = ref(true);
  const sidebarReflogOpen = ref(true);
  const sidebarStashOpen = ref(true);
  const sidebarWidgetOrder = ref([...GIT_SIDEBAR_WIDGET_IDS]);
  const sidebarWidgetVisible = ref(null);
  const widgetDropdownOpen = ref(false);
  const draggedWidgetId = ref(null);
  const widgetDropTarget = ref({ id: null, position: 'before' });
  const branchDragPayload = ref(null);
  const branchDropTarget = ref(null);

  const filterLower = computed(() => (gitFilter.value || '').trim().toLowerCase());
  const filteredBranches = computed(() => {
    if (!filterLower.value) return branches.value;
    return branches.value.filter((b) => String(b).toLowerCase().includes(filterLower.value));
  });
  const branchSelectOptions = computed(() => [
    { value: '', label: '—' },
    { value: '__new__', label: '+ New branch…' },
    ...filteredBranches.value.map((b) => ({ value: b, label: b })),
  ]);
  const filteredTags = computed(() => {
    if (!filterLower.value) return tags.value;
    return tags.value.filter((t) => String(t).toLowerCase().includes(filterLower.value));
  });
  const filteredRemoteBranches = computed(() => {
    if (!filterLower.value) return remoteBranches.value;
    return remoteBranches.value.filter((r) => String(r).toLowerCase().includes(filterLower.value));
  });
  const filteredSubmodules = computed(() => {
    if (!filterLower.value) return submodules.value;
    const lower = filterLower.value;
    return submodules.value.filter(
      (s) =>
        String(s?.path || '').toLowerCase().includes(lower) ||
        String(s?.url || '').toLowerCase().includes(lower)
    );
  });
  const filteredReflogEntries = computed(() => {
    if (!filterLower.value) return reflogEntries.value;
    const lower = filterLower.value;
    return reflogEntries.value.filter(
      (e) =>
        String(e?.sha || '').toLowerCase().includes(lower) ||
        String(e?.ref || '').toLowerCase().includes(lower) ||
        String(e?.message || '').toLowerCase().includes(lower)
    );
  });
  const submoduleSearchLower = computed(() => (submoduleSearch.value || '').trim().toLowerCase());
  const filteredSubmodulesBySearch = computed(() => {
    if (!submoduleSearchLower.value) return submodules.value;
    return submodules.value.filter(
      (s) =>
        String(s?.path || '').toLowerCase().includes(submoduleSearchLower.value) ||
        String(s?.url || '').toLowerCase().includes(submoduleSearchLower.value)
    );
  });
  const reflogSearchLower = computed(() => (reflogSearch.value || '').trim().toLowerCase());
  const filteredReflogBySearch = computed(() => {
    if (!reflogSearchLower.value) return reflogEntries.value;
    return reflogEntries.value.filter(
      (e) =>
        String(e?.sha || '').toLowerCase().includes(reflogSearchLower.value) ||
        String(e?.ref || '').toLowerCase().includes(reflogSearchLower.value) ||
        String(e?.message || '').toLowerCase().includes(reflogSearchLower.value)
    );
  });
  const reflogByCategory = computed(() => {
    const list = filteredReflogBySearch.value;
    const groups = { commit: [], checkout: [], merge: [], rebase: [], reset: [], other: [] };
    for (const e of list) {
      const cat = reflogCategoryFromMessage(e?.message);
      if (groups[cat]) groups[cat].push(e);
      else groups.other.push(e);
    }
    return REFLOG_CATEGORY_ORDER.map((key) => ({ key, label: reflogCategoryLabel(key), entries: groups[key] || [] })).filter((g) => g.entries.length > 0);
  });
  const worktreesSummary = computed(() => {
    const list = worktrees.value ?? [];
    const additional = list.length <= 1 ? 0 : list.length - 1;
    if (additional === 0) return 'No additional worktrees';
    return additional === 1 ? '1 worktree' : `${additional} worktrees`;
  });

  function widgetHasContent(id) {
    switch (id) {
      case 'local-branches': return branches.value.length > 0;
      case 'remote': return remoteBranchesLoaded.value && remoteBranches.value.length > 0;
      case 'worktrees': return worktrees.value.length > 1;
      case 'tags': return tags.value.length > 0;
      case 'stash': return true;
      case 'submodules': return submodules.value.length > 0;
      case 'reflog': return reflogLoaded.value && reflogEntries.value.length > 0;
      default: return false;
    }
  }

  function effectiveWidgetVisible(id) {
    const prefs = sidebarWidgetVisible.value;
    if (prefs == null) return widgetHasContent(id);
    if (typeof prefs[id] === 'boolean') return prefs[id];
    return widgetHasContent(id);
  }

  const visibleOrderedWidgetIds = computed(() =>
    sidebarWidgetOrder.value.filter((id) => effectiveWidgetVisible(id))
  );
  const hasMultipleVisibleWidgets = computed(() => visibleOrderedWidgetIds.value.length > 1);

  function normalizePathForCompare(p) {
    if (!p || typeof p !== 'string') return '';
    return p.replace(/\\/g, '/').trim().replace(/\/+$/, '');
  }

  function isCurrentWorktree(wtPath) {
    const current = normalizePathForCompare(store.selectedPath);
    const wt = normalizePathForCompare(wtPath);
    return current && wt && (current === wt || current === wt + '/' || wt === current + '/');
  }

  function worktreeLabel(w) {
    const path = w?.path || '';
    const base = path.replace(/\\/g, '/').split('/').filter(Boolean).pop() || path;
    const branch = w?.branch || w?.head || '';
    return branch ? `${base} · ${branch}` : base;
  }

  function reflogEntryLabel(e) {
    const msg = e?.message || '';
    return msg.length > 20 ? msg.slice(0, 18) + '…' : msg;
  }

  function toggleReflogCategory(key) {
    const o = { ...reflogCategoryOpen.value };
    o[key] = !o[key];
    reflogCategoryOpen.value = o;
  }

  function loadStashList() {
    const path = store.selectedPath;
    if (!path || !api.getStashList) return Promise.resolve();
    return api.getStashList(path).then((r) => {
      stashListEntries.value = r?.ok && Array.isArray(r?.entries) ? r.entries : [];
    }).catch(() => { stashListEntries.value = []; });
  }

  async function loadRemoteBranches() {
    const path = store.selectedPath;
    if (!path || !api.getRemoteBranches) return;
    remoteBranchesLoading.value = true;
    try {
      const res = await api.getRemoteBranches(path);
      remoteBranches.value = res?.ok && Array.isArray(res.branches) ? res.branches : [];
      remoteBranchesLoaded.value = true;
    } catch {
      remoteBranches.value = [];
      remoteBranchesLoaded.value = true;
    } finally {
      remoteBranchesLoading.value = false;
    }
  }

  async function loadReflogOnly() {
    const path = store.selectedPath;
    if (!path || !api.getReflog) {
      reflogLoading.value = false;
      return;
    }
    reflogLoading.value = true;
    try {
      const r = await api.getReflog(path, 50);
      reflogEntries.value = r?.ok && Array.isArray(r.entries) ? r.entries : [];
      reflogLoaded.value = true;
    } catch {
      reflogEntries.value = [];
      reflogLoaded.value = true;
    } finally {
      reflogLoading.value = false;
    }
  }

  async function loadTagsOnly() {
    const path = store.selectedPath;
    if (!path || !api.getTags) return;
    try {
      const r = await api.getTags(path);
      tags.value = r?.ok && Array.isArray(r?.tags) ? r.tags : [];
    } catch {
      tags.value = [];
    }
  }

  async function loadWorktreesOnly() {
    const path = store.selectedPath;
    if (!path || !api.getWorktrees) return;
    try {
      const r = await api.getWorktrees(path);
      worktrees.value = r?.ok && Array.isArray(r?.worktrees) ? r.worktrees : [];
    } catch {
      worktrees.value = [];
    }
  }

  async function loadSubmodulesOnly() {
    const path = store.selectedPath;
    if (!path || !api.getSubmodules) return;
    try {
      const r = await api.getSubmodules(path);
      submodules.value = r?.ok && Array.isArray(r.submodules) ? r.submodules : [];
    } catch {
      submodules.value = [];
    }
  }

  async function refetchBranches() {
    const path = store.selectedPath;
    const info = getInfo?.();
    if (!path || !api.getBranches) return;
    try {
      const bRes = await api.getBranches(path);
      if (bRes?.ok && Array.isArray(bRes.branches)) {
        branches.value = bRes.branches;
        const current = (bRes.current || info?.branch || '').trim();
        if (current) selectedBranch.value = current;
      }
    } catch {
      // keep existing branches
    }
  }

  async function loadGitSidebarWidgetPrefs() {
    if (!api.getPreference) return;
    try {
      const [order, visible] = await Promise.all([
        api.getPreference(GIT_SIDEBAR_WIDGET_ORDER_KEY),
        api.getPreference(GIT_SIDEBAR_WIDGET_VISIBLE_KEY),
      ]);
      if (Array.isArray(order) && order.length === GIT_SIDEBAR_WIDGET_IDS.length) {
        const valid = order.filter((id) => GIT_SIDEBAR_WIDGET_IDS.includes(id));
        const missing = GIT_SIDEBAR_WIDGET_IDS.filter((id) => !valid.includes(id));
        sidebarWidgetOrder.value = [...valid, ...missing];
      }
      if (visible && typeof visible === 'object') {
        const next = {};
        GIT_SIDEBAR_WIDGET_IDS.forEach((id) => {
          if (typeof visible[id] === 'boolean') next[id] = visible[id];
        });
        if (Object.keys(next).length > 0) sidebarWidgetVisible.value = next;
      }
    } catch (_) {}
  }

  function saveGitSidebarWidgetOrder() {
    if (api.setPreference) api.setPreference(GIT_SIDEBAR_WIDGET_ORDER_KEY, JSON.parse(JSON.stringify(sidebarWidgetOrder.value)));
  }

  function saveGitSidebarWidgetVisibility() {
    if (api.setPreference && sidebarWidgetVisible.value != null) {
      api.setPreference(GIT_SIDEBAR_WIDGET_VISIBLE_KEY, JSON.parse(JSON.stringify(sidebarWidgetVisible.value)));
    }
  }

  function moveWidgetUp(id) {
    const order = [...sidebarWidgetOrder.value];
    const i = order.indexOf(id);
    if (i <= 0) return;
    [order[i - 1], order[i]] = [order[i], order[i - 1]];
    sidebarWidgetOrder.value = order;
    saveGitSidebarWidgetOrder();
  }

  function moveWidgetDown(id) {
    const order = [...sidebarWidgetOrder.value];
    const i = order.indexOf(id);
    if (i < 0 || i >= order.length - 1) return;
    [order[i], order[i + 1]] = [order[i + 1], order[i]];
    sidebarWidgetOrder.value = order;
    saveGitSidebarWidgetOrder();
  }

  function setWidgetVisible(id, visible) {
    const prefs = sidebarWidgetVisible.value;
    const base = prefs != null ? prefs : Object.fromEntries(GIT_SIDEBAR_WIDGET_IDS.map((i) => [i, widgetHasContent(i)]));
    const next = { ...base, [id]: visible };
    sidebarWidgetVisible.value = next;
    saveGitSidebarWidgetVisibility();
  }

  function onWidgetDragStart(e, widgetId) {
    draggedWidgetId.value = widgetId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', widgetId);
    e.dataTransfer.setData('application/x-widget-id', widgetId);
  }

  function onWidgetDragOver(e, widgetId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedWidgetId.value === widgetId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
    widgetDropTarget.value = { id: widgetId, position };
  }

  function onWidgetDragLeave(e, widgetId) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      if (widgetDropTarget.value?.id === widgetId) widgetDropTarget.value = { id: null, position: 'before' };
    }
  }

  function onWidgetDrop(e, targetWidgetId) {
    e.preventDefault();
    const id = e.dataTransfer.getData('application/x-widget-id') || draggedWidgetId.value;
    if (!id || id === targetWidgetId) {
      draggedWidgetId.value = null;
      widgetDropTarget.value = { id: null, position: 'before' };
      return;
    }
    const order = sidebarWidgetOrder.value.filter((x) => x !== id);
    const targetIdx = order.indexOf(targetWidgetId);
    if (targetIdx === -1) {
      draggedWidgetId.value = null;
      widgetDropTarget.value = { id: null, position: 'before' };
      return;
    }
    const insertIdx = widgetDropTarget.value?.id === targetWidgetId && widgetDropTarget.value?.position === 'after' ? targetIdx + 1 : targetIdx;
    order.splice(insertIdx, 0, id);
    sidebarWidgetOrder.value = order;
    saveGitSidebarWidgetOrder();
    draggedWidgetId.value = null;
    widgetDropTarget.value = { id: null, position: 'before' };
  }

  function onWidgetDragEnd() {
    draggedWidgetId.value = null;
    widgetDropTarget.value = { id: null, position: 'before' };
  }

  function onBranchDragStart(e, refName, isRemote) {
    branchDragPayload.value = { ref: refName, isRemote };
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(BRANCH_DRAG_TYPE, JSON.stringify({ ref: refName, isRemote }));
    e.dataTransfer.setData('text/plain', refName);
  }

  function onBranchDragOver(e, targetBranch) {
    if (!e.dataTransfer.types.includes(BRANCH_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const payload = branchDragPayload.value;
    if (!payload) return;
    const draggedRef = payload.ref;
    const isSame = payload.isRemote ? (targetBranch === draggedRef.replace(/^[^/]+\//, '')) : (targetBranch === draggedRef);
    if (isSame) return;
    branchDropTarget.value = targetBranch;
  }

  function onBranchDragLeave(e, targetBranch) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      if (branchDropTarget.value === targetBranch) branchDropTarget.value = null;
    }
  }

  function onBranchDragEnd() {
    branchDragPayload.value = null;
    branchDropTarget.value = null;
  }

  function isWidgetDropBefore(widgetId) {
    const t = widgetDropTarget.value;
    return t?.id === widgetId && t?.position === 'before';
  }

  function isWidgetDropAfter(widgetId) {
    const t = widgetDropTarget.value;
    return t?.id === widgetId && t?.position === 'after';
  }

  async function loadReflogFromSidebar() {
    await loadReflogOnly();
  }

  watch(() => getInfo?.()?.path, async (path) => {
    if (!path) {
      branches.value = [];
      tags.value = [];
      remoteBranches.value = [];
      remoteBranchesLoaded.value = false;
      worktrees.value = [];
      stashListEntries.value = [];
      submodules.value = [];
      reflogEntries.value = [];
      reflogLoaded.value = false;
      selectedBranch.value = '';
      return;
    }
    try {
      const [bRes, tRes, wtRes, stashRes, subRes] = await Promise.all([
        api.getBranches?.(path) ?? { ok: false, branches: [] },
        api.getTags?.(path) ?? { ok: false, tags: [] },
        api.getWorktrees?.(path) ?? Promise.resolve({ ok: false, worktrees: [] }),
        api.getStashList?.(path) ?? Promise.resolve({ ok: false, entries: [] }),
        api.getSubmodules?.(path) ?? Promise.resolve({ ok: false, submodules: [] })
      ]);
      branches.value = bRes?.ok && Array.isArray(bRes.branches) ? bRes.branches : [];
      tags.value = tRes?.ok && Array.isArray(tRes.tags) ? tRes.tags : [];
      worktrees.value = wtRes?.ok && Array.isArray(wtRes.worktrees) ? wtRes.worktrees : [];
      stashListEntries.value = stashRes?.ok && Array.isArray(stashRes?.entries) ? stashRes.entries : [];
      submodules.value = subRes?.ok && Array.isArray(subRes.submodules) ? subRes.submodules : [];
      const info = getInfo?.();
      selectedBranch.value = info?.branch || branches.value[0] || '';
      loadRemoteBranches();
    } catch {
      branches.value = [];
      tags.value = [];
      worktrees.value = [];
      stashListEntries.value = [];
      submodules.value = [];
      selectedBranch.value = '';
    }
  }, { immediate: true });

  watch(() => getInfo?.()?.branch, (b) => { selectedBranch.value = b || ''; }, { immediate: true });

  onMounted(() => {
    loadGitSidebarWidgetPrefs();
  });

  return {
    // Constants (re-export for template / onBranchDrop)
    BRANCH_DRAG_TYPE,
    GIT_SIDEBAR_WIDGET_IDS,
    GIT_SIDEBAR_WIDGET_LABELS,
    // Data
    branches,
    tags,
    remoteBranches,
    remoteBranchesLoaded,
    remoteBranchesLoading,
    worktrees,
    selectedBranch,
    gitFilter,
    stashListEntries,
    submodules,
    reflogEntries,
    reflogLoaded,
    reflogLoading,
    reflogCategoryOpen,
    reflogSearch,
    submoduleSearch,
    sidebarLocalOpen,
    sidebarRemoteOpen,
    sidebarWorktreesOpen,
    sidebarTagsOpen,
    sidebarSubmodulesOpen,
    sidebarReflogOpen,
    sidebarStashOpen,
    sidebarWidgetOrder,
    sidebarWidgetVisible,
    widgetDropdownOpen,
    draggedWidgetId,
    widgetDropTarget,
    branchDragPayload,
    branchDropTarget,
    // Computed
    filterLower,
    filteredBranches,
    branchSelectOptions,
    filteredTags,
    filteredRemoteBranches,
    filteredSubmodules,
    filteredReflogEntries,
    filteredSubmodulesBySearch,
    filteredReflogBySearch,
    reflogByCategory,
    worktreesSummary,
    visibleOrderedWidgetIds,
    hasMultipleVisibleWidgets,
    // Helpers
    widgetHasContent,
    effectiveWidgetVisible,
    normalizePathForCompare,
    isCurrentWorktree,
    worktreeLabel,
    reflogEntryLabel,
    toggleReflogCategory,
    // Loaders
    loadStashList,
    loadRemoteBranches,
    loadReflogOnly,
    loadReflogFromSidebar,
    loadTagsOnly,
    loadWorktreesOnly,
    loadSubmodulesOnly,
    refetchBranches,
    loadGitSidebarWidgetPrefs,
    saveGitSidebarWidgetOrder,
    saveGitSidebarWidgetVisibility,
    moveWidgetUp,
    moveWidgetDown,
    setWidgetVisible,
    onWidgetDragStart,
    onWidgetDragOver,
    onWidgetDragLeave,
    onWidgetDrop,
    onWidgetDragEnd,
    onBranchDragStart,
    onBranchDragOver,
    onBranchDragLeave,
    onBranchDragEnd,
    isWidgetDropBefore,
    isWidgetDropAfter,
  };
}
