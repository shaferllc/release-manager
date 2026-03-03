<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-card flex flex-col max-w-md">
      <div class="modal-header flex-shrink-0">
        <h3 class="modal-title">Add worktree</h3>
        <button type="button" class="modal-close" aria-label="Close" @click="close">×</button>
      </div>
      <div class="modal-body flex flex-col gap-4 p-4">
        <p class="text-xs text-rm-muted m-0">Create a new working directory for this repo. Path can be relative to the repo’s parent or absolute.</p>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-rm-muted">Path</label>
          <input
            v-model="worktreePath"
            type="text"
            class="flex-1 min-w-0 text-sm rounded-rm border border-rm-border bg-rm-bg text-rm-text px-2 py-1.5"
            placeholder="e.g. ../feature-branch or /absolute/path"
            @keydown.enter="submit"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-rm-muted">Branch (optional)</label>
          <input
            v-model="branch"
            type="text"
            class="flex-1 min-w-0 text-sm rounded-rm border border-rm-border bg-rm-bg text-rm-text px-2 py-1.5"
            placeholder="New or existing branch; leave empty to checkout existing"
            @keydown.enter="submit"
          />
        </div>
        <p v-if="error" class="m-0 text-xs text-rm-warning">{{ error }}</p>
        <div class="flex gap-2 flex-shrink-0">
          <button type="button" class="btn-primary btn-compact text-sm" :disabled="!worktreePath.trim() || submitting" @click="submit">
            {{ submitting ? 'Adding…' : 'Add worktree' }}
          </button>
          <button type="button" class="btn-secondary btn-compact text-sm" @click="close">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useApi } from '../../composables/useApi';

const props = defineProps({
  dirPath: { type: String, default: '' },
});

const emit = defineEmits(['close', 'added']);

const api = useApi();
const worktreePath = ref('');
const branch = ref('');
const error = ref('');
const submitting = ref(false);

function close() {
  emit('close');
}

async function submit() {
  const path = worktreePath.value?.trim();
  if (!path || !props.dirPath || !api.worktreeAdd) return;
  error.value = '';
  submitting.value = true;
  try {
    await api.worktreeAdd(props.dirPath, path, branch.value?.trim() || undefined);
    emit('added');
    emit('close');
  } catch (e) {
    error.value = e?.message || 'Add worktree failed.';
  } finally {
    submitting.value = false;
  }
}
</script>
