<template>
  <div class="git-card">
    <p class="card-label mb-2">Bisect</p>
    <template v-if="status.active">
      <p class="text-xs text-rm-muted mb-2">{{ status.current }}</p>
      <p v-if="status.remaining" class="text-xs text-rm-muted mb-3">{{ status.remaining }} revisions left</p>
      <div class="flex flex-wrap gap-2 mb-3">
        <button type="button" class="btn-primary btn-compact text-xs" @click="markGood">Good</button>
        <button type="button" class="btn-secondary btn-compact text-xs text-rm-warning" @click="markBad">Bad</button>
        <button type="button" class="btn-secondary btn-compact text-xs" @click="resetBisect">Reset</button>
      </div>
    </template>
    <template v-else>
      <p class="text-xs text-rm-muted mb-3">Find the commit that introduced a bug by marking refs good/bad.</p>
      <button type="button" class="btn-primary btn-compact text-xs" @click="startBisect">Start bisect</button>
    </template>
    <p v-if="error" class="m-0 mt-2 text-xs text-rm-warning">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';
import { useModals } from '../../../composables/useModals';

const emit = defineEmits(['refresh']);
const store = useAppStore();
const api = useApi();
const modals = useModals();
const status = ref({ active: false, current: '', remaining: '' });
const error = ref('');

async function load() {
  const path = store.selectedPath;
  if (!path || !api.getBisectStatus) return;
  error.value = '';
  try {
    const r = await api.getBisectStatus(path);
    status.value = {
      active: !!r?.active,
      current: r?.current || '',
      remaining: r?.remaining ? `${r.remaining} revisions left` : '',
    };
  } catch {
    status.value = { active: false, current: '', remaining: '' };
  }
}

watch(() => store.selectedPath, load, { immediate: true });

function startBisect() {
  const path = store.selectedPath;
  if (!path) return;
  modals.openModal('bisectRefPicker', {
    defaultBad: 'HEAD',
    defaultGood: '',
    onConfirm: async ({ badRef, goodRef }) => {
      if (!api.bisectStart) return;
      error.value = '';
      try {
        await api.bisectStart(path, badRef, goodRef);
        load();
        emit('refresh');
      } catch (e) {
        error.value = e?.message || 'Bisect start failed.';
      }
    },
  });
}

async function markGood() {
  const path = store.selectedPath;
  if (!path || !api.bisectGood) return;
  error.value = '';
  try {
    await api.bisectGood(path);
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Failed.';
  }
}

async function markBad() {
  const path = store.selectedPath;
  if (!path || !api.bisectBad) return;
  error.value = '';
  try {
    await api.bisectBad(path);
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Failed.';
  }
}

async function resetBisect() {
  const path = store.selectedPath;
  if (!path || !api.bisectReset) return;
  error.value = '';
  try {
    await api.bisectReset(path);
    load();
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Reset failed.';
  }
}
</script>
