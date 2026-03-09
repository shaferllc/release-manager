<template>
  <GitPanelCard :title="panelTitle" :icon="panelIcon">
    <template #header-right>
      <span class="text-xs text-rm-muted tabular-nums">{{ stash.entries.length }} Open</span>
    </template>
    <p v-if="!stash.entries.length" class="m-0 text-xs text-rm-muted">No stashes. Use Stash in the toolbar or open panel to create one.</p>
    <template v-else>
      <div class="flex flex-wrap gap-2 mb-2">
        <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="stash.stashPush">Stash</Button>
        <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="stash.stashPop">Pop</Button>
      </div>
      <label class="text-xs text-rm-muted cursor-pointer flex items-center gap-2 mb-1">
        <Checkbox v-model="stash.includeUntracked" binary />
        <span>Include untracked</span>
      </label>
      <label class="text-xs text-rm-muted cursor-pointer flex items-center gap-2 mb-2">
        <Checkbox v-model="stash.keepIndex" binary />
        <span>Keep index</span>
      </label>
      <ul class="list-none m-0 p-0 space-y-0.5 text-xs">
        <li v-for="e in stash.entries" :key="e.index" class="flex items-center justify-between gap-2 py-0.5 border-b border-rm-border last:border-b-0">
          <span class="truncate text-rm-text min-w-0" :title="e.message">{{ e.index }} {{ e.message }}</span>
          <span class="flex gap-1 shrink-0">
            <Button variant="text" size="small" class="p-0 min-w-0 text-rm-accent hover:underline" @click="stash.stashApply(e.index)">Apply</Button>
            <Button variant="text" size="small" class="p-0 min-w-0 text-rm-warning hover:underline" @click="stash.stashDrop(e.index)">Drop</Button>
          </span>
        </li>
      </ul>
    </template>
    <Message v-if="stash.error" severity="warn" class="mt-2 text-xs">{{ stash.error }}</Message>
  </GitPanelCard>
</template>

<script setup>
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Message from 'primevue/message';
import GitPanelCard from '../GitPanelCard.vue';
import { useStash } from './useStash.js';

defineProps({ panelTitle: { type: String, default: 'Stash' }, panelIcon: { type: String, default: '' } });
const emit = defineEmits(['refresh']);
const stash = useStash({ onRefresh: () => emit('refresh') });
</script>
