import { ref, readonly } from 'vue';
import { useApi } from './useApi';

const PREF_KEY = 'extensionPrefs';

const disabledExtensions = ref(new Set());
let loaded = false;

export function useExtensionPrefs() {
  const api = useApi();

  async function load() {
    if (loaded) return;
    try {
      const raw = await api.getPreference?.(PREF_KEY);
      if (Array.isArray(raw?.disabled)) {
        disabledExtensions.value = new Set(raw.disabled);
      }
    } catch (_) {}
    loaded = true;
  }

  async function save() {
    try {
      await api.setPreference?.(PREF_KEY, { disabled: [...disabledExtensions.value] });
    } catch (_) {}
  }

  function isEnabled(extensionId) {
    return !disabledExtensions.value.has(extensionId);
  }

  async function setEnabled(extensionId, enabled) {
    const next = new Set(disabledExtensions.value);
    if (enabled) {
      next.delete(extensionId);
    } else {
      next.add(extensionId);
    }
    disabledExtensions.value = next;
    await save();
  }

  return {
    disabledExtensions: readonly(disabledExtensions),
    isEnabled,
    setEnabled,
    load,
  };
}
