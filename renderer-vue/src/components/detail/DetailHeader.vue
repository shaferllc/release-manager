<template>
  <header class="detail-header mb-6">
    <div class="flex items-center justify-between gap-4">
      <div class="min-w-0 flex-1 flex items-center gap-3">
        <div class="detail-header-icon shrink-0">
          <svg v-if="projectType === 'npm'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h12"/><path d="M4 14h9"/><path d="M4 18h5"/><path d="M4 6h16"/></svg>
          <svg v-else-if="projectType === 'php'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          <svg v-else-if="projectType === 'rust'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.9 4.9 2.8 2.8"/><path d="m16.3 16.3 2.8 2.8"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.9 19.1 2.8-2.8"/><path d="m16.3 7.7 2.8-2.8"/><circle cx="12" cy="12" r="4"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="m-0 text-lg font-semibold text-rm-text truncate tracking-tight leading-tight">{{ info?.name || info?.path || '—' }}</h2>
            <span v-if="projectType" class="detail-type-badge">{{ projectType }}</span>
          </div>
          <p class="m-0 mt-0.5 text-xs text-rm-muted font-mono truncate" :title="info?.path">{{ info?.path || '—' }}</p>
        </div>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <Button v-tooltip.bottom="'Open in terminal'" variant="text" size="small" class="detail-action-btn" aria-label="Open in Terminal" @click="openTerminal">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
        </Button>
        <Button v-tooltip.bottom="'Open in editor'" variant="text" size="small" class="detail-action-btn" aria-label="Open in editor" @click="openEditor">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </Button>
        <Button v-tooltip.bottom="'Open in Finder'" variant="text" size="small" class="detail-action-btn" aria-label="Open in Finder" @click="openFinder">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </Button>
        <Button v-tooltip.bottom="'Copy path'" variant="text" size="small" class="detail-action-btn" aria-label="Copy path" @click="copyPath">
          <svg v-if="!copyFeedback" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-rm-success"><polyline points="20 6 9 17 4 12"/></svg>
        </Button>
        <Button v-tooltip.bottom="'Open in Shipwell'" variant="text" size="small" class="detail-action-btn" :class="{ 'text-rm-accent': shipwellSyncing }" aria-label="Open in Shipwell" :disabled="shipwellSyncing" @click="openInShipwell">
          <svg v-if="shipwellSyncing" class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9A9 9 0 0 1 3 15"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </Button>
        <span class="detail-action-divider" aria-hidden="true" />
        <Button v-tooltip.bottom="'Remove project'" variant="text" size="small" class="detail-action-btn text-rm-danger/60 hover:text-rm-danger" aria-label="Remove project" @click="removeProject">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </Button>
      </div>
    </div>

    <!-- Tags (collapsed into a subtle row) -->
    <div class="mt-2.5 flex items-center gap-2">
      <svg class="shrink-0 text-rm-muted/60" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
      <InputText
        v-model="tagsInput"
        type="text"
        class="detail-tags-input"
        placeholder="Add tags (comma-separated)"
        @blur="saveTags"
      />
    </div>
  </header>
</template>

<script setup>
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useAppStore } from '../../stores/app';
import { useApi } from '../../composables/useApi';
import { useLicense } from '../../composables/useLicense';
import { useNotifications } from '../../composables/useNotifications';
import { useDetailHeader } from '../../composables/useDetailHeader';
import { computed, ref } from 'vue';

const props = defineProps({ info: { type: Object, default: null } });
const emit = defineEmits(['remove']);

const store = useAppStore();
const api = useApi();
const license = useLicense();
const notifications = useNotifications();
const {
  tagsInput,
  copyFeedback,
  saveTags,
  openTerminal,
  openEditor,
  openFinder,
  copyPath,
  removeProject,
} = useDetailHeader(store, () => props.info, emit);

const projectType = computed(() => (props.info?.projectType || '').toLowerCase());

const shipwellSyncing = ref(false);

async function openInShipwell() {
  if (shipwellSyncing.value) return;
  const serverUrl = license.serverUrl?.value;
  if (!serverUrl) {
    notifications.add({ title: 'Not configured', message: 'Sign in to connect to Shipwell.', type: 'warn' });
    return;
  }
  shipwellSyncing.value = true;
  try {
    await api.syncProjectsToShipwell?.();
    await api.syncReleasesToShipwell?.().catch(() => {});
    const baseUrl = serverUrl.replace(/\/+$/, '');
    window.releaseManager?.openUrl?.(baseUrl + '/projects');
    notifications.add({ title: 'Opened in Shipwell', message: 'Projects and releases synced and opened in your browser.', type: 'success' });
  } catch (e) {
    notifications.add({ title: 'Sync failed', message: e?.message || 'Could not sync to Shipwell.', type: 'error' });
  } finally {
    shipwellSyncing.value = false;
  }
}
</script>

<style scoped>
.detail-header-icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--rm-accent) / 0.1);
  color: rgb(var(--rm-accent));
  flex-shrink: 0;
}
.detail-type-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  background: rgb(var(--rm-surface));
  color: rgb(var(--rm-muted));
  border: 1px solid rgb(var(--rm-border));
}
.detail-action-btn {
  width: 2rem;
  height: 2rem;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: rgb(var(--rm-muted));
  transition: color 0.12s, background 0.12s;
}
.detail-action-btn:hover {
  color: rgb(var(--rm-text));
  background: rgb(var(--rm-surface-hover) / 0.5);
}
.detail-action-divider {
  width: 1px;
  height: 1rem;
  background: rgb(var(--rm-border));
  margin: 0 0.125rem;
}
.detail-tags-input {
  flex: 1;
  min-width: 0;
  font-size: 0.75rem;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgb(var(--rm-border) / 0.4);
  border-radius: 0;
  padding: 0.25rem 0;
  color: rgb(var(--rm-text));
  transition: border-color 0.15s;
}
.detail-tags-input:focus {
  border-bottom-color: rgb(var(--rm-accent));
  outline: none;
  box-shadow: none;
}
.detail-tags-input::placeholder {
  color: rgb(var(--rm-muted) / 0.5);
}
</style>
