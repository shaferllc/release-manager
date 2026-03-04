<template>
  <RmModal title="Uncommitted changes" class="max-w-md" @close="close">
    <p class="m-0 mb-4 text-sm text-rm-text">You have uncommitted changes. How do you want to switch?</p>
    <div class="flex flex-col gap-2">
      <RmButton variant="primary" size="compact" class="w-full text-left" @click="choose('stash-pop')">Stash, switch & pop</RmButton>
      <p class="m-0 text-xs text-rm-muted">Stash your changes, switch branch, then pop the stash so you keep the same changes on the new branch.</p>
      <RmButton variant="secondary" size="compact" class="w-full text-left" @click="choose('stash-only')">Stash and switch</RmButton>
      <p class="m-0 text-xs text-rm-muted">Stash your changes and switch. Restore them later with Pop stash.</p>
      <RmButton variant="secondary" size="compact" class="w-full" @click="choose('cancel')">Cancel</RmButton>
    </div>
  </RmModal>
</template>

<script setup>
import { RmButton, RmModal } from '../ui';
const emit = defineEmits(['stash-pop', 'stash-only', 'cancel', 'close']);

function close() {
  emit('close');
  emit('cancel');
}

function choose(choice) {
  if (choice === 'stash-pop') emit('stash-pop');
  else if (choice === 'stash-only') emit('stash-only');
  else emit('cancel');
  emit('close');
}
</script>
