<template>
  <nav class="nav-bar flex items-center justify-between gap-4 px-4 py-3 bg-rm-surface border-b border-rm-border select-none">
    <div class="flex items-center gap-4 no-drag min-w-0">
      <h1
        class="m-0 text-base font-semibold text-rm-text tracking-tight flex items-center gap-2 shrink-0 cursor-default select-none"
        @click="onAppNameClick"
      >
        <img :src="logoUrl" alt="" class="app-logo w-12 h-12 rounded-rm shrink-0 pointer-events-none" @error="showLogoFallback" />
        <span ref="logoFallback" class="w-12 h-12 rounded-rm bg-rm-accent/20 flex items-center justify-center text-rm-accent text-sm font-bold shrink-0 hidden pointer-events-none" aria-hidden="true">R</span>
        <span class="pointer-events-none">Shipwell</span>
      </h1>
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs font-medium text-rm-muted whitespace-nowrap">View</span>
        <div class="view-dropdown-wrap" ref="dropdownWrap">
          <button
            type="button"
            class="view-dropdown-btn"
            aria-haspopup="listbox"
            :aria-expanded="viewDropdownOpen"
            aria-label="View"
            @click="viewDropdownOpen = !viewDropdownOpen"
          >
            <svg class="view-dropdown-btn-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span class="view-dropdown-label">{{ viewLabel }}</span>
            <svg class="view-dropdown-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <ul class="view-dropdown-menu" :class="{ hidden: !viewDropdownOpen }" role="listbox" aria-label="View">
            <li v-for="opt in viewOptions" :key="opt.value" role="option" :aria-selected="store.viewMode === opt.value" :class="['view-dropdown-option', opt.sep ? 'view-dropdown-option-sep' : '']" @click="selectView(opt.value)">
              <span class="view-dropdown-option-icon" v-html="opt.icon"></span>
              <span class="view-dropdown-option-text">{{ opt.label }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-3 no-drag shrink-0">
      <div class="theme-toggle flex items-center rounded-rm border border-rm-border bg-rm-surface overflow-hidden">
        <button type="button" class="theme-btn p-2 transition-colors" :class="{ 'is-active': store.theme === 'dark' }" title="Dark" aria-label="Dark theme" @click="setTheme('dark')">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
        <button type="button" class="theme-btn p-2 transition-colors" :class="{ 'is-active': store.theme === 'light' }" title="Light" aria-label="Light theme" @click="setTheme('light')">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>
      </div>
      <button
        type="button"
        class="icon-btn p-2 refresh-btn tooltip-btn"
        :class="{ refreshing: isRefreshing }"
        aria-label="Refresh current project"
        @click="onRefresh"
      >
        <!-- Refresh: single circular arrow -->
        <svg class="refresh-btn-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9A9 9 0 0 1 3 15" />
        </svg>
        <span class="tooltip-bubble">Refresh current project</span>
      </button>
      <button
        type="button"
        class="icon-btn p-2 tooltip-btn"
        :disabled="syncingAll || !store.projects.length"
        aria-label="Sync all projects from Git remotes"
        @click="onSyncAll"
      >
        <!-- Sync all: up/down arrows between bar -->
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3v8" />
          <path d="M5 6l3-3 3 3" />
          <path d="M16 21v-8" />
          <path d="M13 18l3 3 3-3" />
          <rect x="3" y="10" width="18" height="4" rx="1" />
        </svg>
        <span class="tooltip-bubble">Sync all projects from Git</span>
      </button>
      <button
        type="button"
        class="btn-primary flex items-center gap-2"
        title="Add a new project folder"
        aria-label="Add project"
        @click="onAddProject"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add project
      </button>
      <span v-if="navStatus" class="text-[11px] text-rm-muted whitespace-nowrap">{{ navStatus }}</span>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from '../composables/useApi';
import { useFeatureFlags } from '../composables/useFeatureFlags';
import * as debug from '../utils/debug';

const emit = defineEmits(['refresh', 'add-project']);

const store = useAppStore();
const api = useApi();
const { openModal: openFeatureFlagsModal } = useFeatureFlags();
const dropdownWrap = ref(null);
const appNameClickCount = ref(0);
let appNameClickResetTimer = null;
const APP_NAME_CLICKS_NEEDED = 5;
const APP_NAME_CLICK_WINDOW_MS = 1500;
const logoFallback = ref(null);
const viewDropdownOpen = ref(false);
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
  docs: 'Documentation',
  changelog: 'Changelog',
  api: 'API',
};

const viewOptions = [
  { value: 'detail', label: VIEW_LABELS.detail, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>', sep: false },
  { value: 'dashboard', label: VIEW_LABELS.dashboard, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>', sep: false },
  { value: 'settings', label: VIEW_LABELS.settings, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', sep: true },
  { value: 'docs', label: VIEW_LABELS.docs, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8"/><path d="M8 11h8"/></svg>', sep: false },
  { value: 'changelog', label: VIEW_LABELS.changelog, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>', sep: false },
  { value: 'api', label: VIEW_LABELS.api, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>', sep: false },
];

const viewLabel = computed(() => VIEW_LABELS[store.viewMode] ?? 'Project');

function selectView(value) {
  debug.log('nav', 'viewMode', value);
  store.setViewMode(value);
  if (api.setPreference) api.setPreference('state.viewMode', value);
  viewDropdownOpen.value = false;
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

function handleClickOutside(e) {
  if (dropdownWrap.value && !dropdownWrap.value.contains(e.target)) viewDropdownOpen.value = false;
}

onMounted(() => {
  if (api.getTheme) {
    api.getTheme().then(({ effective }) => {
      store.setTheme(effective);
      document.documentElement.setAttribute('data-theme', effective);
    });
  }
  if (api.onTheme) api.onTheme((effective) => { store.setTheme(effective); document.documentElement.setAttribute('data-theme', effective); });
  document.addEventListener('click', handleClickOutside);
});
onUnmounted(() => document.removeEventListener('click', handleClickOutside));
</script>

<style scoped>
.view-dropdown-wrap { position: relative; }
.view-dropdown-btn {
  font: inherit; color: inherit; min-width: 8rem; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: space-between; gap: 0.5rem;
  padding: 0.375rem 0.625rem; border: 1px solid rgb(var(--rm-border)); border-radius: 6px;
  background: rgb(var(--rm-bg)); transition: border-color 0.15s, background 0.15s;
}
.view-dropdown-btn:hover { background: rgb(var(--rm-surface-hover)); }
.view-dropdown-btn[aria-expanded="true"] {
  border-color: rgb(var(--rm-accent)); background: rgb(var(--rm-accent) / 0.08);
  box-shadow: 0 0 0 1px rgb(var(--rm-accent) / 0.3);
}
.view-dropdown-label { white-space: nowrap; }
.view-dropdown-chevron { flex-shrink: 0; opacity: 0.7; transition: transform 0.2s ease; }
.view-dropdown-btn[aria-expanded="true"] .view-dropdown-chevron { transform: rotate(180deg); }
.view-dropdown-menu {
  position: absolute; top: calc(100% + 4px); left: 0; min-width: 11rem;
  list-style: none; margin: 0; padding: 6px 0;
  background: rgb(var(--rm-surface)); border: 1px solid rgb(var(--rm-border));
  border-radius: 8px; box-shadow: 0 8px 24px rgb(0 0 0 / 0.25); z-index: 50;
}
.view-dropdown-option {
  display: flex; align-items: center; gap: 0.625rem; padding: 7px 12px; cursor: pointer;
  white-space: nowrap; color: rgb(var(--rm-text)); font-size: 13px; transition: background 0.1s;
}
.view-dropdown-option:hover { background: rgb(var(--rm-surface-hover)); }
.view-dropdown-option[aria-selected="true"] { background: rgb(var(--rm-accent) / 0.12); color: rgb(var(--rm-accent)); }
.view-dropdown-option-sep { border-top: 1px solid rgb(var(--rm-border)); margin-top: 4px; padding-top: 7px; }
.view-dropdown-option-icon { width: 1.25rem; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: inherit; opacity: 0.9; }
.view-dropdown-option-icon :deep(svg) { width: 16px; height: 16px; }
.refresh-btn .refresh-btn-icon { display: inline-block; }
.refresh-btn.refreshing .refresh-btn-icon { animation: refresh-spin 0.7s linear infinite; }
@keyframes refresh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.theme-btn { @apply text-rm-muted hover:text-rm-text hover:bg-rm-surface-hover border-none cursor-pointer bg-transparent inline-flex items-center justify-center; }
.theme-btn.is-active { @apply text-rm-accent bg-rm-accent/15; }
.icon-btn { @apply p-2 rounded-rm border border-rm-border bg-rm-surface text-rm-muted hover:bg-rm-surface-hover hover:text-rm-text transition-colors inline-flex items-center justify-center; }
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
