<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-card modal-card-wide flex flex-col max-h-[85vh]">
      <div class="modal-header flex-shrink-0">
        <h3 class="modal-title truncate flex-1 min-w-0">{{ title || 'Diff' }}</h3>
        <button type="button" class="modal-close" aria-label="Close" @click="close">×</button>
      </div>
      <pre class="m-0 p-4 flex-1 overflow-auto text-xs font-mono border-t border-rm-border whitespace-pre-wrap">{{ content }}</pre>
      <div class="modal-footer flex-shrink-0 p-3 border-t border-rm-border flex flex-wrap items-center gap-2">
        <button v-if="content" type="button" class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5 shrink-0" @click="copyContent">Copy</button>
        <button type="button" class="btn-secondary btn-compact text-xs inline-flex items-center gap-x-1.5 shrink-0" @click="close">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useApi } from '../../composables/useApi';

const props = defineProps({
  title: { type: String, default: 'Diff' },
  content: { type: String, default: '' },
});
const emit = defineEmits(['close']);
const api = useApi();

function close() {
  emit('close');
}

async function copyContent() {
  if (props.content && api.copyToClipboard) await api.copyToClipboard(props.content);
}
</script>
