<template>
  <section class="card mb-6 detail-tab-panel" data-detail-tab="sync">
    <div class="card-section pt-0">
        <p class="m-0 mb-6 text-sm text-rm-muted">
          <strong>Sync</strong> runs <code class="bg-rm-bg px-1 rounded text-xs font-mono">git fetch</code>. Download fetches GitHub Release assets for your platform.
        </p>
        <div class="flex flex-wrap gap-3 items-center">
          <Button severity="secondary" class="inline-flex items-center gap-x-1.5 shrink-0" title="Run git fetch" @click="sync">
            <svg class="w-[11px] h-[11px] shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
            Sync
          </Button>
          <Button severity="secondary" class="inline-flex items-center gap-x-1.5 shrink-0" @click="downloadLatest">
            <svg class="w-[11px] h-[11px] shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download latest
          </Button>
          <Button severity="secondary" class="inline-flex items-center gap-x-1.5 shrink-0" @click="openChooseVersion">
            Choose version…
          </Button>
          <Button v-if="releasesUrl" variant="outlined" severity="secondary" class="inline-flex items-center gap-2 shrink-0 text-sm" @click="openReleasesUrl">
            Open Releases
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </Button>
          <Button v-if="syncStatus" variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-muted hover:text-rm-accent" title="Copy status" @click="copyStatus">Copy status</Button>
        </div>
        <p v-if="syncStatus" class="mt-4 text-sm text-rm-muted">
          {{ syncStatus }}
          <span v-if="copyFeedback" class="text-rm-accent ml-2">Copied!</span>
        </p>
        <Button variant="text" size="small" class="doc-trigger mt-2 p-1 rounded-rm min-w-0 text-rm-muted hover:text-rm-accent hover:bg-rm-surface-hover text-xs font-normal" title="Documentation" aria-label="Documentation" @click="openDocs('sync')">(i) Sync docs</Button>
      </div>
  </section>
</template>

<script setup>
import Button from 'primevue/button';
import { useApi } from '../../composables/useApi';
import { useAppStore } from '../../stores/app';
import { useModals } from '../../composables/useModals';
import { useLongActionOverlay } from '../../composables/useLongActionOverlay';
import { useNotifications } from '../../composables/useNotifications';
import { useSync } from '../../composables/useSync';

const props = defineProps({ info: { type: Object, default: null } });

const api = useApi();
const store = useAppStore();
const modals = useModals();
const notifications = useNotifications();
const { runWithOverlay } = useLongActionOverlay();

const {
  syncStatus,
  releasesUrl,
  copyFeedback,
  openDocs,
  openChooseVersion,
  sync,
  downloadLatest,
  copyStatus,
} = useSync(store, () => props.info, modals, notifications, runWithOverlay);

function openReleasesUrl() {
  if (releasesUrl.value && api.openUrl) api.openUrl(releasesUrl.value);
}
</script>
