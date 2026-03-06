<template>
  <ExtensionLayout tab-id="dependencies" content-class="detail-dependencies">
    <template #toolbar-start>
      <p class="text-sm text-rm-muted m-0">
        Run <code class="deps-code">npm outdated</code> or <code class="deps-code">composer outdated</code> for this project. Optionally run audit.
      </p>
    </template>
    <template #toolbar-end>
      <Button severity="primary" size="small" :disabled="loading" @click="runOutdated">
        {{ loading ? 'Running…' : 'Check outdated' }}
      </Button>
      <Button severity="secondary" size="small" :disabled="loading" @click="runAudit">
        {{ auditLoading ? 'Running…' : 'Run audit' }}
      </Button>
      <Button
        severity="secondary"
        size="small"
        :disabled="selectedRows.length === 0"
        @click="copyUpgradeCommand"
      >
        Copy upgrade command
      </Button>
      <Button severity="secondary" size="small" icon="pi pi-external-link" label="Open in terminal" @click="openInTerminal" />
    </template>

    <Panel class="deps-outdated-panel flex-1">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full">
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Outdated packages</h3>
          <span v-if="outdatedRows.length" class="text-xs text-rm-muted">{{ outdatedRows.length }} outdated</span>
        </div>
      </template>

      <div v-if="outdatedError" class="p-4 text-sm text-rm-muted">{{ outdatedError }}</div>
      <div v-else-if="outdatedRows.length === 0 && !loading" class="empty-state py-12 px-4">
        <p v-if="ranOutdated" class="text-sm text-rm-muted m-0">All dependencies are up to date.</p>
        <p v-else class="text-sm text-rm-muted m-0">Click <strong>Check outdated</strong> to run {{ projectType === 'php' ? 'composer outdated' : 'npm outdated' }}.</p>
      </div>
      <div v-else class="deps-table-wrap overflow-auto">
        <table class="deps-table w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-rm-border">
              <th class="text-left py-2 px-3 w-8">
                <Checkbox
                  :model-value="selectedRows.length === outdatedRows.length && outdatedRows.length > 0"
                  :indeterminate="selectedRows.length > 0 && selectedRows.length < outdatedRows.length"
                  binary
                  @update:model-value="toggleSelectAll"
                />
              </th>
              <th class="text-left py-2 px-3 font-medium text-rm-text">Package</th>
              <th class="text-left py-2 px-3 font-medium text-rm-text">Current</th>
              <th class="text-left py-2 px-3 font-medium text-rm-text">Wanted / Latest</th>
              <th v-if="projectType === 'php'" class="text-left py-2 px-3 font-medium text-rm-text">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in outdatedRows"
              :key="row.name"
              class="border-b border-rm-border hover:bg-rm-surface-hover/50"
            >
              <td class="py-2 px-3">
                <Checkbox :model-value="isSelected(row.name)" binary @update:model-value="(v) => setSelected(row.name, v)" />
              </td>
              <td class="py-2 px-3 font-mono text-rm-text">{{ row.name }}</td>
              <td class="py-2 px-3 text-rm-muted">{{ row.current }}</td>
              <td class="py-2 px-3 text-rm-text">{{ row.wanted || row.latest }}</td>
              <td v-if="projectType === 'php'" class="py-2 px-3 text-rm-muted text-xs">{{ row.status || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>

    <Panel v-if="auditResult !== null" class="deps-audit-panel mt-5">
      <template #header>
        <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Audit</h3>
      </template>
      <div v-if="auditError" class="p-4 text-sm text-rm-muted">{{ auditError }}</div>
      <pre v-else class="audit-pre text-xs text-rm-muted whitespace-pre-wrap break-words m-0 p-3 bg-rm-bg rounded-rm border border-rm-border max-h-60 overflow-auto">{{ auditResult }}</pre>
    </Panel>
  </ExtensionLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import ExtensionLayout from '../../components/detail/ExtensionLayout.vue';
import Panel from 'primevue/panel';
import { useApi } from '../../composables/useApi';
import { useAppStore } from '../../stores/app';

const props = defineProps({ info: { type: Object, default: null } });
const store = useAppStore();
const api = useApi();

const projectPath = computed(() => (props.info?.path ?? store.selectedPath ?? '').trim() || '');
const projectType = computed(() => (props.info?.projectType ?? '').toLowerCase() || 'npm');

const loading = ref(false);
const auditLoading = ref(false);
const outdatedRows = ref([]);
const outdatedError = ref('');
const auditResult = ref(null);
const auditError = ref('');
const selectedNames = ref([]);
const ranOutdated = ref(false);

const selectedRows = computed(() => outdatedRows.value.filter((r) => selectedNames.value.includes(r.name)));

function isSelected(name) {
  return selectedNames.value.includes(name);
}

function setSelected(name, selected) {
  const set = new Set(selectedNames.value);
  if (selected) set.add(name);
  else set.delete(name);
  selectedNames.value = Array.from(set);
}

function toggleSelectAll(checked) {
  if (checked) selectedNames.value = outdatedRows.value.map((r) => r.name);
  else selectedNames.value = [];
}

function parseNpmOutdated(stdout) {
  const rows = [];
  try {
    const data = JSON.parse(stdout || '{}');
    if (typeof data !== 'object' || data === null) return rows;
    for (const [name, info] of Object.entries(data)) {
      if (!info || typeof info !== 'object') continue;
      rows.push({
        name,
        current: info.current ?? '—',
        wanted: info.wanted ?? info.latest ?? '—',
        latest: info.latest ?? '—',
        status: null,
      });
    }
  } catch (_) {}
  return rows;
}

function parseComposerOutdated(stdout) {
  const rows = [];
  try {
    const data = JSON.parse(stdout || '{}');
    const installed = data?.installed;
    if (!Array.isArray(installed)) return rows;
    for (const pkg of installed) {
      rows.push({
        name: pkg.name ?? '—',
        current: pkg.version ?? '—',
        wanted: pkg.latest ?? '—',
        latest: pkg.latest ?? '—',
        status: pkg['latest-status'] ?? null,
      });
    }
  } catch (_) {}
  return rows;
}

async function runOutdated() {
  const path = projectPath.value;
  if (!path || !api.runShellCommand) return;
  loading.value = true;
  outdatedError.value = '';
  outdatedRows.value = [];
  selectedNames.value = [];
  try {
    const isNpm = projectType.value === 'npm';
    const cmd = isNpm ? 'npm outdated --json' : 'composer outdated --format=json --no-ansi';
    const result = await api.runShellCommand(path, cmd);
    const out = (result?.stdout ?? '').trim();
    if (isNpm) {
      outdatedRows.value = parseNpmOutdated(out);
      if (out && outdatedRows.value.length === 0) {
        try { JSON.parse(out); } catch { outdatedError.value = result?.stderr || 'Parse error'; }
      }
    } else {
      outdatedRows.value = parseComposerOutdated(out);
      if (result?.stderr && !out) outdatedError.value = result.stderr;
    }
  } catch (e) {
    outdatedError.value = e?.message ?? 'Failed to run outdated';
  } finally {
    loading.value = false;
    ranOutdated.value = true;
  }
}

async function runAudit() {
  const path = projectPath.value;
  if (!path || !api.runShellCommand) return;
  auditLoading.value = true;
  auditResult.value = null;
  auditError.value = '';
  try {
    const isNpm = projectType.value === 'npm';
    const cmd = isNpm ? 'npm audit --json' : 'composer audit --format=json --no-ansi';
    const result = await api.runShellCommand(path, cmd);
    const out = (result?.stdout ?? '').trim();
    const err = (result?.stderr ?? '').trim();
    if (out) {
      try {
        const json = JSON.parse(out);
        auditResult.value = JSON.stringify(json, null, 2);
      } catch {
        auditResult.value = out || err;
      }
    } else {
      auditError.value = err || 'No output';
    }
  } catch (e) {
    auditError.value = e?.message ?? 'Failed to run audit';
  } finally {
    auditLoading.value = false;
  }
}

function copyUpgradeCommand() {
  const names = selectedNames.value;
  if (!names.length) return;
  const isNpm = projectType.value === 'npm';
  const cmd = isNpm ? `npm update ${names.join(' ')}` : `composer update ${names.join(' ')}`;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(cmd).catch(() => {});
  }
}

function openInTerminal() {
  const path = projectPath.value;
  if (path && api.openInTerminal) api.openInTerminal(path);
}

watch(projectPath, () => {
  outdatedRows.value = [];
  outdatedError.value = '';
  auditResult.value = null;
  auditError.value = '';
  selectedNames.value = [];
  ranOutdated.value = false;
});
</script>

<style scoped>
.deps-code {
  padding: 2px 6px;
  border-radius: 4px;
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(var(--rm-border));
  font-size: 12px;
  font-family: ui-monospace, monospace;
}
.deps-table th,
.deps-table td {
  vertical-align: middle;
}
.audit-pre {
  font-family: ui-monospace, monospace;
}
</style>
