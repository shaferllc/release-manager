import { ref, computed, onMounted } from 'vue';
import { useApi } from './useApi';
import { useFeatureFlags } from './useFeatureFlags';
import { useLicense } from './useLicense';
import { getDetailTabExtensions } from '../extensions/registry';
import { groupEntriesByCategory } from '../extensions/tabCategories';

/** All tab flag IDs and their display labels. Built-in first, then extensions (extensions can override). */
function getAllTabLabels() {
  const builtin = {
    'pull-requests': 'Pull requests',
    'processes': 'Dev stack',
    'email': 'Email',
    'tunnels': 'Tunnels',
    'ftp': 'FTP',
    'ssh': 'SSH',
    'composer': 'Composer',
    'tests': 'Tests',
    'coverage': 'Coverage',
    'api': 'API',
    'kanban': 'Kanban',
    'markdown': 'Markdown',
    'wiki': 'Wiki',
  };
  const extLabels = Object.fromEntries(getDetailTabExtensions().map((e) => [e.id, e.label]));
  return { ...builtin, ...extLabels };
}

/** Feature/test areas with the spec file that covers them (path relative to renderer-vue). */
export const FEATURE_TEST_LIST = [
  { id: 'sidebar', label: 'Sidebar & projects', testFile: 'src/components/Sidebar.spec.js' },
  { id: 'navbar', label: 'Nav bar', testFile: 'src/components/NavBar.spec.js' },
  { id: 'modals', label: 'Modals', testFile: 'src/composables/useModals.spec.js' },
  { id: 'api', label: 'API', testFile: 'src/composables/useApi.spec.js' },
  { id: 'collapsible', label: 'Collapsible panels', testFile: 'src/composables/useCollapsible.spec.js' },
  { id: 'app-store', label: 'App store', testFile: 'src/stores/app.spec.js' },
  { id: 'utils', label: 'Utils', testFile: 'src/utils.spec.js' },
  { id: 'no-selection', label: 'No selection view', testFile: 'src/views/NoSelection.spec.js' },
  { id: 'diff-modal', label: 'Diff modal', testFile: 'src/components/modals/DiffFullModal.spec.js' },
];

/**
 * Composable for Feature Flags (Hidden options) modal: tab flags, app login
 * (server config + login/logout), quick test runner. No arguments.
 */
export function useFeatureFlagsModal() {
  const api = useApi();
  const {
    tabFlags,
    setTabFlag,
    loadFlags,
    closeModal,
  } = useFeatureFlags();

  const featureFlagsSearchQuery = ref('');

  /** All tab ids with labels, from built-in + extensions (single source of truth). */
  const tabLabels = computed(() => getAllTabLabels());

  /** Tab flag ids derived from labels, so list is always complete and includes all extensions. */
  const tabFlagIds = computed(() => Object.keys(tabLabels.value));

  /** Sorted alphabetically by label, filtered by search (matches label or id). */
  const sortedFilteredTabEntries = computed(() => {
    const labels = tabLabels.value;
    const q = (featureFlagsSearchQuery.value || '').trim().toLowerCase();
    let entries = Object.entries(labels).map(([id, label]) => ({ id, label: label || id }));
    if (q) {
      entries = entries.filter(
        (e) =>
          (e.label && e.label.toLowerCase().includes(q)) ||
          (e.id && e.id.toLowerCase().includes(q))
      );
    }
    entries.sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id, undefined, { sensitivity: 'base' }));
    return entries;
  });

  /** Same as above but grouped by category for display. */
  const featureFlagsByCategory = computed(() => groupEntriesByCategory(sortedFilteredTabEntries.value));

  const license = useLicense();

  const licenseLogoutLoading = ref(false);

  const testMapOpen = ref(false);
  const testResult = ref(null);
  const testRunning = ref(false);

  function close() {
    closeModal();
  }

  function toggle(tabId, enabled) {
    setTabFlag(tabId, enabled);
  }

  async function runTest(entry) {
    if (testRunning.value) return;
    testRunning.value = true;
    testResult.value = null;
    try {
      const result = await api.runRendererTest?.(entry.testFile) ?? { ok: false, exitCode: -1, stdout: '', stderr: 'runRendererTest not available' };
      testResult.value = {
        label: entry.label,
        ok: result.ok,
        exitCode: result.exitCode ?? -1,
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
      };
    } catch (e) {
      testResult.value = {
        label: entry.label,
        ok: false,
        exitCode: -1,
        stdout: '',
        stderr: e?.message ?? 'Run failed',
      };
    } finally {
      testRunning.value = false;
    }
  }

  async function runAllTests() {
    if (testRunning.value) return;
    testRunning.value = true;
    testResult.value = null;
    try {
      const result = await api.runRendererTest?.('') ?? api.runRendererTest?.() ?? { ok: false, exitCode: -1, stdout: '', stderr: 'runRendererTest not available' };
      testResult.value = {
        label: 'All renderer tests',
        ok: result.ok,
        exitCode: result.exitCode ?? -1,
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
      };
    } catch (e) {
      testResult.value = {
        label: 'All renderer tests',
        ok: false,
        exitCode: -1,
        stdout: '',
        stderr: e?.message ?? 'Run failed',
      };
    } finally {
      testRunning.value = false;
    }
  }

  async function logoutFromLicenseServer() {
    licenseLogoutLoading.value = true;
    try {
      await api.logoutFromLicenseServer?.();
      await license.loadStatus();
    } finally {
      licenseLogoutLoading.value = false;
    }
  }

  onMounted(() => {
    loadFlags();
  });

  return {
    license,
    tabFlags,
    tabFlagIds,
    tabLabels,
    featureFlagsSearchQuery,
    sortedFilteredTabEntries,
    featureFlagsByCategory,
    FEATURE_TEST_LIST,
    licenseLogoutLoading,
    testMapOpen,
    testResult,
    testRunning,
    close,
    toggle,
    runTest,
    runAllTests,
    logoutFromLicenseServer,
  };
}
