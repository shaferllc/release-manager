<template>
  <section class="card mb-6 detail-tab-panel detail-dashboard-card" data-detail-tab="dashboard">
    <div class="card-section">
      <span class="card-label">Overview</span>
      <div class="detail-dashboard-summary flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-rm-muted mb-6">
        <span class="inline-flex items-center gap-1.5">
          <strong class="text-rm-text font-medium">Version</strong>
          <span class="font-mono text-rm-accent">{{ info?.version || '—' }}</span>
        </span>
        <span v-if="info?.hasGit" class="inline-flex items-center gap-1.5">
          <strong class="text-rm-text font-medium">Branch</strong>
          <span class="font-mono">{{ info?.branch || '—' }}</span>
          <span v-if="info?.aheadBehind" class="text-rm-muted">({{ info.aheadBehind }})</span>
        </span>
        <span v-if="hasUncommitted" class="inline-flex items-center gap-1.5 text-rm-warning">
          <strong class="text-rm-text font-medium">Uncommitted</strong>
          {{ uncommittedCount }} file(s)
        </span>
        <span v-if="(info?.commitsSinceLatestTag ?? 0) > 0" class="text-rm-muted">
          {{ info.commitsSinceLatestTag }} unreleased commit(s)
        </span>
      </div>

      <span class="card-label block mb-3">Quick actions</span>
      <div class="detail-dashboard-actions flex flex-wrap gap-2">
        <button
          type="button"
          class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5"
          @click="goTo('version')"
        >
          <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"/><path d="m4.9 4.9 2.8 2.8"/><path d="M2 12h4"/><path d="m4.9 19.1 2.8-2.8"/><path d="M12 18v4"/><path d="m19.1 19.1-2.8-2.8"/><path d="M22 12h-4"/><path d="m19.1 4.9-2.8 2.8"/><circle cx="12" cy="12" r="4"/></svg>
          Version & release
        </button>
        <button
          type="button"
          class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5"
          @click="goTo('git')"
        >
          <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 15a3 3 0 0 0 6 0"/></svg>
          Git
        </button>
        <button
          type="button"
          class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5"
          @click="goTo('sync')"
        >
          <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
          Sync & download
        </button>
        <button
          v-if="showTestsTab"
          type="button"
          class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5"
          @click="goTo('tests')"
        >
          <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2 1.33-2 0 0-2.77 2.24-5 5-5 1.66 0 3 1.35 3 3.02 0 1.33 2 1.33 2 0"/></svg>
          Tests
        </button>
        <button
          v-if="showCoverageTab"
          type="button"
          class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5"
          @click="goTo('coverage')"
        >
          <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
          Coverage
        </button>
        <button
          v-if="info?.hasComposer"
          type="button"
          class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5"
          @click="goTo('composer')"
        >
          <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Composer
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useAppStore } from '../../stores/app';

const props = defineProps({ info: { type: Object, default: null } });

const store = useAppStore();

const projectType = computed(() => (props.info?.projectType || '').toLowerCase());
const showTestsTab = computed(() => projectType.value === 'npm' || projectType.value === 'php');
const showCoverageTab = computed(() => projectType.value === 'npm' || projectType.value === 'php');

const uncommittedCount = computed(() => (props.info?.uncommittedLines || []).length);
const hasUncommitted = computed(() => uncommittedCount.value > 0);

function goTo(tabId) {
  store.setDetailTab(tabId);
}
</script>
