import { ref, computed, watch } from 'vue';
import { useApi } from './useApi';

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/**
 * Composable for File Viewer modal: diff/blame content, render with line classes,
 * open in editor, switch view. Call with (getDirPath, getFilePath, getIsUntracked, emit).
 */
export function useFileViewer(getDirPath, getFilePath, getIsUntracked, emit) {
  const api = useApi();

  const viewMode = ref('diff'); // 'diff' | 'blame'
  const content = ref('');

  const filePath = computed(() => getFilePath?.() || '');
  const showDiffBtn = computed(() => viewMode.value === 'blame');

  const renderedContent = computed(() => {
    const raw = content.value;
    if (!raw) return '';
    return raw
      .split('\n')
      .map((line) => {
        let cls = '';
        if (line.startsWith('diff --git ')) cls = 'diff-header';
        else if (line.startsWith('index ')) cls = 'diff-meta';
        else if (line.startsWith('--- ')) cls = 'diff-file-old';
        else if (line.startsWith('+++ ')) cls = 'diff-file-new';
        else if (line.startsWith('@@') && line.includes('@@')) cls = 'diff-hunk';
        else if (line.startsWith('+')) cls = 'diff-add';
        else if (line.startsWith('-')) cls = 'diff-remove';
        else cls = 'diff-context';
        return `<div class="${cls}">${escapeHtml(line)}</div>`;
      })
      .join('\n');
  });

  async function loadDiff() {
    const dirPath = getDirPath?.();
    const path = getFilePath?.();
    if (!dirPath || !path) return;
    viewMode.value = 'diff';
    try {
      const result = await api.getFileDiff?.(dirPath, path, getIsUntracked?.());
      content.value = result?.error || result?.content || result || '';
    } catch (e) {
      content.value = String(e?.message || e);
    }
  }

  async function loadBlame() {
    const dirPath = getDirPath?.();
    const path = getFilePath?.();
    if (!dirPath || !path) return;
    viewMode.value = 'blame';
    try {
      const result = await api.getBlame?.(dirPath, path);
      content.value = result?.error || result?.content || result || '';
    } catch (e) {
      content.value = String(e?.message || e);
    }
  }

  watch(
    () => [getDirPath?.(), getFilePath?.()],
    loadDiff,
    { immediate: true }
  );

  function close() {
    emit?.('close');
  }

  function openInEditor() {
    const dirPath = getDirPath?.();
    const path = getFilePath?.();
    if (dirPath != null && path != null) api.openFileInEditor?.(dirPath, path);
  }

  function showBlame() {
    loadBlame();
  }

  function showDiff() {
    loadDiff();
  }

  return {
    filePath,
    renderedContent,
    showDiffBtn,
    close,
    openInEditor,
    showBlame,
    showDiff,
  };
}
