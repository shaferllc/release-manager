import { ref } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';
import { useLicense } from './useLicense';
import { useNotifications } from './useNotifications';
import { toPlainProjects } from '../utils/plainProjects';
import { isProjectAlreadyAdded as checkProjectAlreadyAdded } from '../utils/projectUtils';

/**
 * Composable for "Add from Shipwell" flow: fetch projects, clone, add.
 * @param {() => Promise<void>} loadProjects - Callback to reload projects after add
 * @returns { { shipwellProjectsVisible, shipwellProjectsLoading, shipwellProjectsError, shipwellProjectsList, shipwellCloningRepo, isProjectAlreadyAdded, addFromShipwell, cloneAndAddProject } }
 */
export function useShipwellProjects(loadProjects) {
  const store = useAppStore();
  const api = useApi();
  const license = useLicense();
  const notifications = useNotifications();

  const shipwellProjectsVisible = ref(false);
  const shipwellProjectsLoading = ref(false);
  const shipwellProjectsError = ref('');
  const shipwellProjectsList = ref([]);
  const shipwellCloningRepo = ref('');

  function isProjectAlreadyAdded(proj) {
    return checkProjectAlreadyAdded(proj, store.projects);
  }

  async function addFromShipwell() {
    const maxProjects = license.maxProjects?.value ?? 5;
    if (maxProjects > 0 && store.projects.length >= maxProjects) {
      notifications.add({
        title: 'Project limit reached',
        message: `Your plan allows up to ${maxProjects} projects. Upgrade to add more.`,
        type: 'warn',
      });
      return;
    }
    shipwellProjectsVisible.value = true;
    shipwellProjectsLoading.value = true;
    shipwellProjectsError.value = '';
    shipwellProjectsList.value = [];
    try {
      const res = await api.fetchShipwellProjects?.();
      if (!res?.ok) {
        shipwellProjectsError.value = res?.error || 'Failed to fetch projects';
        return;
      }
      shipwellProjectsList.value = res.data || [];
    } catch (e) {
      shipwellProjectsError.value = e?.message || 'Failed to fetch projects';
    } finally {
      shipwellProjectsLoading.value = false;
    }
  }

  async function cloneAndAddProject(proj) {
    if (isProjectAlreadyAdded(proj) || shipwellCloningRepo.value) return;
    shipwellCloningRepo.value = proj.github_repo;
    try {
      const cloneUrl = proj.clone_url || `https://github.com/${proj.github_repo}.git`;
      const result = await api.cloneGitHubRepo?.(cloneUrl);
      if (!result?.ok) {
        if (result?.error !== 'Cancelled') {
          shipwellProjectsError.value = result?.error || 'Clone failed';
        }
        return;
      }
      const clonedPath = result.path;
      const newEntry = { path: clonedPath, name: clonedPath.split(/[/\\]/).pop(), tags: [], starred: false };
      const next = [...store.projects, newEntry];
      store.setProjects(next);
      store.setSelectedPath(clonedPath);
      if (typeof api.setProjects === 'function') {
        await api.setProjects(toPlainProjects(next));
        await loadProjects();
      }
      api.setPreference?.('selectedProjectPath', clonedPath).catch(() => {});
      shipwellProjectsVisible.value = false;
    } catch (e) {
      shipwellProjectsError.value = e?.message || 'Clone failed';
    } finally {
      shipwellCloningRepo.value = '';
    }
  }

  return {
    shipwellProjectsVisible,
    shipwellProjectsLoading,
    shipwellProjectsError,
    shipwellProjectsList,
    shipwellCloningRepo,
    isProjectAlreadyAdded,
    addFromShipwell,
    cloneAndAddProject,
  };
}
