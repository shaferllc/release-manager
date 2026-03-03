import { ref, readonly, computed } from 'vue';
import { useApi } from './useApi';

const FEATURE_FLAGS_PREF = 'featureFlags';

/** Tab IDs that are gated by feature flags. Core tabs (dashboard, git, version) are never gated. */
export const TAB_FLAG_IDS = [
  'pull-requests',
  'processes',
  'email',
  'tunnels',
  'ftp',
  'ssh',
  'wordpress',
  'composer',
  'tests',
  'coverage',
  'api',
];

const defaultTabFlags = () => {
  const o = {};
  TAB_FLAG_IDS.forEach((id) => { o[id] = true; });
  return o;
};

const tabFlags = ref({ ...defaultTabFlags() });
const isModalOpen = ref(false);

/**
 * Composable for detail-tab feature flags. Persisted via getPreference/setPreference.
 * Use openModal() from a hidden trigger (e.g. 5 clicks on app name) to show the flags UI.
 */
export function useFeatureFlags() {
  const api = useApi();

  async function loadFlags() {
    if (!api.getPreference) return;
    try {
      const raw = await api.getPreference(FEATURE_FLAGS_PREF);
      const tabs = raw?.tabs && typeof raw.tabs === 'object' ? raw.tabs : {};
      const next = { ...defaultTabFlags(), ...tabs };
      TAB_FLAG_IDS.forEach((id) => {
        if (next[id] !== true && next[id] !== false) next[id] = true;
      });
      tabFlags.value = next;
    } catch {
      tabFlags.value = { ...defaultTabFlags() };
    }
  }

  function isTabEnabled(tabId) {
    if (!TAB_FLAG_IDS.includes(tabId)) return true;
    return tabFlags.value[tabId] !== false;
  }

  async function setTabFlag(tabId, enabled) {
    const next = { ...tabFlags.value, [tabId]: !!enabled };
    tabFlags.value = next;
    if (api.setPreference) {
      try {
        const raw = await api.getPreference(FEATURE_FLAGS_PREF).catch(() => ({}));
        await api.setPreference(FEATURE_FLAGS_PREF, { ...raw, tabs: next });
      } catch (_) {}
    }
  }

  function openModal() {
    isModalOpen.value = true;
  }

  function closeModal() {
    isModalOpen.value = false;
  }

  return {
    tabFlags: readonly(tabFlags),
    isTabEnabled,
    setTabFlag,
    loadFlags,
    /** Use this in templates so v-if gets a boolean (nested refs don't auto-unwrap). */
    isModalOpen: computed(() => isModalOpen.value),
    openModal,
    closeModal,
    TAB_FLAG_IDS,
  };
}
