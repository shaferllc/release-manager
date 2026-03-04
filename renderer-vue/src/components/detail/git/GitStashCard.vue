<template>
  <div class="git-card">
    <p class="card-label mb-2">Stash</p>
    <div class="flex flex-wrap gap-2 mb-3">
      <Button severity="primary" size="small" class="text-xs" @click="stash.stashPush">Stash</Button>
      <Button severity="secondary" size="small" class="text-xs" @click="stash.stashPop">Pop</Button>
    </div>
    <label class="checkbox-label text-xs text-rm-muted cursor-pointer flex items-center gap-2 mb-2">
      <input v-model="stash.includeUntracked" type="checkbox" class="checkbox-input" />
      <span>Include untracked</span>
    </label>
    <label class="checkbox-label text-xs text-rm-muted cursor-pointer flex items-center gap-2 mb-3">
      <input v-model="stash.keepIndex" type="checkbox" class="checkbox-input" />
      <span>Keep index</span>
    </label>
    <ul v-if="stash.entries.length" class="list-none m-0 p-0 space-y-1 text-sm">
      <li v-for="e in stash.entries" :key="e.index" class="flex items-center justify-between gap-2 py-1 border-b border-rm-border">
        <span class="truncate text-rm-text" :title="e.message">{{ e.index }} {{ e.message }}</span>
        <span class="flex gap-1 shrink-0">
          <button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0" @click="stash.stashApply(e.index)">Apply</button>
          <button type="button" class="text-xs text-rm-warning hover:underline border-none bg-transparent cursor-pointer p-0" @click="stash.stashDrop(e.index)">Drop</button>
        </span>
      </li>
    </ul>
    <p v-else class="m-0 text-xs text-rm-muted">No stashes.</p>
    <p v-if="stash.error" class="m-0 mt-2 text-xs text-rm-warning">{{ stash.error }}</p>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import { useStash } from '../../../composables/useStash';

const emit = defineEmits(['refresh']);
const stash = useStash({ onRefresh: () => emit('refresh') });
</script>
