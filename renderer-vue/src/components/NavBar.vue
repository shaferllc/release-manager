<template>
  <nav class="nav-bar flex items-center justify-between gap-4 px-4 pt-3 pb-4 bg-rm-surface border-b border-rm-border select-none">
    <div class="flex items-center gap-4 no-drag min-w-0">
      <h1
        class="m-0 text-base font-semibold text-rm-text tracking-tight flex items-center gap-2 shrink-0 cursor-default select-none"
        @click="onAppNameClick"
      >
        <img :src="logoUrl" alt="" class="app-logo w-12 h-12 rounded-rm shrink-0 pointer-events-none" @error="showLogoFallback" />
        <span ref="logoFallback" class="w-12 h-12 rounded-rm bg-rm-accent/20 flex items-center justify-center text-rm-accent text-sm font-bold shrink-0 hidden pointer-events-none" aria-hidden="true">R</span>
        <span class="pointer-events-none">Shipwell</span>
      </h1>
      <Button
        variant="text"
        size="small"
        class="tooltip-btn p-2 min-w-0"
        title="Command palette (⌘⇧P)"
        aria-label="Open command palette"
        @click="openCommandPalette"
      >
        <i class="pi pi-search" aria-hidden="true" />
        <span class="tooltip-bubble">Command palette (⌘⇧P)</span>
      </Button>
      <div class="flex items-center gap-2 shrink-0 view-dropdown-wrap">
        <span class="text-xs font-medium text-rm-muted whitespace-nowrap">View</span>
        <Select
          :model-value="store.viewMode"
          :options="viewOptionsForSelect"
          option-label="label"
          option-value="value"
          placeholder="View"
          class="view-dropdown-select min-w-[8rem] text-sm"
          @update:model-value="selectView"
        />
      </div>
    </div>
    <div class="flex items-center gap-3 no-drag shrink-0">
      <div class="theme-toggle flex items-center rounded-rm border border-rm-border bg-rm-surface overflow-hidden">
        <Button variant="text" size="small" class="theme-btn p-2 min-w-0" :class="{ 'is-active': store.theme === 'dark' }" title="Dark" aria-label="Dark theme" @click="setTheme('dark')">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </Button>
        <Button variant="text" size="small" class="theme-btn p-2 min-w-0" :class="{ 'is-active': store.theme === 'light' }" title="Light" aria-label="Light theme" @click="setTheme('light')">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </Button>
      </div>
      <Button variant="text" size="small" class="refresh-btn tooltip-btn p-2 min-w-0" :class="{ refreshing: isRefreshing }" aria-label="Refresh current project" @click="onRefresh">
        <svg class="refresh-btn-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9A9 9 0 0 1 3 15" />
        </svg>
        <span class="tooltip-bubble">Refresh current project</span>
      </Button>
      <Button variant="text" size="small" class="tooltip-btn p-2 min-w-0" :disabled="syncingAll || !store.projects.length" aria-label="Sync all projects from Git remotes" @click="onSyncAll">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3v8" />
          <path d="M5 6l3-3 3 3" />
          <path d="M16 21v-8" />
          <path d="M13 18l3 3 3-3" />
          <rect x="3" y="10" width="18" height="4" rx="1" />
        </svg>
        <span class="tooltip-bubble">Sync all projects from Git</span>
      </Button>
      <Button
        severity="primary"
        class="rm-btn flex items-center gap-2"
        title="Add a new project folder"
        aria-label="Add project"
        @click="onAddProject"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add project
      </Button>
      <span v-if="navStatus" class="text-[11px] text-rm-muted whitespace-nowrap">{{ navStatus }}</span>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import { useAppStore } from '../stores/app';
import { useApi } from '../composables/useApi';
import { useFeatureFlags } from '../composables/useFeatureFlags';
import { useCommandPalette } from '../commandPalette/useCommandPalette';
import * as debug from '../utils/debug';

const emit = defineEmits(['refresh', 'add-project']);

const store = useAppStore();
const api = useApi();
const { openModal: openFeatureFlagsModal } = useFeatureFlags();
const commandPalette = useCommandPalette();

function openCommandPalette() {
  commandPalette.toggle();
}
const appNameClickCount = ref(0);
let appNameClickResetTimer = null;
const APP_NAME_CLICKS_NEEDED = 5;
const APP_NAME_CLICK_WINDOW_MS = 1500;
const logoFallback = ref(null);
const isRefreshing = ref(false);
const syncingAll = ref(false);
const navStatus = ref('');
const logoUrl = 'icon-128.png';
function showLogoFallback(e) {
  e.target.style.display = 'none';
  logoFallback.value?.classList.remove('hidden');
}

function onAppNameClick() {
  if (appNameClickResetTimer) clearTimeout(appNameClickResetTimer);
  appNameClickCount.value += 1;
  if (appNameClickCount.value >= APP_NAME_CLICKS_NEEDED) {
    appNameClickCount.value = 0;
    openFeatureFlagsModal();
  } else {
    appNameClickResetTimer = setTimeout(() => {
      appNameClickCount.value = 0;
      appNameClickResetTimer = null;
    }, APP_NAME_CLICK_WINDOW_MS);
  }
}

const VIEW_LABELS = {
  detail: 'Project',
  dashboard: 'Dashboard',
  settings: 'Settings',
  extensions: 'Extensions',
  docs: 'Documentation',
  changelog: 'Changelog',
  api: 'API',
};

const viewOptions = [
  { value: 'detail', label: VIEW_LABELS.detail, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>', sep: false },
  { value: 'dashboard', label: VIEW_LABELS.dashboard, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>', sep: false },
  { value: 'settings', label: VIEW_LABELS.settings, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', sep: false },
  { value: 'extensions', label: VIEW_LABELS.extensions, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="15" y="15" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/></svg>', sep: false },
  { value: 'docs', label: VIEW_LABELS.docs, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8"/><path d="M8 11h8"/></svg>', sep: false },
  { value: 'changelog', label: VIEW_LABELS.changelog, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>', sep: false },
  { value: 'api', label: VIEW_LABELS.api, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>', sep: false },
];

const viewOptionsFiltered = computed(() => viewOptions.filter((o) => !o.sep));
const viewOptionsForSelect = computed(() => (Array.isArray(viewOptionsFiltered.value) ? viewOptionsFiltered.value : []));

function selectView(value) {
  debug.log('nav', 'viewMode', value);
  store.setViewMode(value);
  if (api.setPreference) api.setPreference('state.viewMode', value);
}

function setTheme(theme) {
  debug.log('theme', 'setTheme', theme);
  store.setTheme(theme);
  if (api.setTheme) api.setTheme(theme);
  document.documentElement.setAttribute('data-theme', theme);
}

function onRefresh() {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  navStatus.value = 'Refreshing project…';
  emit('refresh');
  setTimeout(() => {
    isRefreshing.value = false;
    if (navStatus.value === 'Refreshing project…') navStatus.value = '';
  }, 800);
}

async function onSyncAll() {
  if (syncingAll.value) return;
  const list = store.projects || [];
  if (!list.length) return;
  syncingAll.value = true;
  navStatus.value = 'Syncing all projects…';
  debug.log('git', 'syncAll.start', { count: list.length });
  try {
    for (const p of list) {
      if (!p?.path) continue;
      try {
        if (api.syncFromRemote) {
          await api.syncFromRemote(p.path);
        } else if (api.gitFetch) {
          await api.gitFetch(p.path);
        }
      } catch (e) {
        debug.warn('git', 'syncAll.projectFailed', p.path, e?.message ?? e);
      }
    }
    debug.log('git', 'syncAll.done');
    emit('refresh');
  } finally {
    syncingAll.value = false;
    setTimeout(() => {
      if (navStatus.value === 'Syncing all projects…') navStatus.value = 'Sync complete';
      setTimeout(() => {
        if (navStatus.value === 'Sync complete') navStatus.value = '';
      }, 1200);
    }, 200);
  }
}

function onAddProject() {
  emit('add-project');
}

onMounted(() => {
  if (api.getTheme) {
    api.getTheme()
      .then(({ effective }) => {
        store.setTheme(effective);
        document.documentElement.setAttribute('data-theme', effective);
      })
      .catch(() => {
        const fallback = 'dark';
        store.setTheme(fallback);
        document.documentElement.setAttribute('data-theme', fallback);
      });
  }
  if (api.onTheme) api.onTheme((effective) => { store.setTheme(effective); document.documentElement.setAttribute('data-theme', effective); });
});
</script>

<style scoped>
.refresh-btn .refresh-btn-icon { display: inline-block; }
.refresh-btn.refreshing .refresh-btn-icon { animation: refresh-spin 0.7s linear infinite; }
@keyframes refresh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.theme-btn { @apply text-rm-muted hover:text-rm-text hover:bg-rm-surface-hover border-none cursor-pointer bg-transparent inline-flex items-center justify-center; }
.theme-btn.is-active { @apply text-rm-accent bg-rm-accent/15; }
.tooltip-btn { position: relative; }
.tooltip-bubble {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 6px;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.95);
  color: #e5e7eb;
  font-size: 10px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform-origin: top center;
  transition: opacity 0.12s ease, transform 0.12s ease;
  z-index: 60;
}
.tooltip-btn:hover .tooltip-bubble {
  opacity: 1;
  transform: translateX(-50%) translateY(2px);
}
</style>
