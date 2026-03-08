<template>
  <TerminalPopoutView v-if="isTerminalPopout" />
  <div v-else class="flex flex-col h-full min-h-0 bg-rm-bg text-rm-text">
    <!-- Not loaded yet: only show checking state -->
    <template v-if="!license.licenseStatusLoaded">
      <div class="flex-1 flex flex-col min-h-0 items-center justify-center gap-4 p-8 text-rm-muted">
        <span class="text-sm">Checking login…</span>
        <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem" aria-hidden="true" />
      </div>
    </template>
    <!-- Logged in: full app with navbar, sidebar, and content (only when backend explicitly says hasLicense) -->
    <template v-else-if="showFullApp">
      <NavBar @refresh="onRefresh" @add-project="addProject" />
      <main class="flex-1 flex min-h-0 min-w-0 overflow-hidden">
        <Sidebar />
        <div class="main-content-area flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          <div class="main-content-inner flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden pb-4">
            <LicenseUpgradeBanner v-if="store.viewMode !== 'settings'" />
            <NoSelection v-if="store.viewMode === 'detail' && !store.selectedPath" />
            <DetailView v-else-if="store.viewMode === 'detail' && store.selectedPath" @refresh="onModalRefresh" />
            <DashboardView v-else-if="store.viewMode === 'dashboard'" />
            <SettingsView v-else-if="store.viewMode === 'settings'" />
            <ExtensionsView v-else-if="store.viewMode === 'extensions'" />
            <DocsView v-else-if="store.viewMode === 'docs'" />
            <ChangelogView v-else-if="store.viewMode === 'changelog'" />
            <ApiView v-else-if="store.viewMode === 'api'" />
            <NoSelection v-else />
          </div>
        </div>
      </main>
    </template>
    <!-- Not logged in: only login screen (no app chrome, no settings until signed in) -->
    <template v-else>
      <main class="flex-1 flex min-h-0 min-w-0 overflow-hidden">
        <LoginRequiredView />
      </main>
    </template>
    <ModalHost v-if="showFullApp" @refresh="onModalRefresh" />
    <CommandPalette v-if="!isTerminalPopout && showFullApp" />
    <FeatureFlagsModal v-if="showFullApp && showFeatureFlagsModal" />
    <AppToasts />
    <LoadingBar />
    <LoadingOverlay />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted, provide } from 'vue';
import { useAppStore } from './stores/app';
import { useApi } from './composables/useApi';
import NavBar from './components/NavBar.vue';
import Sidebar from './components/Sidebar.vue';
import NoSelection from './views/NoSelection.vue';
import DetailView from './views/DetailView.vue';
import DashboardView from './views/DashboardView.vue';
import SettingsView from './views/SettingsView.vue';
import ExtensionsView from './views/ExtensionsView.vue';
import DocsView from './views/DocsView.vue';
import ChangelogView from './views/ChangelogView.vue';
import ApiView from './views/ApiView.vue';
import LoginRequiredView from './views/LoginRequiredView.vue';
import TerminalPopoutView from './views/TerminalPopoutView.vue';
import ModalHost from './components/ModalHost.vue';
import LicenseUpgradeBanner from './components/LicenseUpgradeBanner.vue';
import LoadingOverlay from './components/LoadingOverlay.vue';
import LoadingBar from './components/LoadingBar.vue';
import { useLongActionOverlay } from './composables/useLongActionOverlay';
import { useFeatureFlags } from './composables/useFeatureFlags';
import { useLicense } from './composables/useLicense';
import * as debug from './utils/debug';
import { toPlainProjects } from './utils/plainProjects';
import FeatureFlagsModal from './components/modals/FeatureFlagsModal.vue';
import AppToasts from './components/AppToasts.vue';
import CommandPalette from './components/CommandPalette.vue';
import { useCommandPalette } from './commandPalette/useCommandPalette';
import { registerBuiltinCommands } from './commandPalette/builtin';
import { useModals } from './composables/useModals';

const store = useAppStore();
const commandPalette = useCommandPalette();
const modals = useModals();
const featureFlags = useFeatureFlags();
const license = useLicense();
const showFeatureFlagsModal = computed(() => !!featureFlags.isModalOpen?.value);
const api = useApi();

/** Only show navbar/sidebar/content after we have explicitly received hasLicense: true from the backend. */
const showFullApp = computed(() => Boolean(license.licenseStatusLoaded?.value && license.isLoggedIn?.value));
const isTerminalPopout = ref(typeof window !== 'undefined' && window.location.hash === '#terminal-popout');
const { runWithOverlay } = useLongActionOverlay();

let offLicenseStatusChanged = null;
let loadProjectsRetryCount = 0;
const LOAD_PROJECTS_MAX_RETRIES = 2;

async function loadProjects() {
  debug.log('project', 'loadProjects start');
  try {
    if (typeof api.getProjects !== 'function') {
      debug.warn('project', 'loadProjects api.getProjects not ready, retry', loadProjectsRetryCount + 1);
      if (loadProjectsRetryCount < LOAD_PROJECTS_MAX_RETRIES) {
        loadProjectsRetryCount += 1;
        setTimeout(() => loadProjects(), 150);
      }
      return;
    }
    loadProjectsRetryCount = 0;

    debug.log('project', 'loadProjects calling api.getProjects()');
    const list = await api.getProjects();
    const projects = Array.isArray(list) ? list : [];
    debug.log('project', 'loadProjects getProjects result', { count: projects.length, isArray: Array.isArray(list) });
    // Never replace a non-empty list with empty (main may not have synced yet or returned stale data)
    const willUpdate = projects.length > 0 || store.projects.length === 0;
    debug.log('project', 'loadProjects store.setProjects?', { willUpdate, currentLength: store.projects.length });
    if (willUpdate) {
      store.setProjects(projects);
      debug.log('project', 'loadProjects store.setProjects done', store.projects.length);
    }

    if (projects.length > 0 && api.getAllProjectsInfo) {
      try {
        debug.log('project', 'loadProjects calling getAllProjectsInfo');
        const allInfo = await api.getAllProjectsInfo();
        debug.log('project', 'loadProjects getAllProjectsInfo result', { count: allInfo?.length ?? 0 });
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
          debug.log('project', 'loadProjects merged setProjects', merged.length);
        }
      } catch (e) {
        debug.warn('project', 'loadProjects getAllProjectsInfo failed', e?.message ?? e);
      }
    }

    const savedPath = await api.getPreference?.('selectedProjectPath').catch(() => null);
    const savedView = await api.getPreference?.('state.viewMode').catch(() => null);
    const savedDetailTab = await api.getPreference?.('state.detailTab').catch(() => null);
    const normPath = (p) => (p && typeof p === 'string' ? p.trim().replace(/[/\\]+$/, '') : '');
    const pathStillInList = typeof savedPath === 'string' && savedPath && store.projects.some((p) => normPath(p.path) === normPath(savedPath));
    if (pathStillInList) store.setSelectedPath(savedPath);
    else if (store.projects.length > 0 && !store.selectedPath) store.setSelectedPath(store.projects[0].path);
    else store.setSelectedPath(null);
    if (savedView && ['detail', 'dashboard', 'settings', 'extensions', 'docs', 'changelog', 'api'].includes(savedView)) store.setViewMode(savedView);
    const validDetailTabs = ['dashboard', 'git', 'version', 'sync', 'composer', 'tests', 'coverage', 'api', 'pull-requests', 'processes', 'email', 'tunnels', 'ftp', 'ssh', 'kanban', 'markdown', 'agent-crew', 'project-tracker', 'checklist', 'changelog-draft', 'env', 'dependencies', 'notes', 'runbooks', 'terminal', 'github-issues', 'wiki'];
    if (typeof savedDetailTab === 'string' && validDetailTabs.includes(savedDetailTab)) store.setDetailTab(savedDetailTab);
    if (store.selectedPath) {
      const current = store.projects.find((p) => p.path === store.selectedPath);
      if (current) store.setCurrentInfo(current);
    }
    debug.log('project', 'loadProjects done', { projectsLength: store.projects.length, selectedPath: store.selectedPath });
  } catch (e) {
    debug.warn('project', 'loadProjects FAILED', e?.message ?? e, e);
    if (loadProjectsRetryCount < LOAD_PROJECTS_MAX_RETRIES) {
      loadProjectsRetryCount += 1;
      setTimeout(() => loadProjects(), 300);
    }
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
  debug.log('nav', 'onRefresh triggered');
  loadProjectsRetryCount = 0;
  runWithOverlay(loadProjects());
}

async function syncAllProjects() {
  const list = store.projects || [];
  if (!list.length) return;
  try {
    for (const p of list) {
      if (!p?.path) continue;
      try {
        if (api.syncFromRemote) await api.syncFromRemote(p.path);
        else if (api.gitFetch) await api.gitFetch(p.path);
      } catch (e) {
        debug.warn('git', 'syncAll.projectFailed', p.path, e?.message ?? e);
      }
    }
    await onModalRefresh();
  } catch (e) {
    debug.warn('git', 'syncAll.failed', e?.message ?? e);
  }
}

function addProject() {
  debug.log('project', 'addProject clicked', { hasShowDialog: typeof api.showDirectoryDialog === 'function', hasSetProjects: typeof api.setProjects === 'function' });
  if (typeof api.showDirectoryDialog !== 'function') {
    debug.warn('project', 'addProject showDirectoryDialog not available – check preload/IPC');
    return;
  }
  const dialogPromise = api.showDirectoryDialog();
  if (!dialogPromise || typeof dialogPromise.then !== 'function') {
    debug.warn('project', 'addProject showDirectoryDialog did not return a promise');
    return;
  }
  dialogPromise
    .then(async (result) => {
      const selectedPath =
        typeof result === 'string'
          ? result
          : Array.isArray(result?.filePaths) && result.filePaths.length > 0
            ? result.filePaths[0]
            : null;
      debug.log('project', 'addProject dialog result', {
        shape: typeof result,
        canceled: typeof result === 'object' ? result?.canceled : undefined,
        raw: result,
        selectedPath,
      });
      if (!selectedPath) return;
      const path = selectedPath;
      const current = store.projects.map((p) => p.path);
      if (current.includes(path)) {
        debug.log('project', 'addProject path already in list, skip');
        return;
      }
      const newEntry = { path, name: path.split(/[/\\]/).pop(), tags: [], starred: false };
      const next = [...store.projects, newEntry];
      debug.log('project', 'addProject optimistic update', { nextLength: next.length, path });
      store.setProjects(next);
      store.setSelectedPath(path);
      if (typeof api.setProjects === 'function') {
        debug.log('project', 'addProject calling api.setProjects', next.length);
        try {
          const result = await api.setProjects(toPlainProjects(next));
          const persisted = result && result.ok !== false && result.saved != null;
          if (persisted) debug.log('project', 'addProject setProjects persisted', result.saved, 'projects');
          if (typeof api.setPreference === 'function') {
            await api.setPreference('selectedProjectPath', path).catch(() => {});
          }
          await loadProjects();
        } catch (e) {
          debug.warn('project', 'addProject setProjects failed', e?.message ?? e);
        }
      } else {
        debug.warn('project', 'addProject api.setProjects not available');
      }
    })
    .catch((e) => {
      debug.warn('project', 'addProject dialog or flow failed', e?.message ?? e, e);
    });
}

provide('onAddProject', addProject);

watch(() => store.selectedPath, (path) => {
  if (path && api.setPreference) api.setPreference('selectedProjectPath', path);
}, { immediate: false });

watch(() => store.detailTab, (tab) => {
  if (tab && api.setPreference) api.setPreference('state.detailTab', tab);
  if (tab && store.viewMode === 'detail') api.sendTelemetry?.('detail_tab.viewed', { tab });
}, { immediate: false });

watch(() => store.viewMode, (view) => {
  if (view) api.sendTelemetry?.('view.viewed', { view });
}, { immediate: false });

watch(showFullApp, (show) => {
  if (show) loadProjects();
}, { immediate: false });

function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

async function handleShortcut(e) {
  const isCommandPalette = (e.key === 'p' || e.key === 'P') && (e.metaKey || e.ctrlKey) && e.shiftKey;
  if (isCommandPalette) {
    e.preventDefault();
    commandPalette.toggle();
    return;
  }
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
  isTerminalPopout.value = window.location.hash === '#terminal-popout';
  try {
    const debugPref = await api.getPreference?.('debug').catch(() => undefined);
    debug.setEnabled(debugPref !== false);
    debug.log('app', 'mounted', { debug: debugPref !== false, apiReady: !!(window.releaseManager?.showDirectoryDialog) });
  } catch (_) {}
  if (!isTerminalPopout.value) {
    featureFlags.loadFlags();
    await license.loadStatus();
    if (showFullApp.value) {
      loadProjects();
    }
    offLicenseStatusChanged = api.onLicenseStatusChanged?.(() => license.loadStatus()) ?? null;
    window.addEventListener('focus', onWindowFocusForLicense);
    registerBuiltinCommands({
      store,
      onRefresh,
      onAddProject: addProject,
      onSyncAll: syncAllProjects,
      openFeatureFlagsModal: featureFlags.openModal,
      openSetupWizard: () => modals.openModal('setupWizard'),
    });
  }
  try {
    const useTabs = await api.getPreference?.('detailUseTabs');
    if (useTabs !== undefined) store.setUseDetailTabs(useTabs !== false);
  } catch (_) {}
  try {
    const [focusOutline, largeCursor, screenReader] = await Promise.all([
      api.getPreference?.('focusOutlineVisible').catch(() => false),
      api.getPreference?.('largeCursor').catch(() => false),
      api.getPreference?.('screenReaderSupport').catch(() => false),
    ]);
    const el = document.documentElement;
    el.setAttribute('data-focus-outline-visible', focusOutline ? 'true' : 'false');
    el.setAttribute('data-large-cursor', largeCursor ? 'true' : 'false');
    el.setAttribute('data-screen-reader-support', screenReader ? 'true' : 'false');
  } catch (_) {}
  try {
    const [accent, fontSize, radius, reducedMotion, reduceTransparency, highContrast] = await Promise.all([
      api.getPreference?.('appearanceAccent').catch(() => 'green'),
      api.getPreference?.('appearanceFontSize').catch(() => 'comfortable'),
      api.getPreference?.('appearanceRadius').catch(() => 'sharp'),
      api.getPreference?.('appearanceReducedMotion').catch(() => false),
      api.getPreference?.('appearanceReduceTransparency').catch(() => false),
      api.getPreference?.('appearanceHighContrast').catch(() => false),
    ]);
    const el = document.documentElement;
    if (accent) el.setAttribute('data-accent', accent);
    if (fontSize) el.setAttribute('data-font-size', fontSize);
    if (radius) el.setAttribute('data-radius', radius);
    el.setAttribute('data-reduced-motion', reducedMotion ? 'true' : 'false');
    el.setAttribute('data-reduce-transparency', reduceTransparency ? 'true' : 'false');
    el.setAttribute('data-high-contrast', highContrast ? 'true' : 'false');
  } catch (_) {}
  window.addEventListener('keydown', handleShortcut);

  // Detect all problems: report renderer errors to crash ingestion (when enabled in main)
  function reportRendererError(message, stackTrace, payload = {}) {
    if (typeof api.sendCrashReport !== 'function') return;
    api.sendCrashReport({
      message: typeof message === 'string' ? message : (message && message.message) || String(message),
      stack_trace: stackTrace || (message && message.stack),
      payload: { process: 'renderer', ...payload },
    }).catch(() => {});
  }
  const onWindowError = (event) => {
    const msg = event?.message || event;
    const stack = event?.error?.stack;
    reportRendererError(msg, stack, { type: 'error', source: event?.filename, lineno: event?.lineno, colno: event?.colno });
  };
  const onUnhandledRejection = (event) => {
    const reason = event?.reason;
    const msg = reason?.message ?? (typeof reason === 'string' ? reason : String(reason));
    const stack = reason?.stack;
    reportRendererError(msg, stack, { type: 'unhandledrejection' });
  };
  window.addEventListener('error', onWindowError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  window.__releaseManagerRemoveErrorHandlers = () => {
    window.removeEventListener('error', onWindowError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
});

async function onWindowFocusForLicense() {
  if (isTerminalPopout.value) return;
  await license.loadStatus();
}

onUnmounted(() => {
  window.removeEventListener('keydown', handleShortcut);
  window.removeEventListener('focus', onWindowFocusForLicense);
  if (typeof window.__releaseManagerRemoveErrorHandlers === 'function') {
    window.__releaseManagerRemoveErrorHandlers();
  }
  if (typeof offLicenseStatusChanged === 'function') {
    offLicenseStatusChanged();
    offLicenseStatusChanged = null;
  }
});
</script>

