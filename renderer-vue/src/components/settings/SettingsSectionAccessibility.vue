<template>
  <section v-show="activeSection === 'accessibility'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('accessibility')" />
    <div class="settings-section-card">
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
        <label class="block settings-row-clickable settings-row-checkbox">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Always show focus outline</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Show a visible focus ring on keyboard focus.</p>
          </div>
          <Checkbox v-model="focusOutlineVisible" binary @update:model-value="saveFocusOutlineVisible" class="shrink-0" />
        </label>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Large cursor in inputs</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Use a larger text cursor in input fields.</p>
          </div>
          <Checkbox v-model="largeCursor" binary @update:model-value="saveLargeCursor" class="shrink-0" />
        </label>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Screen reader support</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Announce live regions for assistive technologies.</p>
          </div>
          <Checkbox v-model="screenReaderSupport" binary @update:model-value="saveScreenReaderSupport" class="shrink-0" />
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
  focusOutlineVisible,
  largeCursor,
  screenReaderSupport,
  saveFocusOutlineVisible,
  saveLargeCursor,
  saveScreenReaderSupport,
} = ctx;
</script>
