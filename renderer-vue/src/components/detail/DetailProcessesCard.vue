<template>
  <section class="card mb-6 detail-tab-panel detail-processes-card flex flex-col min-h-0" data-detail-tab="processes">
    <!-- Toolbar: intro + actions grouped -->
    <div class="processes-toolbar rounded-rm border border-rm-border bg-rm-surface/50 px-4 py-3 mb-5 flex flex-wrap items-center gap-4">
      <p class="text-sm text-rm-muted m-0 flex-1 min-w-0 max-w-xl">
        Run your dev stack in one place. Start or stop all at once and see status at a glance.
      </p>
      <div class="processes-actions flex items-center gap-2">
        <button
          type="button"
          class="processes-btn processes-btn-primary"
          :disabled="!projectPath || startingAll"
          @click="startAll"
        >
          {{ startingAll ? 'Starting…' : 'Start all' }}
        </button>
        <button
          type="button"
          class="processes-btn processes-btn-stop"
          :disabled="!projectPath || stoppingAll || !hasRunning"
          @click="stopAll"
        >
          {{ stoppingAll ? 'Stopping…' : 'Stop all' }}
        </button>
        <button type="button" class="processes-btn processes-btn-icon" title="Refresh status" @click="refreshStatus">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Processes list card -->
    <div class="processes-list rounded-rm border border-rm-border bg-rm-surface/30 overflow-hidden shadow-sm">
      <div class="processes-list-header flex items-center justify-between gap-3 px-4 py-3 border-b border-rm-border bg-rm-surface/50">
        <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Processes</h3>
        <div class="flex items-center gap-2">
          <button
            v-if="suggestedProcesses.length > 0 && suggestedNotYetAdded.length > 0"
            type="button"
            class="processes-btn processes-btn-suggested"
            :disabled="addingSuggested"
            @click="addSuggestedProcesses"
          >
            {{ addingSuggested ? 'Adding…' : `Add suggested (${suggestedNotYetAdded.length})` }}
          </button>
          <button type="button" class="processes-btn processes-btn-add" @click="showAddProcess = true">
            <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add process
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="processesForProject.length === 0" class="processes-empty flex flex-col items-center justify-center py-14 px-6">
        <div class="processes-empty-icon mb-4 rounded-full bg-rm-surface border border-rm-border flex items-center justify-center text-rm-muted" aria-hidden="true">
          <svg class="w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="20" height="4" rx="1"/><rect x="2" y="10" width="20" height="4" rx="1"/><rect x="2" y="16" width="20" height="4" rx="1"/>
          </svg>
        </div>
        <h4 class="text-base font-semibold text-rm-text m-0 mb-1.5">No processes yet</h4>
        <p class="text-sm text-rm-muted text-center m-0 mb-6 max-w-sm">
          <template v-if="suggestedProcesses.length > 0">
            Add processes from your <code class="processes-code">package.json</code> or <code class="processes-code">composer.json</code>, or add a custom command.
          </template>
          <template v-else>
            Add a process to run (e.g. <code class="processes-code">npm run dev</code>, <code class="processes-code">php artisan queue:work</code>).
          </template>
        </p>
        <div class="flex flex-wrap items-center justify-center gap-2">
          <button
            v-if="suggestedProcesses.length > 0 && suggestedNotYetAdded.length > 0"
            type="button"
            class="processes-btn processes-btn-primary"
            :disabled="addingSuggested"
            @click="addSuggestedProcesses"
          >
            {{ addingSuggested ? 'Adding…' : 'Add suggested processes' }}
          </button>
          <button type="button" class="processes-btn processes-btn-add" @click="showAddProcess = true">
            <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add process manually
          </button>
        </div>
      </div>

      <!-- Process rows -->
      <ul v-else class="divide-y divide-rm-border">
        <li
          v-for="proc in processesForProject"
          :key="proc.processId"
          class="process-row flex flex-col transition-colors"
        >
          <div class="process-row-inner flex items-center gap-3 px-4 py-3 min-w-0">
            <span
              class="status-dot shrink-0 w-3 h-3 rounded-full border-2 border-rm-bg"
              :class="{
                'status-dot-running': proc.status === 'running',
                'status-dot-error': proc.status === 'error',
                'status-dot-stopped': proc.status === 'stopped',
              }"
              :title="proc.status === 'running' ? 'Running' : proc.status === 'error' ? 'Crashed' : 'Stopped'"
            />
            <div class="min-w-0 flex-1">
              <span class="font-medium text-rm-text block truncate">{{ proc.name }}</span>
              <code class="process-row-command text-xs text-rm-muted truncate block mt-0.5">{{ proc.command }}</code>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button"
                class="processes-btn processes-btn-sm"
                :disabled="proc.status === 'running' || startingSingle === proc.processId"
                @click="startOne(proc)"
              >
                {{ proc.status === 'running' ? 'Running' : 'Start' }}
              </button>
              <button
                type="button"
                class="processes-btn processes-btn-sm processes-btn-stop"
                :disabled="proc.status !== 'running' || stoppingSingle === proc.processId"
                @click="stopOne(proc)"
              >
                Stop
              </button>
              <button
                type="button"
                class="processes-btn processes-btn-sm"
                :class="{ 'processes-btn-active': expandedOutput === proc.processId }"
                :disabled="proc.status !== 'running'"
                @click="toggleOutput(proc)"
              >
                Output
              </button>
            </div>
          </div>
          <div
            v-if="expandedOutput === proc.processId"
            class="process-output px-4 py-3 bg-rm-bg/80 border-t border-rm-border font-mono text-xs text-rm-muted overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-words"
          >
            <template v-if="outputLines(proc).length"> {{ outputLines(proc).join('\n') }} </template>
            <span v-else class="italic">No output yet.</span>
          </div>
        </li>
      </ul>
    </div>

    <!-- Add process modal -->
    <div
      v-if="showAddProcess"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showAddProcess = false"
    >
      <div class="bg-rm-surface border border-rm-border rounded-rm shadow-xl w-full max-w-md mx-4 p-5">
        <h3 class="text-base font-semibold text-rm-text m-0 mb-4">Add process</h3>
        <div class="space-y-4">
          <label class="block">
            <span class="text-xs font-medium text-rm-muted block mb-1">Name</span>
            <input v-model="newProcess.name" type="text" class="input-field w-full" placeholder="e.g. dev server" />
          </label>
          <label class="block">
            <span class="text-xs font-medium text-rm-muted block mb-1">Command</span>
            <input v-model="newProcess.command" type="text" class="input-field w-full font-mono text-sm" placeholder="e.g. npm run dev" />
          </label>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="processes-btn processes-btn-add" @click="showAddProcess = false">Cancel</button>
          <button type="button" class="processes-btn processes-btn-primary" :disabled="!newProcess.name.trim() || !newProcess.command.trim()" @click="addProcess">
            Add
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useApi } from '../../composables/useApi';

const props = defineProps({ info: { type: Object, default: null } });

const api = useApi();
const projectPath = computed(() => (props.info?.path || '').trim());

const processStatus = ref([]);
const processesConfig = ref({});
const suggestedProcesses = ref([]);
const addingSuggested = ref(false);
const showAddProcess = ref(false);
const startingAll = ref(false);
const stoppingAll = ref(false);
const startingSingle = ref(null);
const stoppingSingle = ref(null);
const expandedOutput = ref(null);
const outputCache = ref({});
const newProcess = ref({ name: '', command: '' });

const processesForProject = computed(() => {
  const path = projectPath.value;
  if (!path) return [];
  return processStatus.value.filter((s) => s.projectPath === path);
});

const hasRunning = computed(() => processesForProject.value.some((p) => p.status === 'running'));

const currentProcessIds = computed(() => {
  const path = projectPath.value;
  const config = processesConfig.value[path];
  const procs = config?.processes || [];
  return new Set(procs.map((p) => (p.id != null ? String(p.id) : (p.name || '').trim())));
});

const suggestedNotYetAdded = computed(() =>
  suggestedProcesses.value.filter((p) => !currentProcessIds.value.has((p.id || p.name || '').trim()))
);

function processKey(projectPathVal, processId) {
  return `${(projectPathVal || '').trim()}\0${(processId || '').trim()}`;
}

function outputLines(proc) {
  const key = processKey(proc.projectPath, proc.processId);
  return outputCache.value[key] || [];
}

let outputPollTimer = null;

async function loadConfig() {
  try {
    const config = await api.getProcessesConfig?.();
    processesConfig.value = config && typeof config === 'object' ? config : {};
  } catch {
    processesConfig.value = {};
  }
}

async function loadSuggested() {
  const path = projectPath.value;
  if (!path || !api.getSuggestedProcesses) return;
  try {
    const result = await api.getSuggestedProcesses(path);
    suggestedProcesses.value = Array.isArray(result?.suggested) ? result.suggested : [];
  } catch {
    suggestedProcesses.value = [];
  }
}

async function addSuggestedProcesses() {
  const path = projectPath.value;
  const toAdd = suggestedNotYetAdded.value;
  if (!path || !toAdd.length || !api.setProcessesConfig) return;
  addingSuggested.value = true;
  try {
    const config = { ...processesConfig.value };
    const projectConfig = config[path] || { processes: [] };
    const processes = [...(projectConfig.processes || [])];
    for (const p of toAdd) {
      const id = (p.id || p.name || '').trim() || `process-${processes.length}`;
      processes.push({ id, name: p.name || id, command: p.command || '' });
    }
    config[path] = { processes };
    api.setProcessesConfig(config);
    processesConfig.value = config;
    await refreshStatus();
  } finally {
    addingSuggested.value = false;
  }
}

async function refreshStatus() {
  try {
    const list = await api.getProcessStatus?.() ?? [];
    processStatus.value = list;
  } catch {
    processStatus.value = [];
  }
  if (expandedOutput.value) {
    const proc = processStatus.value.find(
      (p) => p.projectPath === projectPath.value && p.processId === expandedOutput.value
    );
    if (!proc || proc.status !== 'running') {
      if (outputPollTimer) clearInterval(outputPollTimer);
      outputPollTimer = null;
    }
  }
  const config = { ...processesConfig.value };
  for (const s of processStatus.value) {
    if (!config[s.projectPath]) config[s.projectPath] = { processes: [] };
    const procs = config[s.projectPath].processes || [];
    if (!procs.some((p) => (p.id != null ? String(p.id) : (p.name || '').trim()) === s.processId)) {
      procs.push({ id: s.processId, name: s.name, command: s.command });
      config[s.projectPath] = { processes: procs };
    }
  }
  processesConfig.value = config;
}

async function startAll() {
  const path = projectPath.value;
  if (!path || !api.startAllProcesses) return;
  startingAll.value = true;
  try {
    await api.startAllProcesses(path);
    await refreshStatus();
  } finally {
    startingAll.value = false;
  }
}

async function stopAll() {
  const path = projectPath.value;
  if (!path || !api.stopAllProcesses) return;
  stoppingAll.value = true;
  try {
    await api.stopAllProcesses(path);
    await refreshStatus();
  } finally {
    stoppingAll.value = false;
  }
}

async function startOne(proc) {
  if (!api.startProcess) return;
  startingSingle.value = proc.processId;
  try {
    await api.startProcess(proc.projectPath, proc.processId, proc.name, proc.command);
    await refreshStatus();
  } finally {
    startingSingle.value = null;
  }
}

async function stopOne(proc) {
  if (!api.stopProcess) return;
  stoppingSingle.value = proc.processId;
  try {
    await api.stopProcess(proc.projectPath, proc.processId);
    await refreshStatus();
  } finally {
    stoppingSingle.value = null;
  }
}

function fetchOutputForExpanded() {
  if (!expandedOutput.value) return;
  const proc = processesForProject.value.find((p) => p.processId === expandedOutput.value);
  if (!proc || proc.status !== 'running') return;
  const key = processKey(proc.projectPath, proc.processId);
  api.getProcessOutput?.(proc.projectPath, proc.processId, 100).then((r) => {
    outputCache.value = { ...outputCache.value, [key]: r?.lines || [] };
  });
}

function toggleOutput(proc) {
  if (expandedOutput.value === proc.processId) {
    expandedOutput.value = null;
    if (outputPollTimer) clearInterval(outputPollTimer);
    outputPollTimer = null;
    return;
  }
  expandedOutput.value = proc.processId;
  fetchOutputForExpanded();
  if (proc.status === 'running') {
    if (outputPollTimer) clearInterval(outputPollTimer);
    outputPollTimer = setInterval(fetchOutputForExpanded, 2000);
  }
}

function addProcess() {
  const path = projectPath.value;
  const name = (newProcess.value.name || '').trim();
  const command = (newProcess.value.command || '').trim();
  if (!path || !name || !command || !api.setProcessesConfig) return;
  const config = { ...processesConfig.value };
  const projectConfig = config[path] || { processes: [] };
  const processes = [...(projectConfig.processes || [])];
  const id = name.toLowerCase().replace(/\s+/g, '-') || `process-${processes.length}`;
  processes.push({ id, name, command });
  config[path] = { processes };
  api.setProcessesConfig(config);
  processesConfig.value = config;
  newProcess.value = { name: '', command: '' };
  showAddProcess.value = false;
  refreshStatus();
}

onMounted(async () => {
  await loadConfig();
  await refreshStatus();
  await loadSuggested();
  if (api.onProcessStatusChanged) api.onProcessStatusChanged(refreshStatus);
});

onUnmounted(() => {
  if (outputPollTimer) clearInterval(outputPollTimer);
});

watch(projectPath, () => {
  expandedOutput.value = null;
  outputCache.value = {};
  loadSuggested();
});
</script>

<style scoped>
/* Toolbar */
.processes-toolbar {
  border-radius: 8px;
}

.processes-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Buttons */
.processes-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}
.processes-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.processes-btn-primary {
  background: rgb(var(--rm-accent));
  color: white;
  border-color: rgb(var(--rm-accent));
}
.processes-btn-primary:hover:not(:disabled) {
  background: rgb(var(--rm-accent-hover));
  border-color: rgb(var(--rm-accent-hover));
  opacity: 1;
}

.processes-btn-stop {
  background: rgb(var(--rm-surface));
  color: rgb(var(--rm-text));
  border-color: rgb(var(--rm-border));
}
.processes-btn-stop:hover:not(:disabled) {
  background: rgba(var(--rm-danger), 0.12);
  border-color: rgba(var(--rm-danger), 0.4);
  color: rgb(var(--rm-danger));
}

.processes-btn-icon {
  padding: 8px;
  background: rgb(var(--rm-surface));
  border-color: rgb(var(--rm-border));
  color: rgb(var(--rm-muted));
}
.processes-btn-icon:hover:not(:disabled) {
  background: rgb(var(--rm-surface-hover));
  color: rgb(var(--rm-text));
}

.processes-btn-add {
  background: rgb(var(--rm-surface));
  color: rgb(var(--rm-text));
  border-color: rgb(var(--rm-border));
}
.processes-btn-add:hover:not(:disabled) {
  background: rgb(var(--rm-surface-hover));
  border-color: rgb(var(--rm-accent) / 0.5);
  color: rgb(var(--rm-accent));
}

.processes-btn-suggested {
  background: rgb(var(--rm-accent) / 0.15);
  color: rgb(var(--rm-accent));
  border-color: rgb(var(--rm-accent) / 0.4);
}
.processes-btn-suggested:hover:not(:disabled) {
  background: rgb(var(--rm-accent) / 0.22);
  border-color: rgb(var(--rm-accent) / 0.6);
}

.processes-btn-sm {
  padding: 5px 10px;
  font-size: 12px;
  background: rgb(var(--rm-surface));
  color: rgb(var(--rm-text));
  border-color: rgb(var(--rm-border));
}
.processes-btn-sm:hover:not(:disabled) {
  background: rgb(var(--rm-surface-hover));
}
.processes-btn-sm.processes-btn-stop:hover:not(:disabled) {
  background: rgba(var(--rm-danger), 0.12);
  border-color: rgba(var(--rm-danger), 0.35);
  color: rgb(var(--rm-danger));
}
.processes-btn-active {
  border-color: rgb(var(--rm-accent));
  background: rgb(var(--rm-accent) / 0.12);
  color: rgb(var(--rm-accent));
}

/* List card */
.processes-list {
  border-radius: 8px;
}

.processes-list-header {
  flex-wrap: wrap;
}

/* Empty state */
.processes-empty {
  min-height: 200px;
}
.processes-empty-icon {
  width: 72px;
  height: 72px;
}
.processes-code {
  padding: 2px 6px;
  border-radius: 4px;
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(var(--rm-border));
  font-size: 12px;
  font-family: ui-monospace, monospace;
}

/* Process rows */
.process-row-inner:hover {
  background: rgb(var(--rm-surface) / 0.5);
}
.process-row-command {
  font-family: ui-monospace, monospace;
}

/* Status dots */
.status-dot-running {
  background: rgb(var(--rm-accent));
  box-shadow: 0 0 0 2px rgb(var(--rm-accent) / 0.35);
}
.status-dot-error {
  background: rgb(var(--rm-danger));
}
.status-dot-stopped {
  background: rgb(var(--rm-muted) / 0.5);
}

/* Modal */
.input-field {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgb(var(--rm-border));
  background: rgb(var(--rm-bg));
  color: rgb(var(--rm-text));
  font-size: 13px;
  width: 100%;
}
</style>
