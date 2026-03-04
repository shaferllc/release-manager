<template>
  <div class="git-card">
    <RmCardHeader tag="p" class="mb-2">Compare & reset</RmCardHeader>
    <div class="flex flex-wrap gap-2 mb-3">
      <RmInput v-model="refA" type="text" class="text-sm w-28 font-mono" placeholder="Ref A (e.g. HEAD)" />
      <RmInput v-model="refB" type="text" class="text-sm w-28 font-mono" placeholder="Ref B" />
      <RmButton variant="secondary" size="compact" class="text-xs" @click="showDiff">Diff</RmButton>
    </div>
    <div class="mb-3">
      <label class="block text-xs text-rm-muted mb-1">Reset to ref</label>
      <div class="flex gap-2">
        <RmInput v-model="resetRef" type="text" class="flex-1 text-sm font-mono" placeholder="e.g. HEAD~1" />
        <RmSelect v-model="resetMode" :options="resetModeOptions" option-label="label" option-value="value" class="text-sm w-24" />
        <RmButton variant="secondary" size="compact" class="text-xs text-rm-warning" @click="reset">Reset</RmButton>
      </div>
    </div>
    <p v-if="error" class="m-0 text-xs text-rm-warning">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { RmButton, RmCardHeader, RmInput, RmSelect } from '../../ui';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';
import { useModals } from '../../../composables/useModals';

const emit = defineEmits(['refresh']);
const store = useAppStore();
const api = useApi();
const modals = useModals();
const resetModeOptions = [
  { value: 'soft', label: 'Soft' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'hard', label: 'Hard' },
];
const refA = ref('HEAD');
const refB = ref('');
const resetRef = ref('HEAD~1');
const resetMode = ref('mixed');
const error = ref('');

async function showDiff() {
  const path = store.selectedPath;
  const a = refA.value?.trim() || 'HEAD';
  const b = refB.value?.trim();
  if (!path || !b || !api.getDiffBetweenFull) return;
  error.value = '';
  try {
    const r = await api.getDiffBetweenFull(path, a, b);
    if (r?.ok && r.diff != null) {
      modals.openModal('diffFull', { title: `Diff ${a}..${b}`, content: r.diff });
    } else {
      error.value = r?.error || 'Diff failed.';
    }
  } catch (e) {
    error.value = e?.message || 'Diff failed.';
  }
}

async function reset() {
  const path = store.selectedPath;
  const refVal = resetRef.value?.trim();
  if (!path || !refVal || !api.gitReset) return;
  const mode = resetMode.value || 'mixed';
  if (mode === 'hard' && !window.confirm('Hard reset will discard all local changes. Continue?')) return;
  error.value = '';
  try {
    await api.gitReset(path, refVal, mode);
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Reset failed.';
  }
}
</script>
