<template>
  <div class="git-card">
    <p class="card-label mb-2">.gitattributes</p>
    <p class="text-xs text-rm-muted m-0 mb-3">
      {{ attrs.contentSummary }}
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <Button severity="primary" size="small" class="text-xs" @click="attrs.openWizard">Wizard…</Button>
      <Button severity="secondary" size="small" class="text-xs" :disabled="attrs.saving" @click="attrs.load">Reload</Button>
      <span v-if="attrs.successMessage" class="text-xs font-medium text-rm-accent">{{ attrs.successMessage }}</span>
    </div>
    <p v-if="attrs.error" class="m-0 mt-2 text-xs text-rm-warning">{{ attrs.error }}</p>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import { useGitattributes } from '../../../composables/useGitattributes';

const emit = defineEmits(['refresh']);
const attrs = useGitattributes({ onRefresh: () => emit('refresh') });
</script>
