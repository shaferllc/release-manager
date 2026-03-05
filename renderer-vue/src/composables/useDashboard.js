import { ref, computed, onMounted, watch } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';
import { formatAheadBehind } from '../utils';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'needs-release', label: 'Needs release' },
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'needs-release', label: 'Needs release first' },
];

function needsRelease(row) {
  const a = row.ahead != null && row.ahead > 0;
  const u = row.uncommittedLines && row.uncommittedLines.length > 0;
  const unreleased = row.commitsSinceLatestTag != null && row.commitsSinceLatestTag > 0;
  return a || u || unreleased;
}

/**
 * Composable for dashboard view: project list, filter/sort, refresh, select project.
 * No arguments. Returns state and methods for DashboardView.vue.
 */
export function useDashboard() {
  const store = useAppStore();
  const api = useApi();

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
      const raw = (await api.getAllProjectsInfo?.()) ?? [];
      data.value = raw.map((r) => ({ ...r, needsRelease: needsRelease(r) }));
    } catch {
      data.value = [];
    }
  }

  onMounted(load);
  watch(() => store.projects, load);

  return {
    filterOptions: FILTER_OPTIONS,
    sortOptions: SORT_OPTIONS,
    filter,
    sort,
    rows,
    unreleasedLabel,
    aheadBehindLabel,
    selectProject,
    load,
  };
}
