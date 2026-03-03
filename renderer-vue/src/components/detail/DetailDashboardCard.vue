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
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5 tooltip-btn"
          :title="`Go to ${tab.label} tab`"
          @click="goTo(tab.id)"
        >
          <span v-if="tab.icon" class="detail-dashboard-tab-icon shrink-0" v-html="tab.icon" aria-hidden="true"></span>
          {{ tab.label }}
          <span class="tooltip-bubble">Go to {{ tab.label }} tab</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useAppStore } from '../../stores/app';

const props = defineProps({
  info: { type: Object, default: null },
  /** List of detail tabs (id, label, icon) to show as quick actions. Excludes dashboard. */
  tabs: { type: Array, default: () => [] },
});

const store = useAppStore();

const uncommittedCount = computed(() => (props.info?.uncommittedLines || []).length);
const hasUncommitted = computed(() => uncommittedCount.value > 0);

function goTo(tabId) {
  store.setDetailTab(tabId);
}
</script>

<style scoped>
.detail-dashboard-tab-icon :deep(svg) {
  width: 14px;
  height: 14px;
  vertical-align: middle;
}
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
