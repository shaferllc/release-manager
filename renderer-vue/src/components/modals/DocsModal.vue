<template>
  <RmModal :title="entry?.title || 'Documentation'" wide class="max-h-[85vh] flex flex-col" @close="close">
    <div class="prose-docs flex-1 overflow-auto border-t border-rm-border p-5" v-html="renderedBody"></div>
    <template #footer>
      <RmButton variant="secondary" size="compact" @click="close">Close</RmButton>
    </template>
  </RmModal>
</template>

<script setup>
import { computed } from 'vue';
import { RmButton, RmModal } from '../ui';
import { DOCS } from '../../docsContent';
import { renderMarkdown } from '../../composables/useMarkdown';

const props = defineProps({
  docKey: { type: String, default: '' },
});
const emit = defineEmits(['close']);

const entry = computed(() => (props.docKey && DOCS[props.docKey]) ? DOCS[props.docKey] : null);

const renderedBody = computed(() => {
  const body = entry.value?.body;
  if (!body) return '';
  return renderMarkdown(body);
});

function close() {
  emit('close');
}
</script>
