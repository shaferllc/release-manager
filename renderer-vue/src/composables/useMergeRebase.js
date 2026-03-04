import { ref, computed, watch } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';
import { useBranchesList } from './useBranchesList';

const DEFAULT_STATE = { merging: false, rebasing: false, cherryPicking: false };

/**
 * Composable for merge, rebase, and cherry-pick: state, branch lists, and actions.
 * @param {Object} options
 * @param {() => void} [options.onRefresh] - Called after any action (e.g. emit('refresh'))
 * @param {import('vue').Ref<string>} [options.currentBranchRef] - Current branch name (excluded from merge/rebase lists)
 * @returns {Object} state, mergeBranch, rebaseOnto, mergeBranchOptions, rebaseOntoOptions, error, merge, mergeContinue, mergeAbort, rebase, rebaseContinue, rebaseSkip, rebaseAbort, cherryPickContinue, cherryPickAbort
 */
export function useMergeRebase({ onRefresh = () => {}, currentBranchRef = ref('') } = {}) {
  const store = useAppStore();
  const api = useApi();
  const { branches: mergeBranches } = useBranchesList({ excludeCurrentRef: currentBranchRef });

  const state = ref({ ...DEFAULT_STATE });
  const mergeBranch = ref('');
  const rebaseOnto = ref('');
  const error = ref('');

  const mergeBranchOptions = computed(() => [
    { value: '', label: '—' },
    ...mergeBranches.value.map((b) => ({ value: b, label: b })),
  ]);
  const rebaseOntoOptions = computed(() => [
    { value: '', label: '—' },
    ...mergeBranches.value.map((b) => ({ value: b, label: b })),
  ]);

  async function loadState() {
    const path = store.selectedPath;
    if (!path || !api.getGitState) return;
    try {
      const r = await api.getGitState(path);
      state.value = { merging: !!r?.merging, rebasing: !!r?.rebasing, cherryPicking: !!r?.cherryPicking };
    } catch {
      state.value = { ...DEFAULT_STATE };
    }
  }

  watch(
    () => [store.selectedPath, currentBranchRef?.value],
    loadState,
    { immediate: true }
  );

  async function runAction(fn) {
    const path = store.selectedPath;
    if (!path) return;
    error.value = '';
    try {
      await fn();
      onRefresh();
      await loadState();
    } catch (e) {
      error.value = e?.message || 'Failed.';
    }
  }

  function merge() {
    if (!mergeBranch.value) return;
    if (!window.confirm(`Merge ${mergeBranch.value} into current branch?`)) return;
    runAction(() => api.gitMerge?.(store.selectedPath, mergeBranch.value, {}));
  }

  function mergeContinue() {
    runAction(() => api.gitMergeContinue?.(store.selectedPath));
  }

  function mergeAbort() {
    if (!window.confirm('Abort merge?')) return;
    runAction(() => api.gitMergeAbort?.(store.selectedPath));
  }

  function rebase() {
    if (!rebaseOnto.value) return;
    if (!window.confirm(`Rebase onto ${rebaseOnto.value}?`)) return;
    runAction(() => api.gitRebase?.(store.selectedPath, rebaseOnto.value));
  }

  function rebaseContinue() {
    runAction(() => api.gitRebaseContinue?.(store.selectedPath));
  }

  function rebaseSkip() {
    runAction(() => api.gitRebaseSkip?.(store.selectedPath));
  }

  function rebaseAbort() {
    if (!window.confirm('Abort rebase?')) return;
    runAction(() => api.gitRebaseAbort?.(store.selectedPath));
  }

  function cherryPickContinue() {
    runAction(() => api.gitCherryPickContinue?.(store.selectedPath));
  }

  function cherryPickAbort() {
    if (!window.confirm('Abort cherry-pick?')) return;
    runAction(() => api.gitCherryPickAbort?.(store.selectedPath));
  }

  return {
    state,
    mergeBranch,
    rebaseOnto,
    mergeBranchOptions,
    rebaseOntoOptions,
    error,
    merge,
    mergeContinue,
    mergeAbort,
    rebase,
    rebaseContinue,
    rebaseSkip,
    rebaseAbort,
    cherryPickContinue,
    cherryPickAbort,
  };
}
