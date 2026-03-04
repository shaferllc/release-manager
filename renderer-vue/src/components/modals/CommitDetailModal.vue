<template>
  <RmModal :title="title" wide class="max-h-[85vh] flex flex-col" @close="close">
    <div class="m-0 flex-1 overflow-auto text-xs font-mono border-t border-rm-border whitespace-pre-wrap p-4">{{ content }}</div>
    <template #footer>
      <RmButton variant="secondary" size="compact" class="text-xs shrink-0" @click="copySha">Copy SHA</RmButton>
      <RmButton variant="secondary" size="compact" class="text-xs shrink-0" @click="cherryPick">Cherry-pick</RmButton>
      <RmButton variant="secondary" size="compact" class="text-xs shrink-0 text-rm-warning hover:bg-rm-warning/10" @click="revert">Revert</RmButton>
      <RmButton v-if="isHead" variant="secondary" size="compact" class="text-xs shrink-0" title="Amend this commit (only for HEAD)" @click="amend">Amend</RmButton>
      <template v-if="commitFiles.length">
        <span class="text-xs text-rm-muted shrink-0">Side-by-side:</span>
        <RmSelect v-model="sideBySideFile" class="text-xs px-2 py-1 max-w-[14rem] truncate">
          <option v-for="f in commitFiles" :key="f" :value="f">{{ f }}</option>
        </RmSelect>
        <RmButton variant="primary" size="compact" class="text-xs shrink-0" title="Open side-by-side diff (old | new) with copy and revert line" @click="openSideBySide">Open</RmButton>
      </template>
      <RmButton variant="secondary" size="compact" class="text-xs shrink-0" @click="close">Close</RmButton>
    </template>
  </RmModal>
</template>

<script setup>
import { watch, ref } from 'vue';
import { RmButton, RmModal, RmSelect } from '../ui';
import { useApi } from '../../composables/useApi';

const props = defineProps({
  dirPath: { type: String, default: '' },
  sha: { type: String, default: '' },
  isHead: { type: Boolean, default: false },
});

const api = useApi();
const content = ref('');
const title = ref('');
const commitFiles = ref([]);
const sideBySideFile = ref('');

const emit = defineEmits(['close', 'refresh', 'open-diff-side-by-side']);

function openSideBySide() {
  if (sideBySideFile.value && props.dirPath && props.sha) {
    emit('open-diff-side-by-side', { dirPath: props.dirPath, filePath: sideBySideFile.value, commitSha: props.sha });
  }
}

async function load() {
  if (!props.dirPath || !props.sha) return;
  title.value = props.sha.slice(0, 7);
  try {
    const result = await api.getCommitDetail?.(props.dirPath, props.sha);
    if (result?.error) {
      content.value = result.error;
      commitFiles.value = [];
    } else if (result?.ok && result?.subject != null) {
      const msg = [result.subject, result.body, result.diff].filter(Boolean).join('\n\n');
      content.value = msg || 'No details.';
      commitFiles.value = Array.isArray(result.files) ? result.files : [];
      if (commitFiles.value.length && !sideBySideFile.value) sideBySideFile.value = commitFiles.value[0];
    } else {
      content.value = 'No details.';
      commitFiles.value = [];
    }
  } catch (e) {
    content.value = String(e?.message || e);
    commitFiles.value = [];
  }
}

watch(() => [props.dirPath, props.sha], load, { immediate: true });

function close() {
  emit('close');
}

async function copySha() {
  await api.copyToClipboard?.(props.sha);
  close();
}

async function cherryPick() {
  try {
    await api.gitCherryPick?.(props.dirPath, props.sha);
    emit('refresh');
    close();
  } catch (_) {}
}

async function revert() {
  try {
    await api.gitRevert?.(props.dirPath, props.sha);
    emit('refresh');
    close();
  } catch (_) {}
}

async function amend() {
  try {
    const message = content.value.split('\n\n')[0]?.trim() || '';
    await api.gitAmend?.(props.dirPath, message);
    emit('refresh');
    close();
  } catch (_) {}
}
</script>
