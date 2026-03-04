<template>
  <section class="card mb-6 detail-tab-panel" data-detail-tab="pull-requests">
      <div class="card-section flex flex-wrap items-center gap-3">
        <a v-if="pullRequestsUrl" :href="pullRequestsUrl" class="inline-flex items-center gap-x-1.5 shrink-0 px-3 py-1.5 text-sm rounded-rm-dynamic border border-rm-border bg-rm-surface hover:bg-rm-surface-hover text-rm-text no-underline" target="_blank" rel="noopener" @click.prevent="openPullRequestsUrl">Open on GitHub</a>
        <RmButton variant="primary" class="inline-flex items-center gap-x-1.5 shrink-0" :disabled="!canCreatePr" @click="openCreateModal">New pull request</RmButton>
        <div class="flex items-center gap-2">
          <button
            v-for="s in ['open', 'closed']"
            :key="s"
            type="button"
            class="text-sm px-2 py-1 rounded-rm border border-transparent"
            :class="prState === s ? 'text-rm-accent border-rm-accent/50 bg-rm-accent/10' : 'text-rm-muted hover:text-rm-text hover:bg-rm-surface/50'"
            @click="prState = s; load()"
          >
            {{ s === 'open' ? 'Open' : 'Closed' }}
          </button>
        </div>
      </div>

      <p v-if="error" class="card-section text-sm text-rm-warning">{{ error }}</p>
      <p v-else-if="!info?.gitRemote" class="card-section text-sm text-rm-muted">No remote configured. Add a GitHub remote to manage pull requests.</p>
      <div v-else class="card-section border-t border-rm-border">
        <p v-if="loading" class="text-sm text-rm-muted">Loading…</p>
        <template v-else>
          <p v-if="!pullRequests.length" class="text-sm text-rm-muted m-0">No {{ prState }} pull requests.</p>
          <ul v-else class="m-0 pl-0 list-none space-y-2 max-h-[24rem] overflow-y-auto">
            <li
              v-for="pr in pullRequests"
              :key="pr.id"
              class="flex flex-wrap items-center gap-2 py-2 px-3 rounded-rm border border-rm-border bg-rm-surface/30"
            >
              <span class="font-mono text-xs text-rm-muted shrink-0">#{{ pr.number }}</span>
              <a
                :href="pr.html_url"
                class="text-rm-accent hover:underline font-medium truncate min-w-0 flex-1"
                target="_blank"
                rel="noopener"
                @click.prevent="openPrUrl(pr.html_url)"
              >
                {{ pr.title || 'Untitled' }}
              </a>
              <span class="text-xs text-rm-muted shrink-0">{{ pr.head?.ref }} → {{ pr.base?.ref }}</span>
              <span v-if="pr.user?.login" class="text-xs text-rm-muted shrink-0">by {{ pr.user.login }}</span>
              <RmButton
                v-if="prState === 'open' && pr.mergeable !== false"
                variant="secondary"
                size="compact"
                class="text-xs shrink-0"
                :disabled="mergingPr === pr.number"
                @click="mergePr(pr)"
              >
                {{ mergingPr === pr.number ? 'Merging…' : 'Merge' }}
              </RmButton>
            </li>
          </ul>
        </template>
      </div>

      <!-- Create PR modal -->
      <div v-if="showCreateModal" class="card-section border-t border-rm-border pt-4">
        <h4 class="text-sm font-semibold text-rm-text mb-3">Create pull request</h4>
        <p class="text-xs text-rm-muted mb-2">Current branch: <strong class="font-mono">{{ info?.branch || '—' }}</strong></p>
        <label class="block text-xs font-medium text-rm-text mb-1">Base branch</label>
        <RmInput v-model="newPrBase" type="text" class="w-full mb-3" placeholder="e.g. main" />
        <label class="block text-xs font-medium text-rm-text mb-1">Title</label>
        <RmInput v-model="newPrTitle" type="text" class="w-full mb-3" placeholder="PR title" />
        <label class="block text-xs font-medium text-rm-text mb-1">Body (optional)</label>
        <RmTextarea v-model="newPrBody" class="w-full min-h-[4rem]" rows="3" placeholder="Description" />
        <div class="flex flex-wrap gap-2 mt-3">
          <RmButton variant="primary" size="compact" class="text-sm" :disabled="createPrLoading" @click="submitCreatePr">{{ createPrLoading ? 'Creating…' : 'Create' }}</RmButton>
          <RmButton variant="secondary" size="compact" class="text-sm" :disabled="createPrLoading" @click="showCreateModal = false">Cancel</RmButton>
        </div>
        <p v-if="createPrError" class="text-sm text-rm-warning mt-2">{{ createPrError }}</p>
      </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { RmButton, RmInput, RmTextarea } from '../ui';
import { useAppStore } from '../../stores/app';
import { useApi } from '../../composables/useApi';
import { useLongActionOverlay } from '../../composables/useLongActionOverlay';
import { useNotifications } from '../../composables/useNotifications';

const props = defineProps({ info: { type: Object, default: null } });
const emit = defineEmits(['refresh']);

const store = useAppStore();
const api = useApi();
const { runWithOverlay } = useLongActionOverlay();
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

const canCreatePr = computed(() => props.info?.path && props.info?.branch && api.createPullRequest);

async function getToken() {
  const proj = store.projects.find((p) => p.path === store.selectedPath);
  const projectToken = proj?.githubToken?.trim();
  if (projectToken) return projectToken;
  return (await api.getGitHubToken?.()) || '';
}

async function load() {
  const path = store.selectedPath;
  const remote = props.info?.gitRemote;
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

watch(() => [props.info?.gitRemote, props.info?.path], () => { if (props.info?.gitRemote) load(); }, { immediate: true });

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
      emit('refresh');
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
  const remote = props.info?.gitRemote;
  if (!remote || !api.mergePullRequest || !pr?.number) return;
  if (!window.confirm(`Merge #${pr.number} "${pr.title || 'Untitled'}"?`)) return;
  mergingPr.value = pr.number;
  try {
    const token = await getToken();
    const result = await api.mergePullRequest(remote, pr.number, 'merge', token || undefined);
    if (result?.ok) {
      await load();
      emit('refresh');
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
</script>
