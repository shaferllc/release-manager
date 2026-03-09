import { ref, computed, watch } from 'vue';
import { useApi } from './useApi';

/**
 * Composable for Commit Detail modal: load commit (subject/body/diff/files), copy SHA,
 * cherry-pick, revert, amend, side-by-side diff. Call with (getDirPath, getSha, getIsHead, emit).
 */
export function useCommitDetail(getDirPath, getSha, getIsHead, emit) {
  const api = useApi();

  const content = ref('');
  const title = ref('');
  const commitFiles = ref([]);
  const sideBySideFile = ref('');

  const sideBySideFileOptions = computed(() =>
    commitFiles.value.map((f) => ({ value: f, label: f }))
  );

  async function load() {
    const dirPath = getDirPath?.();
    const sha = getSha?.();
    if (!dirPath || !sha) return;
    title.value = sha.slice(0, 7);
    try {
      const result = await api.getCommitDetail?.(dirPath, sha);
      if (result?.error) {
        content.value = result.error;
        commitFiles.value = [];
      } else if (result?.ok && result?.subject != null) {
        const msg = [result.subject, result.body, result.diff].filter(Boolean).join('\n\n');
        content.value = msg || 'No details.';
        commitFiles.value = Array.isArray(result.files) ? result.files : [];
        if (commitFiles.value.length && !sideBySideFile.value) {
          sideBySideFile.value = commitFiles.value[0];
        }
      } else {
        content.value = 'No details.';
        commitFiles.value = [];
      }
    } catch (e) {
      content.value = String(e?.message || e);
      commitFiles.value = [];
    }
  }

  watch(
    () => [getDirPath?.(), getSha?.()],
    load,
    { immediate: true }
  );

  function close() {
    emit?.('close');
  }

  function openSideBySide() {
    const dirPath = getDirPath?.();
    const sha = getSha?.();
    if (sideBySideFile.value && dirPath && sha) {
      emit?.('open-diff-side-by-side', {
        dirPath,
        filePath: sideBySideFile.value,
        commitSha: sha,
      });
    }
  }

  async function copySha() {
    const sha = getSha?.();
    if (sha) await api.copyToClipboard?.(sha);
    close();
  }

  async function cherryPick() {
    const dirPath = getDirPath?.();
    const sha = getSha?.();
    if (!dirPath || !sha) return;
    try {
      await api.gitCherryPick?.(dirPath, sha);
      emit?.('refresh');
      close();
    } catch (_) {}
  }

  async function revert() {
    const dirPath = getDirPath?.();
    const sha = getSha?.();
    if (!dirPath || !sha) return;
    try {
      await api.gitRevert?.(dirPath, sha);
      emit?.('refresh');
      close();
    } catch (_) {}
  }

  async function amend() {
    const dirPath = getDirPath?.();
    if (!dirPath) return;
    try {
      const message = content.value.split('\n\n')[0]?.trim() || '';
      await api.gitAmend?.(dirPath, message);
      emit?.('refresh');
      close();
    } catch (_) {}
  }

  return {
    content,
    title,
    commitFiles,
    sideBySideFile,
    sideBySideFileOptions,
    close,
    openSideBySide,
    copySha,
    cherryPick,
    revert,
    amend,
  };
}
