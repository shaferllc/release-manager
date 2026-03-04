<template>
  <div class="git-card">
    <RmCardHeader tag="p" class="mb-2">.gitattributes</RmCardHeader>
    <p class="text-xs text-rm-muted m-0 mb-3">
      {{ contentSummary }}
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <RmButton variant="primary" size="compact" class="text-xs" @click="openWizard">Wizard…</RmButton>
      <RmButton variant="secondary" size="compact" class="text-xs" :disabled="saving" @click="load">Reload</RmButton>
      <span v-if="successMessage" class="text-xs font-medium text-rm-accent">{{ successMessage }}</span>
    </div>
    <p v-if="error" class="m-0 mt-2 text-xs text-rm-warning">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { RmButton, RmCardHeader } from '../../ui';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';
import { useModals } from '../../../composables/useModals';

const emit = defineEmits(['refresh']);
const store = useAppStore();
const api = useApi();
const modals = useModals();
const content = ref('');
const error = ref('');
const saving = ref(false);
const successMessage = ref('');

const contentSummary = computed(() => {
  const t = content.value.trim();
  if (!t) return 'No .gitattributes or load failed. Open the wizard to create or edit.';
  const lines = t.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.length === 0 ? 'Empty' : `${lines.length} line${lines.length === 1 ? '' : 's'}. Open the wizard to edit.`;
});

async function load() {
  const path = store.selectedPath;
  if (!path || !api.getGitattributes) return;
  error.value = '';
  successMessage.value = '';
  try {
    const r = await api.getGitattributes(path);
    content.value = (r?.ok && r.content != null) ? r.content : (typeof r === 'string' ? r : '');
  } catch {
    content.value = '';
  }
}

watch(() => store.selectedPath, load, { immediate: true });

async function save() {
  const path = store.selectedPath;
  if (!path || !api.writeGitattributes) return;
  error.value = '';
  successMessage.value = '';
  saving.value = true;
  try {
    await api.writeGitattributes(path, content.value);
    emit('refresh');
    successMessage.value = 'Saved.';
    setTimeout(() => { successMessage.value = ''; }, 2000);
  } catch (e) {
    error.value = e?.message || 'Save failed.';
  } finally {
    saving.value = false;
  }
}

async function openWizard() {
  const path = store.selectedPath;
  if (!path) return;
  let baselineContent = '';
  if (api.getFileAtRef) {
    try {
      const r = await api.getFileAtRef(path, '.gitattributes', 'HEAD');
      if (r?.ok && r.content != null) baselineContent = r.content;
    } catch (_) {}
  }
  modals.openModal('gitattributesWizard', {
    initialContent: content.value,
    baselineContent,
    onApplyAndSave(c) {
      content.value = c;
      save();
    },
  });
}
</script>
