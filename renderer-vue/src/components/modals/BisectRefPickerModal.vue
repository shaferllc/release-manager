<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-card flex flex-col max-w-lg max-h-[85vh]">
      <div class="modal-header flex-shrink-0">
        <h3 class="modal-title">Bisect — Step 1: Set refs</h3>
        <button type="button" class="modal-close" aria-label="Close" @click="close">×</button>
      </div>
      <div class="modal-body flex flex-col gap-4 p-4 overflow-hidden">
        <p class="text-xs text-rm-muted m-0">Choose the <strong class="text-rm-text">bad</strong> commit (where the bug exists) and a <strong class="text-rm-text">good</strong> commit (before the bug). Git will then check out commits in between for you to test.</p>

        <!-- Bad ref -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-rm-muted">Bad ref (has the bug)</label>
          <div class="flex gap-2 items-center">
            <input
              v-model="badRef"
              type="text"
              class="flex-1 min-w-0 text-sm rounded-rm border border-rm-border bg-rm-bg text-rm-text px-2 py-1.5"
              placeholder="e.g. HEAD"
            />
            <button type="button" class="btn-secondary btn-compact text-xs whitespace-nowrap" @click="toggleBrowser('bad')">
              {{ browserOpen === 'bad' ? 'Hide' : 'Browse' }}
            </button>
          </div>
          <div v-if="browserOpen === 'bad'" class="bisect-browser rounded-rm border border-rm-border bg-rm-surface/50 flex flex-col overflow-hidden">
            <input
              v-model="badSearch"
              type="text"
              class="text-sm rounded-none border-0 border-b border-rm-border bg-rm-bg text-rm-text px-2 py-1.5 placeholder:text-rm-muted"
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
            <input
              v-model="goodRef"
              type="text"
              class="flex-1 min-w-0 text-sm rounded-rm border border-rm-border bg-rm-bg text-rm-text px-2 py-1.5"
              placeholder="e.g. main or a commit SHA"
            />
            <button type="button" class="btn-secondary btn-compact text-xs whitespace-nowrap" @click="toggleBrowser('good')">
              {{ browserOpen === 'good' ? 'Hide' : 'Browse' }}
            </button>
          </div>
          <div v-if="browserOpen === 'good'" class="bisect-browser rounded-rm border border-rm-border bg-rm-surface/50 flex flex-col overflow-hidden">
            <input
              v-model="goodSearch"
              type="text"
              class="text-sm rounded-none border-0 border-b border-rm-border bg-rm-bg text-rm-text px-2 py-1.5 placeholder:text-rm-muted"
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
        <div class="flex gap-2 flex-shrink-0">
          <button type="button" class="btn-primary btn-compact text-sm" :disabled="!canStartBisect" :title="startBisectError || undefined" @click="confirm">Start bisect</button>
          <button type="button" class="btn-secondary btn-compact text-sm" @click="close">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
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
