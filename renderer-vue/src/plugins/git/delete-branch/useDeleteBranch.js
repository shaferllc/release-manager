import { ref, watch } from 'vue';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';
import { useBranchesList } from '../../../composables/useBranchesList';

/**
 * Composable for listing, renaming, and deleting branches (local and remote).
 * @param {Object} options
 * @param {() => void} [options.onRefresh] - Called after rename/delete (e.g. emit('refresh'))
 * @returns {Object} branches, error, branchToRename, renameNewName, load, cancelRename, startRename, renameBranch, deleteLocal, deleteOnRemote
 */
export function useDeleteBranch({ onRefresh = () => {} } = {}) {
  const store = useAppStore();
  const api = useApi();
  const { branches, load } = useBranchesList();

  const error = ref('');
  const branchToRename = ref(null);
  const renameNewName = ref('');

  watch(() => store.selectedPath, () => { error.value = ''; }, { immediate: false });

  function cancelRename() {
    branchToRename.value = null;
  }

  function startRename(branchName) {
    branchToRename.value = branchName;
    renameNewName.value = branchName;
  }

  async function renameBranch() {
    const path = store.selectedPath;
    const oldName = branchToRename.value;
    const newName = renameNewName.value?.trim();
    if (!path || !oldName || !newName || oldName === newName || !api.renameBranch) return;
    error.value = '';
    try {
      await api.renameBranch(path, oldName, newName);
      branchToRename.value = null;
      await load();
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Rename failed.';
    }
  }

  async function deleteLocal(branchName) {
    const path = store.selectedPath;
    if (!path || !api.deleteBranch) return;
    if (!window.confirm(`Delete local branch ${branchName}?`)) return;
    error.value = '';
    try {
      await api.deleteBranch(path, branchName, false);
      await load();
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Delete failed.';
    }
  }

  async function deleteOnRemote(branchName) {
    const path = store.selectedPath;
    if (!path || !api.deleteRemoteBranch) return;
    if (!window.confirm(`Delete branch ${branchName} on remote origin?`)) return;
    error.value = '';
    try {
      await api.deleteRemoteBranch(path, 'origin', branchName);
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Delete failed.';
    }
  }

  return {
    branches,
    error,
    branchToRename,
    renameNewName,
    load,
    cancelRename,
    startRename,
    renameBranch,
    deleteLocal,
    deleteOnRemote,
  };
}
