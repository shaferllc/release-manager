<template>
  <section v-show="activeSection === 'application'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('application')" />
    <div class="settings-section-card">
      <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        <!-- Startup -->
        <div class="bg-rm-surface border border-rm-border/60 rounded-xl p-5 px-6 flex flex-col gap-0">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-rm-muted m-0 mb-4 pb-3 border-b border-rm-border/50">Startup</h4>
          <label class="flex flex-col py-3 border-b border-rm-border/40 last:border-b-0 last:pb-0 flex-row items-center gap-4 cursor-pointer">
            <div class="min-w-0 flex-1">
              <span class="text-[0.9375rem] font-semibold text-rm-text">Launch at login</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 m-0 leading-[1.45]">Start the app when you log in to your computer.</p>
            </div>
            <Checkbox v-model="launchAtLogin" binary @update:model-value="saveLaunchAtLogin" class="shrink-0" />
          </label>
          <div class="flex flex-col py-3 border-b border-rm-border/40 last:border-b-0 last:pb-0">
            <span class="text-[0.9375rem] font-semibold text-rm-text">Open to</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 m-0 leading-[1.45]">Default view when the app starts.</p>
            <Select v-model="defaultView" :options="defaultViewOptions" optionLabel="label" optionValue="value" class="max-w-full mt-2" @change="saveDefaultView" />
          </div>
        </div>

        <!-- Updates -->
        <div class="bg-rm-surface border border-rm-border/60 rounded-xl p-5 px-6 flex flex-col gap-0">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-rm-muted m-0 mb-4 pb-3 border-b border-rm-border/50">Updates</h4>
          <div class="flex flex-col py-3 border-b border-rm-border/40 last:border-b-0 last:pb-0">
            <span class="text-[0.9375rem] font-semibold text-rm-text">Check for updates</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 m-0 leading-[1.45]">When to look for new versions.</p>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <Select v-model="checkForUpdates" :options="checkForUpdatesOptions" optionLabel="label" optionValue="value" class="min-w-[10rem] max-w-full" @change="saveCheckForUpdates" />
              <Button label="Check now" size="small" severity="secondary" :loading="updateCheckLoading" :disabled="updateCheckLoading" @click="checkForUpdatesNow" />
            </div>
            <p v-if="updateCheckMessage" class="text-[0.8125rem] text-rm-muted m-0 mt-2">{{ updateCheckMessage }}</p>
            <div v-if="appStore.updateAvailableVersion && !appStore.updateDownloaded" class="flex flex-wrap items-center gap-2 mt-2">
              <span class="text-sm text-rm-success">Update available (v{{ appStore.updateAvailableVersion }})</span>
              <Button label="Download" size="small" severity="success" :loading="updateDownloading" :disabled="updateDownloading" @click="downloadUpdate" />
            </div>
            <div v-if="appStore.updateDownloaded" class="flex flex-wrap items-center gap-2 mt-2">
              <span class="text-sm text-rm-success">Update downloaded. Restart to install.</span>
              <Button label="Restart now" size="small" severity="success" @click="quitAndInstall" />
            </div>
          </div>
        </div>

        <!-- Quit & Setup -->
        <div class="bg-rm-surface border border-rm-border/60 rounded-xl p-5 px-6 flex flex-col gap-0">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-rm-muted m-0 mb-4 pb-3 border-b border-rm-border/50">Quit & setup</h4>
          <label class="flex flex-col py-3 border-b border-rm-border/40 last:border-b-0 last:pb-0 flex-row items-center gap-4 cursor-pointer">
            <div class="min-w-0 flex-1">
              <span class="text-[0.9375rem] font-semibold text-rm-text">Confirm before closing</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 m-0 leading-[1.45]">Ask for confirmation when quitting the app.</p>
            </div>
            <Checkbox v-model="confirmBeforeQuit" binary @update:model-value="saveConfirmBeforeQuit" class="shrink-0" />
          </label>
          <div class="flex flex-col py-3 border-b border-rm-border/40 last:border-b-0 last:pb-0">
            <span class="text-[0.9375rem] font-semibold text-rm-text">Setup wizard</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 m-0 leading-[1.45]">Walk through adding projects, Git, tests, and extensions.</p>
            <Button label="Run setup wizard" size="small" severity="secondary" class="mt-2" @click="openSetupWizard" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { inject } from 'vue';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import SettingsSectionHeader from './SettingsSectionHeader.vue';
import { SETTINGS_INJECTION_KEY } from './settingsInjectionKey';

const ctx = inject(SETTINGS_INJECTION_KEY);
const {
  getSectionMeta,
  activeSection,
  launchAtLogin,
  defaultView,
  defaultViewOptions,
  checkForUpdates,
  checkForUpdatesOptions,
  confirmBeforeQuit,
  saveLaunchAtLogin,
  saveDefaultView,
  saveCheckForUpdates,
  saveConfirmBeforeQuit,
  updateCheckLoading,
  updateCheckMessage,
  updateDownloading,
  checkForUpdatesNow,
  downloadUpdate,
  quitAndInstall,
  openSetupWizard,
  appStore,
} = ctx;
</script>
