<template>
  <div class="flex-1 overflow-auto p-5">
    <h2 class="text-xl font-semibold text-rm-text tracking-tight mb-6">Changelog</h2>
    <Message v-if="error" severity="warn" class="text-sm">{{ error }}</Message>
    <div v-else-if="content" class="changelog-body prose-changelog text-sm text-rm-text" v-html="content"></div>
    <div v-else class="flex flex-col items-center gap-3 py-12 text-rm-muted text-sm">
      <ProgressSpinner aria-hidden="true" class="!w-8 !h-8" />
      <span>Loading…</span>
    </div>
  </div>
</template>

<script setup>
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import { useChangelog } from '../composables/useChangelog';

const { content, error } = useChangelog();
</script>

<style scoped>
.prose-changelog :deep(a) { color: rgb(var(--rm-accent)); }
.prose-changelog :deep(a:hover) { text-decoration: underline; }
</style>
