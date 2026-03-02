<template>
  <div class="git-card">
    <p class="card-label mb-2">Tags</p>
    <div class="flex flex-wrap gap-2 mb-3">
      <input v-model="newTagName" type="text" class="input-field flex-1 min-w-0 text-sm w-32" placeholder="Tag name" />
      <input v-model="newTagMessage" type="text" class="input-field flex-1 min-w-0 text-sm w-40" placeholder="Message (optional)" />
      <button type="button" class="btn-primary btn-compact text-xs" @click="createTag">Create tag</button>
    </div>
    <ul v-if="tags.length" class="list-none m-0 p-0 space-y-1 text-sm max-h-48 overflow-y-auto">
      <li v-for="t in tags" :key="t" class="flex items-center justify-between gap-2 py-1 border-b border-rm-border/50">
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
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';

const emit = defineEmits(['refresh']);
const store = useAppStore();
const api = useApi();
const tags = ref([]);
const error = ref('');
const newTagName = ref('');
const newTagMessage = ref('');

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

async function createTag() {
  const path = store.selectedPath;
  const name = newTagName.value?.trim();
  if (!path || !name || !api.createTag) return;
  error.value = '';
  try {
    await api.createTag(path, name, newTagMessage.value?.trim() || undefined, undefined);
    newTagName.value = '';
    newTagMessage.value = '';
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Create tag failed.';
  }
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
