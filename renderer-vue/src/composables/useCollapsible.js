import { ref, onMounted } from 'vue';
import { useApi } from './useApi';

const PREF_COLLAPSED_SECTIONS = 'collapsedSections';

/**
 * Persisted collapse state for a detail section.
 * @param {string} sectionKey - e.g. 'version', 'sync', 'git', 'composer', 'tests', 'coverage'
 * @returns {{ collapsed: import('vue').Ref<boolean>, toggle: () => Promise<void>, load: () => Promise<void> }}
 */
export function useCollapsible(sectionKey) {
  const api = useApi();
  const collapsed = ref(false);

  async function load() {
    try {
      const prefs = await api.getPreference?.(PREF_COLLAPSED_SECTIONS);
      if (prefs && typeof prefs === 'object' && prefs[sectionKey] === true) {
        collapsed.value = true;
      }
    } catch (_) {}
  }

  async function toggle() {
    collapsed.value = !collapsed.value;
    try {
      const current = (await api.getPreference?.(PREF_COLLAPSED_SECTIONS)) || {};
      const next = { ...(typeof current === 'object' && current !== null ? current : {}), [sectionKey]: collapsed.value };
      await api.setPreference?.(PREF_COLLAPSED_SECTIONS, JSON.parse(JSON.stringify(next)));
    } catch (_) {}
  }

  onMounted(load);

  return { collapsed, toggle };
}
