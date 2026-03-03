<template>
  <div class="git-card">
    <p class="card-label mb-2">.gitignore</p>

    <!-- Smart suggestions: found in project, not yet ignored -->
    <div v-if="suggestions.length > 0" class="mb-3 p-3 rounded-rm border border-rm-border bg-rm-surface/20">
      <p class="text-[11px] font-medium text-rm-muted uppercase tracking-wider m-0 mb-2">Suggested for your project</p>
      <p class="text-xs text-rm-muted m-0 mb-2">We found these in your repo; they’re commonly ignored. Select to add.</p>
      <div class="flex flex-col gap-1.5 mb-2 max-h-40 overflow-y-auto">
        <label
          v-for="s in suggestions"
          :key="s.pattern"
          class="flex items-center gap-2 text-xs cursor-pointer hover:text-rm-text"
        >
          <input v-model="selectedSuggestions" type="checkbox" :value="s.pattern" class="rounded border-rm-border" />
          <span class="font-mono text-rm-text shrink-0">{{ s.pattern }}</span>
          <span class="text-rm-muted truncate">{{ s.label }}</span>
          <span class="text-[10px] text-rm-muted shrink-0">({{ s.category }})</span>
        </label>
      </div>
      <button type="button" class="btn-primary btn-compact text-xs" :disabled="selectedSuggestions.length === 0" @click="addSelectedSuggestions">
        Add {{ selectedSuggestions.length ? selectedSuggestions.length : '' }} selected to .gitignore
      </button>
    </div>

    <!-- Presets: append or replace -->
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <span class="text-[11px] font-medium text-rm-muted uppercase tracking-wider">Presets</span>
      <select v-model="selectedPresetId" class="input-field text-xs py-1.5 px-2 rounded-rm border border-rm-border bg-rm-bg text-rm-text min-w-0 max-w-[11rem]">
        <option value="">Choose preset…</option>
        <option v-for="p in presets" :key="p.id" :value="p.id">{{ p.label }}</option>
      </select>
      <button type="button" class="btn-secondary btn-compact text-xs" :disabled="!selectedPresetId" @click="appendPreset">
        Append preset
      </button>
      <button type="button" class="btn-secondary btn-compact text-xs" :disabled="!selectedPresetId" title="Replace entire file with preset" @click="replaceWithPreset">
        Replace with preset
      </button>
    </div>

    <!-- Quick add: single patterns -->
    <div class="flex flex-wrap items-center gap-1.5 mb-3">
      <span class="text-[11px] font-medium text-rm-muted uppercase tracking-wider shrink-0">Quick add</span>
      <button
        v-for="q in quickAdd"
        :key="q.pattern"
        type="button"
        class="text-[10px] px-2 py-1 rounded-rm border border-rm-border bg-rm-surface/50 text-rm-muted hover:text-rm-text hover:border-rm-accent/50 hover:bg-rm-accent/10 border-solid cursor-pointer"
        :title="'Add ' + q.pattern"
        @click="quickAddPattern(q.pattern)"
      >
        {{ q.label }}
      </button>
    </div>

    <textarea v-model="content" class="input-field w-full text-sm font-mono resize-y min-h-[12rem]" placeholder="No .gitignore or load failed"></textarea>
    <div class="flex flex-wrap items-center gap-2 mt-2">
      <button type="button" class="btn-primary btn-compact text-xs" :disabled="saving" @click="save">
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
      <button type="button" class="btn-secondary btn-compact text-xs" :disabled="saving" @click="load">Reload</button>
      <span v-if="successMessage" class="text-xs font-medium text-rm-accent">{{ successMessage }}</span>
    </div>
    <p v-if="error" class="m-0 mt-2 text-xs text-rm-warning">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';
import { GITIGNORE_PRESETS, GITIGNORE_QUICK_ADD } from './gitignorePresets.js';

const emit = defineEmits(['refresh']);
const store = useAppStore();
const api = useApi();
const content = ref('');
const error = ref('');
const successMessage = ref('');
const saving = ref(false);
const selectedPresetId = ref('');
const suggestions = ref([]);
const selectedSuggestions = ref([]);

const presets = GITIGNORE_PRESETS;
const quickAdd = GITIGNORE_QUICK_ADD;

async function load() {
  const path = store.selectedPath;
  if (!path || !api.getGitignore) return;
  error.value = '';
  try {
    const r = await api.getGitignore(path);
    content.value = (r?.ok && r.content != null) ? r.content : (typeof r === 'string' ? r : '');
  } catch {
    content.value = '';
  }
  await loadSuggestions();
}

async function loadSuggestions() {
  const path = store.selectedPath;
  if (!path || !api.scanProjectForGitignore) {
    suggestions.value = [];
    return;
  }
  try {
    const r = await api.scanProjectForGitignore(path);
    suggestions.value = r?.ok && Array.isArray(r.suggestions) ? r.suggestions : [];
    selectedSuggestions.value = selectedSuggestions.value.filter((p) => suggestions.value.some((s) => s.pattern === p));
  } catch {
    suggestions.value = [];
  }
}

function addSelectedSuggestions() {
  const toAdd = [...selectedSuggestions.value];
  if (!toAdd.length) return;
  const trimmed = content.value.trimEnd();
  const sep = trimmed ? '\n' : '';
  const lines = toAdd.map((p) => p.trim()).filter(Boolean);
  const existing = new Set(trimmed.split(/\r?\n/).map((l) => l.trim()));
  const newLines = lines.filter((line) => {
    const norm = line.replace(/\/$/, '');
    return !existing.has(line) && !existing.has(norm) && !trimmed.includes(line);
  });
  if (newLines.length) content.value = trimmed + sep + '\n' + newLines.join('\n');
  selectedSuggestions.value = [];
  suggestions.value = suggestions.value.filter((s) => !toAdd.includes(s.pattern));
}

watch(() => store.selectedPath, load, { immediate: true });

async function save() {
  const path = store.selectedPath;
  if (!path || !api.writeGitignore) return;
  error.value = '';
  successMessage.value = '';
  saving.value = true;
  try {
    await api.writeGitignore(path, content.value);
    successMessage.value = 'Saved.';
    emit('refresh');
    setTimeout(() => {
      successMessage.value = '';
    }, 2500);
  } catch (e) {
    error.value = e?.message || 'Save failed.';
  } finally {
    saving.value = false;
  }
}

function appendPreset() {
  const preset = presets.find((p) => p.id === selectedPresetId.value);
  if (!preset) return;
  const sep = content.value.trim() ? '\n\n' : '';
  const block = `\n# --- ${preset.label} ---\n${preset.content.trim()}`;
  content.value = content.value.trimEnd() + sep + block;
}

function replaceWithPreset() {
  const preset = presets.find((p) => p.id === selectedPresetId.value);
  if (!preset) return;
  if (content.value.trim() && !window.confirm('Replace entire .gitignore with this preset? Current content will be lost.')) return;
  content.value = preset.content.trim();
}

function quickAddPattern(pattern) {
  const line = pattern.trim();
  if (!line) return;
  const trimmed = content.value.trimEnd();
  const already = trimmed.split(/\r?\n/).some((l) => l.trim() === line || l.trim() === line.replace(/\/$/, ''));
  if (already) return;
  const sep = trimmed ? '\n' : '';
  content.value = trimmed + sep + line;
}
</script>
