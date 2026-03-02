<template>
  <div class="git-card">
    <p class="card-label mb-2">Remotes</p>
    <div class="flex flex-wrap gap-2 mb-3">
      <input v-model="newName" type="text" class="input-field text-sm w-24" placeholder="Name" />
      <input v-model="newUrl" type="text" class="input-field flex-1 min-w-0 text-sm" placeholder="URL" />
      <button type="button" class="btn-primary btn-compact text-xs" @click="addRemote">Add</button>
    </div>
    <ul v-if="remotes.length" class="list-none m-0 p-0 space-y-1 text-sm">
      <li v-for="r in remotes" :key="r.name" class="flex items-center justify-between gap-2 py-1 border-b border-rm-border/50">
        <span class="font-medium text-rm-text shrink-0">{{ r.name }}</span>
        <span class="truncate text-rm-muted text-xs min-w-0" :title="r.url">{{ r.url }}</span>
        <span class="flex items-center gap-1 shrink-0">
          <button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0" title="Rename this remote" @click="rename(r)">Rename</button>
          <span class="text-rm-border">|</span>
          <button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0" title="Change remote URL" @click="changeUrl(r)">Change URL</button>
          <span class="text-rm-border">|</span>
          <button type="button" class="text-xs text-rm-warning hover:underline border-none bg-transparent cursor-pointer p-0" title="Remove this remote" @click="remove(r.name)">Remove</button>
        </span>
      </li>
    </ul>
    <p v-else class="m-0 text-xs text-rm-muted">No remotes.</p>
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
const remotes = ref([]);
const error = ref('');
const newName = ref('');
const newUrl = ref('');

async function load() {
  const path = store.selectedPath;
  if (!path || !api.getRemotes) return;
  error.value = '';
  try {
    const r = await api.getRemotes(path);
    remotes.value = r?.ok ? (r.remotes || []) : [];
  } catch {
    remotes.value = [];
  }
}

watch(() => store.selectedPath, load, { immediate: true });

async function addRemote() {
  const path = store.selectedPath;
  const name = newName.value?.trim();
  const url = newUrl.value?.trim();
  if (!path || !name || !url || !api.addRemote) return;
  error.value = '';
  try {
    await api.addRemote(path, name, url);
    newName.value = '';
    newUrl.value = '';
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Add remote failed.';
  }
}

async function remove(name) {
  const path = store.selectedPath;
  if (!path || !api.removeRemote) return;
  if (!window.confirm(`Remove remote ${name}?`)) return;
  error.value = '';
  try {
    await api.removeRemote(path, name);
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Remove failed.';
  }
}

async function rename(remote) {
  const path = store.selectedPath;
  if (!path || !api.renameRemote) return;
  const newName = window.prompt(`Rename remote "${remote.name}" to:`, remote.name);
  if (newName == null || newName.trim() === '' || newName.trim() === remote.name) return;
  error.value = '';
  try {
    const result = await api.renameRemote(path, remote.name, newName.trim());
    if (result?.error) {
      error.value = result.error;
      return;
    }
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Rename failed.';
  }
}

async function changeUrl(remote) {
  const path = store.selectedPath;
  if (!path || !api.setRemoteUrl) return;
  const newUrl = window.prompt(`New URL for remote "${remote.name}":`, remote.url);
  if (newUrl == null || newUrl.trim() === '') return;
  error.value = '';
  try {
    const result = await api.setRemoteUrl(path, remote.name, newUrl.trim());
    if (result?.error) {
      error.value = result.error;
      return;
    }
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Change URL failed.';
  }
}
</script>
