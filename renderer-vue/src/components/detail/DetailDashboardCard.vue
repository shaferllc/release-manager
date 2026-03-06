<template>
  <Card class="mb-4 detail-tab-panel detail-dashboard-card" data-detail-tab="dashboard">
    <template #content>
      <div class="card-section">
      <span class="card-label">Overview</span>
      <DetailDashboardOverview :info="info" :uncommitted-count="uncommittedCount" :has-uncommitted="hasUncommitted" />

      <span class="card-label block mb-3">Quick actions</span>
      <div class="detail-dashboard-actions flex flex-wrap gap-2">
        <Button
          v-for="tab in tabs"
          :key="tab.id"
          severity="secondary"
          size="small"
          class="text-xs inline-flex items-center gap-x-1.5"
          v-tooltip.top="`Go to ${tab.label} tab`"
          :aria-label="`Go to ${tab.label} tab`"
          @click="goTo(tab.id)"
        >
          <span v-if="tab.icon" class="detail-dashboard-tab-icon shrink-0" v-html="tab.icon" aria-hidden="true"></span>
          {{ tab.label }}
        </Button>
      </div>
    </div>
    </template>
  </Card>
</template>

<script setup>
import { computed } from 'vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import DetailDashboardOverview from './DetailDashboardOverview.vue';
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
</style>
