<template>
  <Dialog
    :visible="true"
    header="Create tag"
    :style="{ width: '28rem' }"
    :modal="true"
    :dismissableMask="true"
    class="max-w-md max-h-[90vh]"
    @update:visible="(v) => { if (!v) close(); }"
    @hide="close"
  >
    <div class="flex flex-col gap-4 overflow-y-auto min-h-0">
      <!-- Tag name -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-medium text-rm-muted">Tag name</label>
        <div class="flex gap-2 items-center">
          <InputText
            v-model="tagName"
            type="text"
            class="flex-1 min-w-0"
            placeholder="e.g. v1.0.0"
            @keydown.enter="submit"
          />
          <Button
            severity="secondary"
            size="small"
            class="text-xs whitespace-nowrap"
            title="Suggest next version from latest tag"
            :disabled="!dirPath || tagsLoading"
            @click="suggestVersion"
          >
            {{ tagsLoading ? '…' : 'Suggest' }}
          </Button>
        </div>
      </div>

      <!-- Message -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-medium text-rm-muted">Message (optional)</label>
        <div class="flex gap-2 items-start">
          <InputText
            v-model="tagMessage"
            type="text"
            class="flex-1 min-w-0"
            placeholder="Annotated tag message"
            @keydown.enter="submit"
          />
          <div class="flex flex-col gap-1 shrink-0">
            <Button
              severity="secondary"
              size="small"
              class="text-xs whitespace-nowrap"
              title="Use commit message at selected ref"
              :disabled="!dirPath || messageFromRefLoading"
              @click="fillMessageFromRef"
            >
              {{ messageFromRefLoading ? '…' : 'From ref' }}
            </Button>
            <Button
              v-if="aiGenerateAvailable"
              severity="secondary"
              size="small"
              class="text-xs whitespace-nowrap"
              title="Generate message from commits (AI)"
              :disabled="!dirPath || aiGenerateLoading"
              @click="generateMessageWithAi"
            >
              {{ aiGenerateLoading ? '…' : 'Generate (AI)' }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Ref with browser -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-medium text-rm-muted">Ref (optional)</label>
        <div class="flex gap-2 items-center">
          <InputText
            v-model="tagRef"
            type="text"
            class="flex-1 min-w-0"
            placeholder="e.g. HEAD or branch name"
          />
          <Button
            severity="secondary"
            size="small"
            class="whitespace-nowrap"
            @click="toggleRefBrowser"
          >
            {{ refBrowserOpen ? 'Hide' : 'Browse' }}
          </Button>
        </div>
        <div v-if="refBrowserOpen" class="create-tag-ref-browser rounded-rm border border-rm-border bg-rm-surface/50 flex flex-col overflow-hidden">
          <InputText
            v-model="refSearch"
            type="text"
            class="rounded-none border-0 border-b border-rm-border placeholder:text-rm-muted"
            placeholder="Search by hash, title, description or author"
          />
            <div class="overflow-auto max-h-48 min-h-0">
              <Button
                v-for="c in filteredRefCommits"
                :key="c.sha"
                variant="text"
                size="small"
                class="create-tag-commit-row w-full justify-start text-xs px-2 py-2 min-w-0 rounded-none border-0 border-b border-rm-border hover:bg-rm-accent/15 text-rm-text"
                @click="selectRefCommit(c.sha)"
              >
                <span class="font-mono text-rm-muted">{{ c.sha }}</span>
                <span class="mx-1.5">·</span>
                <span class="truncate">{{ c.subject || '(no subject)' }}</span>
                <span class="block text-[11px] text-rm-muted mt-0.5">{{ c.author }} · {{ c.date }}</span>
              </Button>
              <template v-if="refCommitsLoading">
                <Skeleton width="100%" height="2rem" class="mb-2" />
                <Skeleton width="100%" height="2rem" class="mb-2" />
                <Skeleton width="80%" height="2rem" />
              </template>
              <p v-else-if="filteredRefCommits.length === 0" class="text-xs text-rm-muted p-2 m-0">No commits match.</p>
            </div>
          </div>
        </div>

      <Message v-if="error" severity="warn" class="text-xs">{{ error }}</Message>
    </div>
    <template #footer>
      <Button severity="primary" size="small" :disabled="!tagName.trim() || submitting" @click="submit">
        {{ submitting ? 'Creating…' : 'Create tag' }}
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
import Skeleton from 'primevue/skeleton';
import { useNotifications } from '../../composables/useNotifications';
import { useCreateTag } from '../../plugins/git/tags';

const props = defineProps({
  dirPath: { type: String, default: '' },
  /** When opening "Create tag here" from branch menu, prefill ref (e.g. branch name). */
  initialRef: { type: String, default: '' },
});
const emit = defineEmits(['close', 'created']);

const notifications = useNotifications();

const {
  tagName,
  tagMessage,
  tagRef,
  error,
  submitting,
  tagsLoading,
  refBrowserOpen,
  refSearch,
  refCommitsLoading,
  messageFromRefLoading,
  aiGenerateAvailable,
  aiGenerateLoading,
  dirPath,
  filteredRefCommits,
  close,
  suggestVersion,
  fillMessageFromRef,
  generateMessageWithAi,
  toggleRefBrowser,
  selectRefCommit,
  submit,
} = useCreateTag(
  () => props.dirPath,
  () => props.initialRef,
  emit,
  notifications
);
</script>
