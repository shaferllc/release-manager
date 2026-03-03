<template>
  <section class="card mb-6 collapsible-card detail-tab-panel" data-detail-tab="sync" :class="{ 'is-collapsed': collapsed }">
    <div class="collapsible-card-header-row">
      <button type="button" class="collapsible-card-header" :aria-expanded="!collapsed" @click="toggle">
        <span class="collapsible-card-title">Sync &amp; download</span>
        <span class="flex items-center gap-1 shrink-0">
          <button type="button" class="doc-trigger p-1 rounded-rm text-rm-muted hover:text-rm-accent hover:bg-rm-surface-hover border-0 bg-transparent cursor-pointer text-xs font-normal" title="Documentation" aria-label="Documentation" @click.stop="openDocs('sync')">(i)</button>
          <svg class="collapsible-card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </button>
    </div>
    <div class="collapsible-card-body">
      <div class="card-section pt-0">
        <p class="m-0 mb-6 text-sm text-rm-muted">
          <strong>Sync</strong> runs <code class="bg-rm-bg px-1 rounded text-xs font-mono">git fetch</code>. Download fetches GitHub Release assets for your platform.
        </p>
        <div class="flex flex-wrap gap-3 items-center">
          <button type="button" class="btn-secondary inline-flex items-center gap-x-1.5 shrink-0" title="Run git fetch" @click="sync">
            <svg class="w-[11px] h-[11px] shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
            Sync
          </button>
          <button type="button" class="btn-secondary inline-flex items-center gap-x-1.5 shrink-0" @click="downloadLatest">
            <svg class="w-[11px] h-[11px] shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download latest
          </button>
          <button type="button" class="btn-secondary inline-flex items-center gap-x-1.5 shrink-0" @click="openChooseVersion">
            Choose version…
          </button>
          <a v-if="releasesUrl" :href="releasesUrl" class="btn-secondary inline-flex items-center gap-2 no-underline cursor-pointer" target="_blank" rel="noopener">
            Open Releases
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
          <button v-if="syncStatus" type="button" class="text-xs text-rm-muted hover:text-rm-accent border-none bg-transparent cursor-pointer p-0" title="Copy status" @click="copyStatus">Copy status</button>
        </div>
        <p v-if="syncStatus" class="mt-4 text-sm text-rm-muted">
          {{ syncStatus }}
          <span v-if="copyFeedback" class="text-rm-accent ml-2">Copied!</span>
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useAppStore } from '../../stores/app';
import { useApi } from '../../composables/useApi';
import { useModals } from '../../composables/useModals';
import { useCollapsible } from '../../composables/useCollapsible';
import { useLongActionOverlay } from '../../composables/useLongActionOverlay';
import { useNotifications } from '../../composables/useNotifications';

const props = defineProps({ info: { type: Object, default: null } });

const store = useAppStore();
const api = useApi();
const modals = useModals();
const notifications = useNotifications();
const { collapsed, toggle } = useCollapsible('sync');
const { runWithOverlay } = useLongActionOverlay();

function openDocs(docKey) {
  modals.openModal('docs', { docKey });
}

const syncStatus = ref('');
const releasesUrl = ref('');
const copyFeedback = ref(false);

watch(() => props.info?.gitRemote, async (url) => {
  if (!url || !api.getReleasesUrl) return;
  try {
    releasesUrl.value = await api.getReleasesUrl(url) || '';
  } catch {
    releasesUrl.value = '';
  }
}, { immediate: true });

function getToken() {
  const proj = store.selectedProject;
  return proj?.githubToken?.trim() || null;
}

function openChooseVersion() {
  const gitRemote = props.info?.gitRemote;
  if (!gitRemote) {
    syncStatus.value = 'Select a project with a GitHub remote.';
    return;
  }
  const token = getToken() || undefined;
  modals.openModal('chooseVersion', {
    gitRemote,
    token,
    onSelect(release) {
      const assets = release?.assets || [];
      if (assets.length === 0) {
        syncStatus.value = 'No assets for this release.';
        return;
      }
      if (assets.length === 1) {
        const a = assets[0];
        api.downloadAsset?.(a.browser_download_url, a.name).then((r) => {
          if (r?.ok) {
            syncStatus.value = `Saved to ${r.filePath}`;
            notifications.add({ title: 'Download saved', message: r.filePath ? `Saved to ${r.filePath}` : a.name, type: 'success' });
          } else if (!r?.canceled) {
            syncStatus.value = r?.error || 'Download failed';
            notifications.add({ title: 'Download failed', message: r?.error || 'Download failed', type: 'error' });
          }
        }).catch(() => {
          syncStatus.value = 'Download failed.';
          notifications.add({ title: 'Download failed', message: 'Download failed.', type: 'error' });
        });
        return;
      }
      modals.openModal('pickAsset', {
        assets,
        onComplete: () => { syncStatus.value = 'Download started.'; },
      });
    },
  });
}

async function sync() {
  const path = store.selectedPath;
  if (!path || !api.syncFromRemote) return;
  syncStatus.value = 'Syncing…';
  try {
    await runWithOverlay(api.syncFromRemote(path));
    syncStatus.value = 'Synced.';
    notifications.add({ title: 'Sync complete', message: 'Git fetch finished.', type: 'success' });
  } catch (e) {
    const err = e?.message || 'Sync failed.';
    syncStatus.value = err;
    notifications.add({ title: 'Sync failed', message: err, type: 'error' });
  }
}

async function downloadLatest() {
  const path = store.selectedPath;
  if (!path || !api.downloadLatestRelease) return;
  syncStatus.value = 'Downloading…';
  try {
    const remoteUrl = props.info?.gitRemote || '';
    const result = await runWithOverlay(api.downloadLatestRelease(remoteUrl));
    if (result?.ok && result?.filePath) {
      syncStatus.value = `Saved to ${result.filePath}`;
      notifications.add({ title: 'Download saved', message: `Saved to ${result.filePath}`, type: 'success' });
    } else if (result?.canceled) {
      syncStatus.value = 'Canceled.';
    } else {
      syncStatus.value = result?.error || 'Download started.';
      if (result?.error) notifications.add({ title: 'Download failed', message: result.error, type: 'error' });
    }
  } catch (e) {
    const err = e?.message || 'Download failed.';
    syncStatus.value = err;
    notifications.add({ title: 'Download failed', message: err, type: 'error' });
  }
}

async function copyStatus() {
  if (!syncStatus.value) return;
  await api.copyToClipboard?.(syncStatus.value);
  copyFeedback.value = true;
  setTimeout(() => { copyFeedback.value = false; }, 2000);
}
</script>
