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
        <Message v-if="error" severity="warn" class="text-xs">{{ error }}</Message>
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
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import { useAddWorktree } from '../../plugins/git/worktrees';

const props = defineProps({
  dirPath: { type: String, default: '' },
});

const emit = defineEmits(['close', 'added']);

const {
  worktreePath,
  branch,
  error,
  submitting,
  close,
  submit,
} = useAddWorktree(() => props.dirPath, emit);
</script>
