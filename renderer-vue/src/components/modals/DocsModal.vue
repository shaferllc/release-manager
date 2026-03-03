<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-card modal-card-wide flex flex-col max-h-[85vh]">
      <div class="modal-header flex-shrink-0">
        <h3 class="modal-title flex-1 min-w-0">{{ entry?.title || 'Documentation' }}</h3>
        <button type="button" class="modal-close" aria-label="Close" @click="close">×</button>
      </div>
      <div class="modal-docs-body prose-docs flex-1 overflow-auto p-5 border-t border-rm-border" v-html="renderedBody"></div>
      <div class="modal-footer flex-shrink-0 p-3 border-t border-rm-border">
        <button type="button" class="btn-secondary btn-compact" @click="close">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
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
