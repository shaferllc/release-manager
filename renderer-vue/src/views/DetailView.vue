<template>
  <div class="detail-view-root flex flex-col min-w-0" :class="{ 'detail-view-root-coverage': store.detailTab === 'coverage' }">
    <div v-if="error" class="p-5 text-rm-warning text-sm">{{ error }}</div>
    <template v-else-if="info">
      <div
        class="detail-content w-full py-8 px-8 relative flex flex-col"
        :class="store.detailTab === 'coverage' ? 'detail-content-coverage' : 'flex-1 min-h-0'"
      >
        <DetailHeader :info="info" @remove="$emit('refresh')" />
        <div v-if="store.useDetailTabs" class="detail-tabs-bar mb-4 flex flex-wrap gap-1 border-b border-rm-border pb-2 shrink-0">
          <button
            v-for="tab in visibleTabs"
            :key="tab.id"
            type="button"
            class="detail-tab-btn inline-flex items-center gap-x-1.5 shrink-0 px-3 py-1.5 rounded-rm text-sm font-medium border border-transparent bg-transparent"
            :class="store.detailTab === tab.id ? 'text-rm-accent border-rm-accent/50 bg-rm-accent/10' : 'text-rm-muted hover:text-rm-text hover:bg-rm-surface/50'"
            @click="store.setDetailTab(tab.id)"
          >
            <span v-if="tab.icon" class="detail-tab-icon shrink-0" v-html="tab.icon" aria-hidden="true"></span>
            {{ tab.label }}
          </button>
        </div>
        <div
          class="detail-tab-panels flex flex-col"
          :class="store.detailTab === 'coverage' ? 'detail-tab-panels-coverage' : 'flex-1 min-h-0'"
        >
          <template v-if="store.detailTab === 'dashboard'">
            <DetailDashboardCard :info="info" :tabs="visibleTabs.filter((t) => t.id !== 'dashboard')" />
          </template>
          <template v-else-if="store.detailTab === 'git'">
            <DetailGitSection :info="info" @refresh="load" />
          </template>
          <template v-else-if="store.detailTab === 'version'">
            <DetailVersionCard :info="info" />
          </template>
          <template v-else-if="store.detailTab === 'composer'">
            <DetailComposerCard :info="info" />
          </template>
          <template v-else-if="store.detailTab === 'tests'">
            <DetailTestsCard :info="info" />
          </template>
          <template v-else-if="store.detailTab === 'coverage'">
            <DetailCoverageCard :info="info" />
          </template>
          <template v-else-if="store.detailTab === 'api'">
            <DetailApiCard :info="info" />
          </template>
          <template v-else-if="store.detailTab === 'pull-requests'">
            <DetailPullRequestsCard :info="info" @refresh="load" />
          </template>
          <template v-else-if="store.detailTab === 'wordpress'">
            <DetailWordPressCard :info="info" />
          </template>
          <template v-else-if="store.detailTab === 'processes'">
            <DetailProcessesCard :info="info" />
          </template>
          <template v-else-if="store.detailTab === 'email'">
            <DetailEmailCard />
          </template>
          <template v-else-if="store.detailTab === 'tunnels'">
            <DetailTunnelsCard />
          </template>
          <template v-else-if="store.detailTab === 'ftp'">
            <DetailFtpCard />
          </template>
          <template v-else-if="store.detailTab === 'ssh'">
            <DetailSshCard />
          </template>
        </div>
      </div>
    </template>
    <div v-else class="detail-loading flex flex-col items-center justify-center gap-3 py-12 text-rm-muted text-sm">
      <span class="detail-loading-spinner w-8 h-8 border-2 border-rm-border border-t-rm-accent rounded-full animate-spin" aria-hidden="true"></span>
      <span>Loading…</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from '../composables/useApi';
import { useFeatureFlags } from '../composables/useFeatureFlags';
import DetailHeader from '../components/detail/DetailHeader.vue';
import DetailDashboardCard from '../components/detail/DetailDashboardCard.vue';
import DetailVersionCard from '../components/detail/DetailVersionCard.vue';
import DetailGitSection from '../components/detail/DetailGitSection.vue';
import DetailComposerCard from '../components/detail/DetailComposerCard.vue';
import DetailTestsCard from '../components/detail/DetailTestsCard.vue';
import DetailCoverageCard from '../components/detail/DetailCoverageCard.vue';
import DetailApiCard from '../components/detail/DetailApiCard.vue';
import DetailPullRequestsCard from '../components/detail/DetailPullRequestsCard.vue';
import DetailWordPressCard from '../components/detail/DetailWordPressCard.vue';
import DetailProcessesCard from '../components/detail/DetailProcessesCard.vue';
import DetailEmailCard from '../components/detail/DetailEmailCard.vue';
import DetailTunnelsCard from '../components/detail/DetailTunnelsCard.vue';
import DetailFtpCard from '../components/detail/DetailFtpCard.vue';
import DetailSshCard from '../components/detail/DetailSshCard.vue';

defineEmits(['refresh']);

const store = useAppStore();
const api = useApi();
const { isTabEnabled } = useFeatureFlags();
const info = ref(null);
const error = ref(null);

const projectType = computed(() => (info.value?.projectType || '').toLowerCase());
const showTestsTab = computed(() => projectType.value === 'npm' || projectType.value === 'php');
const showCoverageTab = computed(() => projectType.value === 'npm' || projectType.value === 'php');

const tabIcons = {
  dashboard: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  git: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 15a3 3 0 0 0 6 0"/></svg>',
  version: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m4.9 4.9 2.8 2.8"/><path d="M2 12h4"/><path d="m4.9 19.1 2.8-2.8"/><path d="M12 18v4"/><path d="m19.1 19.1-2.8-2.8"/><path d="M22 12h-4"/><path d="m19.1 4.9-2.8 2.8"/><circle cx="12" cy="12" r="4"/></svg>',
  composer: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  tests: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2 1.33-2 0 0-2.77 2.24-5 5-5 1.66 0 3 1.35 3 3.02 0 1.33 2 1.33 2 0"/></svg>',
  coverage: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
  api: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d=\"M4 4h7v7H4z\"/><path d=\"M13 4h7v7h-7z\"/><path d=\"M4 13h7v7H4z\"/><path d=\"M13 13h7v7h-7z\"/></svg>',
  pullRequests: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h5a2 2 0 0 1 2 2v7"/><path d="M6 9v6a2 2 0 0 0 2 2h7"/></svg>',
  wordpress: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/><path d="M8.5 9.5 12 17l2-4 2.5-5"/><path d="M7 14h10"/></svg>',
  processes: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="4" rx="1"/><rect x="2" y="10" width="20" height="4" rx="1"/><rect x="2" y="16" width="20" height="4" rx="1"/></svg>',
  email: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  tunnels: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/><circle cx="12" cy="12" r="3"/></svg>',
  ftp: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
  ssh: '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/></svg>',
};
const baseTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: tabIcons.dashboard },
  { id: 'git', label: 'Git', icon: tabIcons.git },
  { id: 'version', label: 'Version & release', icon: tabIcons.version },
  { id: 'pull-requests', label: 'Pull requests', icon: tabIcons.pullRequests },
  { id: 'processes', label: 'Dev stack', icon: tabIcons.processes },
  { id: 'email', label: 'Email', icon: tabIcons.email },
  { id: 'tunnels', label: 'Tunnels', icon: tabIcons.tunnels },
  { id: 'ftp', label: 'FTP', icon: tabIcons.ftp },
  { id: 'ssh', label: 'SSH', icon: tabIcons.ssh },
];
/* Tab visibility: feature flags only. When user enables a tab in Hidden options, it shows. License still gates in-tab features (e.g. AI, batch). */
const visibleTabs = computed(() => {
  const t = baseTabs.filter((tab) => isTabEnabled(tab.id));
  if (isTabEnabled('wordpress') && info.value?.hasWordPress) t.push({ id: 'wordpress', label: 'WordPress', icon: tabIcons.wordpress });
  if (isTabEnabled('composer') && info.value?.hasComposer) t.push({ id: 'composer', label: 'Composer', icon: tabIcons.composer });
  if (isTabEnabled('tests') && showTestsTab.value) t.push({ id: 'tests', label: 'Tests', icon: tabIcons.tests });
  if (isTabEnabled('coverage') && showCoverageTab.value) t.push({ id: 'coverage', label: 'Coverage', icon: tabIcons.coverage });
  if (isTabEnabled('api')) t.push({ id: 'api', label: 'API', icon: tabIcons.api });
  return t;
});

watch(visibleTabs, (tabs) => {
  const ids = tabs.map((t) => t.id);
  if (ids.length && !ids.includes(store.detailTab)) store.setDetailTab('dashboard');
}, { immediate: true });

async function load() {
  const path = store.selectedPath;
  if (!path) { info.value = null; error.value = null; return; }
  error.value = null;
  try {
    const result = await api.getProjectInfo?.(path);
    if (!result?.ok) {
      error.value = result?.error || 'Failed to load project info';
      info.value = null;
      return;
    }
    info.value = result;
  } catch (e) {
    error.value = e?.message || 'Failed to load project info';
    info.value = null;
  }
}

const AUTO_REFRESH_MS = 2000;
let autoRefreshTimer = null;

onMounted(() => {
  load();
  if (store.selectedPath) {
    autoRefreshTimer = setInterval(() => load(), AUTO_REFRESH_MS);
  }
});
watch(() => store.selectedPath, (path) => {
  load();
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = path ? setInterval(() => load(), AUTO_REFRESH_MS) : null;
});
onUnmounted(() => {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = null;
});
</script>

<style scoped>
.detail-tab-btn.is-active { @apply text-rm-accent border-rm-accent/50 bg-rm-accent/10; }
/* When on Coverage tab, let content grow so the main window scrolls to show full results */
.detail-view-root-coverage {
  min-height: min-content;
  flex-shrink: 0;
}
</style>
