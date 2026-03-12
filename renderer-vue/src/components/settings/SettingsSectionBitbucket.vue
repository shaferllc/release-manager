<template>
  <section v-show="activeSection === 'bitbucket'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('bitbucket')" />
    <div class="settings-section-card">
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
        <div class="block pb-4">
          <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Add from Bitbucket</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Browse your repositories or search Bitbucket to clone and add.</p>
        </div>
        <Button label="Clone from Bitbucket" icon="pi pi-bitbucket" size="small" @click="openCloneFromGit?.('bitbucket')" />
      </div>
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
        <div class="block">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Username</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Your Bitbucket username or email (for API token auth).</p>
          <InputText v-model="bitbucketUsername" type="text" class="max-w-md mt-2" placeholder="username" @blur="saveBitbucketUsername" />
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">API token</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Bitbucket API token with repository read scope. App passwords are deprecated; use API tokens.</p>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <InputText v-model="bitbucketToken" type="password" class="flex-1 min-w-0" placeholder="API token" autocomplete="off" @blur="saveBitbucketToken" />
            <Button variant="link" label="Create API token" class="text-xs text-rm-accent p-0 min-w-0 h-auto shrink-0" @click="openUrl('https://id.atlassian.com/manage-profile/security/api-tokens')" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { inject } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import SettingsSectionHeader from './SettingsSectionHeader.vue';
import { SETTINGS_INJECTION_KEY } from './settingsInjectionKey';

const ctx = inject(SETTINGS_INJECTION_KEY);
const {
  getSectionMeta,
  activeSection,
  bitbucketUsername,
  bitbucketToken,
  saveBitbucketUsername,
  saveBitbucketToken,
  openUrl,
} = ctx;
const openCloneFromGit = inject('openCloneFromGit', null);
</script>
