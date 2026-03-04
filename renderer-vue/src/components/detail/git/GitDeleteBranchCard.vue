<template>
  <div class="git-card">
    <RmCardHeader tag="p" class="mb-2">Delete branch</RmCardHeader>
    <p class="text-xs text-rm-muted mb-2">Rename or delete local branches. Cannot delete current branch.</p>
    <div v-if="branchToRename" class="flex gap-2 mb-3">
      <RmInput v-model="renameNewName" type="text" class="flex-1 text-sm" placeholder="New name" />
      <RmButton variant="primary" size="compact" class="text-xs" @click="renameBranch">Rename</RmButton>
      <RmButton variant="secondary" size="compact" class="text-xs" @click="branchToRename = null">Cancel</RmButton>
    </div>
    <ul v-else class="list-none m-0 p-0 space-y-1 text-sm max-h-48 overflow-y-auto">
      <li v-for="b in branches" :key="b" class="flex items-center justify-between gap-2 py-1 border-b border-rm-border">
        <span class="truncate font-mono" :class="{ 'text-rm-accent font-medium': b === currentBranch }">{{ b }}</span>
        <span class="flex gap-1 shrink-0">
          <button v-if="b !== currentBranch" type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0" @click="branchToRename = b; renameNewName = b">Rename</button>
          <button v-if="b !== currentBranch" type="button" class="text-xs text-rm-warning hover:underline border-none bg-transparent cursor-pointer p-0" @click="deleteLocal(b)">Delete local</button>
          <button v-if="b !== currentBranch" type="button" class="text-xs text-rm-warning hover:underline border-none bg-transparent cursor-pointer p-0" @click="deleteOnRemote(b)">Delete on remote</button>
        </span>
      </li>
    </ul>
    <p v-if="error" class="m-0 mt-2 text-xs text-rm-warning">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { RmButton, RmCardHeader, RmInput } from '../../ui';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';

const props = defineProps({ currentBranch: { type: String, default: '' } });
const emit = defineEmits(['refresh']);
const store = useAppStore();
const api = useApi();
const branches = ref([]);
const error = ref('');
const branchToRename = ref(null);
const renameNewName = ref('');

async function load() {
  const path = store.selectedPath;
  if (!path || !api.getBranches) return;
  error.value = '';
  try {
    const r = await api.getBranches(path);
    branches.value = Array.isArray(r) ? r : (r?.ok ? r.branches || [] : []);
  } catch {
    branches.value = [];
  }
}

watch(() => store.selectedPath, load, { immediate: true });

async function renameBranch() {
  const path = store.selectedPath;
  const oldName = branchToRename.value;
  const newName = renameNewName.value?.trim();
  if (!path || !oldName || !newName || oldName === newName || !api.renameBranch) return;
  error.value = '';
  try {
    await api.renameBranch(path, oldName, newName);
    branchToRename.value = null;
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Rename failed.';
  }
}

async function deleteLocal(branchName) {
  const path = store.selectedPath;
  if (!path || !api.deleteBranch) return;
  if (!window.confirm(`Delete local branch ${branchName}?`)) return;
  error.value = '';
  try {
    await api.deleteBranch(path, branchName, false);
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Delete failed.';
  }
}

async function deleteOnRemote(branchName) {
  const path = store.selectedPath;
  if (!path || !api.deleteRemoteBranch) return;
  if (!window.confirm(`Delete branch ${branchName} on remote origin?`)) return;
  error.value = '';
  try {
    await api.deleteRemoteBranch(path, 'origin', branchName);
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Delete failed.';
  }
}
</script>
