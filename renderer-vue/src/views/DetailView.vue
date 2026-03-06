<template>
  <div class="detail-view-root flex flex-col min-w-0" :class="{ 'detail-view-root-coverage': store.detailTab === 'coverage' }">
    <Message v-if="error" severity="warn" class="m-4">{{ error }}</Message>
    <template v-else-if="info">
      <div
        class="detail-content w-full py-8 px-8 relative flex flex-col"
        :class="store.detailTab === 'coverage' ? 'detail-content-coverage' : 'flex-1 min-h-0'"
      >
        <DetailHeader :info="info" @remove="$emit('refresh')" />
        <div v-if="store.useDetailTabs" class="detail-tabs-bar flex flex-wrap gap-1 shrink-0 mb-6">
          <template v-for="(tab, index) in visibleTabs" :key="tab.id">
            <div
              v-if="dropTargetIndex === index && draggedTabId"
              class="detail-tab-drop-indicator w-0.5 h-6 rounded-full bg-rm-accent shrink-0"
              aria-hidden="true"
            />
            <Button
              variant="text"
              size="small"
              draggable="true"
              class="detail-tab-btn inline-flex items-center gap-x-1.5 shrink-0 px-3 py-1.5 rounded-rm text-sm font-medium min-w-0 border"
              :class="[store.detailTab === tab.id ? 'text-rm-accent border-rm-accent/50 bg-rm-accent/10' : 'text-rm-muted hover:text-rm-text hover:bg-rm-surface/50 border-transparent', draggedTabId === tab.id ? 'opacity-50' : '']"
              :data-tab-id="tab.id"
              :aria-label="`${tab.label} tab. Drag to reorder.`"
              @click="store.setDetailTab(tab.id)"
              @dragstart="onTabDragStart($event, tab.id)"
              @dragover.prevent="onTabDragOver($event, index)"
              @dragenter="onTabDragEnter(index)"
              @drop.prevent="onTabDrop(index)"
              @dragend="onTabDragEnd"
            >
              <span v-if="tab.icon" class="detail-tab-icon shrink-0" v-html="tab.icon" aria-hidden="true"></span>
              {{ tab.label }}
            </Button>
          </template>
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
          <template v-else-if="extensionComponent">
            <component :is="extensionComponent" :info="info" />
          </template>
        </div>
      </div>
    </template>
    <div v-else class="detail-loading flex flex-col items-center justify-center gap-3 py-12 text-rm-muted text-sm">
      <ProgressSpinner aria-hidden="true" class="!w-8 !h-8" />
      <span>Loading…</span>
    </div>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import DetailHeader from '../components/detail/DetailHeader.vue';
import DetailDashboardCard from '../components/detail/DetailDashboardCard.vue';
import DetailVersionCard from '../components/detail/DetailVersionCard.vue';
import DetailGitSection from '../components/detail/DetailGitSection.vue';
import DetailComposerCard from '../components/detail/DetailComposerCard.vue';
import DetailTestsCard from '../components/detail/DetailTestsCard.vue';
import DetailCoverageCard from '../components/detail/DetailCoverageCard.vue';
import DetailApiCard from '../components/detail/DetailApiCard.vue';
import DetailPullRequestsCard from '../components/detail/DetailPullRequestsCard.vue';
import { useDetailView } from '../composables/useDetailView';
import { useFeatureFlags } from '../composables/useFeatureFlags';
import { getDetailTabExtension } from '../extensions/registry';
import { computed, ref } from 'vue';

defineEmits(['refresh']);

const { store, info, error, visibleTabs, load, setDetailTabOrder } = useDetailView();
const { isTabEnabled } = useFeatureFlags();
const draggedTabId = ref(null);
const dropTargetIndex = ref(null);

const extensionComponent = computed(() => {
  const ext = getDetailTabExtension(store.detailTab);
  if (!ext) return null;
  const flagId = ext.featureFlagId ?? ext.id;
  if (!isTabEnabled(flagId)) return null;
  return ext.component;
});

function onTabDragStart(event, tabId) {
  draggedTabId.value = tabId;
  dropTargetIndex.value = null;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', tabId);
  event.dataTransfer.setData('application/x-detail-tab-id', tabId);
}

function onTabDragEnter(index) {
  dropTargetIndex.value = index;
}

function onTabDragOver(event, index) {
  if (!draggedTabId.value) return;
  event.dataTransfer.dropEffect = 'move';
  dropTargetIndex.value = index;
}

function onTabDragEnd() {
  draggedTabId.value = null;
  dropTargetIndex.value = null;
}

function onTabDrop(dropIndex) {
  const tabId = draggedTabId.value;
  onTabDragEnd();
  if (!tabId || !setDetailTabOrder) return;
  const ids = visibleTabs.value.map((t) => t.id);
  const fromIndex = ids.indexOf(tabId);
  if (fromIndex === -1) return;
  const newIds = [...ids];
  newIds.splice(fromIndex, 1);
  const insertIndex = dropIndex > fromIndex ? dropIndex - 1 : dropIndex;
  newIds.splice(insertIndex, 0, tabId);
  setDetailTabOrder(newIds);
}
</script>

<style scoped>
.detail-tab-btn.is-active { @apply text-rm-accent border-rm-accent/50 bg-rm-accent/10; }
/* When on Coverage tab, let content grow so the main window scrolls to show full results */
.detail-view-root-coverage {
  min-height: min-content;
  flex-shrink: 0;
}
</style>
