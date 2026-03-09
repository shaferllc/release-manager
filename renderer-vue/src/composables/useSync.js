import { ref, watch } from 'vue';
import { useApi } from './useApi';

/**
 * Composable for the Sync tab: sync (git fetch), download latest release,
 * choose version modal, releases URL, and status/copy. Call with (store, getInfo, modals, notifications, runWithOverlay).
 * @returns Refs and methods for DetailSyncCard.
 */
export function useSync(store, getInfo, modals, notifications, runWithOverlay) {
  const api = useApi();

  const syncStatus = ref('');
  const releasesUrl = ref('');
  const copyFeedback = ref(false);

  watch(
    () => getInfo?.()?.gitRemote,
    async (url) => {
      if (!url || !api.getReleasesUrl) return;
      try {
        releasesUrl.value = await api.getReleasesUrl(url) || '';
      } catch {
        releasesUrl.value = '';
      }
    },
    { immediate: true }
  );

  function openDocs(docKey) {
    modals.openModal('docs', { docKey });
  }

  function getToken() {
    const proj = store.selectedProject;
    return proj?.githubToken?.trim() || null;
  }

  function openChooseVersion() {
    const gitRemote = getInfo?.()?.gitRemote;
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
      const remoteUrl = getInfo?.()?.gitRemote || '';
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

  return {
    syncStatus,
    releasesUrl,
    copyFeedback,
    openDocs,
    openChooseVersion,
    sync,
    downloadLatest,
    copyStatus,
  };
}
