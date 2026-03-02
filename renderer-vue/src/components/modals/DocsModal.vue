<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-card modal-card-wide flex flex-col max-h-[85vh]">
      <div class="modal-header flex-shrink-0">
        <h3 class="modal-title flex-1 min-w-0">{{ entry?.title || 'Documentation' }}</h3>
        <button type="button" class="modal-close" aria-label="Close" @click="close">×</button>
      </div>
      <div class="modal-docs-body flex-1 overflow-auto p-5 border-t border-rm-border text-sm text-rm-text" v-html="entry?.body || ''"></div>
      <div class="modal-footer flex-shrink-0 p-3 border-t border-rm-border">
        <button type="button" class="btn-secondary btn-compact" @click="close">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { DOCS } from '../../docsContent';

const props = defineProps({
  docKey: { type: String, default: '' },
});
const emit = defineEmits(['close']);

const entry = computed(() => (props.docKey && DOCS[props.docKey]) ? DOCS[props.docKey] : null);

function close() {
  emit('close');
}
</script>
