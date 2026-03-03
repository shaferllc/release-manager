<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-card flex flex-col max-w-md">
      <div class="modal-header flex-shrink-0">
        <h3 class="modal-title">Feature flags</h3>
        <button type="button" class="modal-close" aria-label="Close" @click="close">×</button>
      </div>
      <div class="modal-body flex flex-col gap-4 p-4">
        <p class="text-xs text-rm-muted m-0">Enable or disable detail tabs. Core tabs (Dashboard, Git, Version) are always visible.</p>
        <div class="flex flex-col gap-2">
          <label
            v-for="id in TAB_FLAG_IDS"
            :key="id"
            class="flex items-center gap-3 cursor-pointer"
          >
            <input
              :checked="tabFlags[id] !== false"
              type="checkbox"
              class="checkbox-input"
              @change="toggle(id, ($event.target).checked)"
            />
            <span class="text-sm text-rm-text">{{ tabLabels[id] || id }}</span>
          </label>
        </div>
        <div class="border-t border-rm-border pt-4 mt-2">
          <label class="flex items-center gap-3 cursor-pointer">
            <input
              :checked="license.bypassLicense"
              type="checkbox"
              class="checkbox-input"
              @change="license.setBypassLicense(($event.target).checked)"
            />
            <span class="text-sm text-rm-text">Enable full app without license</span>
          </label>
          <p class="text-xs text-rm-muted mt-1 ml-6 m-0">Show all tabs, AI generation, and batch release without a license key.</p>
        </div>
        <div class="flex justify-end">
          <button type="button" class="btn-secondary btn-compact text-sm" @click="close">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useFeatureFlags } from '../../composables/useFeatureFlags';
import { useLicense } from '../../composables/useLicense';

const TAB_LABELS = {
  'pull-requests': 'Pull requests',
  'processes': 'Dev stack',
  'email': 'Email',
  'tunnels': 'Tunnels',
  'ftp': 'FTP',
  'ssh': 'SSH',
  'wordpress': 'WordPress',
  'composer': 'Composer',
  'tests': 'Tests',
  'coverage': 'Coverage',
  'api': 'API',
};

const {
  tabFlags,
  setTabFlag,
  loadFlags,
  closeModal,
  TAB_FLAG_IDS,
} = useFeatureFlags();
const license = useLicense();

const tabLabels = TAB_LABELS;

function close() {
  closeModal();
}

function toggle(tabId, enabled) {
  setTabFlag(tabId, enabled);
}

onMounted(() => {
  loadFlags();
});
</script>
