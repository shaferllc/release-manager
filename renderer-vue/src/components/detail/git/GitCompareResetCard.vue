<template>
  <div class="git-card">
    <p class="card-label mb-2">Compare & reset</p>
    <div class="flex flex-wrap gap-2 mb-3">
      <input v-model="refA" type="text" class="input-field text-sm w-28 font-mono" placeholder="Ref A (e.g. HEAD)" />
      <input v-model="refB" type="text" class="input-field text-sm w-28 font-mono" placeholder="Ref B" />
      <button type="button" class="btn-secondary btn-compact text-xs" @click="showDiff">Diff</button>
    </div>
    <div class="mb-3">
      <label class="block text-xs text-rm-muted mb-1">Reset to ref</label>
      <div class="flex gap-2">
        <input v-model="resetRef" type="text" class="input-field flex-1 text-sm font-mono" placeholder="e.g. HEAD~1" />
        <select v-model="resetMode" class="text-sm rounded-rm border border-rm-border bg-rm-bg text-rm-text px-2 py-1 w-24">
          <option value="soft">Soft</option>
          <option value="mixed">Mixed</option>
          <option value="hard">Hard</option>
        </select>
        <button type="button" class="btn-secondary btn-compact text-xs text-rm-warning" @click="reset">Reset</button>
      </div>
    </div>
    <p v-if="error" class="m-0 text-xs text-rm-warning">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';
import { useModals } from '../../../composables/useModals';

const emit = defineEmits(['refresh']);
const store = useAppStore();
const api = useApi();
const modals = useModals();
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
