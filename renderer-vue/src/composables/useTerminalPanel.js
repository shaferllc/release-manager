import { ref, computed, watch } from 'vue';

/**
 * Composable for TerminalPanel: tab list, active tab, add/close/clear, terminal refs, pop-out.
 * Call with (store, getInitialDirPath). Ensures at least one tab and syncs single-tab path from store/initial.
 */
export function useTerminalPanel(store, getInitialDirPath) {
  const nextId = ref(1);

  function genId() {
    return `t-${nextId.value++}-${Date.now()}`;
  }

  function dirToLabel(dirPath) {
    if (!dirPath) return 'Terminal';
    const p = (dirPath || '').replace(/\\/g, '/');
    const parts = p.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : p || 'Terminal';
  }

  const tabs = ref([]);
  const activeTabId = ref(null);
  const terminalRefs = ref({});

  const activeTab = computed(() => tabs.value.find((t) => t.id === activeTabId.value));

  function ensureTabs() {
    if (tabs.value.length === 0) {
      const path = getInitialDirPath?.() || store.selectedPath || '';
      const id = genId();
      tabs.value.push({ id, dirPath: path, label: dirToLabel(path) });
      activeTabId.value = id;
    }
  }

  function addTab() {
    const path = store.selectedPath || getInitialDirPath?.() || (tabs.value[0]?.dirPath) || '';
    const id = genId();
    tabs.value.push({ id, dirPath: path, label: dirToLabel(path) });
    activeTabId.value = id;
  }

  function closeTab(id) {
    const idx = tabs.value.findIndex((t) => t.id === id);
    if (idx < 0) return;
    tabs.value.splice(idx, 1);
    delete terminalRefs.value[id];
    if (tabs.value.length === 0) {
      activeTabId.value = null;
      return;
    }
    if (activeTabId.value === id) {
      activeTabId.value = tabs.value[Math.min(idx, tabs.value.length - 1)].id;
    }
  }

  function clearActive() {
    const ref = activeTabId.value ? terminalRefs.value[activeTabId.value] : null;
    if (ref && typeof ref.clear === 'function') ref.clear();
  }

  function setTerminalRef(el, tabId) {
    if (el) terminalRefs.value[tabId] = el;
  }

  function popOut(tab) {
    if (tab?.dirPath && window.releaseManager?.openTerminalPopout) {
      window.releaseManager.openTerminalPopout(tab.dirPath);
    }
  }

  watch(
    () => getInitialDirPath?.() || store.selectedPath,
    (path) => {
      ensureTabs();
      if (tabs.value.length === 1 && path) {
        tabs.value[0].dirPath = path;
        tabs.value[0].label = dirToLabel(path);
      }
    },
    { immediate: true }
  );

  ensureTabs();

  return {
    tabs,
    activeTabId,
    activeTab,
    terminalRefs,
    ensureTabs,
    addTab,
    closeTab,
    clearActive,
    setTerminalRef,
    popOut,
  };
}
