import { ref, computed, watch } from 'vue';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';

/**
 * Composable for branch sync: pull, push, fetch, prune, and checkout remote branch.
 * @param {Object} options
 * @param {() => void} [options.onRefresh] - Called after sync/checkout (e.g. emit('refresh'))
 * @returns {Object} status, remoteBranches, remoteBranch, remoteBranchOptions, loadRemoteBranches, run, runForcePush, checkoutRemote
 */
export function useBranchSync({ onRefresh = () => {} } = {}) {
  const store = useAppStore();
  const api = useApi();

  const status = ref('');
  const remoteBranches = ref([]);
  const remoteBranch = ref('');

  const remoteBranchOptions = computed(() => [
    { value: '', label: '—' },
    ...remoteBranches.value.map((r) => ({ value: r, label: r })),
  ]);

  watch(
    () => store.selectedPath,
    () => {
      remoteBranches.value = [];
      remoteBranch.value = '';
    },
    { immediate: true }
  );

  async function loadRemoteBranches() {
    const path = store.selectedPath;
    if (!path || !api.getRemoteBranches) return;
    try {
      const r = await api.getRemoteBranches(path);
      remoteBranches.value = r?.ok ? (r.branches || []) : [];
    } catch {
      remoteBranches.value = [];
    }
  }

  async function run(method) {
    const path = store.selectedPath;
    if (!path || !api[method]) return;
    status.value = '';
    try {
      await api[method](path);
      status.value = 'Done.';
      onRefresh();
    } catch (e) {
      status.value = e?.message || 'Failed.';
    }
  }

  async function runForcePush() {
    if (store.confirmDestructiveActions && store.confirmBeforeForcePush && !window.confirm('Force push? This can overwrite remote history.')) return;
    const path = store.selectedPath;
    if (!path || !api.gitPushForce) return;
    status.value = '';
    try {
      await api.gitPushForce(path, true);
      status.value = 'Done.';
      onRefresh();
    } catch (e) {
      status.value = e?.message || 'Failed.';
    }
  }

  async function checkoutRemote() {
    const path = store.selectedPath;
    const refName = remoteBranch.value;
    if (!path || !refName || !api.checkoutRemoteBranch) return;
    if (!window.confirm(`Checkout ${refName}?`)) return;
    status.value = '';
    try {
      const r = await api.checkoutRemoteBranch(path, refName);
      if (r?.ok) {
        status.value = 'Checked out.';
        onRefresh();
      } else {
        status.value = r?.error || 'Failed.';
      }
    } catch (e) {
      status.value = e?.message || 'Failed.';
    }
  }

  return {
    status,
    remoteBranches,
    remoteBranch,
    remoteBranchOptions,
    loadRemoteBranches,
    run,
    runForcePush,
    checkoutRemote,
  };
}
