import { ref, computed } from 'vue';
import { useApi } from './useApi';

const overview = ref(null);
const loading = ref(false);
const error = ref('');

export function useExtensionAnalytics() {
  const api = useApi();

  async function fetchOverview() {
    loading.value = true;
    error.value = '';
    try {
      const result = await api.getExtensionAnalyticsOverview?.();
      if (result?.ok) {
        overview.value = result;
      } else {
        error.value = result?.error || 'Failed to load analytics';
        overview.value = null;
      }
    } catch (e) {
      error.value = e?.message || 'Failed to load analytics';
      overview.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchChartData(extensionId, range = '30d') {
    try {
      const result = await api.getExtensionAnalyticsChartData?.(extensionId, range);
      if (result?.ok) return result;
      return null;
    } catch {
      return null;
    }
  }

  const totalExtensions = computed(() => overview.value?.total_extensions ?? null);
  const totalInstalls = computed(() => overview.value?.total_installs ?? null);
  const mostPopular = computed(() => overview.value?.most_popular ?? null);
  const zeroInstalls = computed(() => overview.value?.zero_installs ?? null);

  const installCounts = computed(() => {
    const map = {};
    const perExt = overview.value?.per_extension;
    if (Array.isArray(perExt)) {
      for (const item of perExt) {
        if (item.id || item.slug) {
          map[item.id || item.slug] = item.install_count ?? 0;
        }
      }
    }
    return map;
  });

  return {
    overview,
    loading,
    error,
    totalExtensions,
    totalInstalls,
    mostPopular,
    zeroInstalls,
    installCounts,
    fetchOverview,
    fetchChartData,
  };
}
