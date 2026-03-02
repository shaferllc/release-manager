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
          class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5 tooltip-btn"
          @click="goTo('version')"
        >
          <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"/><path d="m4.9 4.9 2.8 2.8"/><path d="M2 12h4"/><path d="m4.9 19.1 2.8-2.8"/><path d="M12 18v4"/><path d="m19.1 19.1-2.8-2.8"/><path d="M22 12h-4"/><path d="m19.1 4.9-2.8 2.8"/><circle cx="12" cy="12" r="4"/></svg>
          Version & release
          <span class="tooltip-bubble">Go to Version &amp; release tab</span>
        </button>
        <button
          type="button"
          class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5 tooltip-btn"
          @click="goTo('git')"
        >
          <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 15a3 3 0 0 0 6 0"/></svg>
          Git
          <span class="tooltip-bubble">Go to Git tab</span>
        </button>
        <button
          v-if="showTestsTab"
          type="button"
          class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5 tooltip-btn"
          @click="goTo('tests')"
        >
          <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2 1.33-2 0 0-2.77 2.24-5 5-5 1.66 0 3 1.35 3 3.02 0 1.33 2 1.33 2 0"/></svg>
          Tests
          <span class="tooltip-bubble">Go to Tests tab</span>
        </button>
        <button
          v-if="showCoverageTab"
          type="button"
          class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5 tooltip-btn"
          @click="goTo('coverage')"
        >
          <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
          Coverage
          <span class="tooltip-bubble">Go to Coverage tab</span>
        </button>
        <button
          type="button"
          class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5 tooltip-btn"
          @click="goTo('api')"
        >
          <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h7v7H4z"/><path d="M13 4h7v7h-7z"/><path d="M4 13h7v7H4z"/><path d="M13 13h7v7h-7z"/></svg>
          API
          <span class="tooltip-bubble">Go to API tab</span>
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

<style scoped>
.tooltip-btn { position: relative; }
.tooltip-bubble {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 6px;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.95);
  color: #e5e7eb;
  font-size: 10px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform-origin: top center;
  transition: opacity 0.12s ease, transform 0.12s ease;
  z-index: 40;
}
.tooltip-btn:hover .tooltip-bubble {
  opacity: 1;
  transform: translateX(-50%) translateY(2px);
}
</style>
