<template>
  <RmModal title="Hidden options" class="max-w-md" @close="close">
    <div class="flex flex-col gap-4 min-h-0 overflow-x-hidden">
      <section>
        <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-2">Feature flags</h4>
        <p class="text-xs text-rm-muted m-0 mb-2">Enable or disable detail tabs. Core tabs (Dashboard, Git, Version) are always visible.</p>
        <div class="flex flex-col gap-2">
          <label
            v-for="id in TAB_FLAG_IDS"
            :key="id"
            class="flex items-center gap-3 cursor-pointer"
          >
            <input
              :checked="tabFlags[id] !== false"
              type="checkbox"
              class="checkbox-input rounded border-rm-border"
              @change="toggle(id, ($event.target).checked)"
            />
            <span class="text-sm text-rm-text">{{ tabLabels[id] || id }}</span>
          </label>
        </div>
        <div class="border-t border-rm-border pt-4 mt-2">
          <label class="flex items-center gap-3 cursor-pointer">
            <input
              :checked="license.bypassLicense"
              type="checkbox"
              class="checkbox-input rounded border-rm-border"
              @change="license.setBypassLicense(($event.target).checked)"
            />
            <span class="text-sm text-rm-text">Enable full app without license</span>
          </label>
          <p class="text-xs text-rm-muted mt-1 ml-6 m-0">Show all tabs, AI generation, and batch release without a license key.</p>
        </div>
      </section>

      <section class="border-t border-rm-border pt-4">
        <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-2">License</h4>
        <p class="text-xs text-rm-muted m-0 mb-2">License will be brought back later. Configure key or server here when ready.</p>
        <div class="space-y-3">
          <div>
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-sm font-medium text-rm-text">Status</span>
              <span class="text-sm" :class="license.hasLicense ? 'text-rm-success' : 'text-rm-muted'">
                {{ license.hasLicense ? (license.licenseSource === 'remote' && license.licenseEmail ? `Active (${license.licenseEmail})` : 'Active') : 'No license' }}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <RmInput v-model="licenseKeyInput" type="password" class="flex-1 min-w-0 max-w-xs" placeholder="License key" autocomplete="off" />
              <RmButton variant="primary" size="compact" :disabled="licenseSaving" @click="saveLicense">Save</RmButton>
            </div>
            <p v-if="licenseMessage" class="mt-1 text-xs" :class="licenseMessageOk ? 'text-rm-success' : 'text-rm-warning'">{{ licenseMessage }}</p>
          </div>
          <div>
            <span class="text-xs font-medium text-rm-muted block mb-1">License server (Laravel Passport)</span>
            <div class="grid gap-2">
              <RmInput v-model="licenseServerUrl" type="url" placeholder="https://your-app.com" autocomplete="off" @blur="saveLicenseServerConfig" />
              <div class="grid grid-cols-2 gap-2">
                <RmInput v-model="licenseServerClientId" type="text" placeholder="Client ID" autocomplete="off" @blur="saveLicenseServerConfig" />
                <RmInput v-model="licenseServerClientSecret" type="password" placeholder="Client secret" autocomplete="off" @blur="saveLicenseServerConfig" />
              </div>
            </div>
          </div>
          <div>
            <span class="text-xs font-medium text-rm-muted block mb-1">Log in with account</span>
            <p v-if="licenseRemoteLoggedIn" class="text-xs font-medium text-rm-success m-0 mb-1">Logged in as {{ licenseRemoteEmail || 'your account' }}</p>
            <p v-else class="text-xs text-rm-muted m-0 mb-1">Not logged in</p>
            <div class="flex flex-wrap items-center gap-2">
              <RmInput v-model="licenseLoginEmail" type="email" class="w-40" placeholder="Email" autocomplete="email" />
              <RmInput v-model="licenseLoginPassword" type="password" class="w-32" placeholder="Password" autocomplete="current-password" />
              <RmButton variant="primary" size="compact" :disabled="licenseLoginLoading" @click="loginToLicenseServer">Log in</RmButton>
              <RmButton variant="secondary" size="compact" :disabled="licenseLoginLoading" @click="logoutFromLicenseServer">Log out</RmButton>
            </div>
            <p v-if="licenseLoginError" class="mt-1 text-xs text-rm-warning m-0">{{ licenseLoginError }}</p>
          </div>
        </div>
      </section>

      <section class="border-t border-rm-border pt-4">
        <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-2">Quick test</h4>
        <p class="text-xs text-rm-muted m-0 mb-3">Run renderer tests next to each area to confirm things work.</p>
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <RmButton variant="primary" size="compact" :disabled="testRunning" @click="runAllTests">
            Run all renderer tests
          </RmButton>
          <RmButton variant="secondary" size="compact" @click="testMapOpen = true">
            View test map
          </RmButton>
        </div>
        <div class="flex flex-col gap-2">
          <div
            v-for="entry in FEATURE_TEST_LIST"
            :key="entry.id"
            class="flex items-center gap-2 flex-wrap"
          >
            <span class="text-sm text-rm-text min-w-0 flex-1">{{ entry.label }}</span>
            <span class="text-xs text-rm-muted font-mono truncate max-w-[140px]" :title="entry.testFile">{{ entry.testFile }}</span>
            <RmButton variant="secondary" size="compact" :disabled="testRunning" @click="runTest(entry)">
              Run
            </RmButton>
          </div>
        </div>
      </section>

      <div class="flex justify-end pt-2">
        <RmButton variant="secondary" size="compact" @click="close">Done</RmButton>
      </div>
    </div>
  </RmModal>

  <!-- Test map overlay -->
  <RmModal
    v-if="testMapOpen"
    title="Test map"
    class="max-w-lg max-h-[80vh]"
    @close="testMapOpen = false"
  >
    <p class="text-xs text-rm-muted m-0 mb-3">Which test covers each area.</p>
    <dl class="space-y-2 text-sm">
      <div v-for="entry in FEATURE_TEST_LIST" :key="entry.id" class="flex gap-2">
        <dt class="text-rm-text font-medium shrink-0">{{ entry.label }}:</dt>
        <dd class="font-mono text-rm-muted text-xs break-all m-0">{{ entry.testFile }}</dd>
      </div>
    </dl>
  </RmModal>

  <!-- Test result overlay -->
  <RmModal
    v-if="testResult"
    :title="(testResult.ok ? 'Test passed' : 'Test failed') + ' — ' + testResult.label"
    wide
    class="max-w-2xl"
    @close="testResult = null"
  >
    <div class="flex flex-col gap-3">
      <p class="text-sm m-0" :class="testResult.ok ? 'text-rm-success' : 'text-rm-warning'">
        Exit code: {{ testResult.exitCode }}
      </p>
      <div v-if="testResult.stdout" class="min-h-0">
        <span class="text-xs font-semibold text-rm-muted block mb-1">stdout</span>
        <pre class="text-xs font-mono bg-rm-surface p-2 overflow-x-auto whitespace-pre-wrap break-words m-0 rounded-rm-dynamic">{{ testResult.stdout }}</pre>
      </div>
      <div v-if="testResult.stderr" class="min-h-0">
        <span class="text-xs font-semibold text-rm-muted block mb-1">stderr</span>
        <pre class="text-xs font-mono bg-rm-surface p-2 overflow-x-auto whitespace-pre-wrap break-words m-0 text-rm-warning rounded-rm-dynamic">{{ testResult.stderr }}</pre>
      </div>
      <div class="flex justify-end pt-2">
        <RmButton variant="secondary" size="compact" @click="testResult = null">Close</RmButton>
      </div>
    </div>
  </RmModal>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RmButton, RmInput, RmModal } from '../ui';
import { useApi } from '../../composables/useApi';
import { useFeatureFlags } from '../../composables/useFeatureFlags';
import { useLicense } from '../../composables/useLicense';

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
};

/** Feature/test areas with the spec file that covers them (path relative to renderer-vue). */
const FEATURE_TEST_LIST = [
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

const tabLabels = TAB_LABELS;
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
</script>
