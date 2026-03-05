<template>
  <Dialog
    :visible="true"
    header="Hidden options"
    :style="{ width: '28rem' }"
    :modal="true"
    :dismissableMask="true"
    class="max-w-md"
    @update:visible="(v) => { if (!v) close(); }"
    @hide="close"
  >
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
            <Checkbox
              :model-value="tabFlags[id] !== false"
              binary
              @update:model-value="(v) => toggle(id, v)"
            />
            <span class="text-sm text-rm-text">{{ tabLabels[id] || id }}</span>
          </label>
        </div>
        <div class="border-t border-rm-border pt-4 mt-2">
          <label class="flex items-center gap-3 cursor-pointer">
            <Checkbox
              :model-value="license.bypassLicense"
              binary
              @update:model-value="license.setBypassLicense"
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
              <InputText v-model="licenseKeyInput" type="password" class="flex-1 min-w-0 max-w-xs" placeholder="License key" autocomplete="off" />
              <Button severity="primary" size="small" :disabled="licenseSaving" @click="saveLicense">Save</Button>
            </div>
            <Message v-if="licenseMessage" :severity="licenseMessageOk ? 'success' : 'warn'" class="mt-1 text-xs">{{ licenseMessage }}</Message>
          </div>
          <div>
            <span class="text-xs font-medium text-rm-muted block mb-1">License server (Laravel Passport)</span>
            <div class="grid gap-2">
              <InputText v-model="licenseServerUrl" type="url" placeholder="https://your-app.com" autocomplete="off" @blur="saveLicenseServerConfig" />
              <div class="grid grid-cols-2 gap-2">
                <InputText v-model="licenseServerClientId" type="text" placeholder="Client ID" autocomplete="off" @blur="saveLicenseServerConfig" />
                <InputText v-model="licenseServerClientSecret" type="password" placeholder="Client secret" autocomplete="off" @blur="saveLicenseServerConfig" />
              </div>
            </div>
          </div>
          <div>
            <span class="text-xs font-medium text-rm-muted block mb-1">Log in with account</span>
            <p v-if="licenseRemoteLoggedIn" class="text-xs font-medium text-rm-success m-0 mb-1">Logged in as {{ licenseRemoteEmail || 'your account' }}</p>
            <p v-else class="text-xs text-rm-muted m-0 mb-1">Not logged in</p>
            <div class="flex flex-wrap items-center gap-2">
              <InputText v-model="licenseLoginEmail" type="email" class="w-40" placeholder="Email" autocomplete="email" />
              <InputText v-model="licenseLoginPassword" type="password" class="w-32" placeholder="Password" autocomplete="current-password" />
              <Button severity="primary" size="small" :disabled="licenseLoginLoading" @click="loginToLicenseServer">Log in</Button>
              <Button severity="secondary" size="small" :disabled="licenseLoginLoading" @click="logoutFromLicenseServer">Log out</Button>
            </div>
            <Message v-if="licenseLoginError" severity="warn" class="mt-1 text-xs">{{ licenseLoginError }}</Message>
          </div>
        </div>
      </section>

      <section class="border-t border-rm-border pt-4">
        <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-2">Quick test</h4>
        <p class="text-xs text-rm-muted m-0 mb-3">Run renderer tests next to each area to confirm things work.</p>
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <Button severity="primary" size="small" :disabled="testRunning" @click="runAllTests">
            Run all renderer tests
          </Button>
          <Button severity="secondary" size="small" @click="testMapOpen = true">
            View test map
          </Button>
        </div>
        <div class="flex flex-col gap-2">
          <div
            v-for="entry in FEATURE_TEST_LIST"
            :key="entry.id"
            class="flex items-center gap-2 flex-wrap"
          >
            <span class="text-sm text-rm-text min-w-0 flex-1">{{ entry.label }}</span>
            <span class="text-xs text-rm-muted font-mono truncate max-w-[140px]" :title="entry.testFile">{{ entry.testFile }}</span>
            <Button severity="secondary" size="small" :disabled="testRunning" @click="runTest(entry)">
              Run
            </Button>
          </div>
        </div>
      </section>

      <div class="flex justify-end pt-2">
        <Button severity="secondary" size="small" @click="close">Done</Button>
      </div>
    </div>
  </Dialog>

  <!-- Test map overlay -->
  <Dialog
    v-if="testMapOpen"
    :visible="true"
    header="Test map"
    :style="{ width: '32rem' }"
    :modal="true"
    :dismissableMask="true"
    class="max-w-lg max-h-[80vh]"
    @update:visible="(v) => { if (!v) testMapOpen = false; }"
    @hide="testMapOpen = false"
  >
    <p class="text-xs text-rm-muted m-0 mb-3">Which test covers each area.</p>
    <dl class="space-y-2 text-sm">
      <div v-for="entry in FEATURE_TEST_LIST" :key="entry.id" class="flex gap-2">
        <dt class="text-rm-text font-medium shrink-0">{{ entry.label }}:</dt>
        <dd class="font-mono text-rm-muted text-xs break-all m-0">{{ entry.testFile }}</dd>
      </div>
    </dl>
  </Dialog>

  <!-- Test result overlay -->
  <Dialog
    v-if="testResult"
    :visible="true"
    :header="(testResult.ok ? 'Test passed' : 'Test failed') + ' — ' + testResult.label"
    :style="{ width: '42rem' }"
    :modal="true"
    :dismissableMask="true"
    class="max-w-2xl"
    @update:visible="(v) => { if (!v) testResult = null; }"
    @hide="testResult = null"
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
        <Button severity="secondary" size="small" @click="testResult = null">Close</Button>
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import { useFeatureFlagsModal } from '../../composables/useFeatureFlagsModal';

const {
  license,
  tabFlags,
  TAB_FLAG_IDS,
  tabLabels,
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
} = useFeatureFlagsModal();
</script>
