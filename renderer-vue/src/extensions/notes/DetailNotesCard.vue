<template>
  <section class="card mb-6 detail-tab-panel detail-notes flex flex-col min-h-0" data-detail-tab="notes">
    <div class="notes-toolbar rounded-rm border border-rm-border bg-rm-surface/50 px-4 py-3 mb-5 flex flex-wrap items-center gap-4">
      <p class="text-sm text-rm-muted m-0 flex-1 min-w-0 max-w-xl">
        Scratch area for this project. Plain text or Markdown. Saved automatically.
      </p>
      <div class="flex items-center gap-2">
        <Button
          v-if="hasFileInRepo"
          severity="secondary"
          size="small"
          label="Load from repo"
          @click="loadFromRepo"
        />
        <Button
          severity="secondary"
          size="small"
          label="Save to repo"
          v-tooltip.top="'Write to .shipwell/notes.md in the project'"
          @click="saveToRepo"
        />
      </div>
    </div>

    <div class="notes-editor-wrap flex-1 flex flex-col min-h-0 rounded-rm border border-rm-border bg-rm-bg overflow-hidden">
      <Textarea
        v-model="content"
        class="notes-textarea flex-1 w-full border-0 resize-none min-h-[200px]"
        placeholder="Project notes, todos, release notes draft…"
        @blur="saveToPrefs"
        @input="scheduleSave"
      />
    </div>
    <p v-if="saveStatus" class="text-xs text-rm-muted mt-2 m-0">{{ saveStatus }}</p>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import { useApi } from '../../composables/useApi';
import { useAppStore } from '../../stores/app';

const props = defineProps({ info: { type: Object, default: null } });
const store = useAppStore();
const api = useApi();

const projectPath = ref('');
const content = ref('');
const saveStatus = ref('');
const hasFileInRepo = ref(false);

const PREF_KEY = 'projectNotes';
const NOTES_FILE = '.shipwell/notes.md';

function normalizePath(p) {
  if (p == null || typeof p !== 'string') return '';
  return p.trim().replace(/\\/g, '/').replace(/\/+$/, '') || '';
}

async function loadFromPrefs() {
  const path = normalizePath(props.info?.path ?? store.selectedPath ?? '');
  projectPath.value = path;
  if (!path) {
    content.value = '';
    return;
  }
  try {
    const map = await api.getPreference?.(PREF_KEY);
    const obj = typeof map === 'object' && map !== null ? map : {};
    const text = obj[path];
    content.value = typeof text === 'string' ? text : '';
  } catch {
    content.value = '';
  }
}

async function loadFromFile() {
  const path = projectPath.value;
  if (!path || !api.readProjectFile) return null;
  try {
    const result = await api.readProjectFile(path, NOTES_FILE);
    if (result?.ok && typeof result.content === 'string') {
      hasFileInRepo.value = true;
      return result.content;
    }
  } catch (_) {}
  hasFileInRepo.value = false;
  return null;
}

async function loadContent() {
  const path = normalizePath(props.info?.path ?? store.selectedPath ?? '');
  projectPath.value = path;
  if (!path) {
    content.value = '';
    hasFileInRepo.value = false;
    return;
  }
  const fileContent = await loadFromFile();
  if (fileContent != null) {
    content.value = fileContent;
    return;
  }
  await loadFromPrefs();
}

async function saveToPrefs() {
  const path = projectPath.value;
  if (!path || !api.setPreference) return;
  try {
    const current = (await api.getPreference?.(PREF_KEY)) || {};
    const next = { ...current };
    next[path] = content.value;
    await api.setPreference(PREF_KEY, next);
    saveStatus.value = 'Saved';
    setTimeout(() => { saveStatus.value = ''; }, 2000);
  } catch (_) {}
}

let saveTimeout = null;
function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveToPrefs(), 1500);
}

async function saveToRepo() {
  const path = projectPath.value;
  if (!path || !api.writeProjectFile) return;
  try {
    const result = await api.writeProjectFile(path, NOTES_FILE, content.value);
    if (result?.ok) {
      hasFileInRepo.value = true;
      saveStatus.value = 'Saved to .shipwell/notes.md';
      setTimeout(() => { saveStatus.value = ''; }, 3000);
    } else {
      saveStatus.value = result?.error || 'Failed to write file';
    }
  } catch (e) {
    saveStatus.value = e?.message ?? 'Failed to write file';
  }
}

async function loadFromRepo() {
  const fileContent = await loadFromFile();
  if (fileContent != null) {
    content.value = fileContent;
    saveStatus.value = 'Loaded from repo';
    setTimeout(() => { saveStatus.value = ''; }, 2000);
  }
}

watch(
  () => (props.info?.path ?? store.selectedPath ?? '').trim(),
  () => loadContent(),
  { immediate: true }
);
</script>

<style scoped>
.notes-textarea {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  line-height: 1.5;
}
.notes-editor-wrap :deep(.p-inputtextarea) {
  flex: 1;
  min-height: 200px;
}
</style>
