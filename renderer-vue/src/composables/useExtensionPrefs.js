import { ref, readonly } from 'vue';
import { useApi } from './useApi';

const PREF_KEY = 'extensionPrefs';

const disabledExtensions = ref(new Set());
let localLoaded = false;

export function useExtensionPrefs() {
  const api = useApi();

  async function loadLocal() {
    if (localLoaded) return;
    try {
      const raw = await api.getPreference?.(PREF_KEY);
      if (Array.isArray(raw?.disabled)) {
        disabledExtensions.value = new Set(raw.disabled);
      }
    } catch (_) {}
    localLoaded = true;
  }

  async function fetchFromWeb() {
    try {
      const webState = await api.getExtensionEnabledState?.();
      if (webState?.ok && Array.isArray(webState.data)) {
        const next = new Set(disabledExtensions.value);
        for (const item of webState.data) {
          if (item.enabled === false) next.add(item.slug);
          else next.delete(item.slug);
        }
        disabledExtensions.value = next;
        await save();
        return true;
      }
    } catch (_) {}
    return false;
  }

  async function load() {
    await loadLocal();
    await fetchFromWeb();
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
    api.syncExtensionEnabled?.(extensionId, enabled).catch(() => {});
  }

  function applyWebState(extensions) {
    if (!Array.isArray(extensions)) return;
    const next = new Set(disabledExtensions.value);
    for (const item of extensions) {
      if (item.enabled === false) next.add(item.slug);
      else next.delete(item.slug);
    }
    disabledExtensions.value = next;
    save();
  }

  return {
    disabledExtensions: readonly(disabledExtensions),
    isEnabled,
    setEnabled,
    applyWebState,
    fetchFromWeb,
    load,
  };
}
