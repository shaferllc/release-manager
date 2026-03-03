<template>
  <div class="git-card">
    <p class="card-label mb-2">Stash</p>
    <div class="flex flex-wrap gap-2 mb-3">
      <button type="button" class="btn-primary btn-compact text-xs" @click="stashPush">Stash</button>
      <button type="button" class="btn-secondary btn-compact text-xs" @click="stashPop">Pop</button>
    </div>
    <label class="checkbox-label text-xs text-rm-muted cursor-pointer flex items-center gap-2 mb-2">
      <input v-model="includeUntracked" type="checkbox" class="checkbox-input" />
      <span>Include untracked</span>
    </label>
    <label class="checkbox-label text-xs text-rm-muted cursor-pointer flex items-center gap-2 mb-3">
      <input v-model="keepIndex" type="checkbox" class="checkbox-input" />
      <span>Keep index</span>
    </label>
    <ul v-if="entries.length" class="list-none m-0 p-0 space-y-1 text-sm">
      <li v-for="e in entries" :key="e.index" class="flex items-center justify-between gap-2 py-1 border-b border-rm-border/50">
        <span class="truncate text-rm-text" :title="e.message">{{ e.index }} {{ e.message }}</span>
        <span class="flex gap-1 shrink-0">
          <button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0" @click="stashApply(e.index)">Apply</button>
          <button type="button" class="text-xs text-rm-warning hover:underline border-none bg-transparent cursor-pointer p-0" @click="stashDrop(e.index)">Drop</button>
        </span>
      </li>
    </ul>
    <p v-else class="m-0 text-xs text-rm-muted">No stashes.</p>
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
const entries = ref([]);
const error = ref('');
const includeUntracked = ref(false);
const keepIndex = ref(false);

async function load() {
  const path = store.selectedPath;
  if (!path || !api.getStashList) {
    entries.value = [];
    error.value = '';
    return;
  }
  error.value = '';
  try {
    const r = await api.getStashList(path);
    if (r?.ok) {
      entries.value = r.entries || [];
    } else {
      entries.value = [];
      error.value = r?.error || 'Failed to load stash list';
    }
  } catch (e) {
    entries.value = [];
    error.value = e?.message || 'Failed to load stash list';
  }
}

watch(() => store.selectedPath, load, { immediate: true });

async function stashPush() {
  const path = store.selectedPath;
  if (!path || !api.gitStashPush) return;
  const msgRaw = window.prompt('Stash message (optional)');
  if (msgRaw === null) return; // user cancelled
  const msg = (msgRaw || '').trim();
  error.value = '';
  try {
    const result = await api.gitStashPush(path, msg, { includeUntracked: includeUntracked.value, keepIndex: keepIndex.value });
    if (result?.ok) {
      emit('refresh');
      load();
    } else {
      error.value = result?.error || 'Stash failed.';
    }
  } catch (e) {
    error.value = e?.message || 'Stash failed.';
  }
}

async function stashPop() {
  const path = store.selectedPath;
  if (!path || !api.gitStashPop) return;
  if (!window.confirm('Pop top stash?')) return;
  error.value = '';
  try {
    const result = await api.gitStashPop(path);
    if (result?.ok) {
      emit('refresh');
      load();
    } else {
      error.value = result?.error || 'Pop failed.';
    }
  } catch (e) {
    error.value = e?.message || 'Pop failed.';
  }
}

async function stashApply(index) {
  const path = store.selectedPath;
  if (!path || !api.stashApply) return;
  error.value = '';
  try {
    const result = await api.stashApply(path, index);
    if (result?.ok) {
      emit('refresh');
      load();
    } else {
      error.value = result?.error || 'Apply failed.';
    }
  } catch (e) {
    error.value = e?.message || 'Apply failed.';
  }
}

async function stashDrop(index) {
  const path = store.selectedPath;
  if (!path || !api.stashDrop) return;
  if (!window.confirm(`Drop stash ${index}?`)) return;
  error.value = '';
  try {
    const result = await api.stashDrop(path, index);
    if (result?.ok) {
      load();
      emit('refresh');
    } else {
      error.value = result?.error || 'Drop failed.';
    }
  } catch (e) {
    error.value = e?.message || 'Drop failed.';
  }
}
</script>
