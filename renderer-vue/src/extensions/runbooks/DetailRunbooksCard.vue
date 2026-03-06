<template>
  <ExtensionLayout tab-id="runbooks" content-class="detail-runbooks-card">
    <template #toolbar-start>
      <p class="text-sm text-rm-muted m-0">
        Saved commands for this project. Run here, in the app Terminal, or copy and run in your system terminal.
      </p>
    </template>
    <template #toolbar-end>
      <Button severity="primary" size="small" @click="openAdd">
        Add runbook
      </Button>
    </template>

    <Panel class="runbooks-list flex-1">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full">
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Runbooks</h3>
          <span v-if="runbooks.length" class="text-xs text-rm-muted">{{ runbooks.length }} script{{ runbooks.length === 1 ? '' : 's' }}</span>
        </div>
      </template>

      <div v-if="!projectPath" class="py-12 px-4 text-center text-rm-muted text-sm">
        <p class="m-0">Select a project to manage runbooks.</p>
      </div>
      <div v-else-if="runbooks.length === 0" class="empty-state py-12 px-4">
        <div class="empty-state-icon">
          <svg class="w-10 h-10 text-rm-muted opacity-60" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
          </svg>
        </div>
        <h4 class="empty-state-title">No runbooks yet</h4>
        <p class="empty-state-body text-sm text-rm-muted m-0">Add commands you run often: deploy, seed, lint, tests, etc.</p>
        <div class="empty-state-actions mt-3">
          <Button severity="primary" size="small" @click="openAdd">Add runbook</Button>
        </div>
      </div>
      <ul v-else class="runbooks-ul list-none m-0 p-0">
        <li
          v-for="r in runbooks"
          :key="r.id"
          class="runbook-row flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 min-w-0 border-b border-rm-border last:border-b-0 hover:bg-rm-surface-hover/50"
        >
          <div class="min-w-0 flex-1">
            <h4 class="runbook-name font-medium text-rm-text m-0 truncate">{{ r.name || 'Unnamed' }}</h4>
            <code class="runbook-command text-xs text-rm-muted block truncate font-mono mt-0.5">{{ r.command }}</code>
          </div>
          <div class="flex items-center gap-1 shrink-0 flex-wrap">
            <Button
              label="Run"
              size="small"
              icon="pi pi-play"
              :loading="runningId === r.id"
              :disabled="runningId != null"
              @click="run(r)"
            />
            <Button
              variant="outlined"
              size="small"
              icon="pi pi-terminal"
              v-tooltip.top="'Run in Terminal tab'"
              :disabled="runningId != null"
              @click="runInTerminal(r)"
            />
            <Button
              variant="text"
              size="small"
              icon="pi pi-copy"
              class="p-2 min-w-0"
              v-tooltip.top="'Copy command'"
              @click="copyCommand(r.command)"
            />
            <Button
              variant="text"
              size="small"
              icon="pi pi-external-link"
              class="p-2 min-w-0 text-rm-muted hover:text-rm-text"
              v-tooltip.top="'Open system terminal in project'"
              @click="openInTerminal"
            />
            <Button
              variant="text"
              size="small"
              class="p-2 min-w-0 text-rm-muted hover:text-rm-text"
              v-tooltip.top="'Edit'"
              @click="openEdit(r)"
            >
              <i class="pi pi-pencil" />
            </Button>
            <Button
              variant="text"
              severity="danger"
              size="small"
              class="p-2 min-w-0 opacity-80 hover:opacity-100"
              v-tooltip.top="'Delete'"
              @click="confirmDelete(r)"
            >
              <i class="pi pi-trash" />
            </Button>
          </div>
        </li>
      </ul>
    </Panel>

    <!-- Add/Edit modal -->
    <Dialog
      v-model:visible="modalVisible"
      :header="editing ? 'Edit runbook' : 'Add runbook'"
      modal
      :style="{ width: '28rem' }"
      :dismissable-mask="true"
      class="runbook-modal"
      @hide="editing = null"
    >
      <div class="flex flex-col gap-3">
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium text-rm-text">Name</span>
          <InputText v-model="form.name" placeholder="e.g. Deploy staging" class="w-full" />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium text-rm-text">Command</span>
          <Textarea v-model="form.command" placeholder="e.g. npm run deploy:staging" rows="3" class="w-full font-mono text-sm" />
        </label>
      </div>
      <template #footer>
        <Button label="Cancel" variant="text" @click="modalVisible = false" />
        <Button :label="editing ? 'Save' : 'Add'" severity="primary" @click="saveRunbook" />
      </template>
    </Dialog>

    <!-- Run result dialog -->
    <Dialog
      v-model:visible="resultVisible"
      :header="resultTitle"
      modal
      :style="{ width: '36rem', maxWidth: '90vw' }"
      :dismissable-mask="true"
      class="runbook-result-modal"
    >
      <div class="runbook-result-body font-mono text-sm whitespace-pre-wrap break-words overflow-auto max-h-[60vh]">{{ resultOutput }}</div>
      <template #footer>
        <Button label="Close" @click="resultVisible = false" />
      </template>
    </Dialog>
  </ExtensionLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import ExtensionLayout from '../../components/detail/ExtensionLayout.vue';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import Textarea from 'primevue/textarea';
import { useApi } from '../../composables/useApi';
import { useAppStore } from '../../stores/app';

const props = defineProps({ info: { type: Object, default: null } });

const api = useApi();
const store = useAppStore();

const PREF_PREFIX = 'ext.runbooks.';

const runbooks = ref([]);
const modalVisible = ref(false);
const editing = ref(null);
const form = ref({ name: '', command: '' });
const runningId = ref(null);
const resultVisible = ref(false);
const resultTitle = ref('Output');
const resultOutput = ref('');

const projectPath = computed(() => props.info?.path || store.selectedPath || '');

function getPrefKey() {
  const path = projectPath.value || 'default';
  return `${PREF_PREFIX}${encodeURIComponent(path)}`;
}

async function load() {
  if (!api.getPreference) return;
  try {
    const key = getPrefKey();
    const raw = await api.getPreference(key);
    const data = raw && typeof raw === 'string' ? JSON.parse(raw) : raw;
    runbooks.value = Array.isArray(data?.runbooks) ? data.runbooks : [];
  } catch (_) {
    runbooks.value = [];
  }
}

async function save() {
  if (!api.setPreference) return;
  try {
    await api.setPreference(getPrefKey(), JSON.stringify({ runbooks: runbooks.value }));
  } catch (_) {}
}

function openAdd() {
  editing.value = null;
  form.value = { name: '', command: '' };
  modalVisible.value = true;
}

function openEdit(r) {
  editing.value = r;
  form.value = { name: r.name || '', command: r.command || '' };
  modalVisible.value = true;
}

function saveRunbook() {
  const name = form.value.name?.trim() || 'Unnamed';
  const command = form.value.command?.trim();
  if (!command) return;
  if (editing.value) {
    const idx = runbooks.value.findIndex((x) => x.id === editing.value.id);
    if (idx !== -1) {
      runbooks.value = runbooks.value.map((r, i) => (i === idx ? { ...r, name, command } : r));
    }
  } else {
    runbooks.value = [
      ...runbooks.value,
      { id: `rb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, name, command },
    ];
  }
  save();
  modalVisible.value = false;
  editing.value = null;
}

function confirmDelete(r) {
  if (typeof window !== 'undefined' && window.confirm && !window.confirm(`Remove "${r.name || r.command}"?`)) return;
  runbooks.value = runbooks.value.filter((x) => x.id !== r.id);
  save();
}

async function run(r) {
  const path = projectPath.value;
  if (!path || !api.runShellCommand) return;
  runningId.value = r.id;
  resultTitle.value = r.name || 'Output';
  resultOutput.value = '';
  resultVisible.value = true;
  try {
    const result = await api.runShellCommand(path, r.command);
    const out = (result?.stdout ?? '').trim();
    const err = (result?.stderr ?? '').trim();
    const code = result?.exitCode;
    const lines = [];
    if (out) lines.push(out);
    if (err) lines.push(err);
    if (code != null) lines.push(`\n(exit code ${code})`);
    resultOutput.value = lines.length ? lines.join('\n') : '(no output)';
  } catch (e) {
    resultOutput.value = e?.message ?? 'Command failed';
  } finally {
    runningId.value = null;
  }
}

function runInTerminal(r) {
  if (!projectPath.value) return;
  if (store.setDetailTab && store.setPendingTerminalCommand) {
    store.setPendingTerminalCommand(r.command);
    store.setDetailTab('terminal');
  }
}

function copyCommand(cmd) {
  if (api.copyToClipboard) api.copyToClipboard(cmd);
}

function openInTerminal() {
  if (projectPath.value && api.openInTerminal) api.openInTerminal(projectPath.value);
}

watch(projectPath, load, { immediate: true });
</script>

<style scoped>
.runbooks-ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.runbook-name {
  font-size: 0.9375rem;
}
.runbook-command {
  font-size: 0.75rem;
}
.empty-state-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 0.75rem;
}
.empty-state-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
  margin: 0 0 0.25rem;
}
.empty-state-body {
  margin: 0;
}
.empty-state-actions {
  margin-top: 0.75rem;
}
.runbook-result-body {
  padding: 0.5rem 0;
  color: rgb(var(--rm-text));
}
.runbooks-list :deep(.p-panel-content-wrapper),
.runbooks-list :deep(.p-panel-content) {
  border-top: none;
}
</style>
