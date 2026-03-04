<template>
  <RmModal title="Add worktree" class="max-w-md" @close="close">
    <div class="flex flex-col gap-4">
        <p class="text-xs text-rm-muted m-0">Create a new working directory for this repo. Path can be relative to the repo’s parent or absolute.</p>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-rm-muted">Path</label>
          <RmInput
            v-model="worktreePath"
            type="text"
            class="flex-1 min-w-0"
            placeholder="e.g. ../feature-branch or /absolute/path"
            @keydown.enter="submit"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-rm-muted">Branch (optional)</label>
          <RmInput
            v-model="branch"
            type="text"
            class="flex-1 min-w-0"
            placeholder="New or existing branch; leave empty to checkout existing"
            @keydown.enter="submit"
          />
        </div>
        <p v-if="error" class="m-0 text-xs text-rm-warning">{{ error }}</p>
    </div>
    <template #footer>
      <RmButton variant="primary" size="compact" :disabled="!worktreePath.trim() || submitting" @click="submit">
        {{ submitting ? 'Adding…' : 'Add worktree' }}
      </RmButton>
      <RmButton variant="secondary" size="compact" @click="close">Cancel</RmButton>
    </template>
  </RmModal>
</template>

<script setup>
import { ref } from 'vue';
import { RmButton, RmInput, RmModal } from '../ui';
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
