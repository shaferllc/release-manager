<template>
  <GitPanelCard :title="panelTitle" :icon="panelIcon">
    <template #header-right>
      <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="remotes.load(); emit('refresh')">Refresh</Button>
    </template>
    <div class="flex flex-wrap gap-2 mb-2">
      <InputText v-model="remotes.newName" type="text" class="text-xs w-20" placeholder="Name" />
      <InputText v-model="remotes.newUrl" type="text" class="flex-1 min-w-0 text-xs" placeholder="URL" />
      <Button variant="outlined" size="small" class="text-xs min-w-0 border-rm-accent/50 text-rm-accent" @click="remotes.addRemote">Add</Button>
    </div>
    <ul v-if="remotes.remotes.length" class="list-none m-0 p-0 space-y-0.5 text-xs">
      <li v-for="r in remotes.remotes" :key="r.name" class="flex items-center justify-between gap-2 py-0.5 border-b border-rm-border last:border-b-0">
        <span class="font-medium text-rm-text shrink-0">{{ r.name }}</span>
        <span class="truncate text-rm-muted min-w-0" :title="r.url">{{ r.url }}</span>
        <span class="flex items-center gap-1 shrink-0">
          <Button variant="text" size="small" class="p-0 min-w-0 text-rm-accent hover:underline" title="Rename" @click="remotes.rename(r)">Rename</Button>
          <span class="text-rm-border">|</span>
          <Button variant="text" size="small" class="p-0 min-w-0 text-rm-accent hover:underline" title="Change URL" @click="remotes.changeUrl(r)">URL</Button>
          <span class="text-rm-border">|</span>
          <Button variant="text" size="small" class="p-0 min-w-0 text-rm-warning hover:underline" title="Remove" @click="remotes.remove(r.name)">Remove</Button>
        </span>
      </li>
    </ul>
    <p v-else class="m-0 text-xs text-rm-muted">No remotes.</p>
    <Message v-if="remotes.error" severity="warn" class="mt-2 text-xs">{{ remotes.error }}</Message>
  </GitPanelCard>
</template>

<script setup>
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import GitPanelCard from '../GitPanelCard.vue';
import { useRemotes } from './useRemotes.js';

defineProps({ panelTitle: { type: String, default: 'Remotes' }, panelIcon: { type: String, default: '' } });
const emit = defineEmits(['refresh']);
const remotes = useRemotes({ onRefresh: () => emit('refresh') });
</script>
