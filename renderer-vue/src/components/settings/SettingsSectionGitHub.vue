<template>
  <section v-show="activeSection === 'github'" class="settings-section">
    <SettingsSectionHeader :meta="getSectionMeta('github')" />
    <div class="settings-section-card">
      <template v-if="!license.isLoggedIn?.value">
        <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6">
          <p class="text-sm text-rm-warning m-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 align-[-2px]"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            Sign in to view GitHub integration status.
          </p>
        </div>
      </template>
      <template v-else>
        <!-- Connection status -->
        <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-3 min-w-0">
              <span
                class="w-2.5 h-2.5 rounded-full shrink-0"
                :class="githubHealthLoading ? 'gh-status-checking' : githubHealth?.connected ? 'bg-rm-success shadow-[0_0_0_3px_rgb(var(--rm-success)/0.2)]' : 'bg-rm-danger shadow-[0_0_0_3px_rgb(var(--rm-danger)/0.2)]'"
              />
              <div class="min-w-0">
                <span class="text-[0.8125rem] font-semibold text-rm-text m-0 block">
                  {{ githubHealthLoading ? 'Checking…' : githubHealth?.connected ? 'Connected' : githubHealthError ? 'Error' : 'Not connected' }}
                </span>
                <p v-if="githubHealth?.username" class="text-sm text-rm-muted m-0 mt-0.5 flex items-center gap-1.5">
                  <img v-if="githubHealth.avatar_url" :src="githubHealth.avatar_url" alt="" class="w-[18px] h-[18px] rounded-full border border-rm-border object-cover" referrerpolicy="no-referrer" />
                  {{ githubHealth.username }}
                </p>
                <p v-if="githubHealthError && !githubHealthLoading" class="text-xs text-rm-danger m-0 mt-0.5">{{ githubHealthError }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <Button size="small" severity="secondary" :loading="githubHealthLoading" @click="fetchGitHubHealth">
                {{ githubHealthLoading ? 'Checking…' : 'Refresh' }}
              </Button>
              <Button size="small" severity="secondary" label="Open on web" @click="openGitHubStatusPage" />
            </div>
          </div>
        </div>

        <!-- Add from GitHub -->
        <div class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
          <div class="block pb-4">
            <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Add from GitHub</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Browse your repositories or search GitHub to clone and add a project.</p>
          </div>
          <Button label="Clone from GitHub" icon="pi pi-github" size="small" @click="openCloneFromGit?.('github')" />
        </div>

        <!-- Token status -->
        <div v-if="githubHealth" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6 mb-5">
          <div class="block pb-4">
            <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Token status</span>
            <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">OAuth token and scope information.</p>
          </div>
          <div class="space-y-3">
            <div class="flex items-center gap-2 text-sm">
              <span class="font-medium text-rm-text">Status:</span>
              <span
                class="inline-block text-[0.6875rem] font-semibold py-0.5 px-2 rounded-full leading-[1.4]"
                :class="githubHealth.token_status === 'valid' ? 'bg-rm-success/12 text-rm-success' : githubHealth.token_status === 'expired' ? 'bg-rm-warning/12 text-rm-warning' : 'bg-rm-danger/12 text-rm-danger'"
              >
                {{ githubHealth.token_status === 'valid' ? 'Valid' : githubHealth.token_status === 'expired' ? 'Expired' : 'Missing' }}
              </span>
            </div>
            <div v-if="githubHealth.scopes?.length" class="text-sm">
              <span class="font-medium text-rm-text block mb-1.5">Scopes:</span>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="scope in githubHealth.scopes" :key="scope" class="inline-block text-[0.6875rem] font-medium font-mono py-0.5 px-[0.4375rem] rounded bg-rm-bg border border-rm-border text-rm-text">{{ scope }}</span>
              </div>
            </div>
            <div v-if="githubHealth.token_status === 'valid' && githubHealth.has_repo_scope === false" class="flex items-start gap-2 text-[0.8125rem] text-rm-warning py-2 px-3 rounded-md bg-rm-warning/6 border border-rm-warning/15">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              <span>Missing <code class="text-[0.75rem] font-semibold py-0 px-1 rounded bg-rm-warning/10">repo</code> scope — repository access may be limited.</span>
            </div>
          </div>
        </div>

        <!-- Linked repositories -->
        <div v-if="githubHealth?.projects?.length" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6">
          <div class="block pb-4">
            <div class="flex items-center justify-between gap-2">
              <div>
                <span class="text-[0.8125rem] font-semibold text-rm-text block mb-1">Linked repositories</span>
                <p class="text-[0.8125rem] text-rm-muted mt-1 leading-[1.4] m-0">Projects with a connected GitHub repository.</p>
              </div>
              <span v-if="githubHealth.stale_projects" class="text-xs text-rm-warning font-medium">{{ githubHealth.stale_projects }} stale</span>
            </div>
          </div>
          <table class="w-full border-collapse text-[0.8125rem] [&_thead_th]:text-left [&_thead_th]:py-1.5 [&_thead_th]:px-2 [&_thead_th]:py-1.5 [&_thead_th]:pr-0 [&_thead_th]:text-[0.6875rem] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-wider [&_thead_th]:text-rm-muted [&_thead_th]:border-b [&_thead_th]:border-rm-border [&_tbody_tr]:border-b [&_tbody_tr]:border-rm-border/40 [&_tbody_tr:last-child]:border-b-0 [&_tbody_td]:py-2 [&_tbody_td]:px-2 [&_tbody_td]:pr-0 [&_tbody_td]:align-middle">
            <thead>
              <tr>
                <th>Project</th>
                <th>Repository</th>
                <th>Last sync</th>
                <th class="w-12 text-center">Health</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="proj in githubHealth.projects" :key="proj.name">
                <td class="font-medium text-rm-text max-w-40 overflow-hidden text-ellipsis whitespace-nowrap">{{ proj.name }}</td>
                <td class="font-mono text-[0.75rem] text-rm-muted max-w-56 overflow-hidden text-ellipsis whitespace-nowrap">{{ proj.github_repo || '—' }}</td>
                <td class="text-[0.75rem] text-rm-muted whitespace-nowrap">{{ proj.synced_at ? formatGitHubSyncTime(proj.synced_at) : 'Never' }}</td>
                <td class="text-center">
                  <span
                    class="inline-block w-2 h-2 rounded-full"
                    :class="proj.health === 'healthy' ? 'bg-rm-success shadow-[0_0_0_2px_rgb(var(--rm-success)/0.2)]' : proj.health === 'stale' ? 'bg-rm-warning shadow-[0_0_0_2px_rgb(var(--rm-warning)/0.2)]' : 'bg-rm-danger shadow-[0_0_0_2px_rgb(var(--rm-danger)/0.2)]'"
                    :title="proj.health === 'healthy' ? 'Healthy' : proj.health === 'stale' ? 'Stale (>7 days)' : 'Never synced'"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="githubHealth && !githubHealth.projects?.length" class="bg-rm-surface border border-rm-border rounded-[10px] p-5 px-6">
          <p class="text-sm text-rm-muted m-0">No projects with linked GitHub repositories.</p>
        </div>
      </template>
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
  activeSection,
  license,
  githubHealth,
  githubHealthLoading,
  githubHealthError,
  fetchGitHubHealth,
  openGitHubStatusPage,
  formatGitHubSyncTime,
} = ctx;
const openCloneFromGit = inject('openCloneFromGit', null);
</script>
