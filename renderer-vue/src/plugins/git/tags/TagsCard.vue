<template>
  <GitPanelCard :title="panelTitle" :icon="panelIcon">
    <template #header-right>
      <span class="text-xs text-rm-muted tabular-nums">{{ tags.tags.length }} tag{{ tags.tags.length === 1 ? '' : 's' }}</span>
    </template>
    <div class="flex flex-wrap gap-2 mb-2">
      <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="openCreateTagModal">+ New tag</Button>
    </div>
    <ul v-if="tags.tags.length" class="list-none m-0 p-0 space-y-1 text-xs max-h-48 overflow-y-auto text-rm-muted">
      <li v-for="t in tags.tags" :key="t" class="flex items-center justify-between gap-2 py-0.5 border-b border-rm-border last:border-b-0">
        <span class="truncate text-rm-text font-mono">{{ t }}</span>
        <span class="flex gap-1 shrink-0">
          <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="tags.pushTag(t)">Push</Button>
          <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-warning hover:underline" @click="tags.deleteTag(t)">Delete</Button>
        </span>
      </li>
    </ul>
    <p v-else class="m-0 text-xs text-rm-muted">No tags.</p>
    <Message v-if="tags.error" severity="warn" class="mt-2 text-xs">{{ tags.error }}</Message>
  </GitPanelCard>
</template>

<script setup>
import Button from 'primevue/button';
import Message from 'primevue/message';
import GitPanelCard from '../GitPanelCard.vue';
import { useAppStore } from '../../../stores/app';
import { useModals } from '../../../composables/useModals';
import { useTags } from './useTags.js';

defineProps({ panelTitle: { type: String, default: 'Tags' }, panelIcon: { type: String, default: '' } });
const emit = defineEmits(['refresh']);
const store = useAppStore();
const modals = useModals();
const tags = useTags({ onRefresh: () => emit('refresh') });

function openCreateTagModal() {
  const path = store.selectedPath;
  if (!path) return;
  modals.openModal('createTag', {
    dirPath: path,
    onCreated: () => tags.load(),
  });
}
</script>
