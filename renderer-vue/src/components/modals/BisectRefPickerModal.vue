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
              <button
                v-for="c in filteredBadCommits"
                :key="c.sha"
                type="button"
                class="bisect-commit-row w-full text-left text-xs px-2 py-2 border-0 border-b border-rm-border bg-transparent hover:bg-rm-accent/15 text-rm-text"
                :class="{ 'opacity-50 cursor-not-allowed': c.sha === goodRef.trim() }"
                :disabled="c.sha === goodRef.trim()"
                @click="selectRef('bad', c.sha)"
              >
                <span class="font-mono text-rm-muted">{{ c.sha }}</span>
                <span class="mx-1.5">·</span>
                <span class="truncate">{{ c.subject || '(no subject)' }}</span>
                <span class="block text-[11px] text-rm-muted mt-0.5">{{ c.author }} · {{ c.date }}</span>
              </button>
              <p v-if="commitsLoading" class="text-xs text-rm-muted p-2 m-0">Loading commits…</p>
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
              <button
                v-for="c in filteredGoodCommits"
                :key="c.sha"
                type="button"
                class="bisect-commit-row w-full text-left text-xs px-2 py-2 border-0 border-b border-rm-border bg-transparent hover:bg-rm-accent/15 text-rm-text"
                :class="{ 'opacity-50 cursor-not-allowed': c.sha === badRef.trim() }"
                :disabled="c.sha === badRef.trim()"
                @click="selectRef('good', c.sha)"
              >
                <span class="font-mono text-rm-muted">{{ c.sha }}</span>
                <span class="mx-1.5">·</span>
                <span class="truncate">{{ c.subject || '(no subject)' }}</span>
                <span class="block text-[11px] text-rm-muted mt-0.5">{{ c.author }} · {{ c.date }}</span>
              </button>
              <p v-if="commitsLoading" class="text-xs text-rm-muted p-2 m-0">Loading commits…</p>
              <p v-else-if="filteredGoodCommits.length === 0" class="text-xs text-rm-muted p-2 m-0">No commits match.</p>
            </div>
        </div>
      </div>

      <p v-if="startBisectError" class="text-xs text-rm-warning m-0">{{ startBisectError }}</p>
    </div>
    <template #footer>
      <Button severity="primary" size="small" :disabled="!canStartBisect" :title="startBisectError || undefined" @click="confirm">Start bisect</Button>
      <Button severity="secondary" size="small" @click="close">Cancel</Button>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import { useApi } from '../../composables/useApi';

const props = defineProps({
  dirPath: { type: String, default: '' },
  defaultBad: { type: String, default: 'HEAD' },
  defaultGood: { type: String, default: '' },
});
const emit = defineEmits(['close', 'confirm']);

const api = useApi();
const badRef = ref(props.defaultBad || 'HEAD');
const goodRef = ref(props.defaultGood || '');
const browserOpen = ref(null);
const badSearch = ref('');
const goodSearch = ref('');
const commits = ref([]);
const commitsLoading = ref(false);

function matchCommit(c, q) {
  if (!q || !q.trim()) return true;
  const s = q.trim().toLowerCase();
  const sha = (c.sha || '').toLowerCase();
  const subject = (c.subject || '').toLowerCase();
  const author = (c.author || '').toLowerCase();
  const body = (c.body || '').toLowerCase();
  return sha.includes(s) || subject.includes(s) || author.includes(s) || body.includes(s);
}

const filteredBadCommits = computed(() => {
  const q = badSearch.value;
  return commits.value.filter((c) => matchCommit(c, q));
});

const filteredGoodCommits = computed(() => {
  const q = goodSearch.value;
  return commits.value.filter((c) => matchCommit(c, q));
});

const canStartBisect = computed(() => {
  const bad = badRef.value.trim();
  const good = goodRef.value.trim();
  if (!bad || !good) return false;
  if (bad === good) return false;
  return commits.value.length >= 2;
});

const startBisectError = computed(() => {
  const bad = badRef.value.trim();
  const good = goodRef.value.trim();
  if (!bad || !good) return 'Set both bad and good refs.';
  if (bad === good) return 'Bad and good must be different commits.';
  if (commits.value.length < 2) return 'Need at least two commits to bisect.';
  return null;
});

watch(() => [props.defaultBad, props.defaultGood], () => {
  badRef.value = props.defaultBad || 'HEAD';
  goodRef.value = props.defaultGood || '';
});

onMounted(async () => {
  if (!props.dirPath) return;
  const fetchLog = api.getCommitLogWithBody || api.getCommitLog;
  if (!fetchLog) return;
  commitsLoading.value = true;
  try {
    const result = await fetchLog(props.dirPath, 100);
    commits.value = result?.ok && Array.isArray(result.commits) ? result.commits : [];
  } catch {
    commits.value = [];
  } finally {
    commitsLoading.value = false;
  }
});

function toggleBrowser(which) {
  browserOpen.value = browserOpen.value === which ? null : which;
}

function selectRef(which, sha) {
  if (which === 'bad') {
    if (sha === goodRef.value.trim()) return;
    badRef.value = sha;
    browserOpen.value = null;
  } else {
    if (sha === badRef.value.trim()) return;
    goodRef.value = sha;
    browserOpen.value = null;
  }
}

function close() {
  emit('close');
}

function confirm() {
  if (!canStartBisect.value) return;
  emit('confirm', { badRef: badRef.value.trim(), goodRef: goodRef.value.trim() });
  emit('close');
}
</script>
