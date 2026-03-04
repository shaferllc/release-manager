import { ref, watch } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';

/**
 * Shared composable: fetch local branch list, optionally excluding current branch.
 * Used by useMergeRebase (exclude current) and useDeleteBranch (full list).
 * @param {Object} options
 * @param {import('vue').Ref<string>} [options.excludeCurrentRef] - If set, exclude this branch from the list
 * @returns {{ branches: import('vue').Ref<string[]>, load: () => Promise<void> }}
 */
export function useBranchesList({ excludeCurrentRef } = {}) {
  const store = useAppStore();
  const api = useApi();

  const branches = ref([]);

  async function load() {
    const path = store.selectedPath;
    if (!path || !api.getBranches) return;
    try {
      const r = await api.getBranches(path);
      const list = Array.isArray(r) ? r : (r?.branches ?? []);
      const current = excludeCurrentRef?.value ?? '';
      branches.value = current ? list.filter((b) => b !== current) : list;
    } catch {
      branches.value = [];
    }
  }

  watch(
    () => [store.selectedPath, excludeCurrentRef?.value],
    load,
    { immediate: true }
  );

  return { branches, load };
}
