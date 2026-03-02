<template>
  <section class="card mb-6 collapsible-card detail-tab-panel detail-coverage-card" data-detail-tab="coverage" :class="{ 'is-collapsed': collapsed }">
    <div class="collapsible-card-header-row shrink-0">
      <button type="button" class="collapsible-card-header" :aria-expanded="!collapsed" @click="toggle">
        <span class="collapsible-card-title">Coverage</span>
        <svg class="collapsible-card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
    <div class="collapsible-card-body">
    <div class="card-section">
      <span class="card-label shrink-0">Coverage</span>
      <p class="m-0 mb-4 text-sm text-rm-muted shrink-0">Run coverage for this project (npm: typically <code class="bg-rm-surface px-1 rounded text-xs">test:coverage</code> or similar; PHP: Pest/PHPUnit).</p>

      <!-- Last / previous run -->
      <div v-if="history.length" class="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4 shrink-0 text-sm">
        <span class="inline-flex items-center gap-1.5">
          <strong class="text-rm-muted font-medium">Last run:</strong>
          <span class="font-mono font-semibold text-rm-accent">{{ lastSummary }}</span>
          <span v-if="lastEntry?.date" class="text-rm-muted text-xs">({{ formatDate(lastEntry.date) }})</span>
        </span>
        <span v-if="previousEntry" class="inline-flex items-center gap-1.5 text-rm-muted">
          <strong class="font-medium">Previous:</strong>
          <span class="font-mono">{{ previousEntry.summary || previousEntry.percent + '%' }}</span>
          <span v-if="previousEntry.date" class="text-xs">({{ formatDate(previousEntry.date) }})</span>
        </span>
      </div>

      <div class="flex items-center gap-2 mb-4 shrink-0">
        <button type="button" class="btn-primary btn-compact text-xs" :disabled="running" @click="run">{{ running ? 'Running…' : 'Run coverage' }}</button>
        <span v-if="running" class="detail-coverage-progress inline-flex items-center gap-1.5 text-sm text-rm-muted" aria-live="polite">
          <span class="detail-coverage-spinner w-4 h-4 border-2 border-rm-border border-t-rm-accent rounded-full animate-spin shrink-0" aria-hidden="true"></span>
          Running coverage…
        </span>
      </div>

      <!-- Display range + retention -->
      <div class="flex flex-wrap items-center gap-3 mb-4 shrink-0 text-sm">
        <label class="inline-flex items-center gap-2 text-rm-muted">
          <span class="font-medium">Show:</span>
          <select v-model="displayRangeDays" class="text-xs rounded-rm border border-rm-border bg-rm-bg text-rm-text px-2 py-1">
            <option :value="7">Last 7 days</option>
            <option :value="30">Last 30 days</option>
            <option :value="90">Last 90 days</option>
            <option :value="365">Last year</option>
            <option :value="0">All time</option>
          </select>
        </label>
        <label class="inline-flex items-center gap-2 text-rm-muted">
          <span class="font-medium">Keep history:</span>
          <select v-model="retentionDays" class="text-xs rounded-rm border border-rm-border bg-rm-bg text-rm-text px-2 py-1" @change="saveRetentionAndTrim">
            <option :value="30">30 days</option>
            <option :value="90">90 days</option>
            <option :value="365">1 year</option>
            <option :value="0">Forever</option>
          </select>
        </label>
      </div>

      <!-- Coverage over time graph -->
      <div v-if="chartPoints.length >= 2" class="detail-coverage-chart-wrap mb-4 shrink-0 rounded-rm border border-rm-border bg-rm-surface/50 p-4">
        <span class="card-label text-rm-muted text-xs block mb-2">Coverage over time (by run date)</span>
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
              <circle
                :cx="pt.x"
                :cy="pt.y"
                :r="hoveredPoint === pt ? 5 : 3"
                fill="rgb(var(--rm-accent))"
                class="detail-coverage-dot"
                :class="{ 'detail-coverage-dot-hover': hoveredPoint === pt }"
              />
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
            <span v-if="entry.commitSubject" class="truncate min-w-0 text-rm-text/80" :title="entry.commitSubject">— {{ entry.commitSubject }}</span>
          </li>
        </ul>
      </div>

      <p v-if="(output || lastOutput) && lastEntry?.date && !running" class="text-xs text-rm-muted mb-2 shrink-0">Run at {{ formatDate(lastEntry.date) }}</p>
      <pre v-if="running || output || lastOutput" class="detail-coverage-output m-0 p-4 rounded-rm bg-rm-surface text-xs font-mono text-rm-text min-h-[12rem] border border-rm-border whitespace-pre-wrap break-words">{{ running && !output ? 'Running coverage…' : (output || lastOutput) }}</pre>
    </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useCollapsible } from '../../composables/useCollapsible';
import { useAppStore } from '../../stores/app';
import { useApi } from '../../composables/useApi';
import { useModals } from '../../composables/useModals';

const COVERAGE_HISTORY_KEY = 'coverageHistory';
const COVERAGE_LAST_OUTPUT_KEY = 'coverageLastOutput';
const COVERAGE_DISPLAY_RANGE_KEY = 'coverageDisplayRangeDays';
const COVERAGE_RETENTION_KEY = 'coverageHistoryRetention';
const MAX_HISTORY = 500;
const CHART_HEIGHT = 120;
const DEFAULT_DISPLAY_RANGE_DAYS = 30;
const DEFAULT_RETENTION_DAYS = 30;

const props = defineProps({ info: { type: Object, default: null } });

const store = useAppStore();
const api = useApi();
const modals = useModals();
const { collapsed, toggle } = useCollapsible('coverage');
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

const chartHeight = CHART_HEIGHT;

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

/** days: number (7,30,90,365) or 0 / null / undefined for no limit */
function isDateWithinDays(isoDate, days) {
  if (days == null || days === 0) return true;
  const d = new Date(isoDate);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff;
}

/** History filtered by display range (default last 30 days). */
const filteredHistory = computed(() => {
  const range = displayRangeDays.value;
  return history.value.filter((e) => isDateWithinDays(e.date, range));
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

async function loadHistory() {
  const path = store.selectedPath;
  if (!path || !api.getPreference) {
    history.value = [];
    lastOutput.value = '';
    return;
  }
  try {
    const [raw, outMap, range, retention] = await Promise.all([
      api.getPreference(COVERAGE_HISTORY_KEY),
      api.getPreference(COVERAGE_LAST_OUTPUT_KEY),
      api.getPreference(COVERAGE_DISPLAY_RANGE_KEY),
      api.getPreference(COVERAGE_RETENTION_KEY),
    ]);
    const map = typeof raw === 'object' && raw !== null ? raw : {};
    const list = Array.isArray(map[path]) ? map[path] : [];
    history.value = list;
    const outByPath = typeof outMap === 'object' && outMap !== null ? outMap : {};
    lastOutput.value = typeof outByPath[path] === 'string' ? outByPath[path] : '';
    displayRangeDays.value = range === 7 || range === 30 || range === 90 || range === 365 ? range : (range === 0 || range === null ? 0 : DEFAULT_DISPLAY_RANGE_DAYS);
    retentionDays.value = retention === 30 || retention === 90 || retention === 365 ? retention : (retention === 0 || retention === null ? 0 : DEFAULT_RETENTION_DAYS);
  } catch {
    history.value = [];
    lastOutput.value = '';
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
    await api.setPreference(COVERAGE_HISTORY_KEY, map);
    history.value = trimmed;
    if (typeof fullOutput === 'string' && api.setPreference) {
      const outByPath = typeof outMap === 'object' && outMap !== null ? { ...outMap } : {};
      outByPath[path] = fullOutput;
      await api.setPreference(COVERAGE_LAST_OUTPUT_KEY, outByPath);
      lastOutput.value = fullOutput;
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
    await api.setPreference(COVERAGE_HISTORY_KEY, map);
    history.value = trimmed;
  } catch (_) {}
}

watch(displayRangeDays, (val) => {
  if (api.setPreference) api.setPreference(COVERAGE_DISPLAY_RANGE_KEY, val === 0 ? null : val);
}, { immediate: false });

watch(() => store.selectedPath, loadHistory, { immediate: true });

async function run() {
  const path = store.selectedPath;
  const type = (props.info?.projectType || '').toLowerCase();
  if (!path || !api.runProjectCoverage || (type !== 'npm' && type !== 'php')) return;
  running.value = true;
  output.value = '';
  try {
    const result = await api.runProjectCoverage(path, type);
    output.value = result?.stdout != null ? result.stdout : (result?.stderr || result?.error || 'No output');
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
    const entry = {
      date: new Date().toISOString(),
      percent: percent ?? 0,
      summary: summary ?? (percent != null ? percent + '%' : null),
      commitSha: commitSha ?? null,
      commitSubject: commitSubject ?? null,
    };
    await saveHistoryEntry(entry, output.value);
  } catch (e) {
    output.value = e?.message || 'Coverage run failed.';
  } finally {
    running.value = false;
  }
}
</script>
