<template>
  <section v-show="activeSection === 'behavior'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('behavior')" />
    <div class="settings-section-card">
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
        <label class="block settings-row-clickable settings-row-checkbox">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Double-click to open project</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Require double-click to open a project in the sidebar (single-click to select only).</p>
          </div>
          <Checkbox v-model="doubleClickToOpenProject" binary @update:model-value="saveDoubleClickToOpenProject" class="shrink-0" />
        </label>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Default project sort</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">How to order projects in the sidebar.</p>
          <Select v-model="projectSortOrder" :options="projectSortOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveProjectSortOrder" />
        </div>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Lock sidebar width</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Prevent resizing the sidebar (width stays fixed).</p>
          </div>
          <Checkbox v-model="sidebarWidthLocked" binary @update:model-value="saveSidebarWidthLocked" class="shrink-0" />
        </label>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Open project in new tab</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">When using tabs, open projects in a new tab instead of replacing the current one.</p>
          </div>
          <Checkbox v-model="openProjectInNewTab" binary @update:model-value="saveOpenProjectInNewTab" class="shrink-0" />
        </label>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Compact sidebar</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Smaller icons and labels in the project list.</p>
          </div>
          <Checkbox v-model="compactSidebar" binary @update:model-value="saveCompactSidebar" class="shrink-0" />
        </label>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Show project path in sidebar</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Display full path under each project name.</p>
          </div>
          <Checkbox v-model="showProjectPathInSidebar" binary @update:model-value="saveShowProjectPathInSidebar" class="shrink-0" />
        </label>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Remember last opened tab</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Per project, restore the last detail tab (Git, Tests, etc.) when reopening.</p>
          </div>
          <Checkbox v-model="rememberLastDetailTab" binary @update:model-value="saveRememberLastDetailTab" class="shrink-0" />
        </label>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Confirm destructive actions</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Ask for confirmation before delete, release, or batch release.</p>
          </div>
          <Checkbox v-model="confirmDestructiveActions" binary @update:model-value="saveConfirmDestructiveActions" class="shrink-0" />
        </label>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Confirm before discarding changes</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Extra confirmation before git discard or reset.</p>
          </div>
          <Checkbox v-model="confirmBeforeDiscard" binary @update:model-value="saveConfirmBeforeDiscard" class="shrink-0" />
        </label>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Confirm before force push</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Extra confirmation before git push --force.</p>
          </div>
          <Checkbox v-model="confirmBeforeForcePush" binary @update:model-value="saveConfirmBeforeForcePush" class="shrink-0" />
        </label>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Open links in default browser</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Open external links (docs, GitHub, etc.) in the system browser instead of in-app.</p>
          </div>
          <Checkbox v-model="openLinksInExternalBrowser" binary @update:model-value="saveOpenLinksInExternalBrowser" class="shrink-0" />
        </label>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Debug bar visible</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Show the debug bar by default (for developers).</p>
          </div>
          <Checkbox v-model="debugBarVisible" binary @update:model-value="saveDebugBarVisible" class="shrink-0" />
        </label>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Notify on release success/failure</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Show system notifications when a release finishes.</p>
          </div>
          <Checkbox v-model="notifyOnRelease" binary @update:model-value="saveNotifyOnRelease" class="shrink-0" />
        </label>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Notify when project sync completes</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Alert when background sync finishes.</p>
          </div>
          <Checkbox v-model="notifyOnSyncComplete" binary @update:model-value="saveNotifyOnSyncComplete" class="shrink-0" />
        </label>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Auto-refresh interval</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">How often to refresh project list and dashboard (0 = off).</p>
          <Select v-model="autoRefreshIntervalSeconds" :options="autoRefreshIntervalOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveAutoRefreshInterval" />
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Recent projects list length</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Maximum number of recent projects to remember.</p>
          <Select v-model="recentListLength" :options="recentListLengthOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveRecentListLength" />
        </div>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Show tips and onboarding</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Show first-run tips and occasional hints. Uncheck to hide permanently.</p>
          </div>
          <Checkbox v-model="showTips" binary @update:model-value="saveShowTips" class="shrink-0" />
        </label>
      </div>
    </div>
  </section>
</template>

<script setup>
import { inject } from 'vue';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import SettingsSectionHeader from './SettingsSectionHeader.vue';
import { SETTINGS_INJECTION_KEY } from './settingsInjectionKey';

const ctx = inject(SETTINGS_INJECTION_KEY);
const {
  getSectionMeta,
  activeSection,
  doubleClickToOpenProject,
  projectSortOrder,
  projectSortOptions,
  sidebarWidthLocked,
  openProjectInNewTab,
  compactSidebar,
  showProjectPathInSidebar,
  rememberLastDetailTab,
  confirmDestructiveActions,
  confirmBeforeDiscard,
  confirmBeforeForcePush,
  openLinksInExternalBrowser,
  debugBarVisible,
  notifyOnRelease,
  notifyOnSyncComplete,
  autoRefreshIntervalSeconds,
  autoRefreshIntervalOptions,
  recentListLength,
  recentListLengthOptions,
  showTips,
  saveDoubleClickToOpenProject,
  saveProjectSortOrder,
  saveSidebarWidthLocked,
  saveOpenProjectInNewTab,
  saveCompactSidebar,
  saveShowProjectPathInSidebar,
  saveRememberLastDetailTab,
  saveConfirmDestructiveActions,
  saveConfirmBeforeDiscard,
  saveConfirmBeforeForcePush,
  saveOpenLinksInExternalBrowser,
  saveDebugBarVisible,
  saveNotifyOnRelease,
  saveNotifyOnSyncComplete,
  saveAutoRefreshInterval,
  saveRecentListLength,
  saveShowTips,
} = ctx;
</script>
