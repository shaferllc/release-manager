import { ref, watch } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';

/**
 * Composable for reflog: load entries and checkout by ref/sha.
 * @param {Object} options
 * @param {() => void} [options.onRefresh] - Called after checkout (e.g. emit('refresh'))
 * @param {number} [options.limit=50] - Max reflog entries to fetch
 * @returns {Object} entries, error, load, checkout
 */
export function useReflog({ onRefresh = () => {}, limit = 50 } = {}) {
  const store = useAppStore();
  const api = useApi();

  const entries = ref([]);
  const error = ref('');

  async function load() {
    const path = store.selectedPath;
    if (!path || !api.getReflog) return;
    error.value = '';
    try {
      const r = await api.getReflog(path, limit);
      entries.value = r?.ok ? (r.entries || []) : [];
    } catch {
      entries.value = [];
    }
  }

  watch(() => store.selectedPath, load, { immediate: true });

  async function checkout(entry) {
    const path = store.selectedPath;
    const refVal = entry?.ref || entry?.sha;
    if (!path || !refVal || !api.checkoutRef) return;
    if (!window.confirm(`Checkout ${refVal}?`)) return;
    error.value = '';
    try {
      await api.checkoutRef(path, refVal);
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Checkout failed.';
    }
  }

  return {
    entries,
    error,
    load,
    checkout,
  };
}
