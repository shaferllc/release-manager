<template>
  <ExtensionLayout tab-id="env" content-class="detail-env-card">
    <template #toolbar-start>
      <p class="text-sm text-rm-muted m-0">
        View or edit environment variables for this project. Choose which file to open.
      </p>
    </template>
    <template #toolbar-end>
      <label class="flex items-center gap-2">
        <span class="text-xs text-rm-muted shrink-0">File</span>
        <Select
          v-model="selectedFile"
          :options="envFileOptions"
          option-label="label"
          option-value="value"
          class="env-file-select w-[11rem]"
          @change="onFileChange"
        />
      </label>
      <Button
        label="Save"
        severity="primary"
        size="small"
        :loading="saving"
        :disabled="!projectPath || !contentDirty || saving"
        @click="save"
      />
    </template>

    <div v-if="!projectPath" class="py-12 px-4 text-center text-rm-muted text-sm">
      <p class="m-0">Select a project to view or edit .env files.</p>
    </div>
    <template v-else>
      <Panel class="env-panel flex-1 flex flex-col min-h-0">
        <template #header>
          <div class="flex items-center justify-between gap-3 w-full">
            <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight font-mono">{{ selectedFile || '.env' }}</h3>
            <span v-if="loadError" class="text-xs text-red-500">Not found or could not read</span>
            <span v-else-if="contentDirty" class="text-xs text-rm-muted">Unsaved changes</span>
          </div>
        </template>
        <div class="env-body flex flex-col min-h-0">
          <Textarea
            v-model="content"
            class="env-textarea w-full font-mono text-sm min-h-[240px]"
            :placeholder="`Contents of ${selectedFile || '.env'}. Edit and click Save.`"
            rows="14"
            @input="contentDirty = true"
          />
          <p v-if="saveStatus" class="text-xs mt-2 m-0" :class="saveStatusOk ? 'text-rm-accent' : 'text-red-500'">{{ saveStatus }}</p>
        </div>
      </Panel>
    </template>
  </ExtensionLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import ExtensionLayout from '../../components/detail/ExtensionLayout.vue';
import Panel from 'primevue/panel';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useApi } from '../../composables/useApi';
import { useAppStore } from '../../stores/app';

const props = defineProps({ info: { type: Object, default: null } });

const api = useApi();
const store = useAppStore();

const PREF_PREFIX = 'ext.envFile.';

const envFileOptions = [
  { label: '.env', value: '.env' },
  { label: '.env.example', value: '.env.example' },
  { label: '.env.local', value: '.env.local' },
  { label: '.env.test', value: '.env.test' },
];

const selectedFile = ref('.env');
const content = ref('');
const contentDirty = ref(false);
const loadError = ref(false);
const saving = ref(false);
const saveStatus = ref('');
const saveStatusOk = ref(false);
let saveStatusTimer = null;

const projectPath = computed(() => props.info?.path ?? store.selectedPath ?? '');

function getPrefKey() {
  const path = projectPath.value || 'default';
  return `${PREF_PREFIX}${encodeURIComponent(path)}`;
}

async function loadPref() {
  if (!api.getPreference || !projectPath.value) return;
  try {
    const key = getPrefKey();
    const val = await api.getPreference(key);
    const file = (val && typeof val === 'string') ? val : '.env';
    if (envFileOptions.some((o) => o.value === file)) selectedFile.value = file;
  } catch (_) {}
}

async function loadFile() {
  const path = projectPath.value;
  const file = selectedFile.value || '.env';
  if (!path || !api.readProjectFile) {
    content.value = '';
    loadError.value = false;
    return;
  }
  contentDirty.value = false;
  loadError.value = false;
  try {
    const result = await api.readProjectFile(path, file);
    if (result?.ok && result?.content != null) {
      content.value = result.content;
    } else {
      content.value = '';
      loadError.value = true;
    }
  } catch (_) {
    content.value = '';
    loadError.value = true;
  }
}

function onFileChange() {
  const path = projectPath.value;
  if (!path) return;
  if (api.setPreference) api.setPreference(getPrefKey(), selectedFile.value);
  loadFile();
}

function setSaveStatus(message, ok) {
  saveStatus.value = message;
  saveStatusOk.value = ok;
  if (saveStatusTimer) clearTimeout(saveStatusTimer);
  saveStatusTimer = setTimeout(() => { saveStatus.value = ''; }, 3000);
}

async function save() {
  const path = projectPath.value;
  const file = selectedFile.value || '.env';
  if (!path || !api.writeProjectFile) return;
  saving.value = true;
  setSaveStatus('', true);
  try {
    const result = await api.writeProjectFile(path, file, content.value);
    if (result?.ok) {
      contentDirty.value = false;
      setSaveStatus('Saved.', true);
    } else {
      setSaveStatus(result?.error || 'Could not save.', false);
    }
  } catch (e) {
    setSaveStatus(e?.message || 'Failed to save.', false);
  } finally {
    saving.value = false;
  }
}

watch(projectPath, async () => {
  await loadPref();
  loadFile();
}, { immediate: true });
</script>

<style scoped>
.env-file-select {
  min-width: 11rem;
}
.env-panel :deep(.p-panel-content) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.env-body {
  flex: 1;
  min-height: 0;
}
.env-textarea {
  resize: vertical;
  min-height: 240px;
}
</style>
