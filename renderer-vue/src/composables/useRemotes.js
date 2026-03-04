import { ref, watch } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';

/**
 * Composable for git remotes: list, add, remove, rename, change URL.
 * @param {Object} options
 * @param {() => void} [options.onRefresh] - Called after add/remove/rename/changeUrl (e.g. emit('refresh'))
 * @returns {Object} remotes, error, newName, newUrl, load, addRemote, remove, rename, changeUrl
 */
export function useRemotes({ onRefresh = () => {} } = {}) {
  const store = useAppStore();
  const api = useApi();

  const remotes = ref([]);
  const error = ref('');
  const newName = ref('');
  const newUrl = ref('');

  async function load() {
    const path = store.selectedPath;
    if (!path || !api.getRemotes) return;
    error.value = '';
    try {
      const r = await api.getRemotes(path);
      remotes.value = r?.ok ? (r.remotes || []) : [];
    } catch {
      remotes.value = [];
    }
  }

  watch(() => store.selectedPath, load, { immediate: true });

  async function addRemote() {
    const path = store.selectedPath;
    const name = newName.value?.trim();
    const url = newUrl.value?.trim();
    if (!path || !name || !url || !api.addRemote) return;
    error.value = '';
    try {
      await api.addRemote(path, name, url);
      newName.value = '';
      newUrl.value = '';
      await load();
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Add remote failed.';
    }
  }

  async function remove(remoteName) {
    const path = store.selectedPath;
    if (!path || !api.removeRemote) return;
    if (!window.confirm(`Remove remote ${remoteName}?`)) return;
    error.value = '';
    try {
      await api.removeRemote(path, remoteName);
      await load();
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Remove failed.';
    }
  }

  async function rename(remote) {
    const path = store.selectedPath;
    if (!path || !api.renameRemote) return;
    const nameInput = window.prompt(`Rename remote "${remote.name}" to:`, remote.name);
    if (nameInput == null || nameInput.trim() === '' || nameInput.trim() === remote.name) return;
    error.value = '';
    try {
      const result = await api.renameRemote(path, remote.name, nameInput.trim());
      if (result?.error) {
        error.value = result.error;
        return;
      }
      await load();
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Rename failed.';
    }
  }

  async function changeUrl(remote) {
    const path = store.selectedPath;
    if (!path || !api.setRemoteUrl) return;
    const urlInput = window.prompt(`New URL for remote "${remote.name}":`, remote.url);
    if (urlInput == null || urlInput.trim() === '') return;
    error.value = '';
    try {
      const result = await api.setRemoteUrl(path, remote.name, urlInput.trim());
      if (result?.error) {
        error.value = result.error;
        return;
      }
      await load();
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Change URL failed.';
    }
  }

  return {
    remotes,
    error,
    newName,
    newUrl,
    load,
    addRemote,
    remove,
    rename,
    changeUrl,
  };
}
