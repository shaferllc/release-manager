<template>
  <Card class="mb-4 detail-tab-panel detail-coverage-card" data-detail-tab="coverage">
    <template #content>
      <div class="card-section">
      <span class="card-label shrink-0 mb-0">Coverage</span>
      <p class="m-0 mb-4 text-sm text-rm-muted shrink-0">Run coverage for this project (npm: typically <code class="bg-rm-surface px-1 rounded text-xs">test:coverage</code> or similar; PHP: Pest/PHPUnit).</p>

      <!-- No coverage yet: suggest AI -->
      <div v-if="showNoCoverageHint" class="mb-4 p-3 rounded-rm border border-rm-border bg-rm-surface/50 text-sm text-rm-muted">
        <p class="m-0">If no coverage exists yet, you can use AI to help generate tests and coverage. Configure your AI provider and API keys in Settings, then use the Tests tab to run tests and get AI-suggested fixes.</p>
        <Button variant="text" size="small" class="mt-2 text-sm hover:underline !p-0 font-medium" @click="goToAiSettings">Open AI settings</Button>
      </div>

      <!-- Last / previous run + trend + goal -->
      <div v-if="history.length" class="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4 shrink-0 text-sm">
        <span class="inline-flex items-center gap-1.5">
          <strong class="text-rm-muted font-medium">Last run:</strong>
          <span class="font-mono font-semibold text-rm-accent">{{ lastSummary }}</span>
          <span v-if="trendDelta != null" class="font-mono text-xs" :class="trendDelta > 0 ? 'text-rm-success' : trendDelta < 0 ? 'text-rm-warning' : 'text-rm-muted'" :title="trendDelta > 0 ? 'Up from previous' : trendDelta < 0 ? 'Down from previous' : 'No change'">{{ trendDelta > 0 ? '↑' : trendDelta < 0 ? '↓' : '' }}{{ trendDelta !== 0 ? (trendDelta > 0 ? '+' : '') + trendDelta.toFixed(1) + '%' : '' }}</span>
          <span v-if="lastEntry?.date" class="text-rm-muted text-xs">({{ formatDate(lastEntry.date) }})</span>
          <span v-if="goalPercent != null && lastPercent != null" class="text-xs" :class="lastPercent >= goalPercent ? 'text-rm-success' : 'text-rm-warning'">{{ lastPercent >= goalPercent ? 'Above goal' : 'Below goal' }}</span>
        </span>
        <span v-if="previousEntry" class="inline-flex items-center gap-1.5 text-rm-muted">
          <strong class="font-medium">Previous:</strong>
          <span class="font-mono">{{ previousEntry.summary || previousEntry.percent + '%' }}</span>
          <span v-if="previousEntry.date" class="text-xs">({{ formatDate(previousEntry.date) }})</span>
        </span>
      </div>

      <!-- Coverage goal -->
      <div class="flex flex-wrap items-center gap-3 mb-4 shrink-0 text-sm">
        <label class="inline-flex items-center gap-2 text-rm-muted">
          <span class="font-medium">Goal:</span>
          <InputText v-model.number="goalPercent" type="number" min="0" max="100" step="1" class="w-16 text-xs" placeholder="—" @blur="saveGoal" />
          <span class="text-xs">%</span>
        </label>
      </div>

      <div class="flex flex-wrap items-center gap-2 mb-4 shrink-0">
        <Button severity="primary" size="small" class="text-xs" :disabled="running" @click="run">{{ running ? 'Running…' : 'Run coverage' }}</Button>
        <span class="inline-flex items-center gap-2">
          <Button severity="secondary" size="small" class="text-xs" :disabled="!(output || lastOutput)" v-tooltip.top="'Copy full output'" aria-label="Copy full output" @click="copyOutput">Copy output</Button>
          <span v-if="copyOutputStatus.status" class="text-xs" :class="copyOutputStatus.status === 'Copied!' ? 'text-rm-success' : 'text-rm-warning'">{{ copyOutputStatus.status }}</span>
        </span>
        <span class="inline-flex items-center gap-2">
          <Button severity="secondary" size="small" class="text-xs" :disabled="!lastEntry" v-tooltip.top="'Copy one-line summary'" aria-label="Copy one-line summary" @click="copySummary">Copy summary</Button>
          <span v-if="copySummaryStatus.status" class="text-xs" :class="copySummaryStatus.status === 'Copied!' ? 'text-rm-success' : 'text-rm-warning'">{{ copySummaryStatus.status }}</span>
        </span>
        <span class="inline-flex items-center gap-2">
          <Button severity="secondary" size="small" class="text-xs" :disabled="history.length === 0" v-tooltip.top="'Download history as CSV'" aria-label="Download history as CSV" @click="exportHistoryCsv">Export CSV</Button>
          <span v-if="exportStatus.status" class="text-xs" :class="exportStatus.status === 'Exported!' ? 'text-rm-success' : 'text-rm-warning'">{{ exportStatus.status }}</span>
        </span>
        <span v-if="running" class="detail-coverage-progress inline-flex items-center gap-1.5 text-sm text-rm-muted" aria-live="polite">
          <ProgressSpinner aria-hidden="true" class="!w-4 !h-4" />
          Running coverage…
        </span>
      </div>

      <!-- Compare with previous -->
      <div v-if="lastEntry && previousEntry && lastEntry.percent != null && previousEntry.percent != null" class="mb-4 shrink-0 p-3 rounded-rm border border-rm-border bg-rm-surface/50 text-sm">
        <span class="font-medium text-rm-muted">Compare with previous:</span>
        <span class="font-mono ml-2">{{ previousEntry.percent }}% → {{ lastEntry.percent }}%</span>
        <span class="font-mono ml-2" :class="compareDelta > 0 ? 'text-rm-success' : compareDelta < 0 ? 'text-rm-warning' : 'text-rm-muted'">({{ compareDelta > 0 ? '+' : '' }}{{ compareDelta.toFixed(1) }}%)</span>
        <span class="ml-2 text-rm-muted text-xs">{{ formatDateShort(previousEntry.date) }} → {{ formatDateShort(lastEntry.date) }}</span>
        <div class="mt-2 flex flex-wrap gap-2">
          <Button v-if="previousEntry.commitSha" variant="text" size="small" class="text-xs hover:underline !p-0 min-w-0" @click="openCommit(previousEntry.commitSha)">View previous commit</Button>
          <Button v-if="lastEntry.commitSha" variant="text" size="small" class="text-xs hover:underline !p-0 min-w-0" @click="openCommit(lastEntry.commitSha)">View last commit</Button>
        </div>
      </div>

      <!-- Display range + retention + branch -->
      <div class="flex flex-wrap items-center gap-3 mb-4 shrink-0 text-sm">
        <label class="inline-flex items-center gap-2 text-rm-muted">
          <span class="font-medium">Show:</span>
          <Select v-model="displayRangeDays" :options="displayRangeOptions" optionLabel="label" optionValue="value" class="text-xs px-2 py-1" />
        </label>
        <label class="inline-flex items-center gap-2 text-rm-muted">
          <span class="font-medium">Branch:</span>
          <Select v-model="branchFilter" :options="branchFilterSelectOptions" optionLabel="label" optionValue="value" class="text-xs px-2 py-1 min-w-[8rem]" />
        </label>
        <label class="inline-flex items-center gap-2 text-rm-muted">
          <span class="font-medium">Keep history:</span>
          <Select v-model="retentionDays" :options="retentionOptions" optionLabel="label" optionValue="value" class="text-xs px-2 py-1" @change="saveRetentionAndTrim" />
        </label>
      </div>

      <!-- Coverage over time graph -->
      <div v-if="chartPoints.length >= 2" class="detail-coverage-chart-wrap mb-4 shrink-0 rounded-rm border border-rm-border bg-rm-surface/50 p-4">
        <span class="card-label text-rm-muted text-xs block mb-2">Coverage over time (by run date)</span>
        <CoverageChart :points="chartPoints" :height="chartHeight" @point-click="openCommitForPoint" />
        <div class="flex justify-between mt-1 text-[10px] text-rm-muted">
          <span>{{ chartPoints.length ? formatDateShort(chartPoints[0].date) : '' }}</span>
          <span>{{ chartPoints.length ? formatDateShort(chartPoints[chartPoints.length - 1].date) : '' }}</span>
        </div>
        <CoverageHistoryList :entries="historyNewestFirst" />
      </div>

      <p v-if="(output || lastOutput) && lastEntry?.date && !running" class="text-xs text-rm-muted mb-2 shrink-0">Run at {{ formatDate(lastEntry.date) }}</p>
      <pre v-if="running || output || lastOutput" class="detail-coverage-output m-0 p-4 rounded-rm bg-rm-surface text-xs font-mono text-rm-text min-h-[12rem] border border-rm-border whitespace-pre-wrap break-words">{{ running && !output ? 'Running coverage…' : (output || lastOutput) }}</pre>
    </div>
    </template>
  </Card>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import ProgressSpinner from 'primevue/progressspinner';
import CoverageChart from './CoverageChart.vue';
import CoverageHistoryList from './CoverageHistoryList.vue';
import { useAppStore } from '../../stores/app';
import { useStatusMessage } from '../../composables/useStatusMessage';
import { useApi } from '../../composables/useApi';
import { useModals } from '../../composables/useModals';
import { formatDate, formatDateShort } from '../../utils/formatDate';
import * as debug from '../../utils/debug';

const COVERAGE_HISTORY_KEY = 'coverageHistory';
const COVERAGE_LAST_OUTPUT_KEY = 'coverageLastOutput';
const COVERAGE_DISPLAY_RANGE_KEY = 'coverageDisplayRangeDays';
const COVERAGE_RETENTION_KEY = 'coverageHistoryRetention';
const COVERAGE_GOAL_KEY = 'coverageGoal';
const MAX_HISTORY = 500;
const CHART_HEIGHT = 120;
const DEFAULT_DISPLAY_RANGE_DAYS = 30;
const DEFAULT_RETENTION_DAYS = 30;

const props = defineProps({ info: { type: Object, default: null } });

const store = useAppStore();
const api = useApi();
const modals = useModals();
const running = ref(false);
const output = ref('');
const history = ref([]);
const lastOutput = ref('');
const displayRangeDays = ref(DEFAULT_DISPLAY_RANGE_DAYS); // 7 | 30 | 90 | 365 | 0 (all)
const retentionDays = ref(DEFAULT_RETENTION_DAYS); // 30 | 90 | 365 | 0 (forever)
const goalPercent = ref(null); // number | null
const branchFilter = ref(''); // '' = all, or branch name
const branchesFromGit = ref([]); // list of branch names from getBranches
const copyOutputStatus = useStatusMessage(2500);
const copySummaryStatus = useStatusMessage(2500);
const exportStatus = useStatusMessage(2500);

const chartHeight = CHART_HEIGHT;

function stripAnsiLocal(text) {
  if (!text || typeof text !== 'string') return text || '';
  // Remove real ANSI escape sequences (when present from current runs)
  let out = text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  // Remove JSON-escaped ANSI sequences like \\u001b[32m from older persisted output
  out = out.replace(/\\u001b\[[0-9;]*[a-zA-Z]/g, '');
  return out;
}

function parsePercentFromSummary(summary) {
  if (!summary || typeof summary !== 'string') return null;
  const m = summary.match(/([\d.]+)\s*%/);
  return m ? parseFloat(m[1], 10) : null;
}

const lastEntry = computed(() => history.value[history.value.length - 1] ?? null);
const previousEntry = computed(() => (history.value.length >= 2 ? history.value[history.value.length - 2] : null));
const lastSummary = computed(() => lastEntry.value?.summary ?? (lastEntry.value?.percent != null ? lastEntry.value.percent + '%' : '—'));
const lastPercent = computed(() => (lastEntry.value?.percent != null ? lastEntry.value.percent : null));

/** Trend: delta from previous run (positive = improved). */
const trendDelta = computed(() => {
  const last = lastEntry.value?.percent;
  const prev = previousEntry.value?.percent;
  if (last == null || prev == null) return null;
  const delta = last - prev;
  return Math.abs(delta) < 0.01 ? 0 : delta;
});

/** Same as trendDelta for compare block. */
const compareDelta = computed(() => {
  const last = lastEntry.value?.percent;
  const prev = previousEntry.value?.percent;
  if (last == null || prev == null) return 0;
  return last - prev;
});

/** Show hint to use AI when there is no coverage data yet. */
const showNoCoverageHint = computed(() => !running.value && history.value.length === 0 && !output.value && !lastOutput.value);

function goToAiSettings() {
  store.setViewMode('settings');
}

const displayRangeOptions = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 365, label: 'Last year' },
  { value: 0, label: 'All time' },
];
const retentionOptions = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
  { value: 0, label: 'Forever' },
];

/** Branch options: from Git (getBranches) plus any in history not in the list. */
const branchOptions = computed(() => {
  const set = new Set(branchesFromGit.value);
  history.value.forEach((e) => { if (e.branch) set.add(e.branch); });
  return [...set].sort();
});
const branchFilterSelectOptions = computed(() => [
  { value: '', label: 'All branches' },
  ...branchOptions.value.map((b) => ({ value: b, label: b })),
]);

/** days: number (7,30,90,365) or 0 / null / undefined for no limit */
function isDateWithinDays(isoDate, days) {
  if (days == null || days === 0) return true;
  const d = new Date(isoDate);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff;
}

/** History filtered by display range and branch. */
const filteredHistory = computed(() => {
  const range = displayRangeDays.value;
  const branch = branchFilter.value;
  return history.value.filter((e) => {
    if (!isDateWithinDays(e.date, range)) return false;
    if (branch && e.branch !== branch) return false;
    return true;
  });
});

/** Filtered entries for chart, oldest first (last 30 of filtered). */
const chartEntries = computed(() => {
  const list = [...filteredHistory.value];
  list.reverse();
  return list.slice(0, 30);
});

/** Filtered history newest first for the log list. */
const historyNewestFirst = computed(() => [...filteredHistory.value].reverse().slice(0, 30));

const chartPoints = computed(() => {
  const entries = chartEntries.value;
  if (entries.length < 2) return [];
  const percents = entries.map((e) => e.percent ?? 0);
  const minP = Math.min(0, ...percents);
  const maxP = Math.max(100, ...percents);
  const range = maxP - minP || 1;
  const w = 400;
  const h = 120;
  const padding = 8;
  const yScale = (v) => h - padding - ((v - minP) / range) * (h - 2 * padding);
  const xStep = (w - 2 * padding) / (entries.length - 1);
  return entries.map((e, i) => ({
    date: e.date,
    percent: e.percent,
    summary: e.summary,
    commitSha: e.commitSha,
    commitSubject: e.commitSubject,
    branch: e.branch,
    x: padding + i * xStep,
    y: yScale(e.percent ?? 0),
  }));
});

function openCommitForPoint(pt) {
  const path = store.selectedPath;
  if (!path || !pt.commitSha) return;
  modals.openModal('commitDetail', {
    dirPath: path,
    sha: pt.commitSha,
    isHead: false,
    onRefresh: () => {},
  });
}

function openCommit(sha) {
  const path = store.selectedPath;
  if (!path || !sha) return;
  modals.openModal('commitDetail', {
    dirPath: path,
    sha,
    isHead: false,
    onRefresh: () => {},
  });
}

async function saveGoal() {
  const path = store.selectedPath;
  if (!path || !api.setPreference || !api.getPreference) return;
  const val = goalPercent.value;
  if (val != null && (Number.isNaN(val) || val < 0 || val > 100)) {
    goalPercent.value = null;
  }
  try {
    const raw = await api.getPreference(COVERAGE_GOAL_KEY);
    const map = typeof raw === 'object' && raw !== null ? { ...raw } : {};
    if (val != null && !Number.isNaN(val) && val >= 0 && val <= 100) {
      map[path] = val;
    } else {
      delete map[path];
    }
    await api.setPreference(COVERAGE_GOAL_KEY, JSON.parse(JSON.stringify(map)));
  } catch (_) {}
}

async function copyOutput() {
  const text = output.value || lastOutput.value;
  if (!text) return;
  copyOutputStatus.clear();
  try {
    if (api.copyToClipboard) await api.copyToClipboard(text);
    else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else throw new Error('Copy not available');
    copyOutputStatus.setSuccess();
  } catch (_) {
    copyOutputStatus.setError();
  }
}

async function copySummary() {
  const e = lastEntry.value;
  if (!e) return;
  copySummaryStatus.clear();
  const line = `${e.percent}% – ${formatDate(e.date)}${e.branch ? ' – ' + e.branch : ''}${e.commitSubject ? ' – ' + e.commitSubject : ''}`;
  try {
    if (api.copyToClipboard) await api.copyToClipboard(line);
    else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(line);
    else throw new Error('Copy not available');
    copySummaryStatus.setSuccess();
  } catch (_) {
    copySummaryStatus.setError();
  }
}

function exportHistoryCsv() {
  const list = history.value;
  if (!list.length) return;
  exportStatus.clear();
  try {
    const headers = ['date', 'percent', 'branch', 'commitSha', 'commitSubject'];
    const rows = list.map((e) => [
      String(e.date ?? ''),
      String(e.percent ?? ''),
      String(e.branch ?? ''),
      String(e.commitSha ?? ''),
      String(e.commitSubject ?? '').replace(/"/g, '""'),
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => (c.includes(',') || c.includes('"') || c.includes('\n') ? `"${c}"` : c)).join(','))].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coverage-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    exportStatus.setExported();
  } catch (_) {
    exportStatus.setError();
  }
}

async function loadBranches() {
  const path = store.selectedPath;
  if (!path || !api.getBranches || !props.info?.hasGit) {
    branchesFromGit.value = [];
    return;
  }
  try {
    const r = await api.getBranches(path);
    branchesFromGit.value = r?.ok && Array.isArray(r.branches) ? r.branches : [];
  } catch {
    branchesFromGit.value = [];
  }
}

async function loadHistory() {
  const path = store.selectedPath;
  if (!path || !api.getPreference) {
    history.value = [];
    lastOutput.value = '';
    branchesFromGit.value = [];
    return;
  }
  try {
    const [raw, outMap, range, retention, goalMap] = await Promise.all([
      api.getPreference(COVERAGE_HISTORY_KEY),
      api.getPreference(COVERAGE_LAST_OUTPUT_KEY),
      api.getPreference(COVERAGE_DISPLAY_RANGE_KEY),
      api.getPreference(COVERAGE_RETENTION_KEY),
      api.getPreference(COVERAGE_GOAL_KEY),
    ]);
    const map = typeof raw === 'object' && raw !== null ? raw : {};
    const list = Array.isArray(map[path]) ? map[path] : [];
    // Clean any old persisted ANSI sequences from history summaries (defensive).
    history.value = list.map((e) => ({
      ...e,
      summary: typeof e.summary === 'string' ? stripAnsiLocal(e.summary) : e.summary,
    }));
    const outByPath = typeof outMap === 'object' && outMap !== null ? outMap : {};
    lastOutput.value = typeof outByPath[path] === 'string' ? stripAnsiLocal(outByPath[path]) : '';
    displayRangeDays.value = range === 7 || range === 30 || range === 90 || range === 365 ? range : (range === 0 || range === null ? 0 : DEFAULT_DISPLAY_RANGE_DAYS);
    retentionDays.value = retention === 30 || retention === 90 || retention === 365 ? retention : (retention === 0 || retention === null ? 0 : DEFAULT_RETENTION_DAYS);
    const goals = typeof goalMap === 'object' && goalMap !== null ? goalMap : {};
    const g = goals[path];
    goalPercent.value = typeof g === 'number' && g >= 0 && g <= 100 ? g : null;
    await loadBranches();
  } catch {
    history.value = [];
    lastOutput.value = '';
    branchesFromGit.value = [];
  }
}

function trimHistoryByRetention(list) {
  const days = retentionDays.value;
  if (days == null || days === 0) return list;
  return list.filter((e) => isDateWithinDays(e.date, days));
}

async function saveHistoryEntry(entry, fullOutput) {
  const path = store.selectedPath;
  if (!path || !api.setPreference || !api.getPreference) return;
  try {
    const [raw, outMap] = await Promise.all([
      api.getPreference(COVERAGE_HISTORY_KEY),
      api.getPreference(COVERAGE_LAST_OUTPUT_KEY),
    ]);
    const map = typeof raw === 'object' && raw !== null ? { ...raw } : {};
    const list = Array.isArray(map[path]) ? [...map[path]] : [];
    list.push(entry);
    const trimmed = trimHistoryByRetention(list);
    if (trimmed.length > MAX_HISTORY) trimmed.splice(0, trimmed.length - MAX_HISTORY);
    map[path] = trimmed;
    await api.setPreference(COVERAGE_HISTORY_KEY, JSON.parse(JSON.stringify(map)));
    history.value = trimmed;
    if (typeof fullOutput === 'string' && api.setPreference) {
      const outByPath = typeof outMap === 'object' && outMap !== null ? { ...outMap } : {};
      outByPath[path] = stripAnsiLocal(fullOutput);
      await api.setPreference(COVERAGE_LAST_OUTPUT_KEY, JSON.parse(JSON.stringify(outByPath)));
      lastOutput.value = stripAnsiLocal(fullOutput);
    }
  } catch (_) {}
}

async function saveRetentionAndTrim() {
  const path = store.selectedPath;
  if (!path || !api.setPreference || !api.getPreference) return;
  try {
    await api.setPreference(COVERAGE_RETENTION_KEY, retentionDays.value === 0 ? null : retentionDays.value);
    const raw = await api.getPreference(COVERAGE_HISTORY_KEY);
    const map = typeof raw === 'object' && raw !== null ? { ...raw } : {};
    const list = Array.isArray(map[path]) ? [...map[path]] : [];
    const trimmed = trimHistoryByRetention(list);
    map[path] = trimmed;
    await api.setPreference(COVERAGE_HISTORY_KEY, JSON.parse(JSON.stringify(map)));
    history.value = trimmed;
  } catch (_) {}
}

watch(displayRangeDays, (val) => {
  if (api.setPreference) api.setPreference(COVERAGE_DISPLAY_RANGE_KEY, val === 0 ? null : val);
}, { immediate: false });

watch(() => store.selectedPath, loadHistory, { immediate: true });

watch(() => [props.info?.path, props.info?.hasGit], () => {
  if (store.selectedPath && props.info?.hasGit) loadBranches();
}, { immediate: true });

async function run() {
  const path = store.selectedPath;
  const type = (props.info?.projectType || '').toLowerCase();
  debug.log('project', 'coverage.run clicked', { path, type, hasApi: !!api.runProjectCoverage });
  if (!path || !api.runProjectCoverage || (type !== 'npm' && type !== 'php')) {
    debug.warn('project', 'coverage.run guard failed', { pathOk: !!path, type, hasApi: !!api.runProjectCoverage });
    return;
  }
  running.value = true;
  output.value = '';
  try {
    debug.log('project', 'coverage.run call api.runProjectCoverage', { path, type });
    const result = await api.runProjectCoverage(path, type);
    debug.log('project', 'coverage.run result', {
      ok: result?.ok,
      exitCode: result?.exitCode,
      error: result?.error || null,
      hasSummary: !!result?.summary,
    });
    const rawOut = result?.stdout != null ? result.stdout : (result?.stderr || result?.error || 'No output');
    output.value = stripAnsiLocal(rawOut);
    const summary = result?.summary ?? null;
    const percent = summary ? parsePercentFromSummary(summary) : null;
    let commitSha = null;
    let commitSubject = null;
    if (api.getCommitLog) {
      try {
        const log = await api.getCommitLog(path, 1);
        if (log?.ok && log.commits?.length) {
          commitSha = log.commits[0].sha;
          commitSubject = log.commits[0].subject ?? null;
        }
      } catch (_) {}
    }
    const branch = props.info?.branch ?? null;
    const entry = {
      date: new Date().toISOString(),
      percent: percent ?? 0,
      summary: summary ?? (percent != null ? percent + '%' : null),
      commitSha: commitSha ?? null,
      commitSubject: commitSubject ?? null,
      branch: branch || null,
    };
    await saveHistoryEntry(entry, output.value);
  } catch (e) {
    output.value = e?.message || 'Coverage run failed.';
  } finally {
    running.value = false;
  }
}
</script>
