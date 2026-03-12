<template>
  <section v-show="activeSection === 'appearance'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('appearance')" />
    <div class="settings-section-card">
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
        <div class="block">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Theme</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Light, dark, or follow your system.</p>
          <div class="flex flex-wrap gap-2 mt-2">
            <Button
              v-for="t in themeOptions"
              :key="t.value"
              variant="outlined"
              size="small"
              class="appearance-option-btn px-3 py-2 rounded-rm text-sm font-medium min-w-0"
              :class="theme === t.value ? 'border-rm-accent bg-rm-accent/15 text-rm-accent' : 'border-rm-border bg-rm-surface hover:bg-rm-surface-hover text-rm-text'"
              @click="setTheme(t.value)"
            >
              {{ t.label }}
            </Button>
          </div>
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Accent color</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Buttons, links, and highlights.</p>
          <div class="flex flex-wrap gap-2 mt-2">
            <Button
              v-for="a in accentOptions"
              :key="a.value"
              variant="text"
              size="small"
              class="accent-swatch w-9 h-9 min-w-[2.25rem] min-h-[2.25rem] p-0 rounded-full border-2 transition-all cursor-pointer border-transparent"
              :class="accentColor === a.value ? 'border-rm-text scale-110' : 'border-transparent hover:scale-105'"
              :style="{ backgroundColor: a.hex }"
              :title="a.label"
              :aria-label="`Accent ${a.label}`"
              @click="setAccent(a.value)"
            />
          </div>
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Density</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Base font and spacing. Tighter fits more on screen; relaxed is easier to read.</p>
          <Select v-model="fontSize" :options="fontSizeOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveFontSize" />
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">UI zoom</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Scale the entire interface (Electron webContents). Useful for high-DPI or accessibility.</p>
          <Select v-model="zoomFactor" :options="zoomOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveZoomFactor" />
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Corner style</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Sharp, rounded, or pill-shaped buttons and inputs.</p>
          <Select v-model="borderRadius" :options="borderRadiusOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveBorderRadius" />
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <label class="block settings-row-clickable settings-row-checkbox">
            <div class="min-w-0">
              <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Reduce motion</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Minimize animations and transitions. Aligns with system accessibility preferences.</p>
            </div>
            <Checkbox v-model="reducedMotion" binary @update:model-value="saveReducedMotion" class="shrink-0" />
          </label>
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <label class="block settings-row-clickable settings-row-checkbox">
            <div class="min-w-0">
              <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Reduce transparency</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Use solid backgrounds instead of semi-transparent panels. Improves readability (Electron / macOS-style).</p>
            </div>
            <Checkbox v-model="reduceTransparency" binary @update:model-value="saveReduceTransparency" class="shrink-0" />
          </label>
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <label class="block settings-row-clickable settings-row-checkbox">
            <div class="min-w-0">
              <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">High contrast</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Stronger borders and higher-contrast text. Helps with visibility (Electron / accessibility).</p>
            </div>
            <Checkbox v-model="highContrast" binary @update:model-value="saveHighContrast" class="shrink-0" />
          </label>
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <label class="block settings-row-clickable settings-row-checkbox">
            <div class="min-w-0">
              <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Use tabs in project detail</span>
              <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Switch between Git, Version & release, and other sections with tabs.</p>
            </div>
            <Checkbox v-model="useDetailTabs" binary @update:model-value="saveUseTabs" class="shrink-0" />
          </label>
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Terminal popout</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] mb-3">When you open a terminal in a separate window, these options control its size and behavior (Electron window options).</p>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-rm-muted mb-1">Size</label>
              <Select v-model="terminalPopoutSize" :options="terminalPopoutSizeOptions" optionLabel="label" optionValue="value" class="max-w-xs" @change="saveTerminalPopoutSize" />
            </div>
            <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Always on top</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Keep the terminal window above other windows.</p>
              </div>
              <Checkbox v-model="terminalPopoutAlwaysOnTop" binary @update:model-value="saveTerminalPopoutAlwaysOnTop" class="shrink-0" />
            </label>
            <label class="block settings-row-clickable settings-row-checkbox">
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Allow fullscreen</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Allow the terminal window to enter fullscreen (e.g. green traffic light on macOS).</p>
              </div>
              <Checkbox v-model="terminalPopoutFullscreenable" binary @update:model-value="saveTerminalPopoutFullscreenable" class="shrink-0" />
            </label>
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
  theme,
  themeOptions,
  accentColor,
  accentOptions,
  fontSize,
  fontSizeOptions,
  zoomFactor,
  zoomOptions,
  borderRadius,
  borderRadiusOptions,
  reducedMotion,
  reduceTransparency,
  highContrast,
  useDetailTabs,
  terminalPopoutSize,
  terminalPopoutSizeOptions,
  terminalPopoutAlwaysOnTop,
  terminalPopoutFullscreenable,
  setTheme,
  setAccent,
  saveFontSize,
  saveZoomFactor,
  saveBorderRadius,
  saveReducedMotion,
  saveReduceTransparency,
  saveHighContrast,
  saveUseTabs,
  saveTerminalPopoutSize,
  saveTerminalPopoutAlwaysOnTop,
  saveTerminalPopoutFullscreenable,
} = ctx;
</script>
