import { ref, computed, watch, onMounted } from 'vue';
import { useApi } from '../../../composables/useApi';
import { useAiGenerateAvailable } from '../../../composables/useAiGenerateAvailable';

function matchCommit(c, q) {
  if (!q || !q.trim()) return true;
  const s = q.trim().toLowerCase();
  const sha = (c.sha || '').toLowerCase();
  const subject = (c.subject || '').toLowerCase();
  const author = (c.author || '').toLowerCase();
  const body = (c.body || '').toLowerCase();
  return sha.includes(s) || subject.includes(s) || author.includes(s) || body.includes(s);
}

/** Parse v1.2.3 or 1.2.3 and return [major, minor, patch] or null. */
function parseVersion(tagNameStr) {
  const m = String(tagNameStr).match(/v?(\d+)\.(\d+)\.(\d+)/);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)] : null;
}

/**
 * Composable for Create Tag modal: tag name/message/ref, suggest version, ref browser,
 * fill message from ref, AI generate message, submit. Call with (getDirPath, getInitialRef, emit, notifications).
 */
export function useCreateTag(getDirPath, getInitialRef, emit, notifications) {
  const api = useApi();
  const { aiGenerateAvailable } = useAiGenerateAvailable();

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

  const dirPath = computed(() => getDirPath?.() || '');

  const filteredRefCommits = computed(() =>
    refCommits.value.filter((c) => matchCommit(c, refSearch.value))
  );

  function close() {
    emit?.('close');
  }

  function suggestVersion() {
    const path = dirPath.value;
    if (!path || !api.getTags) return;
    tagsLoading.value = true;
    error.value = '';
    api
      .getTags(path)
      .then((result) => {
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
      })
      .catch(() => {
        tagsLoading.value = false;
      });
  }

  async function fillMessageFromRef() {
    const path = dirPath.value;
    if (!path || !api.getCommitSubject) return;
    const ref = (tagRef.value || 'HEAD').trim();
    messageFromRefLoading.value = true;
    error.value = '';
    try {
      const result = await api.getCommitSubject(path, ref);
      if (result?.ok && result.subject) tagMessage.value = result.subject;
      else if (!result?.ok) error.value = result?.error || 'Could not get commit message.';
    } finally {
      messageFromRefLoading.value = false;
    }
  }

  async function generateMessageWithAi() {
    const path = dirPath.value;
    if (!path || !api.ollamaGenerateTagMessage) return;
    const ref = (tagRef.value || '').trim() || null;
    aiGenerateLoading.value = true;
    error.value = '';
    try {
      const result = await api.ollamaGenerateTagMessage(path, ref);
      if (result?.ok && result.text) tagMessage.value = result.text.trim();
      else if (!result?.ok) error.value = result?.error || 'AI generate failed.';
    } finally {
      aiGenerateLoading.value = false;
    }
  }

  function loadRefCommits() {
    const path = dirPath.value;
    if (!path) return;
    const fetchLog = api.getCommitLogWithBody || api.getCommitLog;
    if (!fetchLog) return;
    refCommitsLoading.value = true;
    fetchLog(path, 100)
      .then((result) => {
        refCommits.value = result?.ok && Array.isArray(result.commits) ? result.commits : [];
      })
      .catch(() => {
        refCommits.value = [];
      })
      .finally(() => {
        refCommitsLoading.value = false;
      });
  }

  function toggleRefBrowser() {
    refBrowserOpen.value = !refBrowserOpen.value;
    if (refBrowserOpen.value && refCommits.value.length === 0 && dirPath.value) {
      loadRefCommits();
    }
  }

  function selectRefCommit(sha) {
    tagRef.value = sha;
    refBrowserOpen.value = false;
  }

  async function submit() {
    const name = tagName.value?.trim();
    const path = dirPath.value;
    if (!name || !path || !api.createTag) return;
    error.value = '';
    submitting.value = true;
    try {
      await api.createTag(
        path,
        name,
        tagMessage.value?.trim() || undefined,
        tagRef.value?.trim() || undefined
      );
      notifications?.add({ title: 'Tag created', message: name, type: 'success' });
      emit?.('created');
      emit?.('close');
    } catch (e) {
      const err = e?.message || 'Create tag failed.';
      error.value = err;
      notifications?.add({ title: 'Create tag failed', message: err, type: 'error' });
    } finally {
      submitting.value = false;
    }
  }

  watch(
    () => getDirPath?.(),
    (path) => {
      if (path) tagRef.value = (getInitialRef?.() || '').trim() || 'HEAD';
    }
  );

  watch(
    () => getInitialRef?.(),
    (r) => {
      if ((r || '').trim()) tagRef.value = r.trim();
    },
    { immediate: true }
  );

  onMounted(() => {
    if (getDirPath?.()) tagRef.value = (getInitialRef?.() || '').trim() || 'HEAD';
  });

  return {
    tagName,
    tagMessage,
    tagRef,
    error,
    submitting,
    tagsLoading,
    refBrowserOpen,
    refSearch,
    refCommits,
    refCommitsLoading,
    messageFromRefLoading,
    aiGenerateLoading,
    aiGenerateAvailable,
    dirPath,
    filteredRefCommits,
    close,
    suggestVersion,
    fillMessageFromRef,
    generateMessageWithAi,
    toggleRefBrowser,
    selectRefCommit,
    submit,
  };
}
