import { ref, computed, watch } from 'vue';
import { useApi } from './useApi';

/**
 * Composable for Diff Side-by-Side modal: load structured diff, rows with insert hints,
 * use old/new per line, copy line, discard entire file. Call with (getDirPath, getFilePath, getCommitSha, getStaged, getTitle, emit).
 */
export function useDiffSideBySide(getDirPath, getFilePath, getCommitSha, getStaged, getTitle, emit) {
  const api = useApi();

  const loading = ref(true);
  const error = ref('');
  const rows = ref([]);
  const revertStatus = ref(null);

  const dirPath = computed(() => getDirPath?.() || '');
  const filePath = computed(() => getFilePath?.() || '');
  const commitSha = computed(() => getCommitSha?.() || '');

  const displayTitle = computed(() => {
    const title = getTitle?.();
    if (title) return title;
    const sha = commitSha.value;
    const path = filePath.value;
    if (sha) return `Diff: ${path} @ ${sha.slice(0, 7)}`;
    const staged = getStaged?.();
    if (staged === true) return `Diff (staged): ${path}`;
    if (staged === false) return `Diff (unstaged): ${path}`;
    return `Diff: ${path}`;
  });

  const rowsWithInsert = computed(() => {
    const list = rows.value;
    const out = list.map((r) => ({ ...r }));
    for (let i = 0; i < out.length; i++) {
      if (out[i].type === 'remove' && out[i].newLineNum == null) {
        for (let j = i + 1; j < out.length; j++) {
          if (out[j].newLineNum != null) {
            out[i].insertBeforeNewLine = out[j].newLineNum;
            break;
          }
        }
        if (out[i].insertBeforeNewLine == null) {
          const prev = out.slice(0, i).reverse().find((r) => r.newLineNum != null);
          out[i].insertBeforeNewLine = prev ? prev.newLineNum + 1 : 1;
        }
      }
    }
    return out;
  });

  function rowTypeClass(row) {
    if (row.type === 'add') return 'diff-row-add';
    if (row.type === 'remove') return 'diff-row-remove';
    return 'diff-row-context';
  }

  function canUseOld(row) {
    if (commitSha.value || !dirPath.value || !filePath.value || row.revertedToOld) return false;
    if (row.type === 'add') return true;
    if (row.type === 'remove') return true;
    if (row.type === 'context' && row.oldContent !== row.newContent) return false;
    if (row.type === 'context') return false;
    return row.newLineNum != null && (row.oldContent != null || row.type === 'add');
  }

  function canUseNew(row) {
    if (commitSha.value || !dirPath.value || !filePath.value || !row.revertedToOld) return false;
    return row.originalNewContent !== undefined;
  }

  async function useOld(row) {
    const d = dirPath.value;
    const f = filePath.value;
    revertStatus.value = null;
    try {
      if (row.type === 'add') {
        const res = await api.revertFileLine?.(d, f, 'delete', row.newLineNum, null);
        revertStatus.value = res;
        if (res?.ok) {
          row.originalNewContent = row.newContent;
          row.newContent = null;
          row.revertedToOld = true;
        }
      } else if (row.type === 'remove' && row.insertBeforeNewLine != null) {
        const res = await api.revertFileLine?.(d, f, 'insert', row.insertBeforeNewLine, row.oldContent);
        revertStatus.value = res;
        if (res?.ok) {
          row.originalNewContent = row.newContent;
          row.newContent = row.oldContent;
          row.revertedToOld = true;
        }
      } else if (row.newLineNum != null && row.oldContent != null) {
        const res = await api.revertFileLine?.(d, f, 'replace', row.newLineNum, row.oldContent);
        revertStatus.value = res;
        if (res?.ok) {
          row.originalNewContent = row.newContent;
          row.newContent = row.oldContent;
          row.revertedToOld = true;
        }
      }
      if (revertStatus.value?.ok) {
        emit?.('refresh');
        setTimeout(() => { revertStatus.value = null; }, 3000);
      }
    } catch (e) {
      revertStatus.value = { ok: false, error: e?.message || String(e) };
    }
  }

  async function useNew(row) {
    const d = dirPath.value;
    const f = filePath.value;
    revertStatus.value = null;
    try {
      if (row.type === 'add') {
        const res = await api.revertFileLine?.(d, f, 'insert', row.newLineNum, row.originalNewContent ?? row.newContent);
        revertStatus.value = res;
        if (res?.ok) {
          row.newContent = row.originalNewContent;
          row.revertedToOld = false;
        }
      } else if (row.type === 'remove' && row.insertBeforeNewLine != null) {
        const res = await api.revertFileLine?.(d, f, 'delete', row.insertBeforeNewLine, null);
        revertStatus.value = res;
        if (res?.ok) {
          row.newContent = null;
          row.revertedToOld = false;
        }
      } else if (row.newLineNum != null && row.originalNewContent !== undefined) {
        const res = await api.revertFileLine?.(d, f, 'replace', row.newLineNum, row.originalNewContent);
        revertStatus.value = res;
        if (res?.ok) {
          row.newContent = row.originalNewContent;
          row.revertedToOld = false;
        }
      }
      if (revertStatus.value?.ok) {
        emit?.('refresh');
        setTimeout(() => { revertStatus.value = null; }, 3000);
      }
    } catch (e) {
      revertStatus.value = { ok: false, error: e?.message || String(e) };
    }
  }

  async function copyLine(text) {
    if (text != null && api.copyToClipboard) await api.copyToClipboard(text);
  }

  async function discardEntireFile() {
    const d = dirPath.value;
    const f = filePath.value;
    if (!d || !f || !api.discardFile) return;
    if (!window.confirm(`Discard all changes in "${f}"? This cannot be undone.`)) return;
    revertStatus.value = null;
    try {
      await api.discardFile(d, f);
      emit?.('refresh');
      close();
    } catch (e) {
      revertStatus.value = { ok: false, error: e?.message || String(e) };
    }
  }

  async function load() {
    const d = dirPath.value;
    const f = filePath.value;
    if (!d || !f) {
      loading.value = false;
      return;
    }
    loading.value = true;
    error.value = '';
    try {
      const sha = getCommitSha?.();
      const staged = getStaged?.();
      const options = sha ? { commitSha: sha } : { staged };
      const result = await api.getFileDiffStructured?.(d, f, options);
      if (result?.error) {
        error.value = result.error;
        rows.value = [];
      } else if (result?.ok) {
        const raw = result.rows || [];
        rows.value = raw.map((r) => ({
          ...r,
          originalNewContent: r.newContent,
          revertedToOld: false,
        }));
      } else {
        rows.value = [];
      }
    } catch (e) {
      error.value = e?.message || String(e);
      rows.value = [];
    } finally {
      loading.value = false;
    }
  }

  watch(
    () => [getDirPath?.(), getFilePath?.(), getCommitSha?.(), getStaged?.()],
    load,
    { immediate: true }
  );

  function close() {
    emit?.('close');
  }

  return {
    loading,
    error,
    rows,
    revertStatus,
    dirPath,
    filePath,
    commitSha,
    displayTitle,
    rowsWithInsert,
    rowTypeClass,
    canUseOld,
    canUseNew,
    useOld,
    useNew,
    copyLine,
    discardEntireFile,
    close,
  };
}
