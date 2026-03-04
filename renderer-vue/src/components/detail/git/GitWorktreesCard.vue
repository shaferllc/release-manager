<template>
  <div class="git-card">
    <RmCardHeader tag="p" class="mb-2">Worktrees</RmCardHeader>
    <div class="flex flex-wrap gap-2 mb-3">
      <RmButton variant="primary" size="compact" class="text-xs" @click="openAddWorktreeModal">Add worktree</RmButton>
    </div>
    <ul v-if="worktrees.length" class="list-none m-0 p-0 space-y-1 text-sm max-h-48 overflow-y-auto">
      <li v-for="w in worktrees" :key="w.path" class="flex items-center justify-between gap-2 py-1 border-b border-rm-border">
        <span class="truncate text-rm-text" :title="w.path">{{ w.path }}</span>
        <span class="text-rm-muted text-xs shrink-0">{{ w.branch || w.head }}</span>
        <button type="button" class="text-xs text-rm-warning hover:underline border-none bg-transparent cursor-pointer p-0 shrink-0" @click="remove(w.path)">Remove</button>
      </li>
    </ul>
    <p v-else class="m-0 text-xs text-rm-muted">No worktrees.</p>
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
const worktrees = ref([]);
const error = ref('');

async function load() {
  const path = store.selectedPath;
  if (!path || !api.getWorktrees) return;
  error.value = '';
  try {
    const r = await api.getWorktrees(path);
    worktrees.value = r?.ok ? (r.worktrees || []) : [];
  } catch {
    worktrees.value = [];
  }
}

watch(() => store.selectedPath, load, { immediate: true });

function openAddWorktreeModal() {
  const path = store.selectedPath;
  if (!path) return;
  modals.openModal('addWorktree', {
    dirPath: path,
    onAdded: () => {
      load();
    },
  });
}

async function remove(wtPath) {
  const path = store.selectedPath;
  if (!path || !api.worktreeRemove) return;
  if (!window.confirm(`Remove worktree ${wtPath}?`)) return;
  error.value = '';
  try {
    await api.worktreeRemove(path, wtPath);
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Remove failed.';
  }
}
</script>
