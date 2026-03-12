<template>
  <section v-show="activeSection === 'subscription'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('subscription')" />
    <div class="settings-section-card">
      <!-- Plan info (when logged in) -->
      <div v-if="license.isLoggedIn?.value" class="py-3.5 px-4 rounded-lg border border-rm-border bg-rm-surface/50 mb-4">
        <div class="flex items-baseline gap-2 text-[0.8125rem]">
          <span class="text-rm-muted font-medium min-w-[5rem]">Plan limits</span>
          <span class="text-rm-text">
            {{ license.maxProjects?.value === -1 ? 'Unlimited' : license.maxProjects?.value }} projects
            ·
            {{ license.maxExtensions?.value === -1 ? 'Unlimited' : license.maxExtensions?.value }} extensions
          </span>
        </div>
        <div v-if="license.team?.value" class="flex items-baseline gap-2 text-[0.8125rem] mt-1.5">
          <span class="text-rm-muted font-medium min-w-[5rem]">Team</span>
          <span class="text-rm-text">{{ license.team?.value?.name || '—' }} ({{ license.team?.value?.member_count ?? license.team?.value?.members?.length ?? 0 }} members)</span>
        </div>
      </div>

      <!-- Current plan banner -->
      <div class="flex items-center justify-between gap-4 flex-wrap p-4 px-5 rounded-[10px] border border-rm-border bg-rm-surface mb-5" :class="license.isPro?.value ? 'border-rm-accent/30 bg-rm-accent/6' : license.isPlus?.value ? 'border-blue-500/25 bg-blue-500/5' : ''">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" :class="license.isPro?.value ? 'bg-rm-accent/15 text-rm-accent' : license.isPlus?.value ? 'bg-blue-500/12 text-blue-400' : 'bg-rm-accent/12 text-rm-accent'">
            <svg v-if="license.isPro?.value" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <svg v-else-if="license.isPlus?.value" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m4.9 4.9 2.8 2.8"/><path d="M2 12h4"/><path d="m4.9 19.1 2.8-2.8"/><path d="M12 18v4"/><path d="m19.1 19.1-2.8-2.8"/><path d="M22 12h-4"/><path d="m19.1 4.9-2.8 2.8"/><circle cx="12" cy="12" r="4"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </div>
          <div>
            <span class="block text-base font-bold text-rm-text leading-tight">{{ license.tierLabel?.value || 'Free' }}</span>
            <span class="block text-[0.6875rem] text-rm-muted font-medium">Current plan</span>
          </div>
        </div>
        <div class="flex gap-2 shrink-0">
          <Button
            v-if="!license.isPro?.value"
            severity="primary"
            size="small"
            label="Upgrade"
            @click="openSubscriptionPage('pricing')"
            :disabled="!license.isLoggedIn?.value"
          />
          <Button
            severity="secondary"
            size="small"
            label="Manage billing"
            @click="openSubscriptionPage('billing/portal')"
            :disabled="!license.isLoggedIn?.value"
          />
        </div>
      </div>

      <!-- Plan tiers -->
      <div class="grid grid-cols-3 gap-2.5 mb-5">
        <div v-for="tier in PLAN_TIERS" :key="tier.id" class="border border-rm-border rounded-[10px] p-4 bg-rm-surface/40 relative text-center transition-[border-color] duration-150 hover:border-rm-border-focus/30" :class="currentPlanId === tier.id ? 'border-rm-accent/40 bg-rm-accent/4' : tier.popular ? 'border-rm-accent/25' : ''">
          <div v-if="tier.popular && currentPlanId !== tier.id" class="absolute -top-[0.4375rem] left-1/2 -translate-x-1/2 text-[0.5625rem] font-bold uppercase tracking-wider py-px px-2 rounded-full bg-rm-accent text-rm-bg whitespace-nowrap">Popular</div>
          <div v-else-if="currentPlanId === tier.id" class="absolute -top-[0.4375rem] left-1/2 -translate-x-1/2 text-[0.5625rem] font-bold uppercase tracking-wider py-px px-2 rounded-full bg-rm-accent/15 text-rm-accent whitespace-nowrap">Current</div>
          <div v-if="tier.icon" class="sub-tier-icon flex items-center justify-center w-8 h-8 mx-auto mb-2 text-rm-muted" :class="currentPlanId === tier.id ? 'text-rm-accent' : ''" aria-hidden="true" v-html="tier.icon"></div>
          <h4 class="text-[0.8125rem] font-bold text-rm-text m-0">{{ tier.name }}</h4>
          <div class="mt-1 mb-0.5 leading-none">
            <span class="text-xl font-extrabold text-rm-text tabular-nums">{{ tier.price }}</span>
            <span v-if="tier.period" class="text-[0.6875rem] text-rm-muted font-medium">{{ tier.period }}</span>
          </div>
          <p class="text-[0.6875rem] text-rm-muted m-0 leading-snug">{{ tier.desc }}</p>
          <Button
            v-if="currentPlanId !== tier.id && tier.id !== 'free'"
            :label="tier.id === 'pro' ? 'Upgrade' : 'Go Team'"
            :severity="tier.popular ? 'primary' : 'secondary'"
            size="small"
            class="w-full mt-2"
            @click="openSubscriptionPage('pricing')"
            :disabled="!license.isLoggedIn?.value"
          />
          <div v-else-if="currentPlanId === tier.id" class="flex items-center justify-center gap-1 text-[0.6875rem] font-semibold text-rm-accent mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            Active
          </div>
        </div>
      </div>

      <!-- Feature comparison table -->
      <div class="border border-rm-border rounded-[10px] overflow-hidden bg-rm-surface/25">
        <table class="w-full border-collapse text-[0.75rem]">
          <thead>
            <tr>
              <th class="w-[45%] text-center py-2.5 px-2 text-[0.6875rem] font-semibold text-rm-muted border-b border-rm-border uppercase tracking-wider text-left pl-4"></th>
              <th v-for="tier in PLAN_TIERS" :key="tier.id" class="text-center py-2.5 px-2 text-[0.6875rem] font-semibold text-rm-muted border-b border-rm-border uppercase tracking-wider" :class="currentPlanId === tier.id ? 'text-rm-accent' : ''">{{ tier.name }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in PLAN_FEATURES" :key="group.category">
              <tr>
                <td :colspan="PLAN_TIERS.length + 1" class="p-0 text-[0.625rem] font-bold uppercase tracking-wider text-rm-muted py-2.5 px-4 pt-2.5 pb-1.5 bg-rm-bg/50 border-b border-rm-border/50">
                  <span v-if="group.icon" class="inline-flex items-center justify-center mr-1.5 align-[-0.15em] text-rm-muted" aria-hidden="true" v-html="group.icon"></span>
                  {{ group.category }}
                </td>
              </tr>
              <tr v-for="feat in group.features" :key="feat.label" class="border-b border-rm-border/30 last:border-b-0">
                <td class="py-[0.4375rem] px-2 py-[0.4375rem] pl-4 text-rm-text font-normal">{{ feat.label }}</td>
                <td v-for="tier in PLAN_TIERS" :key="tier.id" class="text-center py-[0.4375rem] px-2 align-middle" :class="currentPlanId === tier.id ? 'bg-rm-accent/3' : ''">
                  <template v-if="feat[tier.id] === true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="inline-block align-middle text-rm-accent"><polyline points="20 6 9 17 4 12"/></svg>
                  </template>
                  <template v-else-if="feat[tier.id] === false">
                    <span class="text-rm-muted/25 text-sm">—</span>
                  </template>
                  <template v-else>
                    <span class="text-rm-text font-semibold tabular-nums">{{ feat[tier.id] }}</span>
                  </template>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <p v-if="!license.isLoggedIn?.value" class="text-sm text-rm-warning mt-4 m-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 align-[-2px]"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        Sign in to manage your subscription.
      </p>
    </div>
  </section>
</template>

<script setup>
import { inject } from 'vue';
import Button from 'primevue/button';
import SettingsSectionHeader from './SettingsSectionHeader.vue';
import { SETTINGS_INJECTION_KEY } from './settingsInjectionKey';

const ctx = inject(SETTINGS_INJECTION_KEY);
const {
  getSectionMeta,
  license,
  activeSection,
  openSubscriptionPage,
  currentPlanId,
} = ctx;

const TIER_ICONS = {
  free: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  pro: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  team: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
};

const PLAN_TIERS = [
  { id: 'free', name: 'Free', price: '$0', period: '', desc: 'For personal projects', icon: TIER_ICONS.free },
  { id: 'pro', name: 'Pro', price: '$9', period: '/mo', desc: 'For developers who ship regularly', popular: true, icon: TIER_ICONS.pro },
  { id: 'team', name: 'Team', price: '$29', period: '/mo', desc: 'For teams and organizations', icon: TIER_ICONS.team },
];

const FEATURE_CATEGORY_ICONS = {
  Limits: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
  Core: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2 1.33-2 0 0-2.77 2.24-5 5-5 1.66 0 3 1.35 3 3.02 0 1.33 2 1.33 2 0"/></svg>',
  'Pro features': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  'Team features': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
};

const PLAN_FEATURES = [
  { category: 'Limits', icon: FEATURE_CATEGORY_ICONS.Limits, features: [
    { label: 'Projects', free: '3', pro: '50', team: 'Unlimited' },
    { label: 'Extensions', free: '3', pro: '25', team: 'Unlimited' },
    { label: 'Team members', free: '1', pro: '1', team: '10' },
  ]},
  { category: 'Core', icon: FEATURE_CATEGORY_ICONS.Core, features: [
    { label: 'Releases & version bumps', free: true, pro: true, team: true },
    { label: 'Git integration', free: true, pro: true, team: true },
    { label: 'Dashboard overview', free: true, pro: true, team: true },
    { label: 'Notes, wiki & bookmarks', free: true, pro: true, team: true },
    { label: 'Kanban & checklists', free: true, pro: true, team: true },
    { label: 'Env file editor', free: true, pro: true, team: true },
    { label: 'Settings sync', free: false, pro: true, team: true },
  ]},
  { category: 'Pro features', icon: FEATURE_CATEGORY_ICONS['Pro features'], features: [
    { label: 'AI commit messages', free: false, pro: true, team: true },
    { label: 'AI release notes', free: false, pro: true, team: true },
    { label: 'Pull requests', free: false, pro: true, team: true },
    { label: 'GitHub issues', free: false, pro: true, team: true },
    { label: 'Terminal & processes', free: false, pro: true, team: true },
    { label: 'Runbooks & changelogs', free: false, pro: true, team: true },
    { label: 'Usage analytics', free: false, pro: true, team: true },
    { label: 'Priority support', free: false, pro: true, team: true },
  ]},
  { category: 'Team features', icon: FEATURE_CATEGORY_ICONS['Team features'], features: [
    { label: 'Team collaboration', free: false, pro: false, team: true },
    { label: 'Shared dashboard', free: false, pro: false, team: true },
    { label: 'Batch release', free: false, pro: false, team: true },
    { label: 'SSH, FTP & tunnels', free: false, pro: false, team: true },
  ]},
];
</script>
