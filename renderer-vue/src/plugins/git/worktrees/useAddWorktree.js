import { ref } from 'vue';
import { useApi } from '../../../composables/useApi';

/**
 * Composable for Add Worktree modal: path, branch, error, submitting, submit, close.
 * Call with (getDirPath, emit). Emits 'added' and 'close' on success.
 */
export function useAddWorktree(getDirPath, emit) {
  const api = useApi();

  const worktreePath = ref('');
  const branch = ref('');
  const error = ref('');
  const submitting = ref(false);

  function close() {
    emit?.('close');
  }

  async function submit() {
    const path = worktreePath.value?.trim();
    const dirPath = getDirPath?.();
    if (!path || !dirPath || !api.worktreeAdd) return;
    error.value = '';
    submitting.value = true;
    try {
      await api.worktreeAdd(dirPath, path, branch.value?.trim() || undefined);
      emit?.('added');
      emit?.('close');
    } catch (e) {
      error.value = e?.message || 'Add worktree failed.';
    } finally {
      submitting.value = false;
    }
  }

  return {
    worktreePath,
    branch,
    error,
    submitting,
    close,
    submit,
  };
}
