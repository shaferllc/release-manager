import { ref, readonly, onMounted } from 'vue';
import { useApi } from './useApi';

const HIDDEN_EXTENSIONS_PREF = 'hiddenExtensions';

const hiddenIds = ref([]);

/**
 * Composable for dev-only "hidden extensions" – completely hide an extension from the app
 * (detail tabs, settings sections, extensions list). Persisted via getPreference/setPreference.
 */
export function useHiddenExtensions() {
  const api = useApi();

  async function load() {
    if (!api.getPreference) return;
    try {
      const raw = await api.getPreference(HIDDEN_EXTENSIONS_PREF);
      hiddenIds.value = Array.isArray(raw) ? raw.filter((id) => typeof id === 'string') : [];
    } catch {
      hiddenIds.value = [];
    }
  }

  function isHidden(id) {
    return id != null && hiddenIds.value.includes(String(id));
  }

  function setHidden(id, hidden) {
    if (id == null) return;
    const s = String(id);
    if (hidden) {
      if (!hiddenIds.value.includes(s)) hiddenIds.value = [...hiddenIds.value, s];
    } else {
      hiddenIds.value = hiddenIds.value.filter((x) => x !== s);
    }
    api.setPreference?.(HIDDEN_EXTENSIONS_PREF, hiddenIds.value);
  }

  onMounted(() => load());

  return {
    hiddenExtensionIds: readonly(hiddenIds),
    isHidden,
    setHidden,
    load,
  };
}
