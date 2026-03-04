<template>
  <Dialog
    :visible="true"
    header="Add worktree"
    :style="{ width: '28rem' }"
    :modal="true"
    :dismissableMask="true"
    class="max-w-md"
    @update:visible="(v) => { if (!v) close(); }"
    @hide="close"
  >
    <div class="flex flex-col gap-4">
        <p class="text-xs text-rm-muted m-0">Create a new working directory for this repo. Path can be relative to the repo’s parent or absolute.</p>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-rm-muted">Path</label>
          <InputText
            v-model="worktreePath"
            type="text"
            class="flex-1 min-w-0"
            placeholder="e.g. ../feature-branch or /absolute/path"
            @keydown.enter="submit"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-rm-muted">Branch (optional)</label>
          <InputText
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
      <Button severity="primary" size="small" :disabled="!worktreePath.trim() || submitting" @click="submit">
        {{ submitting ? 'Adding…' : 'Add worktree' }}
      </Button>
      <Button severity="secondary" size="small" @click="close">Cancel</Button>
    </template>
  </Dialog>
</template>

<script setup>
import { ref } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
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
