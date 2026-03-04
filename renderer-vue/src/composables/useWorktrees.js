import { ref, watch } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';
import { useModals } from './useModals';

/**
 * Composable for git worktrees: list, add (via modal), remove.
 * @param {Object} options
 * @param {() => void} [options.onRefresh] - Called after remove (e.g. emit('refresh'))
 * @returns {Object} worktrees, error, load, openAddWorktreeModal, remove
 */
export function useWorktrees({ onRefresh = () => {} } = {}) {
  const store = useAppStore();
  const api = useApi();
  const modals = useModals();

  const worktrees = ref([]);
  const error = ref('');

  async function load() {
    const path = store.selectedPath;
    if (!path || !api.getWorktrees) return;
    error.value = '';
    try {
      const r = await api.getWorktrees(path);
      worktrees.value = r?.ok ? (r.worktrees || []) : [];
    } catch {
      worktrees.value = [];
    }
  }

  watch(() => store.selectedPath, load, { immediate: true });

  function openAddWorktreeModal() {
    const path = store.selectedPath;
    if (!path) return;
    modals.openModal('addWorktree', {
      dirPath: path,
      onAdded: () => load(),
    });
  }

  async function remove(wtPath) {
    const path = store.selectedPath;
    if (!path || !api.worktreeRemove) return;
    if (!window.confirm(`Remove worktree ${wtPath}?`)) return;
    error.value = '';
    try {
      await api.worktreeRemove(path, wtPath);
      await load();
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Remove failed.';
    }
  }

  return {
    worktrees,
    error,
    load,
    openAddWorktreeModal,
    remove,
  };
}
