import { ref, watch } from 'vue';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';

const SUCCESS_CLEAR_MS = 5000;

/**
 * Format a full SHA to short (7 chars) for display.
 * @param {string} sha
 * @returns {string}
 */
export function shortSha(sha) {
  if (!sha || typeof sha !== 'string') return '';
  return sha.length > 7 ? sha.slice(0, 7) : sha;
}

/**
 * Composable for git submodules: list, update (init / no init), reveal in Finder, copy.
 * @param {Object} options
 * @param {() => void} [options.onRefresh] - Called after successful update (e.g. emit('refresh'))
 * @returns {Object} submodules, error, success, updating, load, update, reveal, copy, shortSha
 */
export function useSubmodules({ onRefresh = () => {} } = {}) {
  const store = useAppStore();
  const api = useApi();

  const submodules = ref([]);
  const error = ref('');
  const success = ref('');
  const updating = ref(false);
  let successClearTimer = null;

  async function load() {
    const path = store.selectedPath;
    if (!path || !api.getSubmodules) return;
    error.value = '';
    try {
      const r = await api.getSubmodules(path);
      submodules.value = r?.ok ? (r.submodules || []) : [];
    } catch {
      submodules.value = [];
    }
  }

  watch(() => store.selectedPath, load, { immediate: true });

  async function update(init) {
    const path = store.selectedPath;
    if (!path || !api.submoduleUpdate) return;
    error.value = '';
    success.value = '';
    if (successClearTimer) {
      clearTimeout(successClearTimer);
      successClearTimer = null;
    }
    updating.value = true;
    try {
      const result = await api.submoduleUpdate(path, init);
      if (result?.ok !== false) {
        await load();
        onRefresh();
        success.value = init ? 'Submodules initialized and updated.' : 'Submodules updated.';
        successClearTimer = setTimeout(() => {
          success.value = '';
          successClearTimer = null;
        }, SUCCESS_CLEAR_MS);
      } else {
        error.value = result?.error || 'Update failed.';
      }
    } catch (e) {
      error.value = e?.message || 'Update failed.';
    } finally {
      updating.value = false;
    }
  }

  function reveal(subPath) {
    const base = store.selectedPath;
    if (!base || !subPath || !api.openPathInFinder) return;
    const full = base.replace(/\\/g, '/').replace(/\/+$/, '') + '/' + subPath.replace(/^\/+/, '');
    api.openPathInFinder(full);
  }

  async function copy(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {}
  }

  return {
    submodules,
    error,
    success,
    updating,
    load,
    update,
    reveal,
    copy,
    shortSha,
  };
}
