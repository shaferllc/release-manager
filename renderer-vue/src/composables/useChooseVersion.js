import { ref, watch } from 'vue';
import { useApi } from './useApi';

/**
 * Composable for Choose Version modal: load GitHub releases, status, select/close.
 * Call with (getGitRemote, getToken, emit). Watches remote/token and loads on change.
 */
export function useChooseVersion(getGitRemote, getToken, emit) {
  const api = useApi();

  const releases = ref([]);
  const status = ref('Loading…');

  async function load() {
    const gitRemote = getGitRemote?.();
    if (!gitRemote) {
      status.value = 'No remote configured.';
      return;
    }
    status.value = 'Loading…';
    releases.value = [];
    try {
      const result = await api.getGitHubReleases?.(gitRemote, getToken?.() || undefined);
      const list = Array.isArray(result) ? result : result?.releases;
      releases.value = Array.isArray(list) ? list : [];
      status.value = releases.value.length === 0 ? 'No releases found.' : '';
    } catch (e) {
      status.value = e?.message || 'Failed to load releases.';
    }
  }

  watch(
    () => [getGitRemote?.(), getToken?.()],
    load,
    { immediate: true }
  );

  function close() {
    emit?.('close');
  }

  function select(release) {
    emit?.('select', release);
    emit?.('close');
  }

  return {
    releases,
    status,
    load,
    close,
    select,
  };
}
