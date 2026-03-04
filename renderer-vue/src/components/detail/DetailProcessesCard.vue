<template>
  <section class="card mb-6 detail-tab-panel detail-processes-card flex flex-col min-h-0" data-detail-tab="processes">
    <!-- Toolbar: intro + actions grouped -->
    <div class="processes-toolbar rounded-rm border border-rm-border bg-rm-surface/50 px-4 py-3 mb-5 flex flex-wrap items-center gap-4">
      <p class="text-sm text-rm-muted m-0 flex-1 min-w-0 max-w-xl">
        Run your dev stack in one place. Start or stop all at once and see status at a glance.
      </p>
      <div class="processes-actions flex items-center gap-2">
        <Button
          severity="primary"
          size="small"
          :disabled="!projectPath || startingAll"
          @click="startAll"
        >
          {{ startingAll ? 'Starting…' : 'Start all' }}
        </Button>
        <Button
          severity="danger"
          size="small"
          :disabled="!projectPath || stoppingAll || !hasRunning"
          @click="stopAll"
        >
          {{ stoppingAll ? 'Stopping…' : 'Stop all' }}
        </Button>
        <Button variant="text" size="small" class="!p-2" title="Refresh status" @click="refreshStatus">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/>
          </svg>
        </Button>
      </div>
    </div>

    <!-- Processes list card -->
    <Panel class="processes-list">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full">
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Processes</h3>
          <div class="flex items-center gap-2">
            <Button
              v-if="suggestedProcesses.length > 0 && suggestedNotYetAdded.length > 0"
              severity="secondary"
              size="small"
              :disabled="addingSuggested"
              @click="addSuggestedProcesses"
            >
              {{ addingSuggested ? 'Adding…' : `Add suggested (${suggestedNotYetAdded.length})` }}
            </Button>
            <Button severity="secondary" size="small" @click="showAddProcess = true">
              <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add process
            </Button>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <div
        v-if="processesForProject.length === 0"
        class="empty-state"
      >
        <div class="empty-state-icon">
          <svg class="w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="20" height="4" rx="1"/><rect x="2" y="10" width="20" height="4" rx="1"/><rect x="2" y="16" width="20" height="4" rx="1"/>
          </svg>
        </div>
        <h4 class="empty-state-title">No processes yet</h4>
        <div class="empty-state-body">
          <template v-if="suggestedProcesses.length > 0">
            Add processes from your <code class="processes-code">package.json</code> or <code class="processes-code">composer.json</code>, or add a custom command.
          </template>
          <template v-else>
            Add a process to run (e.g. <code class="processes-code">npm run dev</code>, <code class="processes-code">php artisan queue:work</code>).
          </template>
        </div>
        <div class="empty-state-actions">
          <Button
            v-if="suggestedProcesses.length > 0 && suggestedNotYetAdded.length > 0"
            severity="primary"
            size="small"
            :disabled="addingSuggested"
            @click="addSuggestedProcesses"
          >
            {{ addingSuggested ? 'Adding…' : 'Add suggested processes' }}
          </Button>
          <Button severity="secondary" size="small" @click="showAddProcess = true">
            <svg class="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add process manually
          </Button>
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
              :class="['status-dot', proc.status === 'running' ? 'status-dot-running' : proc.status === 'error' ? 'status-dot-error' : 'status-dot-stopped']"
              :title="proc.status === 'running' ? 'Running' : proc.status === 'error' ? 'Crashed' : 'Stopped'"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1">
              <span class="font-medium text-rm-text block truncate">{{ proc.name }}</span>
              <code class="process-row-command text-xs text-rm-muted truncate block mt-0.5">{{ proc.command }}</code>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <Button
                severity="secondary"
                size="small"
                :disabled="proc.status === 'running' || startingSingle === proc.processId"
                @click="startOne(proc)"
              >
                {{ proc.status === 'running' ? 'Running' : 'Start' }}
              </Button>
              <Button
                severity="danger"
                size="small"
                :disabled="proc.status !== 'running' || stoppingSingle === proc.processId"
                @click="stopOne(proc)"
              >
                Stop
              </Button>
              <Button
                severity="secondary"
                size="small"
                :class="{ 'border-rm-accent bg-rm-accent/15': expandedOutput === proc.processId }"
                :disabled="proc.status !== 'running'"
                @click="toggleOutput(proc)"
              >
                Output
              </Button>
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
    </Panel>

    <!-- Add process modal -->
    <Dialog
      v-model:visible="showAddProcess"
      header="Add process"
      :style="{ width: '28rem' }"
      :modal="true"
      :dismissableMask="true"
      class="max-w-md"
    >
      <div class="space-y-4">
        <label class="block">
          <span class="text-xs font-medium text-rm-muted block mb-1">Name</span>
          <InputText v-model="newProcess.name" type="text" class="w-full" placeholder="e.g. dev server" />
        </label>
        <label class="block">
          <span class="text-xs font-medium text-rm-muted block mb-1">Command</span>
          <InputText v-model="newProcess.command" type="text" class="w-full font-mono text-sm" placeholder="e.g. npm run dev" />
        </label>
      </div>
      <template #footer>
        <Button severity="secondary" size="small" @click="showAddProcess = false">Cancel</Button>
        <Button severity="primary" size="small" :disabled="!newProcess.name.trim() || !newProcess.command.trim()" @click="addProcess">Add</Button>
      </template>
    </Dialog>
  </section>
</template>

<script setup>
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import Dialog from 'primevue/dialog';
import { useProcesses } from '../../composables/useProcesses';

const props = defineProps({ info: { type: Object, default: null } });

const {
  projectPath,
  processStatus,
  suggestedProcesses,
  addingSuggested,
  showAddProcess,
  startingAll,
  stoppingAll,
  startingSingle,
  stoppingSingle,
  expandedOutput,
  newProcess,
  processesForProject,
  hasRunning,
  suggestedNotYetAdded,
  processKey,
  outputLines,
  addSuggestedProcesses,
  refreshStatus,
  startAll,
  stopAll,
  startOne,
  stopOne,
  toggleOutput,
  addProcess,
} = useProcesses(() => props.info);
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

/* List card */
.processes-list {
  border-radius: 8px;
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

</style>
