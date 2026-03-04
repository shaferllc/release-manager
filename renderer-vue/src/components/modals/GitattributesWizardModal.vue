<template>
  <RmModal title=".gitattributes — create or edit" class="max-w-2xl max-h-[90vh]" @close="close">
    <div class="flex flex-col gap-4 overflow-y-auto min-h-0">
        <!-- Wizard: check then add -->
        <div class="rounded-rm border border-rm-border bg-rm-surface/20 p-3">
          <p class="text-[11px] font-medium text-rm-muted uppercase tracking-wider m-0 mb-2">Add rules</p>
          <p class="text-xs text-rm-muted m-0 mb-3">Check what you need, then click Add selected. Duplicates are skipped.</p>
          <div class="flex flex-col gap-1.5 mb-3">
            <label
              v-for="opt in wizardOptions"
              :key="opt.id"
              class="flex items-start gap-2 text-xs group"
              :class="isOptionFullyInContent(opt) ? 'cursor-default opacity-90' : 'cursor-pointer'"
            >
              <input
                type="checkbox"
                :checked="isWizardSelected(opt.id) || isOptionAnyInContent(opt)"
                :disabled="isOptionFullyInContent(opt)"
                class="rounded border-rm-border mt-0.5 shrink-0"
                :title="isOptionFullyInContent(opt) ? 'Already in file' : undefined"
                @change="toggleWizardOption(opt.id)"
              />
              <span class="flex-1 min-w-0">
                <span class="font-medium text-rm-text group-hover:text-rm-accent">{{ opt.label }}</span>
                <span class="text-rm-muted block mt-0.5">{{ opt.description }}</span>
              </span>
            </label>
          </div>
          <RmButton
            variant="primary"
            size="compact"
            class="text-xs"
            :disabled="wizardSelected.length === 0"
            @click="addSelected"
          >
            Add selected
          </RmButton>
        </div>

        <!-- Presets -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[11px] font-medium text-rm-muted uppercase tracking-wider">Presets</span>
          <RmSelect v-model="selectedPresetId" class="text-xs py-1.5 px-2 min-w-0 max-w-[14rem]">
            <option value="">Choose preset…</option>
            <option v-for="p in presets" :key="p.id" :value="p.id">{{ p.label }}</option>
          </RmSelect>
          <RmButton variant="secondary" size="compact" class="text-xs" :disabled="!selectedPresetId" @click="appendPreset">Add preset</RmButton>
        </div>

        <!-- Inline diff: removed / added vs HEAD -->
        <div v-if="inlineDiffLines.length > 0" class="rounded-rm border border-rm-border bg-rm-bg overflow-hidden flex flex-col">
          <p class="text-[11px] font-medium text-rm-muted uppercase tracking-wider m-0 px-2 py-1.5 border-b border-rm-border">Changes vs HEAD</p>
          <div class="text-xs font-mono overflow-y-auto max-h-40 min-h-0 p-2">
            <div
              v-for="(row, i) in inlineDiffLines"
              :key="i"
              class="diff-inline-line py-0.5 px-1.5 rounded-sm whitespace-pre-wrap break-all"
              :class="row.type === 'remove' ? 'bg-rm-danger/15 text-rm-danger' : row.type === 'add' ? 'bg-rm-success/15 text-rm-success' : 'text-rm-muted'"
            >
              <span class="select-none w-6 inline-block">{{ row.type === 'remove' ? '−' : row.type === 'add' ? '+' : ' ' }}</span>{{ row.line || ' ' }}
            </div>
          </div>
        </div>

        <!-- Editable content -->
        <div class="flex flex-col gap-1.5 min-h-0 flex-1">
          <label class="text-[11px] font-medium text-rm-muted uppercase tracking-wider">Content (edit below)</label>
          <RmTextarea
            v-model="localContent"
            class="w-full text-sm font-mono min-h-[14rem] flex-1"
            placeholder="No .gitattributes or add rules above"
            spellcheck="false"
          />
        </div>
    </div>
    <template #footer>
      <RmButton variant="secondary" size="compact" class="text-xs" @click="close">Cancel</RmButton>
      <RmButton variant="primary" size="compact" class="text-xs" @click="save">Save</RmButton>
    </template>
  </RmModal>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { RmButton, RmModal, RmSelect, RmTextarea } from '../ui';
import { GITATTRIBUTES_PRESETS, GITATTRIBUTES_WIZARD_OPTIONS } from '../detail/git/gitattributesPresets.js';

const props = defineProps({
  initialContent: { type: String, default: '' },
  baselineContent: { type: String, default: '' },
});

const emit = defineEmits(['close', 'applyAndSave']);

const wizardOptions = GITATTRIBUTES_WIZARD_OPTIONS;
const presets = GITATTRIBUTES_PRESETS;
const localContent = ref(props.initialContent || '');
const wizardSelected = ref([]);
const selectedPresetId = ref('');

watch(() => props.initialContent, (v) => { localContent.value = v || ''; }, { immediate: false });

/** Set of non-empty trimmed lines in the current content (for rule detection) */
const contentLineSet = computed(() => {
  const lines = (localContent.value || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return new Set(lines);
});

function getOptionLines(linesStr) {
  return (linesStr || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/** True if any line of this option is already in the file */
function isOptionAnyInContent(opt) {
  const optionLines = getOptionLines(opt.lines);
  return optionLines.some((line) => contentLineSet.value.has(line));
}

/** True if all lines of this option are already in the file → show checked and disable */
function isOptionFullyInContent(opt) {
  const optionLines = getOptionLines(opt.lines);
  return optionLines.length > 0 && optionLines.every((line) => contentLineSet.value.has(line));
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

const inlineDiffLines = computed(() => {
  const baseline = props.baselineContent ?? '';
  const current = localContent.value ?? '';
  if (!baseline && !current.trim()) return [];
  const lines = computeLineDiff(baseline, current);
  return lines.filter((r) => r.type === 'add' || r.type === 'remove');
});

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
  emit('close');
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

/** Return set of existing non-empty trimmed lines for duplicate check */
function existingLineSet(content) {
  const lines = (content || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return new Set(lines);
}

/** Append newContent to current, skipping lines that already exist (no duplicates) */
function appendWithoutDuplicates(current, newContent) {
  const existing = existingLineSet(current);
  const newLines = (newContent || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const toAdd = newLines.filter((line) => !existing.has(line));
  if (toAdd.length === 0) return current.trimEnd();
  const trimmed = current.trimEnd();
  const sep = trimmed ? '\n\n' : '';
  return trimmed + sep + toAdd.join('\n') + '\n';
}

/** Remove duplicate lines from content (first occurrence kept, order preserved) */
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

function appendPreset() {
  const preset = presets.find((p) => p.id === selectedPresetId.value);
  if (!preset?.content) return;
  localContent.value = appendWithoutDuplicates(localContent.value, preset.content);
}

function save() {
  emit('applyAndSave', deduplicateContent(localContent.value));
  emit('close');
}
</script>
