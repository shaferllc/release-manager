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
              <button
                v-for="c in filteredRefCommits"
                :key="c.sha"
                type="button"
                class="create-tag-commit-row w-full text-left text-xs px-2 py-2 border-0 border-b border-rm-border bg-transparent hover:bg-rm-accent/15 text-rm-text"
                @click="selectRefCommit(c.sha)"
              >
                <span class="font-mono text-rm-muted">{{ c.sha }}</span>
                <span class="mx-1.5">·</span>
                <span class="truncate">{{ c.subject || '(no subject)' }}</span>
                <span class="block text-[11px] text-rm-muted mt-0.5">{{ c.author }} · {{ c.date }}</span>
              </button>
              <p v-if="refCommitsLoading" class="text-xs text-rm-muted p-2 m-0">Loading commits…</p>
              <p v-else-if="filteredRefCommits.length === 0" class="text-xs text-rm-muted p-2 m-0">No commits match.</p>
            </div>
          </div>
        </div>

      <p v-if="error" class="m-0 text-xs text-rm-warning">{{ error }}</p>
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
import { ref, computed, watch, onMounted } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import { useApi } from '../../composables/useApi';
import { useAiGenerateAvailable } from '../../composables/useAiGenerateAvailable';
import { useNotifications } from '../../composables/useNotifications';

const props = defineProps({
  dirPath: { type: String, default: '' },
  /** When opening "Create tag here" from branch menu, prefill ref (e.g. branch name). */
  initialRef: { type: String, default: '' },
});

const emit = defineEmits(['close', 'created']);

const api = useApi();
const { aiGenerateAvailable } = useAiGenerateAvailable();
const notifications = useNotifications();

const tagName = ref('');
const tagMessage = ref('');
const tagRef = ref('HEAD');
const error = ref('');
const submitting = ref(false);

const tagsLoading = ref(false);
const refBrowserOpen = ref(false);
const refSearch = ref('');
const refCommits = ref([]);
const refCommitsLoading = ref(false);
const messageFromRefLoading = ref(false);
const aiGenerateLoading = ref(false);

const dirPath = computed(() => props.dirPath || '');

function matchCommit(c, q) {
  if (!q || !q.trim()) return true;
  const s = q.trim().toLowerCase();
  const sha = (c.sha || '').toLowerCase();
  const subject = (c.subject || '').toLowerCase();
  const author = (c.author || '').toLowerCase();
  const body = (c.body || '').toLowerCase();
  return sha.includes(s) || subject.includes(s) || author.includes(s) || body.includes(s);
}

const filteredRefCommits = computed(() => {
  return refCommits.value.filter((c) => matchCommit(c, refSearch.value));
});

function close() {
  emit('close');
}

/** Parse v1.2.3 or 1.2.3 and return [major, minor, patch] or null. */
function parseVersion(tagNameStr) {
  const m = String(tagNameStr).match(/v?(\d+)\.(\d+)\.(\d+)/);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)] : null;
}

function suggestVersion() {
  if (!dirPath.value || !api.getTags) return;
  tagsLoading.value = true;
  error.value = '';
  api.getTags(dirPath.value).then((result) => {
    tagsLoading.value = false;
    const tags = result?.ok && Array.isArray(result.tags) ? result.tags : [];
    const latest = tags[0];
    if (!latest) {
      tagName.value = 'v1.0.0';
      return;
    }
    const v = parseVersion(latest);
    if (!v) {
      tagName.value = latest + '-next';
      return;
    }
    const [major, minor, patch] = v;
    tagName.value = `v${major}.${minor}.${patch + 1}`;
  }).catch(() => {
    tagsLoading.value = false;
  });
}

async function fillMessageFromRef() {
  if (!dirPath.value || !api.getCommitSubject) return;
  const ref = (tagRef.value || 'HEAD').trim();
  messageFromRefLoading.value = true;
  error.value = '';
  try {
    const result = await api.getCommitSubject(dirPath.value, ref);
    if (result?.ok && result.subject) tagMessage.value = result.subject;
    else if (!result?.ok) error.value = result?.error || 'Could not get commit message.';
  } finally {
    messageFromRefLoading.value = false;
  }
}

async function generateMessageWithAi() {
  if (!dirPath.value || !api.ollamaGenerateTagMessage) return;
  const ref = (tagRef.value || '').trim() || null;
  aiGenerateLoading.value = true;
  error.value = '';
  try {
    const result = await api.ollamaGenerateTagMessage(dirPath.value, ref);
    if (result?.ok && result.text) tagMessage.value = result.text.trim();
    else if (!result?.ok) error.value = result?.error || 'AI generate failed.';
  } finally {
    aiGenerateLoading.value = false;
  }
}

function toggleRefBrowser() {
  refBrowserOpen.value = !refBrowserOpen.value;
  if (refBrowserOpen.value && refCommits.value.length === 0 && dirPath.value) loadRefCommits();
}

function loadRefCommits() {
  if (!dirPath.value) return;
  const fetchLog = api.getCommitLogWithBody || api.getCommitLog;
  if (!fetchLog) return;
  refCommitsLoading.value = true;
  fetchLog(dirPath.value, 100).then((result) => {
    refCommits.value = result?.ok && Array.isArray(result.commits) ? result.commits : [];
  }).catch(() => {
    refCommits.value = [];
  }).finally(() => {
    refCommitsLoading.value = false;
  });
}

function selectRefCommit(sha) {
  tagRef.value = sha;
  refBrowserOpen.value = false;
}

async function submit() {
  const name = tagName.value?.trim();
  if (!name || !dirPath.value || !api.createTag) return;
  error.value = '';
  submitting.value = true;
  try {
    await api.createTag(
      dirPath.value,
      name,
      tagMessage.value?.trim() || undefined,
      tagRef.value?.trim() || undefined
    );
    notifications.add({ title: 'Tag created', message: name, type: 'success' });
    emit('created');
    emit('close');
  } catch (e) {
    const err = e?.message || 'Create tag failed.';
    error.value = err;
    notifications.add({ title: 'Create tag failed', message: err, type: 'error' });
  } finally {
    submitting.value = false;
  }
}

watch(() => props.dirPath, (path) => {
  if (path) tagRef.value = (props.initialRef || '').trim() || 'HEAD';
});

watch(() => props.initialRef, (r) => {
  if ((r || '').trim()) tagRef.value = r.trim();
}, { immediate: true });

onMounted(() => {
  if (props.dirPath) tagRef.value = (props.initialRef || '').trim() || 'HEAD';
});
</script>
