<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-card flex flex-col max-w-md">
      <div class="modal-header flex-shrink-0">
        <h3 class="modal-title">Uncommitted changes</h3>
        <button type="button" class="modal-close" aria-label="Close" @click="close">×</button>
      </div>
      <div class="modal-body flex-shrink-0 p-4">
        <p class="m-0 mb-4 text-sm text-rm-text">You have uncommitted changes. How do you want to switch?</p>
        <div class="flex flex-col gap-2">
          <button type="button" class="btn-primary btn-compact text-sm w-full text-left" @click="choose('stash-pop')">Stash, switch & pop</button>
          <p class="m-0 text-xs text-rm-muted">Stash your changes, switch branch, then pop the stash so you keep the same changes on the new branch.</p>
          <button type="button" class="btn-secondary btn-compact text-sm w-full text-left" @click="choose('stash-only')">Stash and switch</button>
          <p class="m-0 text-xs text-rm-muted">Stash your changes and switch. Restore them later with Pop stash.</p>
          <button type="button" class="btn-secondary btn-compact text-sm w-full" @click="choose('cancel')">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
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
