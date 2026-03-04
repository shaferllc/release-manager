<template>
  <div class="git-card">
    <RmCardHeader tag="p" class="mb-2">Tags</RmCardHeader>
    <div class="flex flex-wrap gap-2 mb-3">
      <RmButton variant="primary" size="compact" class="text-xs" @click="openCreateTagModal">Create tag</RmButton>
    </div>
    <ul v-if="tags.length" class="list-none m-0 p-0 space-y-1 text-sm max-h-48 overflow-y-auto">
      <li v-for="t in tags" :key="t" class="flex items-center justify-between gap-2 py-1 border-b border-rm-border">
        <span class="truncate text-rm-text font-mono">{{ t }}</span>
        <span class="flex gap-1 shrink-0">
          <button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0" @click="pushTag(t)">Push</button>
          <button type="button" class="text-xs text-rm-warning hover:underline border-none bg-transparent cursor-pointer p-0" @click="deleteTag(t)">Delete</button>
        </span>
      </li>
    </ul>
    <p v-else class="m-0 text-xs text-rm-muted">No tags.</p>
    <p v-if="error" class="m-0 mt-2 text-xs text-rm-warning">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { RmButton, RmCardHeader } from '../../ui';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';
import { useModals } from '../../../composables/useModals';

const emit = defineEmits(['refresh']);
const store = useAppStore();
const api = useApi();
const modals = useModals();
const tags = ref([]);
const error = ref('');

async function load() {
  const path = store.selectedPath;
  if (!path || !api.getTags) return;
  error.value = '';
  try {
    const r = await api.getTags(path);
    tags.value = r?.ok ? (r.tags || []) : [];
  } catch {
    tags.value = [];
  }
}

watch(() => store.selectedPath, load, { immediate: true });

function openCreateTagModal() {
  const path = store.selectedPath;
  if (!path) return;
  modals.openModal('createTag', {
    dirPath: path,
    onCreated: () => {
      load();
    },
  });
}

async function pushTag(tagName) {
  const path = store.selectedPath;
  if (!path || !api.pushTag) return;
  error.value = '';
  try {
    await api.pushTag(path, tagName, 'origin');
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Push failed.';
  }
}

async function deleteTag(tagName) {
  const path = store.selectedPath;
  if (!path || !api.deleteTag) return;
  if (!window.confirm(`Delete tag ${tagName}?`)) return;
  error.value = '';
  try {
    await api.deleteTag(path, tagName);
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Delete failed.';
  }
}
</script>
