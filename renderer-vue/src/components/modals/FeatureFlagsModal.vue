<template>
  <Dialog
    :visible="true"
    header="Hidden options"
    :style="{ width: '40rem' }"
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
        <div class="mb-3 flex flex-col gap-1.5">
          <label class="text-xs font-medium text-rm-muted block">Search</label>
          <InputText
            v-model="featureFlagsSearchQuery"
            placeholder="Filter by name..."
            class="w-full text-sm feature-flags-search"
          />
        </div>
        <p class="text-xs text-rm-muted m-0 mb-2">Sort: A–Z by category</p>
        <div class="flex flex-col gap-3 max-h-64 overflow-y-auto">
          <template v-for="group in featureFlagsByCategory" :key="group.categoryId">
            <div class="flex flex-col gap-1.5">
              <h5 class="text-xs font-semibold text-rm-muted uppercase tracking-wider m-0">{{ group.label }}</h5>
              <label
                v-for="entry in group.entries"
                :key="entry.id"
                class="flex items-center gap-3 cursor-pointer pl-0"
              >
                <Checkbox
                  :model-value="tabFlags[entry.id] !== false"
                  binary
                  @update:model-value="(v) => toggle(entry.id, v)"
                />
                <span class="text-sm text-rm-text">{{ entry.label }}</span>
              </label>
            </div>
          </template>
          <p v-if="featureFlagsByCategory.length === 0" class="text-xs text-rm-muted m-0">No matching tabs.</p>
        </div>
      </section>

      <section class="border-t border-rm-border pt-4">
        <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-2">App account</h4>
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span class="text-sm" :class="license.isLoggedIn ? 'text-rm-success' : 'text-rm-muted'">
            {{ license.isLoggedIn ? (license.licenseSource === 'remote' && license.licenseEmail ? `Signed in as ${license.licenseEmail}` : 'Signed in') : 'Not signed in' }}
          </span>
          <Button
            v-if="license.isLoggedIn"
            severity="secondary"
            size="small"
            :disabled="licenseLogoutLoading"
            @click="logoutFromLicenseServer"
          >
            Sign out
          </Button>
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
import { useFeatureFlagsModal } from '../../composables/useFeatureFlagsModal';

const {
  license,
  tabFlags,
  featureFlagsSearchQuery,
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
} = useFeatureFlagsModal();
</script>

<style scoped>
.feature-flags-search :deep(input) {
  min-height: 2rem;
  padding: 0.375rem 0.5rem;
}
</style>
