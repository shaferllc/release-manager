<template>
  <div class="detail-dashboard detail-tab-panel" data-detail-tab="dashboard">
    <DetailDashboardOverview :info="info" :uncommitted-count="uncommittedCount" :has-uncommitted="hasUncommitted" />

    <!-- Quick actions -->
    <div v-if="tabs.length" class="dashboard-section">
      <h3 class="dashboard-section-title">Quick actions</h3>
      <div class="dashboard-actions-grid">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="action-card"
          :aria-label="`Go to ${tab.label}`"
          @click="goTo(tab.id)"
        >
          <span v-if="tab.icon" class="action-card-icon" v-html="tab.icon" aria-hidden="true"></span>
          <span class="action-card-label">{{ tab.label }}</span>
          <svg class="action-card-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>

    <!-- Project info -->
    <div class="dashboard-section mt-5">
      <h3 class="dashboard-section-title">Project info</h3>
      <div class="dashboard-info-grid">
        <div v-if="info?.projectType" class="info-item">
          <span class="info-item-label">Type</span>
          <span class="info-item-value">{{ info.projectType }}</span>
        </div>
        <div v-if="info?.hasGit && info?.gitRemote" class="info-item">
          <span class="info-item-label">Remote</span>
          <span class="info-item-value font-mono text-xs truncate">{{ info.gitRemote }}</span>
        </div>
        <div v-if="info?.allTags?.length" class="info-item">
          <span class="info-item-label">Tags</span>
          <span class="info-item-value">{{ info.allTags.length }} tag{{ info.allTags.length === 1 ? '' : 's' }}</span>
        </div>
        <div v-if="info?.hasComposer" class="info-item">
          <span class="info-item-label">Composer</span>
          <span class="info-item-value text-rm-success">Available</span>
        </div>
        <div class="info-item">
          <span class="info-item-label">Path</span>
          <span class="info-item-value font-mono text-xs truncate" :title="info?.path">{{ shortPath }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import DetailDashboardOverview from './DetailDashboardOverview.vue';
import { useAppStore } from '../../stores/app';

const props = defineProps({
  info: { type: Object, default: null },
  tabs: { type: Array, default: () => [] },
});

const store = useAppStore();

const uncommittedCount = computed(() => (props.info?.uncommittedLines || []).length);
const hasUncommitted = computed(() => uncommittedCount.value > 0);
const shortPath = computed(() => {
  const p = props.info?.path || '';
  return p.replace(/^\/Users\/[^/]+/, '~');
});

function goTo(tabId) {
  store.setDetailTab(tabId);
}
</script>

<style scoped>
.dashboard-section-title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--rm-muted));
  margin: 0 0 0.75rem 0;
}

.dashboard-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 0.5rem;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgb(var(--rm-border));
  background: rgb(var(--rm-surface) / 0.3);
  color: rgb(var(--rm-text));
  cursor: pointer;
  transition: all 0.12s ease;
  text-align: left;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
}
.action-card:hover {
  background: rgb(var(--rm-surface-hover) / 0.5);
  border-color: rgb(var(--rm-accent) / 0.3);
}
.action-card:active {
  transform: scale(0.98);
}
.action-card-icon {
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--rm-accent));
  flex-shrink: 0;
}
.action-card-icon :deep(svg) {
  width: 16px;
  height: 16px;
}
.action-card-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.action-card-arrow {
  color: rgb(var(--rm-muted) / 0.4);
  flex-shrink: 0;
  transition: color 0.12s, transform 0.12s;
}
.action-card:hover .action-card-arrow {
  color: rgb(var(--rm-accent));
  transform: translateX(2px);
}

.dashboard-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 0.5rem;
}
.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgb(var(--rm-border) / 0.5);
  background: rgb(var(--rm-bg) / 0.5);
}
.info-item-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgb(var(--rm-muted));
  flex-shrink: 0;
}
.info-item-value {
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgb(var(--rm-text));
  min-width: 0;
}
</style>
