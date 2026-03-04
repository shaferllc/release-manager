<template>
  <Dialog
    :visible="true"
    header="Uncommitted changes"
    :style="{ width: '32rem' }"
    :modal="true"
    :dismissableMask="true"
    class="max-w-md"
    @update:visible="(v) => { if (!v) close(); }"
    @hide="close"
  >
    <p class="m-0 mb-4 text-sm text-rm-text">You have uncommitted changes. How do you want to switch?</p>
    <div class="flex flex-col gap-2">
      <Button severity="primary" size="small" class="w-full text-left" @click="choose('stash-pop')">Stash, switch & pop</Button>
      <p class="m-0 text-xs text-rm-muted">Stash your changes, switch branch, then pop the stash so you keep the same changes on the new branch.</p>
      <Button severity="secondary" size="small" class="w-full text-left" @click="choose('stash-only')">Stash and switch</Button>
      <p class="m-0 text-xs text-rm-muted">Stash your changes and switch. Restore them later with Pop stash.</p>
      <Button severity="secondary" size="small" class="w-full" @click="choose('cancel')">Cancel</Button>
    </div>
  </Dialog>
</template>

<script setup>
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
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
