import { ref, computed, watch } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';
import { useRepoFileContent } from './useRepoFileContent';

/**
 * Composable for .gitignore: load, save, suggestions, presets, quick add.
 * @param {Object} options
 * @param {() => void} [options.onRefresh] - Called after save (e.g. emit('refresh'))
 * @param {Array<{ id: string, label: string, content: string }>} options.presets - Preset list for append/replace
 * @param {Array<{ pattern: string, label: string }>} options.quickAdd - Quick-add pattern buttons
 * @returns {Object} content, error, successMessage, saving, selectedPresetId, presetSelectOptions, suggestions, selectedSuggestions, quickAdd, load, save, toggleSuggestion, addSelectedSuggestions, appendPreset, replaceWithPreset, quickAddPattern
 */
export function useGitignore({ onRefresh = () => {}, presets = [], quickAdd = [] } = {}) {
  const store = useAppStore();
  const api = useApi();
  const file = useRepoFileContent({
    getKey: 'getGitignore',
    writeKey: 'writeGitignore',
    onRefresh,
    successMessageDuration: 2500,
  });

  const selectedPresetId = ref('');
  const suggestions = ref([]);
  const selectedSuggestions = ref([]);

  const presetSelectOptions = computed(() => [
    { value: '', label: 'Choose preset…' },
    ...presets.map((p) => ({ value: p.id, label: p.label })),
  ]);

  async function loadSuggestions() {
    const path = store.selectedPath;
    if (!path || !api.scanProjectForGitignore) {
      suggestions.value = [];
      return;
    }
    try {
      const r = await api.scanProjectForGitignore(path);
      suggestions.value = r?.ok && Array.isArray(r.suggestions) ? r.suggestions : [];
      selectedSuggestions.value = selectedSuggestions.value.filter((p) =>
        suggestions.value.some((s) => s.pattern === p)
      );
    } catch {
      suggestions.value = [];
    }
  }

  async function load() {
    await file.loadContent();
    await loadSuggestions();
  }

  watch(() => store.selectedPath, load, { immediate: true });

  function toggleSuggestion(pattern, checked) {
    if (checked) {
      if (!selectedSuggestions.value.includes(pattern)) selectedSuggestions.value = [...selectedSuggestions.value, pattern];
    } else {
      selectedSuggestions.value = selectedSuggestions.value.filter((p) => p !== pattern);
    }
  }

  function addSelectedSuggestions() {
    const toAdd = [...selectedSuggestions.value];
    if (!toAdd.length) return;
    const trimmed = file.content.value.trimEnd();
    const sep = trimmed ? '\n' : '';
    const lines = toAdd.map((p) => p.trim()).filter(Boolean);
    const existing = new Set(trimmed.split(/\r?\n/).map((l) => l.trim()));
    const newLines = lines.filter((line) => {
      const norm = line.replace(/\/$/, '');
      return !existing.has(line) && !existing.has(norm) && !trimmed.includes(line);
    });
    if (newLines.length) file.content.value = trimmed + sep + '\n' + newLines.join('\n');
    selectedSuggestions.value = [];
    suggestions.value = suggestions.value.filter((s) => !toAdd.includes(s.pattern));
  }

  function appendPreset() {
    const preset = presets.find((p) => p.id === selectedPresetId.value);
    if (!preset) return;
    const sep = file.content.value.trim() ? '\n\n' : '';
    const block = `\n# --- ${preset.label} ---\n${preset.content.trim()}`;
    file.content.value = file.content.value.trimEnd() + sep + block;
  }

  function replaceWithPreset() {
    const preset = presets.find((p) => p.id === selectedPresetId.value);
    if (!preset) return;
    if (file.content.value.trim() && !window.confirm('Replace entire .gitignore with this preset? Current content will be lost.')) return;
    file.content.value = preset.content.trim();
  }

  function quickAddPattern(pattern) {
    const line = pattern.trim();
    if (!line) return;
    const trimmed = file.content.value.trimEnd();
    const already = trimmed.split(/\r?\n/).some((l) => l.trim() === line || l.trim() === line.replace(/\/$/, ''));
    if (already) return;
    const sep = trimmed ? '\n' : '';
    file.content.value = trimmed + sep + line;
  }

  return {
    content: file.content,
    error: file.error,
    successMessage: file.successMessage,
    saving: file.saving,
    selectedPresetId,
    presetSelectOptions,
    suggestions,
    selectedSuggestions,
    quickAdd,
    load,
    save: file.save,
    toggleSuggestion,
    addSelectedSuggestions,
    appendPreset,
    replaceWithPreset,
    quickAddPattern,
  };
}
