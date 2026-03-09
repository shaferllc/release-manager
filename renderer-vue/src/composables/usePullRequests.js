import { ref, computed, watch } from 'vue';
import { useApi } from './useApi';
import { useNotifications } from './useNotifications';

/**
 * Composable for the Pull requests tab: list, open/closed filter, create PR,
 * merge, and GitHub URL. Call with (store, getInfo, emit).
 * @returns Refs, computeds, and methods for DetailPullRequestsCard.
 */
export function usePullRequests(store, getInfo, emit) {
  const api = useApi();
  const notifications = useNotifications();

  const pullRequestsUrl = ref('');
  const pullRequests = ref([]);
  const loading = ref(false);
  const error = ref('');
  const prState = ref('open');
  const mergingPr = ref(null);
  const showCreateModal = ref(false);
  const newPrBase = ref('main');
  const newPrTitle = ref('');
  const newPrBody = ref('');
  const createPrLoading = ref(false);
  const createPrError = ref('');

  const prStateOptions = [
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
  ];

  const canCreatePr = computed(() => getInfo?.()?.path && getInfo?.()?.branch && api.createPullRequest);

  async function getToken() {
    const proj = store.projects.find((p) => p.path === store.selectedPath);
    const projectToken = proj?.githubToken?.trim();
    if (projectToken) return projectToken;
    return (await api.getGitHubToken?.()) || '';
  }

  async function load() {
    const path = store.selectedPath;
    const remote = getInfo?.()?.gitRemote;
    if (!path || !remote || !api.getPullRequests) return;
    error.value = '';
    loading.value = true;
    try {
      const prUrl = await api.getPullRequestsUrl?.(remote);
      if (prUrl) pullRequestsUrl.value = prUrl;
      const token = await getToken();
      const result = await api.getPullRequests(remote, prState.value, token || undefined);
      if (result?.ok) {
        pullRequests.value = result.pullRequests || [];
      } else {
        error.value = result?.error || 'Failed to load pull requests';
        pullRequests.value = [];
      }
    } catch (e) {
      error.value = e?.message || 'Failed to load pull requests';
      pullRequests.value = [];
    } finally {
      loading.value = false;
    }
  }

  watch(
    () => [getInfo?.()?.gitRemote, getInfo?.()?.path],
    () => { if (getInfo?.()?.gitRemote) load(); },
    { immediate: true }
  );

  watch(prState, () => { if (getInfo?.()?.gitRemote) load(); });

  function openPullRequestsUrl() {
    if (pullRequestsUrl.value) api.openUrl?.(pullRequestsUrl.value);
  }
  function openPrUrl(url) {
    if (url) api.openUrl?.(url);
  }

  function openCreateModal() {
    createPrError.value = '';
    newPrBase.value = 'main';
    newPrTitle.value = '';
    newPrBody.value = '';
    showCreateModal.value = true;
  }

  async function submitCreatePr() {
    const path = store.selectedPath;
    if (!path || !api.createPullRequest) return;
    createPrError.value = '';
    createPrLoading.value = true;
    try {
      const token = await getToken();
      const result = await api.createPullRequest(path, newPrBase.value || 'main', newPrTitle.value || 'WIP', newPrBody.value, token || undefined);
      if (result?.ok && result.pullRequest?.html_url) {
        showCreateModal.value = false;
        api.openUrl?.(result.pullRequest.html_url);
        await load();
        emit?.('refresh');
        notifications.add({ title: 'Pull request created', message: result.pullRequest?.title || 'PR opened in browser.', type: 'success' });
      } else {
        createPrError.value = result?.error || 'Failed to create pull request';
        notifications.add({ title: 'Create PR failed', message: result?.error || 'Failed to create pull request', type: 'error' });
      }
    } catch (e) {
      const err = e?.message || 'Failed to create pull request';
      createPrError.value = err;
      notifications.add({ title: 'Create PR failed', message: err, type: 'error' });
    } finally {
      createPrLoading.value = false;
    }
  }

  async function mergePr(pr) {
    const remote = getInfo?.()?.gitRemote;
    if (!remote || !api.mergePullRequest || !pr?.number) return;
    if (!window.confirm(`Merge #${pr.number} "${pr.title || 'Untitled'}"?`)) return;
    mergingPr.value = pr.number;
    try {
      const token = await getToken();
      const result = await api.mergePullRequest(remote, pr.number, 'merge', token || undefined);
      if (result?.ok) {
        await load();
        emit?.('refresh');
        notifications.add({ title: 'Pull request merged', message: `#${pr.number} merged.`, type: 'success' });
      } else {
        const err = result?.error || 'Merge failed';
        notifications.add({ title: 'Merge failed', message: err, type: 'error' });
      }
    } catch (e) {
      const err = e?.message || 'Merge failed';
      notifications.add({ title: 'Merge failed', message: err, type: 'error' });
    } finally {
      mergingPr.value = null;
    }
  }

  return {
    pullRequestsUrl,
    pullRequests,
    loading,
    error,
    prState,
    prStateOptions,
    mergingPr,
    showCreateModal,
    newPrBase,
    newPrTitle,
    newPrBody,
    createPrLoading,
    createPrError,
    canCreatePr,
    load,
    openPullRequestsUrl,
    openPrUrl,
    openCreateModal,
    submitCreatePr,
    mergePr,
  };
}
