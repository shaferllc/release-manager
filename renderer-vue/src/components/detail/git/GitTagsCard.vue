<template>
  <div class="git-card">
    <p class="card-label mb-2">Tags</p>
    <div class="flex flex-wrap gap-2 mb-3">
      <Button severity="primary" size="small" class="text-xs" @click="openCreateTagModal">Create tag</Button>
    </div>
    <Panel class="tags-list border-rm-border">
      <template #header>
        <span class="text-sm font-semibold text-rm-text">{{ tags.tags.length }} tag{{ tags.tags.length === 1 ? '' : 's' }}</span>
      </template>
      <ul v-if="tags.tags.length" class="list-none m-0 p-0 space-y-1 text-sm max-h-48 overflow-y-auto">
        <li v-for="t in tags.tags" :key="t" class="flex items-center justify-between gap-2 py-1 border-b border-rm-border">
          <span class="truncate text-rm-text font-mono">{{ t }}</span>
          <span class="flex gap-1 shrink-0">
            <Button
              variant="text"
              size="small"
              class="text-xs text-rm-accent hover:underline !p-0 min-w-0"
              @click="tags.pushTag(t)"
            >
              Push
            </Button>
            <Button
              variant="text"
              size="small"
              class="text-xs text-rm-warning hover:underline !p-0 min-w-0"
              @click="tags.deleteTag(t)"
            >
              Delete
            </Button>
          </span>
        </li>
      </ul>
      <p v-else class="m-0 text-xs text-rm-muted">No tags.</p>
    </Panel>
    <p v-if="tags.error" class="m-0 mt-2 text-xs text-rm-warning">{{ tags.error }}</p>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import Panel from 'primevue/panel';
import { useAppStore } from '../../../stores/app';
import { useModals } from '../../../composables/useModals';
import { useTags } from '../../../composables/useTags';

const emit = defineEmits(['refresh']);
const store = useAppStore();
const modals = useModals();
const tags = useTags({ onRefresh: () => emit('refresh') });

function openCreateTagModal() {
  const path = store.selectedPath;
  if (!path) return;
  modals.openModal('createTag', {
    dirPath: path,
    onCreated: () => {
      tags.load();
    },
  });
}
</script>
