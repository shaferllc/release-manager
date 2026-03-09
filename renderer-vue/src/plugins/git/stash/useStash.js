import { ref, watch } from 'vue';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';

/**
 * Composable for git stash: list, push, pop, apply, drop.
 * @param {Object} options
 * @param {() => void} [options.onRefresh] - Called after push/pop/apply/drop (e.g. emit('refresh'))
 * @returns {Object} entries, error, includeUntracked, keepIndex, load, stashPush, stashPop, stashApply, stashDrop
 */
export function useStash({ onRefresh = () => {} } = {}) {
  const store = useAppStore();
  const api = useApi();

  const entries = ref([]);
  const error = ref('');
  const includeUntracked = ref(false);
  const keepIndex = ref(false);

  async function load() {
    const path = store.selectedPath;
    if (!path || !api.getStashList) {
      entries.value = [];
      error.value = '';
      return;
    }
    error.value = '';
    try {
      const r = await api.getStashList(path);
      if (r?.ok) {
        entries.value = r.entries || [];
      } else {
        entries.value = [];
        error.value = r?.error || 'Failed to load stash list';
      }
    } catch (e) {
      entries.value = [];
      error.value = e?.message || 'Failed to load stash list';
    }
  }

  watch(() => store.selectedPath, load, { immediate: true });

  async function stashPush() {
    const path = store.selectedPath;
    if (!path || !api.gitStashPush) return;
    const msgRaw = window.prompt('Stash message (optional)');
    if (msgRaw === null) return;
    const msg = (msgRaw || '').trim();
    error.value = '';
    try {
      const result = await api.gitStashPush(path, msg, {
        includeUntracked: includeUntracked.value,
        keepIndex: keepIndex.value,
      });
      if (result?.ok) {
        onRefresh();
        await load();
      } else {
        error.value = result?.error || 'Stash failed.';
      }
    } catch (e) {
      error.value = e?.message || 'Stash failed.';
    }
  }

  async function stashPop() {
    const path = store.selectedPath;
    if (!path || !api.gitStashPop) return;
    if (!window.confirm('Pop top stash?')) return;
    error.value = '';
    try {
      const result = await api.gitStashPop(path);
      if (result?.ok) {
        onRefresh();
        await load();
      } else {
        error.value = result?.error || 'Pop failed.';
      }
    } catch (e) {
      error.value = e?.message || 'Pop failed.';
    }
  }

  async function stashApply(index) {
    const path = store.selectedPath;
    if (!path || !api.stashApply) return;
    error.value = '';
    try {
      const result = await api.stashApply(path, index);
      if (result?.ok) {
        onRefresh();
        await load();
      } else {
        error.value = result?.error || 'Apply failed.';
      }
    } catch (e) {
      error.value = e?.message || 'Apply failed.';
    }
  }

  async function stashDrop(index) {
    const path = store.selectedPath;
    if (!path || !api.stashDrop) return;
    if (!window.confirm(`Drop stash ${index}?`)) return;
    error.value = '';
    try {
      const result = await api.stashDrop(path, index);
      if (result?.ok) {
        await load();
        onRefresh();
      } else {
        error.value = result?.error || 'Drop failed.';
      }
    } catch (e) {
      error.value = e?.message || 'Drop failed.';
    }
  }

  return {
    entries,
    error,
    includeUntracked,
    keepIndex,
    load,
    stashPush,
    stashPop,
    stashApply,
    stashDrop,
  };
}
