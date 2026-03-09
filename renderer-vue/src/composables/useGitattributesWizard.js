import { ref, watch, computed } from 'vue';
import { GITATTRIBUTES_PRESETS, GITATTRIBUTES_WIZARD_OPTIONS } from '../plugins/git/gitattributes/gitattributesPresets.js';

function getOptionLines(linesStr) {
  return (linesStr || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/** Inline diff: ordered list of { type: 'add'|'remove'|'context', line } (baseline vs current). */
function computeLineDiff(oldText, newText) {
  const oldLines = (oldText || '').split(/\r?\n/);
  const newLines = (newText || '').split(/\r?\n/);
  const result = [];
  let i = 0;
  let j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      result.push({ type: 'context', line: newLines[j] });
      i++;
      j++;
      continue;
    }
    if (j < newLines.length && (i >= oldLines.length || oldLines.indexOf(newLines[j], i) === -1)) {
      result.push({ type: 'add', line: newLines[j] });
      j++;
      continue;
    }
    if (i < oldLines.length && (j >= newLines.length || newLines.indexOf(oldLines[i], j) === -1)) {
      result.push({ type: 'remove', line: oldLines[i] });
      i++;
      continue;
    }
    if (i < oldLines.length && j < newLines.length) {
      const nextOld = newLines.indexOf(oldLines[i], j);
      const nextNew = oldLines.indexOf(newLines[j], i);
      if (nextOld !== -1 && (nextNew === -1 || nextOld - j <= nextNew - i)) {
        while (j < nextOld) {
          result.push({ type: 'add', line: newLines[j] });
          j++;
        }
        result.push({ type: 'context', line: newLines[j] });
        i++;
        j++;
      } else if (nextNew !== -1) {
        while (i < nextNew) {
          result.push({ type: 'remove', line: oldLines[i] });
          i++;
        }
        result.push({ type: 'context', line: oldLines[i] });
        i++;
        j++;
      } else {
        result.push({ type: 'remove', line: oldLines[i] });
        result.push({ type: 'add', line: newLines[j] });
        i++;
        j++;
      }
    }
  }
  return result;
}

function existingLineSet(content) {
  const lines = (content || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return new Set(lines);
}

function appendWithoutDuplicates(current, newContent) {
  const existing = existingLineSet(current);
  const newLines = (newContent || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const toAdd = newLines.filter((line) => !existing.has(line));
  if (toAdd.length === 0) return current.trimEnd();
  const trimmed = current.trimEnd();
  const sep = trimmed ? '\n\n' : '';
  return trimmed + sep + toAdd.join('\n') + '\n';
}

function deduplicateContent(content) {
  const lines = (content || '').split(/\r?\n/);
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      out.push(line);
      continue;
    }
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + (out.length ? '\n' : '');
}

/**
 * Composable for .gitattributes wizard modal: wizard options, presets, local content,
 * inline diff vs baseline, add selected / append preset, save. Call with (getInitialContent, getBaselineContent, emit).
 */
export function useGitattributesWizard(getInitialContent, getBaselineContent, emit) {
  const wizardOptions = GITATTRIBUTES_WIZARD_OPTIONS;
  const presets = GITATTRIBUTES_PRESETS;

  const localContent = ref(getInitialContent?.() || '');
  const wizardSelected = ref([]);
  const selectedPresetId = ref('');

  const presetSelectOptions = computed(() => [
    { value: '', label: 'Choose preset…' },
    ...presets.map((p) => ({ value: p.id, label: p.label })),
  ]);

  const contentLineSet = computed(() => {
    const lines = (localContent.value || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return new Set(lines);
  });

  const inlineDiffLines = computed(() => {
    const baseline = getBaselineContent?.() ?? '';
    const current = localContent.value ?? '';
    if (!baseline && !current.trim()) return [];
    const lines = computeLineDiff(baseline, current);
    return lines.filter((r) => r.type === 'add' || r.type === 'remove');
  });

  watch(
    () => getInitialContent?.(),
    (v) => {
      if (v !== undefined) localContent.value = v || '';
    },
    { immediate: false }
  );

  function isOptionAnyInContent(opt) {
    const optionLines = getOptionLines(opt.lines);
    return optionLines.some((line) => contentLineSet.value.has(line));
  }

  function isOptionFullyInContent(opt) {
    const optionLines = getOptionLines(opt.lines);
    return optionLines.length > 0 && optionLines.every((line) => contentLineSet.value.has(line));
  }

  function isWizardSelected(id) {
    return wizardSelected.value.includes(id);
  }

  function toggleWizardOption(id) {
    const arr = wizardSelected.value;
    if (arr.includes(id)) {
      wizardSelected.value = arr.filter((x) => x !== id);
    } else {
      wizardSelected.value = [...arr, id];
    }
  }

  function close() {
    emit?.('close');
  }

  function addSelected() {
    const ids = wizardSelected.value;
    if (!ids.length) return;
    const generated = wizardOptions
      .filter((opt) => ids.includes(opt.id))
      .map((opt) => opt.lines.trim())
      .join('\n\n') + '\n';
    localContent.value = appendWithoutDuplicates(localContent.value, generated);
  }

  function appendPreset() {
    const preset = presets.find((p) => p.id === selectedPresetId.value);
    if (!preset?.content) return;
    localContent.value = appendWithoutDuplicates(localContent.value, preset.content);
  }

  function save() {
    emit?.('applyAndSave', deduplicateContent(localContent.value));
    emit?.('close');
  }

  return {
    wizardOptions,
    presets,
    presetSelectOptions,
    localContent,
    wizardSelected,
    selectedPresetId,
    inlineDiffLines,
    isOptionAnyInContent,
    isOptionFullyInContent,
    isWizardSelected,
    toggleWizardOption,
    close,
    addSelected,
    appendPreset,
    save,
  };
}
