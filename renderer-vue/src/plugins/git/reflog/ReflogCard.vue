<template>
  <GitPanelCard :title="panelTitle" :icon="panelIcon">
    <template #header-right>
      <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="reflog.load(); $emit('refresh')">Refresh</Button>
    </template>
    <ul v-if="reflog.entries.length" class="list-none m-0 p-0 space-y-1 text-sm max-h-64 overflow-y-auto">
      <li
        v-for="(e, i) in reflog.entries"
        :key="i"
        class="py-1 border-b border-rm-border cursor-pointer hover:text-rm-accent truncate"
        :title="e.message"
        @click="reflog.checkout(e)"
      >
        <span class="font-mono text-rm-muted">{{ e.sha }}</span> {{ e.message }}
      </li>
    </ul>
    <p v-else class="m-0 text-xs text-rm-muted">No reflog entries.</p>
    <Message v-if="reflog.error" severity="warn" class="mt-2 text-xs">{{ reflog.error }}</Message>
  </GitPanelCard>
</template>

<script setup>
import Button from 'primevue/button';
import Message from 'primevue/message';
import GitPanelCard from '../GitPanelCard.vue';
import { useReflog } from './useReflog.js';

defineProps({ panelTitle: { type: String, default: 'Reflog' }, panelIcon: { type: String, default: '' } });
const emit = defineEmits(['refresh']);
const reflog = useReflog({ onRefresh: () => emit('refresh') });
</script>
