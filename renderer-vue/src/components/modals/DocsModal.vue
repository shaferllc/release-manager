<template>
  <Dialog
    :visible="true"
    :header="entry?.title || 'Documentation'"
    :style="{ width: '42rem' }"
    :modal="true"
    :dismissableMask="true"
    class="max-h-[85vh] flex flex-col"
    @update:visible="(v) => { if (!v) close(); }"
    @hide="close"
  >
    <div class="prose-docs flex-1 overflow-auto border-t border-rm-border p-5" v-html="renderedBody"></div>
    <template #footer>
      <Button severity="secondary" size="small" @click="close">Close</Button>
    </template>
  </Dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { DOCS } from '../../docsContent';
import { renderMarkdown } from '../../composables/useMarkdown';

const props = defineProps({
  docKey: { type: String, default: '' },
});
const emit = defineEmits(['close']);

const entry = computed(() => (props.docKey && DOCS[props.docKey]) ? DOCS[props.docKey] : null);

const renderedBody = ref('');

watch(
  entry,
  async (e) => {
    const body = e?.body;
    if (!body) {
      renderedBody.value = '';
      return;
    }
    renderedBody.value = await renderMarkdown(body);
  },
  { immediate: true }
);

function close() {
  emit('close');
}
</script>
