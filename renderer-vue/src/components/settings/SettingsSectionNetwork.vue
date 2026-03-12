<template>
  <section v-show="activeSection === 'network'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('network')" />
    <div class="settings-section-card">
      <!-- Connectivity status -->
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="connectivityStatus === 'online' ? 'bg-rm-success shadow-[0_0_0_3px_rgb(var(--rm-success)/0.2)]' : connectivityStatus === 'offline' ? 'bg-rm-danger shadow-[0_0_0_3px_rgb(var(--rm-danger)/0.2)]' : 'bg-rm-muted/40'" />
            <span class="text-[0.8125rem] font-semibold text-rm-text m-0">
              {{ connectivityStatus === 'online' ? 'Connected' : connectivityStatus === 'offline' ? 'No connection' : connectivityStatus === 'checking' ? 'Checking…' : 'Unknown' }}
            </span>
            <span v-if="connectivityStatus === 'online'" class="text-xs text-rm-success">Server reachable</span>
            <span v-else-if="connectivityStatus === 'offline'" class="text-xs text-rm-danger">Server unreachable</span>
          </div>
          <Button size="small" severity="secondary" :loading="connectivityStatus === 'checking'" @click="checkConnectivity">
            {{ connectivityStatus === 'checking' ? 'Checking…' : 'Check now' }}
          </Button>
        </div>
      </div>

      <!-- Connection settings -->
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5 mb-5">
        <div class="block">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Proxy</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Use system proxy or set custom (e.g. http://proxy:8080). Leave empty for system.</p>
          <InputText v-model="proxy" type="text" class="mt-2 w-full max-w-md" placeholder="System or http://host:port" @blur="saveProxy" />
        </div>
        <div class="block pt-5 mt-5 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Request timeout (seconds)</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">How long to wait for HTTP requests before timing out.</p>
          <Select v-model="requestTimeoutSeconds" :options="requestTimeoutOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveRequestTimeout" />
        </div>
      </div>

      <!-- Offline mode -->
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
        <label class="block settings-row-clickable settings-row-checkbox">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Offline mode</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Use the app without a network connection. License, plan, and permissions are cached from your last successful login.</p>
          </div>
          <Checkbox v-model="offlineMode" binary @update:model-value="saveOfflineMode" class="shrink-0" />
        </label>

        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Offline grace period</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">How many days the app can run offline before requiring you to sign in again to verify your account.</p>
          <Select v-model="offlineGraceDays" :options="offlineGraceDaysOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveOfflineGraceDays" />
        </div>

        <div v-if="offlineLastVerifiedAt" class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Offline status</span>
          <div class="mt-2 space-y-2">
            <div class="flex items-center gap-2 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-rm-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span class="text-rm-muted">Last verified: <strong class="text-rm-text">{{ formatTimestamp(offlineLastVerifiedAt) }}</strong></span>
            </div>
            <div v-if="offlineGraceStatus" class="flex items-center gap-2 text-sm">
              <svg v-if="offlineGraceStatus.valid" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-rm-success shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-rm-danger shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span :class="offlineGraceStatus.valid ? 'text-rm-success' : 'text-rm-danger'">
                {{ offlineGraceStatus.valid ? `${offlineGraceStatus.daysRemaining} day${offlineGraceStatus.daysRemaining === 1 ? '' : 's'} remaining` : 'Grace period expired — sign in required' }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="!offlineLastVerifiedAt && license.isLoggedIn?.value" class="block pt-2 border-t border-rm-border">
          <p class="text-sm text-rm-muted m-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-rm-info inline-block mr-1 align-text-bottom" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            Your offline grace period will start the next time your account is verified online.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { inject } from 'vue';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import SettingsSectionHeader from './SettingsSectionHeader.vue';
import { SETTINGS_INJECTION_KEY } from './settingsInjectionKey';

const ctx = inject(SETTINGS_INJECTION_KEY);
const {
  getSectionMeta,
  activeSection,
  license,
  connectivityStatus,
  proxy,
  requestTimeoutSeconds,
  requestTimeoutOptions,
  offlineMode,
  offlineGraceDays,
  offlineGraceDaysOptions,
  offlineLastVerifiedAt,
  offlineGraceStatus,
  checkConnectivity,
  saveProxy,
  saveRequestTimeout,
  saveOfflineMode,
  saveOfflineGraceDays,
  formatTimestamp,
} = ctx;
</script>
