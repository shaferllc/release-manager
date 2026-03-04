<template>
  <div class="git-card">
    <p class="card-label mb-2">Delete branch</p>
    <p class="text-xs text-rm-muted mb-2">Rename or delete local branches. Cannot delete current branch.</p>
    <div v-if="del.branchToRename" class="flex gap-2 mb-3">
      <InputText v-model="del.renameNewName" type="text" class="flex-1 text-sm" placeholder="New name" />
      <Button severity="primary" size="small" class="text-xs" @click="del.renameBranch">Rename</Button>
      <Button severity="secondary" size="small" class="text-xs" @click="del.cancelRename">Cancel</Button>
    </div>
    <ul v-else class="list-none m-0 p-0 space-y-1 text-sm max-h-48 overflow-y-auto">
      <li v-for="b in del.branches" :key="b" class="flex items-center justify-between gap-2 py-1 border-b border-rm-border">
        <span class="truncate font-mono" :class="{ 'text-rm-accent font-medium': b === currentBranch }">{{ b }}</span>
        <span class="flex gap-1 shrink-0">
          <button v-if="b !== currentBranch" type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0" @click="del.startRename(b)">Rename</button>
          <button v-if="b !== currentBranch" type="button" class="text-xs text-rm-warning hover:underline border-none bg-transparent cursor-pointer p-0" @click="del.deleteLocal(b)">Delete local</button>
          <button v-if="b !== currentBranch" type="button" class="text-xs text-rm-warning hover:underline border-none bg-transparent cursor-pointer p-0" @click="del.deleteOnRemote(b)">Delete on remote</button>
        </span>
      </li>
    </ul>
    <p v-if="del.error" class="m-0 mt-2 text-xs text-rm-warning">{{ del.error }}</p>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useDeleteBranch } from '../../../composables/useDeleteBranch';

defineProps({ currentBranch: { type: String, default: '' } });
const emit = defineEmits(['refresh']);
const del = useDeleteBranch({ onRefresh: () => emit('refresh') });
</script>
