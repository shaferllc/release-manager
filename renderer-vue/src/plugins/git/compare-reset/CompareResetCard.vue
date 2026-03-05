<template>
  <div class="git-card">
    <p class="card-label mb-2">Compare & reset</p>
    <div class="flex flex-wrap gap-2 mb-3">
      <InputText v-model="compare.refA" type="text" class="text-sm w-28 font-mono" placeholder="Ref A (e.g. HEAD)" />
      <InputText v-model="compare.refB" type="text" class="text-sm w-28 font-mono" placeholder="Ref B" />
      <Button severity="secondary" size="small" class="text-xs" @click="compare.showDiff">Diff</Button>
    </div>
    <div class="mb-3">
      <label class="block text-xs text-rm-muted mb-1">Reset to ref</label>
      <div class="flex gap-2">
        <InputText v-model="compare.resetRef" type="text" class="flex-1 text-sm font-mono" placeholder="e.g. HEAD~1" />
        <Select v-model="compare.resetMode" :options="compare.resetModeOptions" optionLabel="label" optionValue="value" class="text-sm w-24" />
        <Button severity="danger" size="small" class="text-xs" @click="compare.reset">Reset</Button>
      </div>
    </div>
    <Message v-if="compare.error" severity="warn" class="text-xs">{{ compare.error }}</Message>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import { useCompareReset } from './useCompareReset.js';

const emit = defineEmits(['refresh']);
const compare = useCompareReset({ onRefresh: () => emit('refresh') });
</script>
