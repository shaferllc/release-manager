import { ref, computed } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';
import { useLicense } from './useLicense';
import { useNotifications } from './useNotifications';
import { toPlainProjects } from '../utils/plainProjects';
import * as debug from '../utils/debug';

/**
 * Composable for bulk import projects flow.
 * @param {() => Promise<void>} loadProjects - Callback to reload projects after import
 * @returns { { bulkImportVisible, bulkImportScanning, bulkImportResults, bulkImportSelected, bulkImportSelectedCount, bulkImportSelectAll, bulkImport, confirmBulkImport } }
 */
export function useBulkImport(loadProjects) {
  const store = useAppStore();
  const api = useApi();
  const license = useLicense();
  const notifications = useNotifications();

  const bulkImportVisible = ref(false);
  const bulkImportScanning = ref(false);
  const bulkImportResults = ref(null);
  const bulkImportSelected = ref([]);

  const bulkImportSelectedCount = computed(() => bulkImportSelected.value.filter(Boolean).length);

  function bulkImportSelectAll(val) {
    bulkImportSelected.value = bulkImportSelected.value.map(() => val);
  }

  async function bulkImport() {
    bulkImportVisible.value = true;
    bulkImportScanning.value = true;
    bulkImportResults.value = null;
    bulkImportSelected.value = [];
    try {
      const result = await api.bulkImportProjects?.();
      if (!result?.ok) {
        bulkImportVisible.value = false;
        return;
      }
      bulkImportResults.value = result;
      bulkImportSelected.value = result.projects.map(() => true);
    } catch (e) {
      notifications.add({
        title: 'Scan failed',
        message: e?.message || 'Could not scan directory',
        type: 'error',
      });
      bulkImportVisible.value = false;
    } finally {
      bulkImportScanning.value = false;
    }
  }

  async function confirmBulkImport() {
    const results = bulkImportResults.value;
    if (!results) return;
    const selected = results.projects.filter((_, i) => bulkImportSelected.value[i]);
    if (!selected.length) return;

    const maxProjects = license.maxProjects?.value ?? 5;
    const currentCount = store.projects.length;
    let toAdd = selected;
    if (maxProjects > 0 && currentCount + selected.length > maxProjects) {
      const available = Math.max(0, maxProjects - currentCount);
      if (available === 0) {
        notifications.add({
          title: 'Project limit reached',
          message: `Your plan allows up to ${maxProjects} projects. Upgrade to add more.`,
          type: 'warn',
        });
        return;
      }
      toAdd = selected.slice(0, available);
      notifications.add({
        title: 'Partial import',
        message: `Only importing ${available} of ${selected.length} — plan limit of ${maxProjects} projects.`,
        type: 'warn',
      });
    }

    const newEntries = toAdd.map((p) => ({
      path: p.path,
      name: p.name || p.path.split(/[/\\]/).pop(),
      tags: [],
      starred: false,
    }));
    const next = [...store.projects, ...newEntries];
    store.setProjects(next);
    if (typeof api.setProjects === 'function') {
      try {
        const result = await api.setProjects(toPlainProjects(next));
        if (result?.limitExceeded) {
          await loadProjects();
          notifications.add({
            title: 'Project limit reached',
            message: `Your plan allows up to ${result.max} projects.`,
            type: 'warn',
          });
          bulkImportVisible.value = false;
          return;
        }
        await loadProjects();
      } catch (e) {
        debug.warn('project', 'bulkImport setProjects failed', e?.message ?? e);
      }
    }
    notifications.add({
      title: 'Projects imported',
      message: `${toAdd.length} project${toAdd.length === 1 ? '' : 's'} added.`,
      type: 'success',
    });
    bulkImportVisible.value = false;
  }

  return {
    bulkImportVisible,
    bulkImportScanning,
    bulkImportResults,
    bulkImportSelected,
    bulkImportSelectedCount,
    bulkImportSelectAll,
    bulkImport,
    confirmBulkImport,
  };
}
