<template>
  <div class="git-card">
    <p class="card-label mb-2">.gitattributes</p>
    <p class="text-xs text-rm-muted m-0 mb-3">
      {{ attrs.contentSummary }}
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <Button severity="primary" size="small" class="text-xs" @click="attrs.openWizard">Wizard…</Button>
      <Button severity="secondary" size="small" class="text-xs" :disabled="attrs.saving" @click="attrs.load">Reload</Button>
      <Message v-if="attrs.successMessage" severity="success" class="text-xs mt-2">{{ attrs.successMessage }}</Message>
    </div>
    <Message v-if="attrs.error" severity="warn" class="mt-2 text-xs">{{ attrs.error }}</Message>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useGitattributes } from './useGitattributes.js';

const emit = defineEmits(['refresh']);
const attrs = useGitattributes({ onRefresh: () => emit('refresh') });
</script>
