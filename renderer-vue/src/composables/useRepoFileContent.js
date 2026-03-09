import { ref } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';

/**
 * Shared composable: load/save a repo file via API (e.g. .gitattributes, .gitignore).
 * Used by useGitattributes and useGitignore for content, error, saving, successMessage, loadContent, save.
 * Does not set up a watch; consumers call loadContent (or their own load) when path changes.
 * @param {Object} options
 * @param {string} options.getKey - API method name to read content (e.g. 'getGitattributes')
 * @param {string} options.writeKey - API method name to write content (e.g. 'writeGitattributes')
 * @param {() => void} [options.onRefresh] - Called after save
 * @param {number} [options.successMessageDuration=2000] - Ms to show success message
 * @returns {{ content: Ref<string>, error: Ref<string>, saving: Ref<boolean>, successMessage: Ref<string>, loadContent: () => Promise<void>, save: () => Promise<void> }}
 */
export function useRepoFileContent({
  getKey,
  writeKey,
  onRefresh = () => {},
  successMessageDuration = 2000,
} = {}) {
  const store = useAppStore();
  const api = useApi();

  const content = ref('');
  const error = ref('');
  const saving = ref(false);
  const successMessage = ref('');

  async function loadContent() {
    const path = store.selectedPath;
    if (!path || !api[getKey]) return;
    error.value = '';
    successMessage.value = '';
    try {
      const r = await api[getKey](path);
      content.value = (r?.ok && r.content != null) ? r.content : (typeof r === 'string' ? r : '');
    } catch {
      content.value = '';
    }
  }

  async function save() {
    const path = store.selectedPath;
    if (!path || !api[writeKey]) return;
    error.value = '';
    successMessage.value = '';
    saving.value = true;
    try {
      await api[writeKey](path, content.value);
      onRefresh();
      successMessage.value = 'Saved.';
      setTimeout(() => { successMessage.value = ''; }, successMessageDuration);
    } catch (e) {
      error.value = e?.message || 'Save failed.';
    } finally {
      saving.value = false;
    }
  }

  return {
    content,
    error,
    saving,
    successMessage,
    loadContent,
    save,
  };
}
