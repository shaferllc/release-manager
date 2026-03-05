import { ref, onMounted } from 'vue';
import { useApi } from './useApi';
import { useFeatureFlags } from './useFeatureFlags';
import { useLicense } from './useLicense';

const TAB_LABELS = {
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
};

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
 * Composable for Feature Flags (Hidden options) modal: tab flags, license form,
 * license server config, login/logout, quick test runner. No arguments.
 */
export function useFeatureFlagsModal() {
  const api = useApi();
  const {
    tabFlags,
    setTabFlag,
    loadFlags,
    closeModal,
    TAB_FLAG_IDS,
  } = useFeatureFlags();
  const license = useLicense();

  const licenseKeyInput = ref('');
  const licenseSaving = ref(false);
  const licenseServerUrl = ref('');
  const licenseServerClientId = ref('');
  const licenseServerClientSecret = ref('');
  const licenseLoginEmail = ref('');
  const licenseLoginPassword = ref('');
  const licenseRemoteLoggedIn = ref(false);
  const licenseRemoteEmail = ref('');
  const licenseLoginLoading = ref(false);
  const licenseLoginError = ref('');
  const licenseMessage = ref('');
  const licenseMessageOk = ref(false);

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

  async function saveLicense() {
    licenseMessage.value = '';
    licenseSaving.value = true;
    try {
      const result = await license.setLicenseKey(licenseKeyInput.value);
      licenseKeyInput.value = '';
      if (result?.ok) {
        licenseMessage.value = result.hasLicense ? 'License saved.' : 'License cleared.';
        licenseMessageOk.value = true;
      } else {
        licenseMessage.value = 'Could not save license.';
        licenseMessageOk.value = false;
      }
    } catch {
      licenseMessage.value = 'Could not save license.';
      licenseMessageOk.value = false;
    } finally {
      licenseSaving.value = false;
    }
  }

  function saveLicenseServerConfig() {
    api.setLicenseServerConfig?.({
      url: licenseServerUrl.value?.trim() ?? '',
      clientId: licenseServerClientId.value?.trim() ?? '',
      clientSecret: licenseServerClientSecret.value?.trim() ?? '',
    });
  }

  async function loginToLicenseServer() {
    licenseLoginError.value = '';
    licenseLoginLoading.value = true;
    try {
      const result = await api.loginToLicenseServer?.(licenseLoginEmail.value?.trim() ?? '', licenseLoginPassword.value ?? '');
      if (result?.ok) {
        licenseLoginPassword.value = '';
        await license.loadStatus();
        const session = await api.getLicenseRemoteSession?.().catch(() => ({}));
        licenseRemoteLoggedIn.value = !!session?.loggedIn;
        licenseRemoteEmail.value = session?.email ?? '';
      } else {
        licenseLoginError.value = result?.error || 'Login failed';
      }
    } catch (e) {
      licenseLoginError.value = e?.message || 'Login failed';
    } finally {
      licenseLoginLoading.value = false;
    }
  }

  async function logoutFromLicenseServer() {
    licenseLoginError.value = '';
    licenseLoginLoading.value = true;
    try {
      await api.logoutFromLicenseServer?.();
      await license.loadStatus();
      licenseRemoteLoggedIn.value = false;
      licenseRemoteEmail.value = '';
    } finally {
      licenseLoginLoading.value = false;
    }
  }

  onMounted(async () => {
    loadFlags();
    try {
      const [config, session] = await Promise.all([
        api.getLicenseServerConfig?.().catch(() => ({ url: '', clientId: '', clientSecret: '' })),
        api.getLicenseRemoteSession?.().catch(() => ({ loggedIn: false })),
      ]);
      if (config) {
        licenseServerUrl.value = config.url || '';
        licenseServerClientId.value = config.clientId || '';
        licenseServerClientSecret.value = config.clientSecret || '';
      }
      if (session) {
        licenseRemoteLoggedIn.value = !!session.loggedIn;
        licenseRemoteEmail.value = session.email || '';
      }
    } catch (_) {}
  });

  return {
    license,
    tabFlags,
    TAB_FLAG_IDS,
    tabLabels: TAB_LABELS,
    FEATURE_TEST_LIST,
    licenseKeyInput,
    licenseSaving,
    licenseServerUrl,
    licenseServerClientId,
    licenseServerClientSecret,
    licenseLoginEmail,
    licenseLoginPassword,
    licenseRemoteLoggedIn,
    licenseRemoteEmail,
    licenseLoginLoading,
    licenseLoginError,
    licenseMessage,
    licenseMessageOk,
    testMapOpen,
    testResult,
    testRunning,
    close,
    toggle,
    runTest,
    runAllTests,
    saveLicense,
    saveLicenseServerConfig,
    loginToLicenseServer,
    logoutFromLicenseServer,
  };
}
