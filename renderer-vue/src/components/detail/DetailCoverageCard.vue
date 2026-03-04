<template>
  <section class="card mb-6 detail-tab-panel detail-coverage-card" data-detail-tab="coverage">
    <div class="card-section">
      <RmCardHeader class="shrink-0 mb-0">Coverage</RmCardHeader>
      <p class="m-0 mb-4 text-sm text-rm-muted shrink-0">Run coverage for this project (npm: typically <code class="bg-rm-surface px-1 rounded text-xs">test:coverage</code> or similar; PHP: Pest/PHPUnit).</p>

      <!-- No coverage yet: suggest AI -->
      <div v-if="showNoCoverageHint" class="mb-4 p-3 rounded-rm border border-rm-border bg-rm-surface/50 text-sm text-rm-muted">
        <p class="m-0">If no coverage exists yet, you can use AI to help generate tests and coverage. Configure your AI provider and API keys in Settings, then use the Tests tab to run tests and get AI-suggested fixes.</p>
        <button type="button" class="mt-2 text-sm text-rm-accent hover:underline border-0 bg-transparent cursor-pointer p-0 font-medium" @click="goToAiSettings">Open AI settings</button>
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
          <input v-model.number="goalPercent" type="number" min="0" max="100" step="1" class="w-16 text-xs rounded-rm border border-rm-border bg-rm-bg text-rm-text px-2 py-1" placeholder="—" @change="saveGoal" />
          <span class="text-xs">%</span>
        </label>
      </div>

      <div class="flex flex-wrap items-center gap-2 mb-4 shrink-0">
        <RmButton variant="primary" size="compact" class="text-xs" :disabled="running" @click="run">{{ running ? 'Running…' : 'Run coverage' }}</RmButton>
        <span class="inline-flex items-center gap-2">
          <RmButton variant="secondary" size="compact" class="text-xs" :disabled="!(output || lastOutput)" title="Copy full output" @click="copyOutput">Copy output</RmButton>
          <span v-if="copyOutputStatus" class="text-xs" :class="copyOutputStatus === 'Copied!' ? 'text-rm-success' : 'text-rm-warning'">{{ copyOutputStatus }}</span>
        </span>
        <span class="inline-flex items-center gap-2">
          <RmButton variant="secondary" size="compact" class="text-xs" :disabled="!lastEntry" title="Copy one-line summary" @click="copySummary">Copy summary</RmButton>
          <span v-if="copySummaryStatus" class="text-xs" :class="copySummaryStatus === 'Copied!' ? 'text-rm-success' : 'text-rm-warning'">{{ copySummaryStatus }}</span>
        </span>
        <span class="inline-flex items-center gap-2">
          <RmButton variant="secondary" size="compact" class="text-xs" :disabled="history.length === 0" title="Download history as CSV" @click="exportHistoryCsv">Export CSV</RmButton>
          <span v-if="exportStatus" class="text-xs" :class="exportStatus === 'Exported!' ? 'text-rm-success' : 'text-rm-warning'">{{ exportStatus }}</span>
        </span>
        <span v-if="running" class="detail-coverage-progress inline-flex items-center gap-1.5 text-sm text-rm-muted" aria-live="polite">
          <span class="detail-coverage-spinner w-4 h-4 border-2 border-rm-border border-t-rm-accent rounded-full animate-spin shrink-0" aria-hidden="true"></span>
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
          <button v-if="previousEntry.commitSha" type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0" @click="openCommit(previousEntry.commitSha)">View previous commit</button>
          <button v-if="lastEntry.commitSha" type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0" @click="openCommit(lastEntry.commitSha)">View last commit</button>
        </div>
      </div>

      <!-- Display range + retention + branch -->
      <div class="flex flex-wrap items-center gap-3 mb-4 shrink-0 text-sm">
        <label class="inline-flex items-center gap-2 text-rm-muted">
          <span class="font-medium">Show:</span>
          <RmSelect v-model="displayRangeDays" :options="displayRangeOptions" option-label="label" option-value="value" class="text-xs px-2 py-1" />
        </label>
        <label class="inline-flex items-center gap-2 text-rm-muted">
          <span class="font-medium">Branch:</span>
          <RmSelect v-model="branchFilter" :options="branchFilterSelectOptions" option-label="label" option-value="value" class="text-xs px-2 py-1 min-w-[8rem]" />
        </label>
        <label class="inline-flex items-center gap-2 text-rm-muted">
          <span class="font-medium">Keep history:</span>
          <RmSelect v-model="retentionDays" :options="retentionOptions" option-label="label" option-value="value" class="text-xs px-2 py-1" @change="saveRetentionAndTrim" />
        </label>
      </div>

      <!-- Coverage over time graph -->
      <div v-if="chartPoints.length >= 2" class="detail-coverage-chart-wrap mb-4 shrink-0 rounded-rm border border-rm-border bg-rm-surface/50 p-4">
        <RmCardHeader tag="span" muted class="text-xs block mb-2">Coverage over time (by run date)</RmCardHeader>
        <div ref="chartEl" class="detail-coverage-chart relative" :style="{ height: chartHeight + 'px' }">
          <svg class="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none" @mouseleave="hoveredPoint = null">
            <defs>
              <linearGradient id="detail-coverage-fill" x1="0" x2="0" y1="1" y2="0">
                <stop offset="0%" stop-color="rgb(var(--rm-accent))" stop-opacity="0.2" />
                <stop offset="100%" stop-color="rgb(var(--rm-accent))" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path
              v-if="chartPath"
              :d="chartPath"
              fill="url(#detail-coverage-fill)"
              stroke="rgb(var(--rm-accent))"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <g
              v-for="(pt, i) in chartPoints"
              :key="i"
              class="detail-coverage-point-group"
              :class="{ 'cursor-pointer': pt.commitSha }"
              @mouseenter="(e) => setHoveredPoint(e, pt)"
              @mouseleave="hoveredPoint = null"
              @click="openCommitForPoint(pt)"
            >
              <!-- Nested SVG keeps the dot round when the main chart is stretched to full width -->
              <svg
                :x="pt.x - 6"
                :y="pt.y - 6"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                preserveAspectRatio="xMidYMid meet"
                overflow="visible"
                class="detail-coverage-dot-svg"
              >
                <circle
                  cx="6"
                  cy="6"
                  :r="hoveredPoint === pt ? 4 : 2.5"
                  fill="rgb(var(--rm-surface))"
                  stroke="rgb(var(--rm-accent))"
                  stroke-width="1.2"
                  class="detail-coverage-dot"
                  :class="{ 'detail-coverage-dot-hover': hoveredPoint === pt }"
                />
              </svg>
            </g>
          </svg>
          <!-- Tooltip (fixed so clientX/clientY work) -->
          <div
            v-if="hoveredPoint"
            class="detail-coverage-tooltip fixed z-[100] py-2 px-3 rounded-rm border border-rm-border bg-rm-surface shadow-lg text-xs text-rm-text pointer-events-none"
            :style="tooltipStyle"
          >
            <div class="font-mono font-semibold text-rm-accent">{{ hoveredPoint.percent }}%</div>
            <div class="text-rm-muted mt-0.5">{{ formatDate(hoveredPoint.date) }}</div>
            <div v-if="hoveredPoint.branch" class="text-rm-muted text-[11px]">{{ hoveredPoint.branch }}</div>
            <div v-if="hoveredPoint.commitSubject" class="mt-1 max-w-[16rem] truncate text-rm-muted" :title="hoveredPoint.commitSubject">{{ hoveredPoint.commitSubject }}</div>
            <div v-if="hoveredPoint.commitSha" class="mt-1.5 text-rm-accent">Click to view commit</div>
          </div>
        </div>
        <div class="flex justify-between mt-1 text-[10px] text-rm-muted">
          <span>{{ chartPoints.length ? formatDateShort(chartPoints[0].date) : '' }}</span>
          <span>{{ chartPoints.length ? formatDateShort(chartPoints[chartPoints.length - 1].date) : '' }}</span>
        </div>
        <ul class="m-0 mt-3 pl-0 list-none text-xs text-rm-muted max-h-24 overflow-y-auto space-y-1">
          <li v-for="(entry, i) in historyNewestFirst" :key="i" class="flex items-center gap-2 truncate">
            <span class="font-mono shrink-0 w-12">{{ entry.percent }}%</span>
            <span class="shrink-0 min-w-[10rem]" :title="formatDate(entry.date)">{{ formatDate(entry.date) }}</span>
            <span v-if="entry.branch" class="shrink-0 text-rm-muted/80 w-20 truncate" :title="entry.branch">{{ entry.branch }}</span>
            <span v-if="entry.commitSubject" class="truncate min-w-0 text-rm-text/80" :title="entry.commitSubject">— {{ entry.commitSubject }}</span>
          </li>
        </ul>
      </div>

      <p v-if="(output || lastOutput) && lastEntry?.date && !running" class="text-xs text-rm-muted mb-2 shrink-0">Run at {{ formatDate(lastEntry.date) }}</p>
      <pre v-if="running || output || lastOutput" class="detail-coverage-output m-0 p-4 rounded-rm bg-rm-surface text-xs font-mono text-rm-text min-h-[12rem] border border-rm-border whitespace-pre-wrap break-words">{{ running && !output ? 'Running coverage…' : (output || lastOutput) }}</pre>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { RmButton, RmCardHeader, RmSelect } from '../ui';
import { useAppStore } from '../../stores/app';
import { useApi } from '../../composables/useApi';
import { useModals } from '../../composables/useModals';
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
const chartEl = ref(null);
const hoveredPoint = ref(null);
const tooltipX = ref(0);
const tooltipY = ref(0);
const goalPercent = ref(null); // number | null
const branchFilter = ref(''); // '' = all, or branch name
const branchesFromGit = ref([]); // list of branch names from getBranches
const copyOutputStatus = ref('');
const copySummaryStatus = ref('');
const exportStatus = ref('');

const chartHeight = CHART_HEIGHT;

const STATUS_RESET_MS = 2500;

function stripAnsiLocal(text) {
  if (!text || typeof text !== 'string') return text || '';
  // Remove real ANSI escape sequences (when present from current runs)
  let out = text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  // Remove JSON-escaped ANSI sequences like \\u001b[32m from older persisted output
  out = out.replace(/\\u001b\[[0-9;]*[a-zA-Z]/g, '');
  return out;
}

function clearStatusAfter(ref) {
  setTimeout(() => { ref.value = ''; }, STATUS_RESET_MS);
}

function copyToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (_) {}
  document.body.removeChild(ta);
  return ok ? Promise.resolve() : Promise.reject(new Error('execCommand copy failed'));
}

function parsePercentFromSummary(summary) {
  if (!summary || typeof summary !== 'string') return null;
  const m = summary.match(/([\d.]+)\s*%/);
  return m ? parseFloat(m[1], 10) : null;
}

function formatDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const hasTime = typeof isoDate === 'string' && isoDate.includes('T');
  if (hasTime) {
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateShort(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
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

const chartPath = computed(() => {
  const pts = chartPoints.value;
  if (pts.length < 2) return '';
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const padding = 8;
  const bottom = 112;
  return `${d} L ${pts[pts.length - 1].x} ${bottom} L ${pts[0].x} ${bottom} Z`;
});

const tooltipStyle = computed(() => ({
  left: `${tooltipX.value}px`,
  top: `${tooltipY.value}px`,
}));

function setHoveredPoint(e, pt) {
  hoveredPoint.value = pt;
  const offset = 12;
  tooltipX.value = e.clientX + offset;
  tooltipY.value = e.clientY + offset;
}

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
  copyOutputStatus.value = '';
  try {
    await copyToClipboard(text);
    copyOutputStatus.value = 'Copied!';
    clearStatusAfter(copyOutputStatus);
  } catch (_) {
    copyOutputStatus.value = 'Failed';
    clearStatusAfter(copyOutputStatus);
  }
}

async function copySummary() {
  const e = lastEntry.value;
  if (!e) return;
  copySummaryStatus.value = '';
  const line = `${e.percent}% – ${formatDate(e.date)}${e.branch ? ' – ' + e.branch : ''}${e.commitSubject ? ' – ' + e.commitSubject : ''}`;
  try {
    await copyToClipboard(line);
    copySummaryStatus.value = 'Copied!';
    clearStatusAfter(copySummaryStatus);
  } catch (_) {
    copySummaryStatus.value = 'Failed';
    clearStatusAfter(copySummaryStatus);
  }
}

function exportHistoryCsv() {
  const list = history.value;
  if (!list.length) return;
  exportStatus.value = '';
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
    exportStatus.value = 'Exported!';
    clearStatusAfter(exportStatus);
  } catch (_) {
    exportStatus.value = 'Failed';
    clearStatusAfter(exportStatus);
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
