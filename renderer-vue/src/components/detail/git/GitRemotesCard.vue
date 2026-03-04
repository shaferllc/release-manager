<template>
  <div class="git-card">
    <p class="card-label mb-2">Remotes</p>
    <div class="flex flex-wrap gap-2 mb-3">
      <InputText v-model="remotes.newName" type="text" class="text-sm w-24" placeholder="Name" />
      <InputText v-model="remotes.newUrl" type="text" class="flex-1 min-w-0 text-sm" placeholder="URL" />
      <Button severity="primary" size="small" class="text-xs" @click="remotes.addRemote">Add</Button>
    </div>
    <ul v-if="remotes.remotes.length" class="list-none m-0 p-0 space-y-1 text-sm">
      <li v-for="r in remotes.remotes" :key="r.name" class="flex items-center justify-between gap-2 py-1 border-b border-rm-border">
        <span class="font-medium text-rm-text shrink-0">{{ r.name }}</span>
        <span class="truncate text-rm-muted text-xs min-w-0" :title="r.url">{{ r.url }}</span>
        <span class="flex items-center gap-1 shrink-0">
          <button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0" title="Rename this remote" @click="remotes.rename(r)">Rename</button>
          <span class="text-rm-border">|</span>
          <button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0" title="Change remote URL" @click="remotes.changeUrl(r)">Change URL</button>
          <span class="text-rm-border">|</span>
          <button type="button" class="text-xs text-rm-warning hover:underline border-none bg-transparent cursor-pointer p-0" title="Remove this remote" @click="remotes.remove(r.name)">Remove</button>
        </span>
      </li>
    </ul>
    <p v-else class="m-0 text-xs text-rm-muted">No remotes.</p>
    <p v-if="remotes.error" class="m-0 mt-2 text-xs text-rm-warning">{{ remotes.error }}</p>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useRemotes } from '../../../composables/useRemotes';

const emit = defineEmits(['refresh']);
const remotes = useRemotes({ onRefresh: () => emit('refresh') });
</script>
