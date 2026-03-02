<template>
  <div class="flex-1 overflow-auto p-5">
    <h2 class="text-xl font-semibold text-rm-text tracking-tight mb-6">Changelog</h2>
    <p v-if="error" class="text-sm text-rm-warning">{{ error }}</p>
    <div v-else-if="content" class="changelog-body prose-changelog text-sm text-rm-text" v-html="content"></div>
    <p v-else class="text-sm text-rm-muted">Loading…</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useApi } from '../composables/useApi';

const api = useApi();
const content = ref('');
const error = ref(null);

onMounted(async () => {
  try {
    const result = await api.getChangelog?.();
    if (result?.ok && result.content) {
      content.value = result.content;
      error.value = null;
    } else {
      error.value = result?.error || 'Could not load changelog.';
      content.value = '';
    }
  } catch (e) {
    error.value = e?.message || 'Could not load changelog.';
    content.value = '';
  }
});
</script>

<style scoped>
.prose-changelog :deep(a) { color: rgb(var(--rm-accent)); }
.prose-changelog :deep(a:hover) { text-decoration: underline; }
</style>
