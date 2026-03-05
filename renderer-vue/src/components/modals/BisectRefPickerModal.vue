<template>
  <Dialog
    :visible="true"
    header="Bisect — Step 1: Set refs"
    :style="{ width: '32rem' }"
    :modal="true"
    :dismissableMask="true"
    class="max-w-lg max-h-[85vh]"
    @update:visible="(v) => { if (!v) close(); }"
    @hide="close"
  >
    <div class="flex flex-col gap-4 overflow-hidden">
      <p class="text-xs text-rm-muted m-0">Choose the <strong class="text-rm-text">bad</strong> commit (where the bug exists) and a <strong class="text-rm-text">good</strong> commit (before the bug). Git will then check out commits in between for you to test.</p>

      <!-- Bad ref -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-medium text-rm-muted">Bad ref (has the bug)</label>
        <div class="flex gap-2 items-center">
          <InputText
            v-model="badRef"
            type="text"
            class="flex-1 min-w-0"
            placeholder="e.g. HEAD"
          />
          <Button severity="secondary" size="small" class="text-xs whitespace-nowrap" @click="toggleBrowser('bad')">
            {{ browserOpen === 'bad' ? 'Hide' : 'Browse' }}
          </Button>
        </div>
        <div v-if="browserOpen === 'bad'" class="bisect-browser rounded-rm border border-rm-border bg-rm-surface/50 flex flex-col overflow-hidden">
          <InputText
            v-model="badSearch"
            type="text"
            class="rounded-none border-0 border-b border-rm-border placeholder:text-rm-muted"
            placeholder="Search by hash, title, description or author"
          />
            <div class="overflow-auto max-h-48 min-h-0">
              <Button
                v-for="c in filteredBadCommits"
                :key="c.sha"
                variant="text"
                size="small"
                class="bisect-commit-row w-full justify-start text-xs px-2 py-2 min-w-0 rounded-none border-0 border-b border-rm-border hover:bg-rm-accent/15 text-rm-text"
                :class="{ 'opacity-50 cursor-not-allowed': c.sha === goodRef.trim() }"
                :disabled="c.sha === goodRef.trim()"
                @click="selectRef('bad', c.sha)"
              >
                <span class="font-mono text-rm-muted">{{ c.sha }}</span>
                <span class="mx-1.5">·</span>
                <span class="truncate">{{ c.subject || '(no subject)' }}</span>
                <span class="block text-[11px] text-rm-muted mt-0.5">{{ c.author }} · {{ c.date }}</span>
              </Button>
              <template v-if="commitsLoading">
                <Skeleton width="100%" height="2rem" class="mb-2" />
                <Skeleton width="100%" height="2rem" class="mb-2" />
                <Skeleton width="80%" height="2rem" />
              </template>
              <p v-else-if="filteredBadCommits.length === 0" class="text-xs text-rm-muted p-2 m-0">No commits match.</p>
            </div>
        </div>
      </div>

      <!-- Good ref -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-medium text-rm-muted">Good ref (no bug)</label>
        <div class="flex gap-2 items-center">
          <InputText
            v-model="goodRef"
            type="text"
            class="flex-1 min-w-0"
            placeholder="e.g. main or a commit SHA"
          />
          <Button severity="secondary" size="small" class="text-xs whitespace-nowrap" @click="toggleBrowser('good')">
            {{ browserOpen === 'good' ? 'Hide' : 'Browse' }}
          </Button>
        </div>
        <div v-if="browserOpen === 'good'" class="bisect-browser rounded-rm border border-rm-border bg-rm-surface/50 flex flex-col overflow-hidden">
          <InputText
            v-model="goodSearch"
            type="text"
            class="rounded-none border-0 border-b border-rm-border placeholder:text-rm-muted"
            placeholder="Search by hash, title, description or author"
          />
            <div class="overflow-auto max-h-48 min-h-0">
              <Button
                v-for="c in filteredGoodCommits"
                :key="c.sha"
                variant="text"
                size="small"
                class="bisect-commit-row w-full justify-start text-xs px-2 py-2 min-w-0 rounded-none border-0 border-b border-rm-border hover:bg-rm-accent/15 text-rm-text"
                :class="{ 'opacity-50 cursor-not-allowed': c.sha === badRef.trim() }"
                :disabled="c.sha === badRef.trim()"
                @click="selectRef('good', c.sha)"
              >
                <span class="font-mono text-rm-muted">{{ c.sha }}</span>
                <span class="mx-1.5">·</span>
                <span class="truncate">{{ c.subject || '(no subject)' }}</span>
                <span class="block text-[11px] text-rm-muted mt-0.5">{{ c.author }} · {{ c.date }}</span>
              </Button>
              <template v-if="commitsLoading">
                <Skeleton width="100%" height="2rem" class="mb-2" />
                <Skeleton width="100%" height="2rem" class="mb-2" />
                <Skeleton width="80%" height="2rem" />
              </template>
              <p v-else-if="filteredGoodCommits.length === 0" class="text-xs text-rm-muted p-2 m-0">No commits match.</p>
            </div>
        </div>
      </div>

      <Message v-if="startBisectError" severity="warn" class="text-xs">{{ startBisectError }}</Message>
    </div>
    <template #footer>
      <Button severity="primary" size="small" :disabled="!canStartBisect" :title="startBisectError || undefined" @click="confirm">Start bisect</Button>
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
import { useBisectRefPicker } from '../../plugins/git/bisect';

const props = defineProps({
  dirPath: { type: String, default: '' },
  defaultBad: { type: String, default: 'HEAD' },
  defaultGood: { type: String, default: '' },
});
const emit = defineEmits(['close', 'confirm']);

const {
  badRef,
  goodRef,
  browserOpen,
  badSearch,
  goodSearch,
  commitsLoading,
  filteredBadCommits,
  filteredGoodCommits,
  canStartBisect,
  startBisectError,
  toggleBrowser,
  selectRef,
  close,
  confirm,
} = useBisectRefPicker(
  () => props.dirPath,
  () => props.defaultBad,
  () => props.defaultGood,
  emit
);
</script>
