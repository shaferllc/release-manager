import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAppStore = defineStore('app', () => {
  const projects = ref([]);
  const selectedPath = ref(null);
  const filterByType = ref('');
  const filterByTag = ref('');
  const currentInfo = ref(null);
  const viewMode = ref('detail'); // 'detail' | 'dashboard' | 'settings' | 'docs' | 'changelog'
  const dashboardData = ref([]);
  const selectedPaths = ref(new Set());
  const currentGitSubtab = ref('main');
  const gitSectionsMovedToRightPanel = ref(false);
  const isRefreshingAfterCheckout = ref(false);
  const theme = ref('dark');
  const detailTab = ref('dashboard'); // 'dashboard' | 'git' | 'version' | 'sync' | 'composer' | 'tests' | 'coverage'
  const useDetailTabs = ref(true);
  const loadingOverlayVisible = ref(false);
  const loadingBarVisible = ref(false);

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
    // Sort: starred first, then by name
    const sorted = [...list].sort((a, b) => {
      const aStarred = a.starred === true;
      const bStarred = b.starred === true;
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      const aName = a.name || (a.path ? a.path.replace(/\\/g, '/').split('/').filter(Boolean).pop() : '') || '';
      const bName = b.name || (b.path ? b.path.replace(/\\/g, '/').split('/').filter(Boolean).pop() : '') || '';
      return String(aName).localeCompare(String(bName), undefined, { sensitivity: 'base' });
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
    setUseDetailTabs,
    toggleProjectSelection,
    clearProjectSelection,
    toggleStar,
    removeProject,
    detailTab,
    useDetailTabs,
  };
});
