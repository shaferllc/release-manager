import { ref, onMounted } from 'vue';
import { useApi } from './useApi';

/**
 * Composable for changelog view: loads changelog via API, exposes content and error.
 * No arguments. Returns { content, error, load }.
 */
export function useChangelog() {
  const api = useApi();
  const content = ref('');
  const error = ref(null);

  async function load() {
    try {
      const result = await api.getChangelog?.();
      if (result?.ok && result.content) {
        content.value = result.content;
        error.value = null;
      } else {
        error.value = result?.error || 'Could not load changelog.';
        content.value = '';
      }
    } catch (e) {
      error.value = e?.message || 'Could not load changelog.';
      content.value = '';
    }
  }

  onMounted(() => load());

  return { content, error, load };
}
