<template>
  <section v-show="activeSection === 'azureDevOps'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('azureDevOps')" />
    <div class="settings-section-card">
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
        <div class="block pb-4">
          <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Add from Azure DevOps</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Browse your repositories across all projects to clone and add.</p>
        </div>
        <Button label="Clone from Azure DevOps" icon="pi pi-microsoft" size="small" @click="openCloneFromGit?.('azure-devops')" />
      </div>
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5">
        <div class="block">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Organization</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Your Azure DevOps organization name (e.g. from dev.azure.com/your-org).</p>
          <InputText v-model="azureDevOpsOrg" type="text" class="max-w-md mt-2" placeholder="my-organization" @blur="saveAzureDevOpsOrg" />
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Personal access token</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">PAT with Code (Read) scope for listing repositories.</p>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <InputText v-model="azureDevOpsToken" type="password" class="flex-1 min-w-0" placeholder="PAT" autocomplete="off" @blur="saveAzureDevOpsToken" />
            <Button variant="link" label="Create PAT" class="text-xs text-rm-accent p-0 min-w-0 h-auto shrink-0" @click="openUrl('https://dev.azure.com/_usersSettings/tokens')" />
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
  azureDevOpsOrg,
  azureDevOpsToken,
  saveAzureDevOpsOrg,
  saveAzureDevOpsToken,
  openUrl,
} = ctx;
const openCloneFromGit = inject('openCloneFromGit', null);
</script>
