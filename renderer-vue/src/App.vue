<template>
  <TerminalPopoutView v-if="isTerminalPopout" />
  <div v-else class="flex flex-col h-full min-h-0 bg-rm-bg text-rm-text">
    <!-- Splash / loading screen shown until license check completes + minimum duration -->
    <template v-if="showSplash">
      <div class="app-splash flex-1 flex flex-col min-h-0 items-center justify-center gap-5 p-8">
        <img src="/icon-128.png" alt="Shipwell" class="app-splash-logo" width="64" height="64" />
        <div class="app-splash-spinner">
          <svg class="app-splash-ring" width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="12" stroke="currentColor" stroke-width="2.5" opacity="0.15" />
            <path d="M14 2a12 12 0 0 1 12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
          </svg>
        </div>
      </div>
    </template>
    <!-- Logged in: full app with navbar, sidebar, and content (only when backend explicitly says hasLicense) -->
    <template v-else-if="showFullApp">
      <div v-if="license.isOfflineCache?.value && license.offlineGrace?.value" class="offline-banner">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        <span>Offline mode — {{ license.offlineGrace.value.daysRemaining }} day{{ license.offlineGrace.value.daysRemaining === 1 ? '' : 's' }} remaining before sign-in required</span>
      </div>
      <NavBar ref="navBarRef" @refresh="onRefresh" @sync-all="syncAllProjects" @add-project="addProject" @add-from-shipwell="addFromShipwell" @bulk-import="bulkImport" />
      <main class="flex-1 flex min-h-0 min-w-0 overflow-hidden">
        <Sidebar v-show="store.sidebarVisible" />
        <div class="main-content-area flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          <div class="main-content-inner flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden pb-4">
            <LicenseUpgradeBanner v-if="store.viewMode !== 'settings'" />
            <NoSelection v-if="store.viewMode === 'detail' && !store.selectedPath" />
            <DetailView v-else-if="store.viewMode === 'detail' && store.selectedPath" @refresh="onModalRefresh" />
            <DashboardView v-else-if="store.viewMode === 'dashboard'" />
            <SettingsView v-else-if="store.viewMode === 'settings'" />
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
    <Dialog v-model:visible="shipwellProjectsVisible" header="Add from Shipwell" modal :style="{ width: '540px' }">
      <div v-if="shipwellProjectsLoading" class="flex items-center justify-center py-8">
        <svg class="animate-spin w-5 h-5 text-rm-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
        <span class="ml-2 text-sm text-rm-muted">Loading projects...</span>
      </div>
      <div v-else-if="shipwellProjectsError" class="py-4 text-sm text-red-500">{{ shipwellProjectsError }}</div>
      <div v-else-if="shipwellProjectsList.length === 0" class="py-4 text-sm text-rm-muted">No projects found. Add projects in the Shipwell web app first.</div>
      <div v-else class="flex flex-col gap-1 max-h-[400px] overflow-y-auto -mx-2">
        <div
          v-for="proj in shipwellProjectsList"
          :key="proj.github_repo"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-rm-surface-hover"
          :class="{ 'opacity-50 pointer-events-none': isProjectAlreadyAdded(proj) }"
          @click="cloneAndAddProject(proj)"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-rm-text truncate">{{ proj.name }}</span>
              <span v-if="proj.language" class="text-[10px] px-1.5 py-0.5 rounded bg-rm-surface text-rm-muted">{{ proj.language }}</span>
            </div>
            <div class="text-xs text-rm-muted truncate mt-0.5">{{ proj.github_repo }}</div>
            <div v-if="proj.description" class="text-xs text-rm-muted truncate mt-0.5">{{ proj.description }}</div>
          </div>
          <span v-if="isProjectAlreadyAdded(proj)" class="text-xs text-rm-muted whitespace-nowrap">Already added</span>
          <span v-else-if="shipwellCloningRepo === proj.github_repo" class="text-xs text-rm-accent whitespace-nowrap flex items-center gap-1">
            <svg class="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
            Cloning...
          </span>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 text-rm-muted"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        </div>
      </div>
    </Dialog>

    <Dialog v-model:visible="bulkImportVisible" header="Bulk Import Projects" modal :style="{ width: '560px' }">
      <div v-if="bulkImportScanning" class="flex items-center justify-center py-8">
        <svg class="animate-spin w-5 h-5 text-rm-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
        <span class="ml-2 text-sm text-rm-muted">Scanning for projects...</span>
      </div>
      <template v-else-if="bulkImportResults">
        <div v-if="bulkImportResults.projects.length === 0" class="py-4 text-sm text-rm-muted">
          No new projects found in <code class="bg-rm-surface px-1 rounded text-xs">{{ bulkImportResults.parentDir }}</code>.
          <span v-if="bulkImportResults.alreadyAdded > 0" class="block mt-1">{{ bulkImportResults.alreadyAdded }} project{{ bulkImportResults.alreadyAdded === 1 ? '' : 's' }} already in your list.</span>
        </div>
        <template v-else>
          <p class="text-sm text-rm-muted mb-3">
            Found {{ bulkImportResults.projects.length }} new project{{ bulkImportResults.projects.length === 1 ? '' : 's' }}
            <span v-if="bulkImportResults.alreadyAdded > 0">({{ bulkImportResults.alreadyAdded }} already added)</span>
          </p>
          <div class="flex flex-col gap-0.5 max-h-[320px] overflow-y-auto -mx-2 mb-4">
            <label
              v-for="(proj, i) in bulkImportResults.projects"
              :key="proj.path"
              class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-rm-surface-hover"
            >
              <Checkbox v-model="bulkImportSelected[i]" binary class="shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-rm-text truncate">{{ proj.name }}</span>
                  <span v-if="proj.projectType" class="text-[10px] px-1.5 py-0.5 rounded bg-rm-surface text-rm-muted">{{ proj.projectType }}</span>
                </div>
                <div class="text-xs text-rm-muted truncate mt-0.5">{{ proj.path }}</div>
              </div>
            </label>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex gap-2">
              <Button label="Select all" variant="text" size="small" class="text-xs p-0 min-w-0" @click="bulkImportSelectAll(true)" />
              <Button label="Select none" variant="text" size="small" class="text-xs p-0 min-w-0" @click="bulkImportSelectAll(false)" />
            </div>
            <Button
              :label="`Import ${bulkImportSelectedCount} project${bulkImportSelectedCount === 1 ? '' : 's'}`"
              severity="primary"
              size="small"
              :disabled="bulkImportSelectedCount === 0"
              @click="confirmBulkImport"
            />
          </div>
        </template>
      </template>
    </Dialog>

    <AppToasts />
    <ScreenReaderAnnouncer />
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
import { useLicense } from './composables/useLicense';
import { useExtensionPrefs } from './composables/useExtensionPrefs';
import { useProjectLoader } from './composables/useProjectLoader';
import { useAddProject } from './composables/useAddProject';
import { useShipwellProjects } from './composables/useShipwellProjects';
import { useBulkImport } from './composables/useBulkImport';
import * as debug from './utils/debug';
import AppToasts from './components/AppToasts.vue';
import ScreenReaderAnnouncer from './components/ScreenReaderAnnouncer.vue';
import CommandPalette from './components/CommandPalette.vue';
import { useCommandPalette } from './commandPalette/useCommandPalette';
import { registerBuiltinCommands } from './commandPalette/builtin';
import { useModals } from './composables/useModals';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Dialog from 'primevue/dialog';

const store = useAppStore();
const navBarRef = ref(null);
const commandPalette = useCommandPalette();
const modals = useModals();
const license = useLicense();
const extPrefs = useExtensionPrefs();
const api = useApi();
const { runWithOverlay } = useLongActionOverlay();

const {
  loadProjects,
  onModalRefresh,
  onRefresh,
  syncAllProjects: syncAllProjectsFn,
  syncExtensions,
} = useProjectLoader({ runWithOverlay });

const { addProject } = useAddProject(loadProjects);
const {
  shipwellProjectsVisible,
  shipwellProjectsLoading,
  shipwellProjectsError,
  shipwellProjectsList,
  shipwellCloningRepo,
  isProjectAlreadyAdded,
  addFromShipwell,
  cloneAndAddProject,
} = useShipwellProjects(loadProjects);

const {
  bulkImportVisible,
  bulkImportScanning,
  bulkImportResults,
  bulkImportSelected,
  bulkImportSelectedCount,
  bulkImportSelectAll,
  bulkImport,
  confirmBulkImport,
} = useBulkImport(loadProjects);

provide('onAddProject', addProject);

async function syncAllProjects() {
  await syncAllProjectsFn(navBarRef);
}

/** Minimum time (ms) to show the splash screen so it doesn't flash. */
const SPLASH_MIN_MS = 600;
const splashMinElapsed = ref(false);
setTimeout(() => { splashMinElapsed.value = true; }, SPLASH_MIN_MS);

const showSplash = computed(() => !license.licenseStatusLoaded?.value || !splashMinElapsed.value);

/** Only show navbar/sidebar/content after we have explicitly received hasLicense: true from the backend. */
const showFullApp = computed(() => Boolean(license.licenseStatusLoaded?.value && license.isLoggedIn?.value));
const isTerminalPopout = ref(typeof window !== 'undefined' && window.location.hash === '#terminal-popout');

let offLicenseStatusChanged = null;
let offInstallExtensionDeeplink = null;

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
  if (show) {
    loadProjects();
    api.syncProjectsToShipwell?.().then(() => api.syncReleasesToShipwell?.().catch(() => {})).catch(() => {});
    syncExtensions();
  }
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
  if ((e.key === 'b' || e.key === 'B') && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
    e.preventDefault();
    store.toggleSidebar();
    return;
  }
  const action = await api.getShortcutAction?.(
    store.viewMode,
    store.selectedPath,
    e.key,
    e.metaKey,
    e.ctrlKey,
    isInputFocused(),
    store.detailTab
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
    try { await runWithOverlay(api.syncFromRemote?.(path)); await onModalRefresh(); api.syncProjectsToShipwell?.().then(() => api.syncReleasesToShipwell?.().catch(() => {})).catch(() => {}); } catch (_) {}
  } else if (action === 'download-latest' && path) {
    try { await runWithOverlay(api.downloadLatestRelease?.(store.currentInfo?.gitRemote || path)); } catch (_) {}
  } else if (action === 'focus-git-filter') {
    try {
      const el = document.querySelector('.detail-git-filter-input');
      if (el && typeof el.focus === 'function') el.focus();
    } catch (_) {}
  } else if (action === 'codeseer-clear') {
    try {
      await api.codeseerClear?.();
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
    await Promise.all([license.loadStatus(), extPrefs.load()]);
    if (showFullApp.value) {
      loadProjects();
      api.syncProjectsToShipwell?.().then(() => api.syncReleasesToShipwell?.().catch(() => {})).catch(() => {});
      syncExtensions();
    }
    offLicenseStatusChanged = api.onLicenseStatusChanged?.(async () => {
      await license.loadStatus();
      if (showFullApp.value) {
        loadProjects();
        api.syncProjectsToShipwell?.().then(() => api.syncReleasesToShipwell?.().catch(() => {})).catch(() => {});
        syncExtensions();
      }
    }) ?? null;
    offInstallExtensionDeeplink = api.onInstallExtensionFromDeeplink?.(async ({ repo }) => {
      if (!repo) return;
      store.setViewMode('extensions');
      try {
        const result = await api.installExtensionFromGitHub?.({ repo, github_repo: repo });
        if (result?.ok) {
          notifications.add({ title: 'Extension installed', message: `${repo} was installed successfully.`, type: 'success' });
        } else if (result?.limitExceeded) {
          notifications.add({ title: 'Extension limit reached', message: `Your plan allows up to ${result.max} extensions. Upgrade to install more.`, type: 'warn' });
        } else {
          notifications.add({ title: 'Install failed', message: result?.error || 'Could not install extension.', type: 'error' });
        }
      } catch (e) {
        notifications.add({ title: 'Install failed', message: e?.message || 'Could not install extension.', type: 'error' });
      }
    }) ?? null;
    window.addEventListener('focus', onWindowFocusForLicense);
    registerBuiltinCommands({
      store,
      onRefresh,
      onAddProject: addProject,
      onSyncAll: syncAllProjects,
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
  if (typeof offInstallExtensionDeeplink === 'function') {
    offInstallExtensionDeeplink();
    offInstallExtensionDeeplink = null;
  }
});
</script>

<style scoped>
.app-splash {
  user-select: none;
  -webkit-app-region: drag;
}

.app-splash-ring {
  animation: splash-spin 0.8s linear infinite;
  color: var(--rm-text, #aaa);
  opacity: 0.6;
}

@keyframes splash-spin {
  to { transform: rotate(360deg); }
}

.offline-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgb(var(--rm-warning));
  background: rgb(var(--rm-warning) / 0.1);
  border-bottom: 1px solid rgb(var(--rm-warning) / 0.2);
  flex-shrink: 0;
  -webkit-app-region: drag;
}
</style>
