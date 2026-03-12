<template>
  <section v-show="activeSection === 'gitea'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('gitea')" />
    <div class="settings-section-card">
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
        <div class="block pb-4">
          <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Add from Gitea</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Browse your repositories or search Gitea/Forgejo to clone and add.</p>
        </div>
        <Button label="Clone from Gitea" icon="pi pi-box" size="small" @click="openCloneFromGit?.('gitea')" />
      </div>
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
        <div class="block">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Instance URL</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Gitea or Forgejo instance URL. Leave empty for gitea.com.</p>
          <InputText v-model="giteaUrl" type="text" class="max-w-md mt-2" placeholder="https://gitea.com" @blur="saveGiteaUrl" />
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Access token</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Required for listing and searching your repositories.</p>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <InputText v-model="giteaToken" type="password" class="flex-1 min-w-0" placeholder="Token" autocomplete="off" @blur="saveGiteaToken" />
            <Button variant="link" label="Create token" class="text-xs text-rm-accent p-0 min-w-0 h-auto shrink-0" @click="openGiteaTokenUrl" />
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
  giteaUrl,
  giteaToken,
  saveGiteaUrl,
  saveGiteaToken,
  openUrl,
} = ctx;
const openCloneFromGit = inject('openCloneFromGit', null);

function openGiteaTokenUrl() {
  const base = (giteaUrl.value || 'https://gitea.com').replace(/\/+$/, '');
  openUrl(base + '/user/settings/applications');
}
</script>
