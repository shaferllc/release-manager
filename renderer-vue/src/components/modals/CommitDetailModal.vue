<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-card modal-card-wide flex flex-col max-h-[85vh]">
      <div class="modal-header flex-shrink-0">
        <h3 class="modal-title truncate flex-1 min-w-0">{{ title }}</h3>
        <button type="button" class="modal-close" aria-label="Close" @click="close">×</button>
      </div>
      <div class="m-0 p-4 flex-1 overflow-auto text-xs font-mono border-t border-rm-border whitespace-pre-wrap">{{ content }}</div>
      <div class="modal-footer flex-shrink-0 flex flex-wrap gap-2 p-3 border-t border-rm-border">
        <button type="button" class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5 shrink-0" @click="copySha">Copy SHA</button>
        <button type="button" class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5 shrink-0" @click="cherryPick">Cherry-pick</button>
        <button type="button" class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5 shrink-0 text-rm-warning hover:bg-rm-warning/10" @click="revert">Revert</button>
        <button v-if="isHead" type="button" class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5 shrink-0" title="Amend this commit (only for HEAD)" @click="amend">Amend</button>
        <button type="button" class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5 shrink-0" @click="close">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue';
import { useApi } from '../../composables/useApi';

const props = defineProps({
  dirPath: { type: String, default: '' },
  sha: { type: String, default: '' },
  isHead: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'refresh']);

const api = useApi();
const content = ref('');
const title = ref('');

async function load() {
  if (!props.dirPath || !props.sha) return;
  title.value = props.sha.slice(0, 7);
  try {
    const result = await api.getCommitDetail?.(props.dirPath, props.sha);
    if (result?.error) {
      content.value = result.error;
    } else if (result?.ok && result?.subject != null) {
      const msg = [result.subject, result.body, result.diff].filter(Boolean).join('\n\n');
      content.value = msg || 'No details.';
    } else {
      content.value = 'No details.';
    }
  } catch (e) {
    content.value = String(e?.message || e);
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
