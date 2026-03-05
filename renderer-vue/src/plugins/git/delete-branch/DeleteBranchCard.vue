<template>
  <GitPanelCard :title="panelTitle" :icon="panelIcon">
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
          <Button v-if="b !== currentBranch" variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="del.startRename(b)">Rename</Button>
          <Button v-if="b !== currentBranch" variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-warning hover:underline" @click="del.deleteLocal(b)">Delete local</Button>
          <Button v-if="b !== currentBranch" variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-warning hover:underline" @click="del.deleteOnRemote(b)">Delete on remote</Button>
        </span>
      </li>
    </ul>
    <Message v-if="del.error" severity="warn" class="mt-2 text-xs">{{ del.error }}</Message>
  </GitPanelCard>
</template>

<script setup>
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import GitPanelCard from '../GitPanelCard.vue';
import { useDeleteBranch } from './useDeleteBranch.js';

defineProps({ currentBranch: { type: String, default: '' }, panelTitle: { type: String, default: 'Delete branch' }, panelIcon: { type: String, default: '' } });
const emit = defineEmits(['refresh']);
const del = useDeleteBranch({ onRefresh: () => emit('refresh') });
</script>
