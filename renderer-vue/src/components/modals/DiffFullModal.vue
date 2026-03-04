<template>
  <RmModal :title="title || 'Diff'" wide class="max-h-[85vh] flex flex-col" @close="close">
    <pre class="m-0 flex-1 overflow-auto text-xs font-mono border-t border-rm-border whitespace-pre-wrap p-4">{{ content }}</pre>
    <template #footer>
      <RmButton v-if="content" variant="secondary" size="compact" class="text-xs shrink-0" @click="copyContent">Copy</RmButton>
      <RmButton variant="secondary" size="compact" class="text-xs shrink-0" @click="close">Close</RmButton>
    </template>
  </RmModal>
</template>

<script setup>
import { RmButton, RmModal } from '../ui';
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
