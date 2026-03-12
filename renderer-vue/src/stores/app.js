import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { projectDisplayName } from '../utils';

export const useAppStore = defineStore('app', () => {
  const projects = ref([]);
  const selectedPath = ref(null);
  const filterByType = ref('');
  const filterByTag = ref('');
  const currentInfo = ref(null);
  const viewMode = ref('dashboard'); // 'dashboard' | 'detail' | 'settings' | 'docs' | 'changelog' | 'api'
  const dashboardData = ref([]);
  const selectedPaths = ref(new Set());
  const currentGitSubtab = ref('main');
  const gitSectionsMovedToRightPanel = ref(false);
  const isRefreshingAfterCheckout = ref(false);
  const theme = ref('dark');
  const detailTab = ref('dashboard'); // 'dashboard' | 'git' | 'version' | ... | 'processes' | 'email'
  const pendingTerminalCommand = ref(null); // when set, Terminal tab will run this command on become active
  const useDetailTabs = ref(true);
  const loadingOverlayVisible = ref(false);
  const loadingBarVisible = ref(false);
  const sidebarVisible = ref(true);
  const projectSortOrder = ref('lastOpened');
  const confirmDestructiveActions = ref(true);
  const confirmBeforeDiscard = ref(true);
  const confirmBeforeForcePush = ref(true);
  const openLinksInExternalBrowser = ref(false);
  const sidebarWidthLocked = ref(false);
  const compactSidebar = ref(false);
  const showProjectPathInSidebar = ref(false);
  const rememberLastDetailTab = ref(true);
  const debugBarVisible = ref(false);
  const notifyOnRelease = ref(true);
  const notifyOnSyncComplete = ref(false);
  const updateAvailableVersion = ref(null);
  const updateDownloaded = ref(false);

  const selectedProject = computed(() => {
    const path = selectedPath.value;
    if (!path) return null;
    return projects.value.find((p) => p.path === path) ?? null;
  });

  const filteredProjects = computed(() => {
    let list = projects.value;
    if (filterByType.value) {
      list = list.filter((p) => (p.type || '').toLowerCase() === filterByType.value.toLowerCase());
    }
    if (filterByTag.value) {
      const tag = filterByTag.value.toLowerCase();
      list = list.filter((p) => (p.tags || []).some((t) => String(t).toLowerCase() === tag));
    }
    const sortBy = projectSortOrder.value || 'lastOpened';
    const sorted = [...list].sort((a, b) => {
      const aStarred = a.starred === true;
      const bStarred = b.starred === true;
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      if (sortBy === 'name') {
        return String(projectDisplayName(a)).localeCompare(String(projectDisplayName(b)), undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'path') {
        return String(a.path || '').localeCompare(String(b.path || ''), undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'status') {
        const aStatus = (a.status || '').toLowerCase();
        const bStatus = (b.status || '').toLowerCase();
        return aStatus.localeCompare(bStatus) || String(projectDisplayName(a)).localeCompare(String(projectDisplayName(b)), undefined, { sensitivity: 'base' });
      }
      // lastOpened: use lastOpenedAt if available, else fall back to name
      const aTime = a.lastOpenedAt != null ? a.lastOpenedAt : 0;
      const bTime = b.lastOpenedAt != null ? b.lastOpenedAt : 0;
      if (aTime !== bTime) return bTime - aTime;
      return String(projectDisplayName(a)).localeCompare(String(projectDisplayName(b)), undefined, { sensitivity: 'base' });
    });
    return sorted;
  });

  const allTags = computed(() => {
    const set = new Set();
    projects.value.forEach((p) => (p.tags || []).forEach((t) => set.add(String(t))));
    return [...set].sort();
  });

  const allTypes = computed(() => {
    const set = new Set();
    projects.value.forEach((p) => {
      if (p.type) set.add(String(p.type));
    });
    return [...set].sort();
  });

  function setProjects(list) {
    projects.value = Array.isArray(list) ? list : [];
  }

  function setSelectedPath(path) {
    selectedPath.value = path;
  }

  function setCurrentInfo(info) {
    currentInfo.value = info;
  }

  function setViewMode(mode) {
    viewMode.value = mode;
  }

  function setFilterByType(value) {
    filterByType.value = value ?? '';
  }

  function setFilterByTag(value) {
    filterByTag.value = value ?? '';
  }

  function setTheme(value) {
    theme.value = value;
  }

  function setDetailTab(tab) {
    detailTab.value = tab;
  }

  function setPendingTerminalCommand(cmd) {
    pendingTerminalCommand.value = cmd;
  }

  function clearPendingTerminalCommand() {
    pendingTerminalCommand.value = null;
  }

  function setUseDetailTabs(value) {
    useDetailTabs.value = value;
  }

  function toggleProjectSelection(path) {
    const set = new Set(selectedPaths.value);
    if (set.has(path)) set.delete(path);
    else set.add(path);
    selectedPaths.value = set;
  }

  function clearProjectSelection() {
    selectedPaths.value = new Set();
  }

  function toggleStar(path) {
    const p = projects.value.find((x) => x.path === path);
    if (p) {
      p.starred = !p.starred;
    }
  }

  function toggleSidebar() {
    sidebarVisible.value = !sidebarVisible.value;
  }

  function setSidebarVisible(val) {
    sidebarVisible.value = val;
  }

  function removeProject(path) {
    const next = projects.value.filter((p) => p.path !== path);
    projects.value = next;
    if (selectedPath.value === path) {
      selectedPath.value = next.length ? next[0].path : null;
    }
    const set = new Set(selectedPaths.value);
    set.delete(path);
    selectedPaths.value = set;
  }

  function setProjectSortOrder(v) { projectSortOrder.value = v ?? 'lastOpened'; }
  function setConfirmDestructiveActions(v) { confirmDestructiveActions.value = !!v; }
  function setConfirmBeforeDiscard(v) { confirmBeforeDiscard.value = !!v; }
  function setConfirmBeforeForcePush(v) { confirmBeforeForcePush.value = !!v; }
  function setOpenLinksInExternalBrowser(v) { openLinksInExternalBrowser.value = !!v; }
  function setSidebarWidthLocked(v) { sidebarWidthLocked.value = !!v; }
  function setCompactSidebar(v) { compactSidebar.value = !!v; }
  function setShowProjectPathInSidebar(v) { showProjectPathInSidebar.value = !!v; }
  function setRememberLastDetailTab(v) { rememberLastDetailTab.value = !!v; }
  function setDebugBarVisible(v) { debugBarVisible.value = !!v; }
  function setNotifyOnRelease(v) { notifyOnRelease.value = !!v; }
  function setNotifyOnSyncComplete(v) { notifyOnSyncComplete.value = !!v; }
  function setUpdateAvailableVersion(v) { updateAvailableVersion.value = v ?? null; }
  function setUpdateDownloaded(v) { updateDownloaded.value = !!v; }
  function clearUpdateState() { updateAvailableVersion.value = null; updateDownloaded.value = false; }

  return {
    projects,
    selectedPath,
    filterByType,
    filterByTag,
    currentInfo,
    viewMode,
    dashboardData,
    selectedPaths,
    currentGitSubtab,
    gitSectionsMovedToRightPanel,
    isRefreshingAfterCheckout,
    theme,
    loadingOverlayVisible,
    loadingBarVisible,
    sidebarVisible,
    selectedProject,
    filteredProjects,
    allTags,
    allTypes,
    setProjects,
    setSelectedPath,
    setCurrentInfo,
    setViewMode,
    setFilterByType,
    setFilterByTag,
    setTheme,
    setDetailTab,
    setPendingTerminalCommand,
    clearPendingTerminalCommand,
    setUseDetailTabs,
    toggleProjectSelection,
    clearProjectSelection,
    toggleStar,
    removeProject,
    toggleSidebar,
    setSidebarVisible,
    detailTab,
    pendingTerminalCommand,
    useDetailTabs,
    projectSortOrder,
    confirmDestructiveActions,
    confirmBeforeDiscard,
    confirmBeforeForcePush,
    openLinksInExternalBrowser,
    sidebarWidthLocked,
    compactSidebar,
    showProjectPathInSidebar,
    rememberLastDetailTab,
    debugBarVisible,
    notifyOnRelease,
    notifyOnSyncComplete,
    updateAvailableVersion,
    updateDownloaded,
    setProjectSortOrder,
    setConfirmDestructiveActions,
    setConfirmBeforeDiscard,
    setConfirmBeforeForcePush,
    setOpenLinksInExternalBrowser,
    setSidebarWidthLocked,
    setCompactSidebar,
    setShowProjectPathInSidebar,
    setRememberLastDetailTab,
    setDebugBarVisible,
    setNotifyOnRelease,
    setNotifyOnSyncComplete,
    setUpdateAvailableVersion,
    setUpdateDownloaded,
    clearUpdateState,
  };
});
