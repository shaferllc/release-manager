<template>
  <div class="dashboard-view flex-1 flex flex-col min-h-0 overflow-hidden">
    <div class="dashboard-toolbar px-5 py-4 border-b border-rm-border bg-rm-surface/30 flex-shrink-0">
      <div class="dashboard-controls flex flex-wrap items-center gap-4">
        <label class="dashboard-label">
          <span class="dashboard-label-text">Filter</span>
          <Select v-model="filter" :options="filterOptions" optionLabel="label" optionValue="value" class="dashboard-select" />
        </label>
        <label class="dashboard-label">
          <span class="dashboard-label-text">Sort</span>
          <Select v-model="sort" :options="sortOptions" optionLabel="label" optionValue="value" class="dashboard-select" />
        </label>
        <Button severity="secondary" size="small" class="inline-flex items-center gap-x-1.5 shrink-0" @click="load">
          <svg class="w-[11px] h-[11px] shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
          Refresh
        </Button>
      </div>
    </div>
    <div class="dashboard-scroll flex-1 overflow-auto p-4">
      <table class="dashboard-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Version</th>
            <th>Latest tag</th>
            <th>Unreleased</th>
            <th>Branch</th>
            <th>Ahead / behind</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.path"
            class="dashboard-row cursor-pointer border-b border-rm-border hover:bg-rm-surface/50 transition-colors"
            @click="selectProject(row.path)"
          >
            <td class="py-2 pr-3 font-medium text-rm-text">{{ row.name || '—' }}</td>
            <td class="py-2 pr-3 font-mono text-sm text-rm-muted">{{ row.version || '—' }}</td>
            <td class="py-2 pr-3 font-mono text-sm text-rm-muted">{{ row.latestTag || '—' }}</td>
            <td class="py-2 pr-3 text-rm-muted">{{ unreleasedLabel(row) }}</td>
            <td class="py-2 pr-3 text-rm-muted">{{ row.branch || '—' }}</td>
            <td class="py-2 pr-3 text-rm-muted">{{ aheadBehindLabel(row) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="rows.length === 0" class="text-sm text-rm-muted m-0 mt-4">No projects match the filter.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import { useAppStore } from '../stores/app';
import { useApi } from '../composables/useApi';
import { formatAheadBehind } from '../utils';

const store = useAppStore();
const api = useApi();
const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'needs-release', label: 'Needs release' },
];
const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'needs-release', label: 'Needs release first' },
];
const filter = ref('all');
const sort = ref('name');
const data = ref([]);

const rows = computed(() => {
  let list = data.value;
  if (filter.value === 'needs-release') list = list.filter((r) => r.needsRelease);
  if (sort.value === 'needs-release') {
    list = [...list].sort((a, b) => (b.needsRelease ? 1 : 0) - (a.needsRelease ? 1 : 0) || (a.name || '').localeCompare(b.name || ''));
  } else {
    list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  return list;
});

function needsRelease(row) {
  const a = row.ahead != null && row.ahead > 0;
  const u = row.uncommittedLines && row.uncommittedLines.length > 0;
  const unreleased = row.commitsSinceLatestTag != null && row.commitsSinceLatestTag > 0;
  return a || u || unreleased;
}

function unreleasedLabel(row) {
  const n = row.commitsSinceLatestTag;
  if (n == null || n === 0) return '—';
  return `${n} commit${n === 1 ? '' : 's'}`;
}

function aheadBehindLabel(row) {
  return formatAheadBehind(row.ahead, row.behind) || '—';
}

function selectProject(path) {
  store.setViewMode('detail');
  store.setSelectedPath(path);
}

async function load() {
  try {
    const raw = await api.getAllProjectsInfo?.() ?? [];
    data.value = raw.map((r) => ({ ...r, needsRelease: needsRelease(r) }));
  } catch {
    data.value = [];
  }
}

onMounted(load);
watch(() => store.projects, load);
</script>
