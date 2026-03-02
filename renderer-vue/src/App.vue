<template>
  <div class="flex flex-col h-full min-h-0 bg-rm-bg text-rm-text">
    <NavBar @refresh="onRefresh" @add-project="addProject" />
    <main class="flex-1 flex min-h-0 min-w-0 overflow-hidden">
      <Sidebar />
      <section class="main-content-section flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-rm-bg">
        <div class="main-content-scroll flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
        <NoSelection v-if="store.viewMode === 'detail' && !store.selectedPath" />
        <DetailView v-else-if="store.viewMode === 'detail' && store.selectedPath" @refresh="onModalRefresh" />
        <DashboardView v-else-if="store.viewMode === 'dashboard'" />
        <SettingsView v-else-if="store.viewMode === 'settings'" />
        <DocsView v-else-if="store.viewMode === 'docs'" />
        <ChangelogView v-else-if="store.viewMode === 'changelog'" />
        <NoSelection v-else />
        </div>
      </section>
    </main>
    <ModalHost @refresh="onModalRefresh" />
    <LoadingBar />
    <LoadingOverlay />
  </div>
</template>

<script setup>
import { onMounted, watch, onUnmounted } from 'vue';
import { useAppStore } from './stores/app';
import { useApi } from './composables/useApi';
import NavBar from './components/NavBar.vue';
import Sidebar from './components/Sidebar.vue';
import NoSelection from './views/NoSelection.vue';
import DetailView from './views/DetailView.vue';
import DashboardView from './views/DashboardView.vue';
import SettingsView from './views/SettingsView.vue';
import DocsView from './views/DocsView.vue';
import ChangelogView from './views/ChangelogView.vue';
import ModalHost from './components/ModalHost.vue';
import LoadingOverlay from './components/LoadingOverlay.vue';
import LoadingBar from './components/LoadingBar.vue';
import { useLongActionOverlay } from './composables/useLongActionOverlay';

const store = useAppStore();
const api = useApi();
const { runWithOverlay } = useLongActionOverlay();

async function loadProjects() {
  try {
    const list = await api.getProjects?.() ?? [];
    const projects = Array.isArray(list) ? list : [];
    store.setProjects(projects);

    if (projects.length > 0 && api.getAllProjectsInfo) {
      try {
        const allInfo = await api.getAllProjectsInfo();
        if (Array.isArray(allInfo) && allInfo.length > 0) {
          const merged = projects.map((p) => {
            const info = allInfo.find((r) => r && r.path === p.path);
            if (!info) return p;
            return {
              ...p,
              ...info,
              tags: p.tags,
              starred: p.starred,
              phpPath: p.phpPath,
              githubToken: p.githubToken,
            };
          });
          store.setProjects(merged);
        }
      } catch (_) {}
    }

    const savedPath = await api.getPreference?.('selectedProjectPath').catch(() => null);
    const savedView = await api.getPreference?.('state.viewMode').catch(() => null);
    const pathStillInList = typeof savedPath === 'string' && savedPath && store.projects.some((p) => p.path === savedPath);
    if (pathStillInList) store.setSelectedPath(savedPath);
    else if (store.projects.length > 0 && !store.selectedPath) store.setSelectedPath(store.projects[0].path);
    else store.setSelectedPath(null);
    if (savedView && ['detail', 'dashboard', 'settings', 'docs', 'changelog'].includes(savedView)) store.setViewMode(savedView);
  } catch (e) {
    console.error('Failed to load projects:', e);
    store.setProjects([]);
  }
}

async function onModalRefresh() {
  await runWithOverlay(
    (async () => {
      await loadProjects();
      if (store.selectedPath) {
        const current = store.projects.find((p) => p.path === store.selectedPath);
        if (current) store.setCurrentInfo(current);
        else if (api.getProjectInfo) {
          try {
            const info = await api.getProjectInfo(store.selectedPath);
            store.setCurrentInfo(info);
          } catch (_) {}
        }
      }
    })()
  );
}

function onRefresh() {
  runWithOverlay(loadProjects());
}

function addProject() {
  api.showDirectoryDialog?.().then((result) => {
    if (result?.canceled || !result?.filePaths?.length) return;
    const path = result.filePaths[0];
    const current = store.projects.map((p) => p.path);
    if (current.includes(path)) return;
    const next = [...store.projects, { path, name: path.split(/[/\\]/).pop(), tags: [], starred: false }];
    api.setProjects?.(next).then(() => loadProjects());
  });
}

watch(() => store.selectedPath, (path) => {
  if (path && api.setPreference) api.setPreference('selectedProjectPath', path);
}, { immediate: false });

function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

async function handleShortcut(e) {
  const action = await api.getShortcutAction?.(
    store.viewMode,
    store.selectedPath,
    e.key,
    e.metaKey,
    e.ctrlKey,
    isInputFocused()
  );
  if (!action) return;
  e.preventDefault();
  const path = store.selectedPath;
  if (action === 'release-patch' && path) {
    try { await runWithOverlay(api.release?.(path, 'patch', false, {})); await onModalRefresh(); } catch (_) {}
  } else if (action === 'release-minor' && path) {
    try { await runWithOverlay(api.release?.(path, 'minor', false, {})); await onModalRefresh(); } catch (_) {}
  } else if (action === 'release-major' && path) {
    try { await runWithOverlay(api.release?.(path, 'major', false, {})); await onModalRefresh(); } catch (_) {}
  } else if (action === 'sync' && path) {
    try { await runWithOverlay(api.syncFromRemote?.(path)); await onModalRefresh(); } catch (_) {}
  } else if (action === 'download-latest' && path) {
    try { await runWithOverlay(api.downloadLatestRelease?.(store.currentInfo?.gitRemote || path)); } catch (_) {}
  } else if (action === 'focus-git-filter') {
    try {
      const el = document.querySelector('.detail-git-filter-input');
      if (el && typeof el.focus === 'function') el.focus();
    } catch (_) {}
  }
}

onMounted(async () => {
  loadProjects();
  try {
    const useTabs = await api.getPreference?.('detailUseTabs');
    if (useTabs !== undefined) store.setUseDetailTabs(useTabs !== false);
  } catch (_) {}
  window.addEventListener('keydown', handleShortcut);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleShortcut);
});
</script>
