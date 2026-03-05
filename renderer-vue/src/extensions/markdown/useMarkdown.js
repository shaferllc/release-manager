import { ref, computed, watch } from 'vue';
import { useApi } from '../../composables/useApi';

/**
 * Composable for the Markdown docs extension: list .md files, read/write content, selection.
 * @param {import('vue').Ref<object>|import('vue').ComputedRef<object>} getInfo - Ref/computed of project info (info.path = dirPath)
 */
export function useMarkdown(getInfo) {
  const api = useApi();

  const files = ref([]);
  const loading = ref(false);
  const error = ref('');
  const selectedPath = ref(null);
  const content = ref('');
  const contentError = ref('');
  const contentDirty = ref(false);
  const saving = ref(false);
  const saveError = ref('');

  const dirPath = computed(() => (getInfo && typeof getInfo.value !== 'undefined' ? getInfo.value?.path : null) ?? null);

  const markdownFiles = computed(() => {
    const list = files.value || [];
    return list.filter((f) => /\.(md|markdown)$/i.test(f)).sort((a, b) => a.localeCompare(b));
  });

  async function loadFiles() {
    const path = dirPath.value;
    if (!path || !api.getProjectFiles) return;
    loading.value = true;
    error.value = '';
    try {
      const result = await api.getProjectFiles(path);
      if (result?.ok && Array.isArray(result.files)) {
        files.value = result.files;
      } else {
        files.value = [];
        error.value = result?.error || 'Failed to list files';
      }
    } catch (e) {
      files.value = [];
      error.value = e?.message || 'Failed to list files';
    } finally {
      loading.value = false;
    }
  }

  async function loadContent(relativePath) {
    const path = dirPath.value;
    if (!path || !relativePath || !api.readProjectFile) return;
    contentError.value = '';
    content.value = '';
    try {
      const result = await api.readProjectFile(path, relativePath);
      if (result?.ok) {
        content.value = result.content ?? '';
        contentDirty.value = false;
      } else {
        content.value = '';
        contentError.value = result?.error || 'Failed to read file';
      }
    } catch (e) {
      content.value = '';
      contentError.value = e?.message || 'Failed to read file';
    }
  }

  async function saveContent() {
    const path = dirPath.value;
    const rel = selectedPath.value;
    if (!path || !rel || !api.writeProjectFile) return;
    saving.value = true;
    saveError.value = '';
    try {
      const result = await api.writeProjectFile(path, rel, content.value);
      if (result?.ok) {
        contentDirty.value = false;
      } else {
        saveError.value = result?.error || 'Failed to save';
      }
    } catch (e) {
      saveError.value = e?.message || 'Failed to save';
    } finally {
      saving.value = false;
    }
  }

  function openInEditor() {
    const path = dirPath.value;
    const rel = selectedPath.value;
    if (path != null && rel != null && api.openFileInEditor) api.openFileInEditor(path, rel);
  }

  watch(
    dirPath,
    (path) => {
      if (path) {
        loadFiles();
        selectedPath.value = null;
        content.value = '';
        contentDirty.value = false;
      } else {
        files.value = [];
        selectedPath.value = null;
        content.value = '';
      }
    },
    { immediate: true }
  );

  watch(selectedPath, (rel) => {
    if (rel) loadContent(rel);
    else {
      content.value = '';
      contentError.value = '';
      contentDirty.value = false;
    }
  });

  // Persist last open file per project
  watch(
    selectedPath,
    async (rel) => {
      const path = dirPath.value;
      if (!rel || !path || !api.setPreference) return;
      try {
        const raw = await api.getPreference('markdownLastOpen');
        const obj = typeof raw === 'string' ? JSON.parse(raw || '{}') : {};
        obj[path] = rel;
        api.setPreference('markdownLastOpen', JSON.stringify(obj));
      } catch (_) {}
    },
    { flush: 'post' }
  );

  async function tryRestoreLastOpen() {
    const path = dirPath.value;
    const files = markdownFiles.value;
    if (!path || !files?.length || selectedPath.value || !api.getPreference) return;
    try {
      const raw = await api.getPreference('markdownLastOpen');
      const obj = typeof raw === 'string' ? JSON.parse(raw || '{}') : {};
      const last = obj[path];
      if (last && files.includes(last)) selectedPath.value = last;
    } catch (_) {}
  }

  watch(
    [markdownFiles, dirPath],
    ([files, path]) => {
      if (path && files?.length) tryRestoreLastOpen();
    },
    { flush: 'post' }
  );

  return {
    dirPath,
    markdownFiles,
    loading,
    error,
    selectedPath,
    content,
    contentError,
    contentDirty,
    saving,
    saveError,
    loadFiles,
    loadContent,
    saveContent,
    openInEditor,
    tryRestoreLastOpen,
  };
}
