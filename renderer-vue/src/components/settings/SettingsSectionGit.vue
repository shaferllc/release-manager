<template>
  <section v-show="activeSection === 'git'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('git')" />
    <div class="settings-section-card">
      <!-- Identity -->
      <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-3">Identity</h4>
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5 mb-6">
        <div class="block">
          <span class="text-[0.8125rem] font-semibold text-rm-text">User name</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Your name for git commits (git config user.name).</p>
          <InputText v-model="gitUserName" type="text" class="max-w-sm mt-2" placeholder="Your Name" @blur="saveGitUserName" />
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Email address</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Your email for git commits (git config user.email).</p>
          <InputText v-model="gitUserEmail" type="email" class="max-w-sm mt-2" placeholder="you@example.com" @blur="saveGitUserEmail" />
        </div>
      </div>

      <!-- Commit signing -->
      <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-3">Commit Signing</h4>
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5 mb-6">
        <label class="block settings-row-clickable settings-row-checkbox">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Sign commits</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Use git commit -S when committing.</p>
          </div>
          <Checkbox v-model="signCommits" binary @update:model-value="saveSignCommits" class="shrink-0" />
        </label>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Signing format</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Choose between GPG (OpenPGP) or SSH key signing.</p>
          <Select v-model="gitGpgFormat" :options="gitGpgFormatOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveGitGpgFormat" />
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Signing key ID</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">GPG key ID or SSH key path used to sign commits.</p>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <InputText v-model="gitGpgKeyId" type="text" class="flex-1 min-w-0 max-w-sm" placeholder="e.g. 3AA5C34371567BD2" @blur="saveGitGpgKeyId" />
            <Button v-if="gitGpgFormat === 'openpgp'" label="Detect keys" size="small" severity="secondary" :loading="gpgKeysLoading" @click="loadGpgKeys" />
          </div>
        </div>
        <div v-if="gpgKeys.length" class="pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text text-sm mb-2 block">Available GPG keys</span>
          <div class="space-y-2">
            <div
              v-for="k in gpgKeys" :key="k.id"
              class="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
              :class="gitGpgKeyId === k.id ? 'bg-rm-accent/10 border border-rm-accent/30' : 'bg-rm-bg/50 border border-rm-border hover:border-rm-muted'"
              @click="gitGpgKeyId = k.id; saveGitGpgKeyId()"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 text-rm-muted"><path d="m21 2-2 2m-7.73 7.73A6.5 6.5 0 1 0 13.26 18H15v2h2v2h4v-4l-7.73-7.73Z"/></svg>
              <div class="min-w-0 flex-1">
                <span class="text-xs font-mono text-rm-text block truncate">{{ k.id }}</span>
                <span v-if="k.uids?.length" class="text-xs text-rm-muted truncate block">{{ k.uids[0] }}</span>
              </div>
              <span v-if="gitGpgKeyId === k.id" class="text-xs text-rm-accent font-medium shrink-0">Selected</span>
            </div>
          </div>
        </div>
        <p v-if="gpgKeysError" class="text-xs text-rm-danger mt-1">{{ gpgKeysError }}</p>
        <div v-if="gitGpgFormat === 'openpgp'" class="pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text text-sm">Generate new GPG key</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Creates an Ed25519 key using your name and email above. Expires in 2 years.</p>
          <div class="flex items-center gap-2 mt-2">
            <Button label="Generate GPG key" size="small" severity="secondary" :loading="gpgGenerating" :disabled="!gitUserName || !gitUserEmail" @click="generateGpgKey" />
          </div>
          <p v-if="gpgGenerateError" class="text-xs text-rm-danger mt-1">{{ gpgGenerateError }}</p>
        </div>
      </div>

      <!-- Repository defaults -->
      <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-3">Repository Defaults</h4>
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5 mb-6">
        <div class="block">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Default branch name</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Default branch to use when creating or referring to repos.</p>
          <InputText v-model="gitDefaultBranch" type="text" class="max-w-xs mt-2" placeholder="main" @blur="saveGitDefaultBranch" />
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Pull strategy</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">How to reconcile divergent branches on pull.</p>
          <Select v-model="gitPullRebase" :options="gitPullStrategyOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveGitPullRebase" />
        </div>
        <label class="block settings-row-clickable settings-row-checkbox pt-2 border-t border-rm-border">
          <div class="min-w-0">
            <span class="text-[0.8125rem] font-semibold text-rm-text block text-rm-text">Auto-stash before rebase</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0 text-sm text-rm-muted">Automatically stash uncommitted changes before rebasing, then pop after.</p>
          </div>
          <Checkbox v-model="gitAutoStash" binary @update:model-value="saveGitAutoStash" class="shrink-0" />
        </label>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Auto-fetch interval</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">How often to run git fetch in the background (0 = off).</p>
          <Select v-model="gitAutoFetchIntervalMinutes" :options="gitAutoFetchIntervalOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveGitAutoFetchInterval" />
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Commit message template (optional)</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Path to a file used as the default commit message template.</p>
          <InputText v-model="gitCommitTemplate" type="text" class="mt-2" placeholder="~/.gitmessage" @blur="saveGitCommitTemplate" />
        </div>
      </div>

      <!-- Tools & paths -->
      <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider mb-3">Tools &amp; Paths</h4>
      <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 space-y-5 mb-6">
        <div class="block">
          <span class="text-[0.8125rem] font-semibold text-rm-text">SSH key path (optional)</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Path to SSH private key for Git operations. Leave empty for default.</p>
          <InputText v-model="gitSshKeyPath" type="text" class="mt-2" placeholder="~/.ssh/id_rsa" @blur="saveGitSshKeyPath" />
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">Diff / merge tool (optional)</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">External diff or merge tool command (e.g. code --diff).</p>
          <InputText v-model="gitDiffTool" type="text" class="mt-2" placeholder="" @blur="saveGitDiffTool" />
        </div>
        <div class="block pt-2 border-t border-rm-border">
          <span class="text-[0.8125rem] font-semibold text-rm-text">GitHub token (default)</span>
          <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4]">Optional. Higher API limits and ability to create or update releases. Stored locally.</p>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <InputText v-model="githubToken" type="password" class="flex-1 min-w-0" placeholder="ghp_..." autocomplete="off" @blur="saveToken" />
            <Button variant="link" label="Create token" class="text-xs text-rm-accent p-0 min-w-0 h-auto shrink-0" @click="openUrl('https://github.com/settings/tokens')" />
          </div>
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
  gitUserName,
  gitUserEmail,
  gitGpgFormat,
  gitGpgFormatOptions,
  gitGpgKeyId,
  gpgKeys,
  gpgKeysLoading,
  gpgKeysError,
  gpgGenerating,
  gpgGenerateError,
  signCommits,
  gitDefaultBranch,
  gitPullRebase,
  gitPullStrategyOptions,
  gitAutoStash,
  gitAutoFetchIntervalMinutes,
  gitAutoFetchIntervalOptions,
  gitCommitTemplate,
  gitSshKeyPath,
  gitDiffTool,
  githubToken,
  saveGitUserName,
  saveGitUserEmail,
  saveSignCommits,
  saveGitGpgFormat,
  saveGitGpgKeyId,
  saveGitDefaultBranch,
  saveGitPullRebase,
  saveGitAutoStash,
  saveGitAutoFetchInterval,
  saveGitCommitTemplate,
  saveGitSshKeyPath,
  saveGitDiffTool,
  saveToken,
  loadGpgKeys,
  generateGpgKey,
  openUrl,
} = ctx;
</script>
