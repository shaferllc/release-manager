import { ref, watch, computed, onMounted } from 'vue';
import { useApi } from '../../../composables/useApi';

function matchCommit(c, q) {
  if (!q || !q.trim()) return true;
  const s = q.trim().toLowerCase();
  const sha = (c.sha || '').toLowerCase();
  const subject = (c.subject || '').toLowerCase();
  const author = (c.author || '').toLowerCase();
  const body = (c.body || '').toLowerCase();
  return sha.includes(s) || subject.includes(s) || author.includes(s) || body.includes(s);
}

/**
 * Composable for Bisect Ref Picker modal: bad/good refs, commit browser, search, confirm.
 * Call with (getDirPath, getDefaultBad, getDefaultGood, emit). Loads commit log on mount.
 */
export function useBisectRefPicker(getDirPath, getDefaultBad, getDefaultGood, emit) {
  const api = useApi();

  const badRef = ref(getDefaultBad?.() || 'HEAD');
  const goodRef = ref(getDefaultGood?.() || '');
  const browserOpen = ref(null);
  const badSearch = ref('');
  const goodSearch = ref('');
  const commits = ref([]);
  const commitsLoading = ref(false);

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

  watch(
    () => [getDefaultBad?.(), getDefaultGood?.()],
    () => {
      badRef.value = getDefaultBad?.() || 'HEAD';
      goodRef.value = getDefaultGood?.() || '';
    }
  );

  onMounted(async () => {
    const dirPath = getDirPath?.();
    if (!dirPath) return;
    const fetchLog = api.getCommitLogWithBody || api.getCommitLog;
    if (!fetchLog) return;
    commitsLoading.value = true;
    try {
      const result = await fetchLog(dirPath, 100);
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
    emit?.('close');
  }

  function confirm() {
    if (!canStartBisect.value) return;
    emit?.('confirm', { badRef: badRef.value.trim(), goodRef: goodRef.value.trim() });
    emit?.('close');
  }

  return {
    badRef,
    goodRef,
    browserOpen,
    badSearch,
    goodSearch,
    commits,
    commitsLoading,
    filteredBadCommits,
    filteredGoodCommits,
    canStartBisect,
    startBisectError,
    toggleBrowser,
    selectRef,
    close,
    confirm,
  };
}
