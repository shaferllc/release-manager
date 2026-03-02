<template>
  <div class="git-card">
    <p class="card-label mb-2">Submodules</p>
    <button type="button" class="btn-primary btn-compact text-xs mb-3" @click="update">Update (init)</button>
    <ul v-if="submodules.length" class="list-none m-0 p-0 space-y-1 text-sm">
      <li v-for="s in submodules" :key="s.path" class="py-1 border-b border-rm-border/50">
        <span class="font-mono text-rm-text">{{ s.path }}</span>
        <span class="text-rm-muted text-xs ml-2">{{ s.sha }}</span>
      </li>
    </ul>
    <p v-else class="m-0 text-xs text-rm-muted">No submodules.</p>
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
const submodules = ref([]);
const error = ref('');

async function load() {
  const path = store.selectedPath;
  if (!path || !api.getSubmodules) return;
  error.value = '';
  try {
    const r = await api.getSubmodules(path);
    submodules.value = r?.ok ? (r.submodules || []) : [];
  } catch {
    submodules.value = [];
  }
}

watch(() => store.selectedPath, load, { immediate: true });

async function update() {
  const path = store.selectedPath;
  if (!path || !api.submoduleUpdate) return;
  error.value = '';
  try {
    await api.submoduleUpdate(path, true);
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Update failed.';
  }
}
</script>
