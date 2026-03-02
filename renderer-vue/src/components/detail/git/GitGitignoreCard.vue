<template>
  <div class="git-card">
    <p class="card-label mb-2">.gitignore</p>
    <textarea v-model="content" class="input-field w-full text-sm font-mono resize-y min-h-[12rem]" placeholder="No .gitignore or load failed"></textarea>
    <div class="flex gap-2 mt-2">
      <button type="button" class="btn-primary btn-compact text-xs" @click="save">Save</button>
      <button type="button" class="btn-secondary btn-compact text-xs" @click="load">Reload</button>
    </div>
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
const content = ref('');
const error = ref('');

async function load() {
  const path = store.selectedPath;
  if (!path || !api.getGitignore) return;
  error.value = '';
  try {
    const r = await api.getGitignore(path);
    content.value = (r?.ok && r.content != null) ? r.content : (typeof r === 'string' ? r : '');
  } catch {
    content.value = '';
  }
}

watch(() => store.selectedPath, load, { immediate: true });

async function save() {
  const path = store.selectedPath;
  if (!path || !api.writeGitignore) return;
  error.value = '';
  try {
    await api.writeGitignore(path, content.value);
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Save failed.';
  }
}
</script>
