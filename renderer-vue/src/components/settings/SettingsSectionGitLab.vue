<template>
  <section v-show="activeSection === 'gitlab'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('gitlab')" />
    <div class="settings-section-card">
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
        <div class="block pb-4">
          <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Add from GitLab</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Browse your projects or search GitLab to clone and add.</p>
        </div>
        <Button label="Clone from GitLab" icon="pi pi-gitlab" size="small" @click="openCloneFromGit?.('gitlab')" />
      </div>
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
        <div class="block">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Instance URL</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">GitLab instance URL. Leave empty for gitlab.com.</p>
          <InputText v-model="gitlabUrl" type="text" class="max-w-md mt-2" placeholder="https://gitlab.com" @blur="saveGitLabUrl" />
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Personal access token</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Required for listing and searching your projects.</p>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <InputText v-model="gitlabToken" type="password" class="flex-1 min-w-0" placeholder="glpat-..." autocomplete="off" @blur="saveGitLabToken" />
            <Button variant="link" label="Create token" class="text-xs text-rm-accent p-0 min-w-0 h-auto shrink-0" @click="openUrl('https://gitlab.com/-/user_settings/personal_access_tokens')" />
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
  gitlabUrl,
  gitlabToken,
  saveGitLabUrl,
  saveGitLabToken,
  openUrl,
} = ctx;
const openCloneFromGit = inject('openCloneFromGit', null);
</script>
