import { ref } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';
import { useModals } from './useModals';

export const RESET_MODE_OPTIONS = [
  { value: 'soft', label: 'Soft' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'hard', label: 'Hard' },
];

/**
 * Composable for compare (diff between refs) and reset.
 * @param {Object} options
 * @param {() => void} [options.onRefresh] - Called after reset (e.g. emit('refresh'))
 * @returns {Object} refA, refB, resetRef, resetMode, resetModeOptions, error, showDiff, reset
 */
export function useCompareReset({ onRefresh = () => {} } = {}) {
  const store = useAppStore();
  const api = useApi();
  const modals = useModals();

  const refA = ref('HEAD');
  const refB = ref('');
  const resetRef = ref('HEAD~1');
  const resetMode = ref('mixed');
  const error = ref('');

  async function showDiff() {
    const path = store.selectedPath;
    const a = refA.value?.trim() || 'HEAD';
    const b = refB.value?.trim();
    if (!path || !b || !api.getDiffBetweenFull) return;
    error.value = '';
    try {
      const r = await api.getDiffBetweenFull(path, a, b);
      if (r?.ok && r.diff != null) {
        modals.openModal('diffFull', { title: `Diff ${a}..${b}`, content: r.diff });
      } else {
        error.value = r?.error || 'Diff failed.';
      }
    } catch (e) {
      error.value = e?.message || 'Diff failed.';
    }
  }

  async function reset() {
    const path = store.selectedPath;
    const refVal = resetRef.value?.trim();
    if (!path || !refVal || !api.gitReset) return;
    const mode = resetMode.value || 'mixed';
    if (mode === 'hard' && !window.confirm('Hard reset will discard all local changes. Continue?')) return;
    error.value = '';
    try {
      await api.gitReset(path, refVal, mode);
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Reset failed.';
    }
  }

  return {
    refA,
    refB,
    resetRef,
    resetMode,
    resetModeOptions: RESET_MODE_OPTIONS,
    error,
    showDiff,
    reset,
  };
}
