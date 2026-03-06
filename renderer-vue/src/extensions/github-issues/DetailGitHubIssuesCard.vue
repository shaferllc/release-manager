<template>
  <ExtensionLayout tab-id="github-issues" content-class="detail-github-issues-card">
    <template #toolbar-start>
      <p class="text-sm text-rm-muted m-0">
        List issues for this GitHub repo. Set a GitHub token in Settings to load. Read-only; open in browser to create or comment.
      </p>
    </template>
    <template #toolbar-end>
      <Button
        v-if="issuesUrl"
        variant="outlined"
        size="small"
        label="Open on GitHub"
        icon="pi pi-external-link"
        @click="openIssuesUrl"
      />
    </template>

    <div v-if="!gitRemote" class="py-12 px-4 text-center text-rm-muted text-sm">
      <p class="m-0">No GitHub remote configured. Add a remote pointing to GitHub to list issues.</p>
    </div>
    <template v-else>
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <SelectButton
          v-model="issueState"
          :options="issueStateOptions"
          option-label="label"
          option-value="value"
          class="text-sm"
        />
        <label class="flex items-center gap-2">
          <span class="text-xs text-rm-muted shrink-0">Label</span>
          <Select
            v-model="selectedLabel"
            :options="labelOptions"
            option-label="label"
            option-value="name"
            placeholder="All"
            class="w-[10rem] text-sm"
            @change="loadIssues"
          />
        </label>
      </div>

      <Message v-if="error" severity="warn" class="text-sm">{{ error }}</Message>
      <Message v-else-if="!hasToken" severity="secondary" class="text-sm">
        GitHub token required. Set it in <strong>Settings</strong> to list issues.
      </Message>
      <Panel v-else class="issues-panel flex-1 flex flex-col min-h-0">
        <template #header>
          <div class="flex items-center justify-between gap-3 w-full">
            <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Issues</h3>
            <span v-if="issues.length" class="text-xs text-rm-muted">{{ issues.length }} issue{{ issues.length === 1 ? '' : 's' }}</span>
          </div>
        </template>
        <div v-if="loading" class="py-8 text-center text-rm-muted text-sm">Loading…</div>
        <template v-else>
          <p v-if="!issues.length" class="text-sm text-rm-muted m-0 py-4">No {{ issueState }} issues{{ selectedLabel ? ` with label “${selectedLabel}”` : '' }}.</p>
          <ul v-else class="issues-ul list-none m-0 p-0 max-h-[24rem] overflow-y-auto">
            <li
              v-for="issue in issues"
              :key="issue.id"
              class="issue-row flex flex-wrap items-center gap-2 py-2 px-3 border-b border-rm-border last:border-b-0 hover:bg-rm-surface-hover/50"
            >
              <span class="font-mono text-xs text-rm-muted shrink-0">#{{ issue.number }}</span>
              <Button
                variant="link"
                :label="issue.title || 'Untitled'"
                class="text-rm-accent font-medium truncate min-w-0 flex-1 justify-start p-0 h-auto text-left"
                @click="openIssueUrl(issue.html_url)"
              />
              <div v-if="issue.labels?.length" class="flex flex-wrap gap-1 shrink-0">
                <span
                  v-for="l in issue.labels"
                  :key="l.id"
                  class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  :style="{ color: l.color ? '#' + l.color : 'inherit', backgroundColor: l.color ? '#' + l.color + '20' : 'var(--rm-surface)' }"
                >
                  {{ l.name }}
                </span>
              </div>
              <span v-if="issue.user?.login" class="text-xs text-rm-muted shrink-0">by {{ issue.user.login }}</span>
              <Button
                variant="text"
                size="small"
                icon="pi pi-external-link"
                class="p-1.5 min-w-0 shrink-0 text-rm-muted hover:text-rm-text"
                v-tooltip.top="'Open in browser'"
                @click="openIssueUrl(issue.html_url)"
              />
            </li>
          </ul>
        </template>
      </Panel>
    </template>
  </ExtensionLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import ExtensionLayout from '../../components/detail/ExtensionLayout.vue';
import Message from 'primevue/message';
import Panel from 'primevue/panel';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import { useApi } from '../../composables/useApi';
import { useAppStore } from '../../stores/app';

const props = defineProps({ info: { type: Object, default: null } });

const api = useApi();
const store = useAppStore();

const issuesUrl = ref('');
const issues = ref([]);
const labels = ref([]);
const labelOptions = computed(() => [
  { name: '', label: 'All' },
  ...labels.value.map((l) => ({ ...l, label: l.name })),
]);
const selectedLabel = ref('');
const issueState = ref('open');
const loading = ref(false);
const error = ref('');
const hasToken = ref(false);

const issueStateOptions = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

const gitRemote = computed(() => props.info?.gitRemote ?? '');

async function getToken() {
  const proj = store.projects?.find((p) => p.path === store.selectedPath);
  const projectToken = proj?.githubToken?.trim();
  if (projectToken) return projectToken;
  return (await api.getGitHubToken?.()) || '';
}

async function loadLabels() {
  const remote = gitRemote.value;
  if (!remote || !api.getGitHubLabels) return;
  const token = await getToken();
  const result = await api.getGitHubLabels(remote, token || undefined);
  if (result?.ok && Array.isArray(result.labels)) {
    labels.value = result.labels;
  } else {
    labels.value = [];
  }
}

async function loadIssues() {
  const remote = gitRemote.value;
  if (!remote || !api.getGitHubIssues) return;
  error.value = '';
  loading.value = true;
  try {
    const token = await getToken();
    hasToken.value = !!(token && token.trim());
    if (!hasToken.value) {
      issues.value = [];
      loading.value = false;
      return;
    }
    const result = await api.getGitHubIssues(remote, token, {
      state: issueState.value,
      labels: selectedLabel.value ? selectedLabel.value : null,
    });
    if (result?.ok) {
      issues.value = result.issues || [];
    } else {
      error.value = result?.error || 'Failed to load issues';
      issues.value = [];
    }
  } catch (e) {
    error.value = e?.message || 'Failed to load issues';
    issues.value = [];
  } finally {
    loading.value = false;
  }
}

function openIssuesUrl() {
  if (issuesUrl.value && api.openUrl) api.openUrl(issuesUrl.value);
}

function openIssueUrl(url) {
  if (url && api.openUrl) api.openUrl(url);
}

watch(
  gitRemote,
  async (remote) => {
    if (!remote) {
      issuesUrl.value = '';
      issues.value = [];
      labels.value = [];
      return;
    }
    issuesUrl.value = (await api.getIssuesUrl?.(remote)) || '';
    await loadLabels();
    loadIssues();
  },
  { immediate: true }
);

watch(issueState, loadIssues);
watch(selectedLabel, loadIssues);
</script>

<style scoped>
.issues-ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.issues-panel :deep(.p-panel-content) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
