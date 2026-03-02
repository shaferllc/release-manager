<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-card flex flex-col max-w-md">
      <div class="modal-header flex-shrink-0">
        <h3 class="modal-title">Bisect: set bad and good refs</h3>
        <button type="button" class="modal-close" aria-label="Close" @click="close">×</button>
      </div>
      <div class="modal-body flex flex-col gap-3 p-4">
        <div>
          <label class="block text-xs font-medium text-rm-muted mb-1">Bad ref (has the bug)</label>
          <input v-model="badRef" type="text" class="w-full text-sm rounded-rm border border-rm-border bg-rm-bg text-rm-text px-2 py-1.5" placeholder="e.g. HEAD" />
        </div>
        <div>
          <label class="block text-xs font-medium text-rm-muted mb-1">Good ref (no bug)</label>
          <input v-model="goodRef" type="text" class="w-full text-sm rounded-rm border border-rm-border bg-rm-bg text-rm-text px-2 py-1.5" placeholder="e.g. main or a commit SHA" />
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn-primary btn-compact text-sm" @click="confirm">Start bisect</button>
          <button type="button" class="btn-secondary btn-compact text-sm" @click="close">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  defaultBad: { type: String, default: 'HEAD' },
  defaultGood: { type: String, default: '' },
});
const emit = defineEmits(['close', 'confirm']);

const badRef = ref(props.defaultBad || 'HEAD');
const goodRef = ref(props.defaultGood || '');

watch(() => [props.defaultBad, props.defaultGood], () => {
  badRef.value = props.defaultBad || 'HEAD';
  goodRef.value = props.defaultGood || '';
});

function close() {
  emit('close');
}

function confirm() {
  emit('confirm', { badRef: badRef.value.trim(), goodRef: goodRef.value.trim() });
  emit('close');
}
</script>
