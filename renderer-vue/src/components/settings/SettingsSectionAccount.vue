<template>
  <section v-show="activeSection === 'account'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('account')" />
    <div class="settings-section-card">
      <!-- Profile card -->
      <div class="bg-rm-surface border border-rm-border/60 rounded-xl p-5 px-6 mb-5">
        <div class="flex items-center gap-4">
          <div v-if="license.isLoggedIn?.value" class="w-12 h-12 shrink-0 relative">
            <img
              v-if="!avatarError && avatarSrc"
              :src="avatarSrc"
              alt=""
              class="account-avatar w-12 h-12 rounded-full border border-rm-border/50 object-cover block"
              referrerpolicy="no-referrer"
              @error="avatarError = true"
            />
            <div v-else class="account-avatar-initials w-12 h-12 rounded-full border border-rm-accent/30 bg-rm-accent/10 flex items-center justify-center text-rm-accent text-base font-semibold tracking-wide select-none">{{ userInitials }}</div>
          </div>
          <div class="flex-1 min-w-0">
            <span class="block text-base font-semibold text-rm-text tracking-tight">
              <template v-if="license.isLoggedIn?.value">
                {{ license.profile?.value?.name || license.licenseEmail?.value || 'Signed in' }}
              </template>
              <template v-else>Not signed in</template>
            </span>
            <p v-if="license.isLoggedIn?.value" class="text-[0.8125rem] text-rm-muted mt-1 m-0 leading-[1.4]">
              {{ license.licenseEmail?.value }}
            </p>
            <p v-else class="text-[0.8125rem] text-rm-warning mt-1 m-0">Sign in to use the app.</p>
          </div>
          <Button
            v-if="license.isLoggedIn?.value"
            severity="secondary"
            size="small"
            label="Sign out"
            class="shrink-0 account-signout-btn"
            @click="signOut"
          />
        </div>
      </div>

      <!-- Your info -->
      <template v-if="license.isLoggedIn?.value">
        <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
          <div
            class="block pb-4 cursor-pointer select-none"
            role="button"
            tabindex="0"
            aria-label="Your info"
            @click="onYourInfoTap"
            @keydown.enter="onYourInfoTap"
            @keydown.space.prevent="onYourInfoTap"
          >
            <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Your info</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Information synced from your account.</p>
          </div>
          <table class="w-full border-collapse text-[0.8125rem] account-info-table">
            <tbody>
              <tr class="border-b border-rm-border/30 last:border-b-0">
                <td class="w-36 text-rm-muted font-medium py-2.5 px-5 align-middle">Name</td>
                <td class="text-rm-text py-2.5 px-5 align-middle">{{ license.profile?.value?.name || '—' }}</td>
              </tr>
              <tr class="border-b border-rm-border/30 last:border-b-0">
                <td class="w-36 text-rm-muted font-medium py-2.5 px-5 align-middle">Email</td>
                <td class="text-rm-text py-2.5 px-5 align-middle">{{ license.licenseEmail?.value || '—' }}</td>
              </tr>
              <tr class="border-b border-rm-border/30 last:border-b-0">
                <td class="w-36 text-rm-muted font-medium py-2.5 px-5 align-middle">Plan</td>
                <td class="text-rm-text py-2.5 px-5 align-middle">
                  <template v-if="isDeveloperPlan">
                    <div class="flex items-center gap-2">
                      <Select
                        v-model="selectedPlan"
                        :options="planOptions"
                        optionLabel="label"
                        optionValue="value"
                        class="plan-switcher min-w-[130px]"
                        :loading="switchingPlan"
                        @change="onPlanSwitch"
                      />
                      <span v-if="switchingPlan" class="text-xs text-rm-muted">Switching…</span>
                    </div>
                  </template>
                  <template v-else>
                    <span class="inline-flex items-center py-0.5 px-2 text-[0.7rem] font-semibold rounded tracking-wide" :class="license.isPro?.value ? 'bg-rm-accent/15 text-rm-accent' : license.isPlus?.value ? 'bg-rm-accent/10 text-rm-accent/85' : 'bg-rm-surface-hover text-rm-muted'">
                      {{ license.tierLabel?.value || 'Free' }}
                    </span>
                  </template>
                </td>
              </tr>
              <tr class="border-b border-rm-border/30 last:border-b-0">
                <td class="w-36 text-rm-muted font-medium py-2.5 px-5 align-middle">GitHub</td>
                <td class="text-rm-text py-2.5 px-5 align-middle">
                  <span v-if="license.profile?.value?.github_linked" class="inline-flex items-center gap-1 text-rm-success">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    Linked
                  </span>
                  <span v-else class="text-rm-muted">Not linked</span>
                </td>
              </tr>
              <tr v-if="license.profile?.value?.created_at" class="border-b border-rm-border/30 last:border-b-0">
                <td class="w-36 text-rm-muted font-medium py-2.5 px-5 align-middle">Member since</td>
                <td class="text-rm-text py-2.5 px-5 align-middle">{{ formatMemberSince(license.profile.value.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Environment (hidden until "Your info" is clicked 7 times) -->
      <div v-if="showEnvSetting" class="env-setting-card bg-rm-surface border border-rm-border/60 border-l-[3px] border-l-rm-accent/50 rounded-xl p-5 px-6 mt-4 flex flex-col gap-4">
        <div class="flex items-start gap-3">
          <span class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-rm-accent/12 text-rm-accent" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>
          </span>
          <div>
            <span class="block text-[0.9375rem] font-semibold text-rm-text tracking-tight">Environment</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 m-0 leading-[1.45]">Backend used for sign-in and password reset.</p>
          </div>
        </div>
        <Select
          v-model="licenseServerEnvironment"
          :options="licenseServerEnvironments"
          option-label="label"
          option-value="id"
          class="env-setting-select max-w-[12rem]"
          placeholder="Development"
          @change="saveLicenseServerEnvironment"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch, inject } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import SettingsSectionHeader from './SettingsSectionHeader.vue';
import { SETTINGS_INJECTION_KEY } from './settingsInjectionKey';

const ctx = inject(SETTINGS_INJECTION_KEY);
const {
  getSectionMeta,
  license,
  licenseServerEnvironment,
  licenseServerEnvironments,
  saveLicenseServerEnvironment,
  activeSection,
} = ctx;

const signOut = ctx.signOut;
const planOptions = ctx.planOptions;
const selectedPlan = ctx.selectedPlan;
const switchingPlan = ctx.switchingPlan;
const onPlanSwitch = ctx.onPlanSwitch;
const isDeveloperPlan = ctx.isDeveloperPlan;

const avatarError = ref(false);
const yourInfoTapCount = ref(0);
let yourInfoTapTimer = null;
const YOUR_INFO_TAP_THRESHOLD = 7;
const YOUR_INFO_TAP_WINDOW_MS = 3000;
const showEnvSetting = ref(false);

function onYourInfoTap() {
  yourInfoTapCount.value++;
  clearTimeout(yourInfoTapTimer);
  yourInfoTapTimer = setTimeout(() => { yourInfoTapCount.value = 0; }, YOUR_INFO_TAP_WINDOW_MS);
  if (yourInfoTapCount.value >= YOUR_INFO_TAP_THRESHOLD) {
    yourInfoTapCount.value = 0;
    showEnvSetting.value = !showEnvSetting.value;
  }
}

const avatarSrc = computed(() => {
  const profile = license.profile?.value;
  if (profile?.avatar_url) return profile.avatar_url;
  const email = (license.licenseEmail?.value || '').trim().toLowerCase();
  if (email) {
    const hash = Array.from(email).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
    const hex = Math.abs(hash).toString(16).padStart(8, '0').slice(0, 32);
    return `https://www.gravatar.com/avatar/${hex}?d=404&s=128`;
  }
  return '';
});

const userInitials = computed(() => {
  const name = license.profile?.value?.name || license.licenseEmail?.value || '';
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
});

watch(() => license.profile?.value?.avatar_url, () => { avatarError.value = false; });

function formatMemberSince(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}
</script>
