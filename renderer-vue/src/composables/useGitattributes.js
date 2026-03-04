import { computed, watch } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';
import { useModals } from './useModals';
import { useRepoFileContent } from './useRepoFileContent';

/**
 * Composable for .gitattributes: load, edit via wizard, save.
 * @param {Object} options
 * @param {() => void} [options.onRefresh] - Called after save (e.g. emit('refresh'))
 * @returns {Object} content, error, saving, successMessage, contentSummary, load, openWizard
 */
export function useGitattributes({ onRefresh = () => {} } = {}) {
  const store = useAppStore();
  const api = useApi();
  const modals = useModals();
  const file = useRepoFileContent({
    getKey: 'getGitattributes',
    writeKey: 'writeGitattributes',
    onRefresh,
  });

  const contentSummary = computed(() => {
    const t = file.content.value.trim();
    if (!t) return 'No .gitattributes or load failed. Open the wizard to create or edit.';
    const lines = t.split(/\r?\n/).filter((l) => l.trim().length > 0);
    return lines.length === 0 ? 'Empty' : `${lines.length} line${lines.length === 1 ? '' : 's'}. Open the wizard to edit.`;
  });

  watch(() => store.selectedPath, file.loadContent, { immediate: true });

  async function openWizard() {
    const path = store.selectedPath;
    if (!path) return;
    let baselineContent = '';
    if (api.getFileAtRef) {
      try {
        const r = await api.getFileAtRef(path, '.gitattributes', 'HEAD');
        if (r?.ok && r.content != null) baselineContent = r.content;
      } catch (_) {}
    }
    modals.openModal('gitattributesWizard', {
      initialContent: file.content.value,
      baselineContent,
      onApplyAndSave(c) {
        file.content.value = c;
        file.save();
      },
    });
  }

  return {
    content: file.content,
    error: file.error,
    saving: file.saving,
    successMessage: file.successMessage,
    contentSummary,
    load: file.loadContent,
    openWizard,
  };
}
