<template>
  <Dialog
    :visible="true"
    :header="title || 'Diff'"
    :style="{ width: '42rem' }"
    :modal="true"
    :dismissableMask="true"
    class="max-h-[85vh] flex flex-col"
    @update:visible="(v) => { if (!v) close(); }"
    @hide="close"
  >
    <pre class="m-0 flex-1 overflow-auto text-xs font-mono border-t border-rm-border whitespace-pre-wrap p-4">{{ content }}</pre>
    <template #footer>
      <Button v-if="content" severity="secondary" size="small" class="text-xs shrink-0" @click="copyContent">Copy</Button>
      <Button severity="secondary" size="small" class="text-xs shrink-0" @click="close">Close</Button>
    </template>
  </Dialog>
</template>

<script setup>
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
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
