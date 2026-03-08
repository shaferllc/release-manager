import { ref, readonly, computed } from 'vue';
import { useApi } from './useApi';
import { getDetailTabExtensions } from '../extensions/registry';

const FEATURE_FLAGS_PREF = 'featureFlags';

/** Built-in tab IDs gated by feature flags. Core tabs (dashboard, git, version) are never gated. */
const BUILTIN_TAB_FLAG_IDS = [
  'pull-requests',
  'processes',
  'email',
  'tunnels',
  'ftp',
  'ssh',
  'composer',
  'tests',
  'coverage',
  'api',
  'kanban',
  'markdown',
  'wiki',
];

/** All tab flag IDs: built-in + every registered extension (so all extensions are toggleable). */
export function getTabFlagIds() {
  const extIds = getDetailTabExtensions().map((e) => e.id).filter(Boolean);
  return [...new Set([...BUILTIN_TAB_FLAG_IDS, ...extIds])];
}

const defaultTabFlags = () => {
  const o = {};
  getTabFlagIds().forEach((id) => { o[id] = true; });
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
      getTabFlagIds().forEach((id) => {
        if (next[id] !== true && next[id] !== false) next[id] = true;
      });
      tabFlags.value = next;
    } catch {
      tabFlags.value = { ...defaultTabFlags() };
    }
  }

  /** Any tab/extension id can be toggled; missing or true = enabled, false = disabled. */
  function isTabEnabled(tabId) {
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
    /** All tab flag IDs (built-in + extensions) for the feature flags modal. */
    getTabFlagIds,
  };
}
