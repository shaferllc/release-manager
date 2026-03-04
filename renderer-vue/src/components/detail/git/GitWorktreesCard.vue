<template>
  <div class="git-card">
    <p class="card-label mb-2">Worktrees</p>
    <div class="flex flex-wrap gap-2 mb-3">
      <Button severity="primary" size="small" class="text-xs" @click="wt.openAddWorktreeModal">Add worktree</Button>
    </div>
    <ul v-if="wt.worktrees.length" class="list-none m-0 p-0 space-y-1 text-sm max-h-48 overflow-y-auto">
      <li v-for="w in wt.worktrees" :key="w.path" class="flex items-center justify-between gap-2 py-1 border-b border-rm-border">
        <span class="truncate text-rm-text" :title="w.path">{{ w.path }}</span>
        <span class="text-rm-muted text-xs shrink-0">{{ w.branch || w.head }}</span>
        <button type="button" class="text-xs text-rm-warning hover:underline border-none bg-transparent cursor-pointer p-0 shrink-0" @click="wt.remove(w.path)">Remove</button>
      </li>
    </ul>
    <p v-else class="m-0 text-xs text-rm-muted">No worktrees.</p>
    <p v-if="wt.error" class="m-0 mt-2 text-xs text-rm-warning">{{ wt.error }}</p>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import { useWorktrees } from '../../../composables/useWorktrees';

const emit = defineEmits(['refresh']);
const wt = useWorktrees({ onRefresh: () => emit('refresh') });
</script>
