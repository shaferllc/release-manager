import { ref, watch } from 'vue';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';

/**
 * Composable for git tags: list, push, delete.
 * @param {Object} options
 * @param {() => void} [options.onRefresh] - Called after push/delete (e.g. emit('refresh'))
 * @returns {Object} tags, error, load, pushTag, deleteTag
 */
export function useTags({ onRefresh = () => {} } = {}) {
  const store = useAppStore();
  const api = useApi();

  const tags = ref([]);
  const error = ref('');

  async function load() {
    const path = store.selectedPath;
    if (!path || !api.getTags) return;
    error.value = '';
    try {
      const r = await api.getTags(path);
      tags.value = r?.ok ? (r.tags || []) : [];
    } catch {
      tags.value = [];
    }
  }

  watch(() => store.selectedPath, load, { immediate: true });

  async function pushTag(tagName) {
    const path = store.selectedPath;
    if (!path || !api.pushTag) return;
    error.value = '';
    try {
      await api.pushTag(path, tagName, 'origin');
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Push failed.';
    }
  }

  async function deleteTag(tagName) {
    const path = store.selectedPath;
    if (!path || !api.deleteTag) return;
    if (!window.confirm(`Delete tag ${tagName}?`)) return;
    error.value = '';
    try {
      await api.deleteTag(path, tagName);
      await load();
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Delete failed.';
    }
  }

  return {
    tags,
    error,
    load,
    pushTag,
    deleteTag,
  };
}
