<template>
  <section v-show="activeSection === 'window'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('window')" />
    <div class="settings-section-card">
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
        <label class="block settings-row-clickable settings-row-checkbox">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Always on top</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Keep the app window above other windows.</p>
          </div>
          <Checkbox v-model="alwaysOnTop" binary @update:model-value="saveAlwaysOnTop" class="shrink-0" />
        </label>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Minimize to tray</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Closing the window hides it to the system tray instead of quitting.</p>
          </div>
          <Checkbox v-model="minimizeToTray" binary @update:model-value="saveMinimizeToTray" class="shrink-0" />
        </label>
      </div>
    </div>
  </section>
</template>

<script setup>
import { inject } from 'vue';
import Checkbox from 'primevue/checkbox';
import SettingsSectionHeader from './SettingsSectionHeader.vue';
import { SETTINGS_INJECTION_KEY } from './settingsInjectionKey';

const ctx = inject(SETTINGS_INJECTION_KEY);
const {
  getSectionMeta,
  activeSection,
  alwaysOnTop,
  minimizeToTray,
  saveAlwaysOnTop,
  saveMinimizeToTray,
} = ctx;
</script>
