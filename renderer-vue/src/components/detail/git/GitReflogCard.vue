<template>
  <div class="git-card">
    <p class="card-label mb-2">Reflog</p>
    <Button severity="secondary" size="small" class="text-xs mb-3" @click="reflog.load">Refresh</Button>
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
    <p v-if="reflog.error" class="m-0 mt-2 text-xs text-rm-warning">{{ reflog.error }}</p>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import { useReflog } from '../../../composables/useReflog';

const emit = defineEmits(['refresh']);
const reflog = useReflog({ onRefresh: () => emit('refresh') });
</script>
