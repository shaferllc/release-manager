<template>
  <section class="card mb-6 detail-tab-panel" data-detail-tab="version">
    <div class="card-section flex flex-wrap items-center gap-x-5 gap-y-3 pt-0">
        <button type="button" class="doc-trigger p-1 rounded-rm text-rm-muted hover:text-rm-accent hover:bg-rm-surface-hover border-0 bg-transparent cursor-pointer text-xs font-normal shrink-0" title="Documentation" aria-label="Documentation" @click="openDocs('version-release')">(i)</button>
        <div class="flex items-center gap-2.5">
          <span class="card-label text-rm-muted mb-0">Version</span>
          <span class="text-xl font-mono font-semibold text-rm-accent">{{ info?.version || '—' }}</span>
          <span v-if="info?.projectType" class="text-xs font-medium text-rm-muted">{{ info.projectType }}</span>
          <button v-if="info?.version" type="button" class="icon-btn icon-btn-sm" title="Copy version" aria-label="Copy version" @click="copyVersion">Copy</button>
        </div>
        <div class="flex items-center gap-2.5 text-sm">
          <span class="text-rm-muted">Latest tag</span>
          <span class="font-mono text-rm-text">{{ info?.latestTag || '—' }}</span>
          <button v-if="info?.latestTag" type="button" class="icon-btn icon-btn-sm" title="Copy tag" aria-label="Copy tag" @click="copyTag">Copy</button>
        </div>
        <p v-if="(info?.commitsSinceLatestTag ?? 0) > 0" class="text-xs text-rm-muted m-0">
          {{ info.commitsSinceLatestTag }} unreleased commit(s).
        </p>
      </div>

      <!-- Released versions -->
      <div v-if="info?.hasGit" class="card-section border-t border-rm-border">
        <span class="card-label">Released versions</span>
        <p v-if="!releasedTags.length" class="m-0 mt-2 text-xs text-rm-muted">No releases yet. Sync to fetch tags, or create a release.</p>
        <ul v-else class="m-0 mt-2 pl-4 text-sm text-rm-muted max-h-40 overflow-y-auto list-disc space-y-1.5">
          <li v-for="tag in releasedTags" :key="tag" class="flex items-center gap-3 flex-wrap font-mono py-0.5">
            <a v-if="releasesUrl" :href="releasesUrl + '/tag/' + encodeURIComponent(tag)" class="text-rm-accent hover:underline" target="_blank" rel="noopener" @click.prevent="openReleaseTag(tag)">{{ tag }}</a>
            <span v-else>{{ tag }}</span>
            <button v-if="releasesUrl" type="button" class="text-xs text-rm-muted hover:text-rm-accent border-none bg-transparent cursor-pointer p-0" @click="downloadForTag(tag)">Download</button>
          </li>
        </ul>
      </div>

      <div class="card-section border-t border-rm-border">
        <span class="card-label">Release</span>
        <p class="m-0 mb-5 text-sm text-rm-muted">
          {{ releaseHint }}
        </p>

        <!-- Recent commits + suggested bump -->
        <div v-if="info?.hasGit" class="mb-5">
          <span class="card-label text-rm-muted text-xs">Recent commits</span>
          <ul v-if="recentCommits.length" class="m-0 mt-1 pl-4 text-sm text-rm-muted max-h-24 overflow-y-auto list-disc space-y-0.5">
            <li v-for="(subject, i) in recentCommits" :key="i" class="truncate" :title="subject">{{ subject }}</li>
          </ul>
          <p v-if="suggestedBump" class="m-0 mt-2 text-xs text-rm-muted">Suggested bump: {{ suggestedBump }} (from conventional commits)</p>
        </div>

        <!-- Changelog (commits since last tag) -->
        <div v-if="info?.hasGit" class="mb-5">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <span class="card-label text-rm-muted text-xs">Changelog (since {{ info?.latestTag || 'start' }})</span>
            <button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent p-0 cursor-pointer" :disabled="changelogLoading" @click="previewChangelog">
              {{ changelogLoading ? 'Loading…' : (changelogPreview.length ? 'Refresh' : 'Preview') }}
            </button>
            <button v-if="changelogPreview.length" type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent p-0 cursor-pointer" @click="useChangelogForReleaseNotes">Use for release notes</button>
            <button v-if="changelogPreview.length" type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent p-0 cursor-pointer" @click="copyChangelog">Copy</button>
          </div>
          <div v-if="changelogPreview.length" class="mt-2 p-3 rounded-rm border border-rm-border bg-rm-surface/50 max-h-40 overflow-y-auto">
            <ul class="m-0 pl-4 text-sm text-rm-muted list-disc space-y-0.5">
              <li v-for="(line, i) in changelogPreview" :key="i" class="truncate" :title="line">{{ line }}</li>
            </ul>
          </div>
          <p v-else-if="changelogError" class="m-0 mt-1 text-xs text-rm-warning">{{ changelogError }}</p>
        </div>

        <!-- Release notes row -->
        <div v-if="canBump" class="release-notes-row mb-5">
          <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <label class="text-xs font-medium text-rm-text">Release notes</label>
            <div class="flex items-center gap-3 flex-wrap">
              <button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent p-0 cursor-pointer" @click="loadFromCommits">Load from commits</button>
              <button v-if="aiGenerateAvailable" type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent p-0 cursor-pointer" @click="generateWithOllama">Generate with Ollama</button>
              <button type="button" class="icon-btn icon-btn-sm" title="Copy to clipboard" aria-label="Copy release notes" @click="copyReleaseNotes">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
              <span v-if="copyFeedback" class="text-xs text-rm-accent">Copied!</span>
            </div>
          </div>
          <textarea v-model="releaseNotes" class="release-notes-input w-full rounded-rm border border-rm-border bg-rm-surface text-rm-text text-sm p-3 resize-y min-h-[5rem]" rows="3" placeholder="Optional. Used as GitHub release body."></textarea>
        </div>
        <div v-if="canBump" class="flex flex-wrap gap-6 mb-5 text-sm">
          <RmCheckbox v-model="draft" label="Draft release" />
          <RmCheckbox v-model="prerelease" label="Pre-release" />
        </div>
        <div class="flex flex-wrap gap-3">
          <RmButton v-if="canBump" variant="primary" class="inline-flex items-center gap-x-1.5 shrink-0" @click="release('patch')">Patch</RmButton>
          <RmButton v-if="canBump" variant="secondary" class="inline-flex items-center gap-x-1.5 shrink-0" @click="release('minor')">Minor</RmButton>
          <RmButton v-if="canBump" variant="secondary" class="inline-flex items-center gap-x-1.5 shrink-0" @click="release('major')">Major</RmButton>
          <RmButton v-if="!canBump" variant="primary" class="inline-flex items-center gap-x-1.5 shrink-0" @click="tagAndPush">Tag and push</RmButton>
        </div>
        <p v-if="canBump" class="mt-3 text-xs text-rm-muted">Shortcuts: <kbd class="px-1 rounded bg-rm-surface font-mono text-xs">⌘1</kbd> Patch, <kbd class="px-1 rounded bg-rm-surface font-mono text-xs">⌘2</kbd> Minor, <kbd class="px-1 rounded bg-rm-surface font-mono text-xs">⌘3</kbd> Major, <kbd class="px-1 rounded bg-rm-surface font-mono text-xs">⌘S</kbd> Sync, <kbd class="px-1 rounded bg-rm-surface font-mono text-xs">⌘D</kbd> Download</p>
        <p class="release-status mt-4 text-sm" :class="releaseStatusSuccess ? 'text-rm-success' : 'text-rm-muted'">{{ releaseStatus }}</p>
        <p v-if="actionsUrl" class="mt-2">
          <a :href="actionsUrl" class="text-rm-accent hover:underline text-sm" target="_blank" rel="noopener" @click.prevent="openActions">Open Actions →</a>
        </p>
      </div>

      <!-- Per-project GitHub token -->
      <div class="card-section card-section-muted border-t border-rm-border">
        <RmCardHeader tag="label" muted class="mb-3">GitHub token (optional override)</RmCardHeader>
        <RmInput v-model="projectToken" type="password" class="w-full" placeholder="Leave empty to use token from Settings." autocomplete="off" @blur="saveProjectToken" />
      </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { RmButton, RmCardHeader, RmCheckbox, RmInput } from '../ui';
import { useAppStore } from '../../stores/app';
import { useApi } from '../../composables/useApi';
import { useModals } from '../../composables/useModals';
import { useLongActionOverlay } from '../../composables/useLongActionOverlay';
import { useAiGenerateAvailable } from '../../composables/useAiGenerateAvailable';
import { useNotifications } from '../../composables/useNotifications';
import { toPlainProjects } from '../../utils/plainProjects';

const props = defineProps({ info: { type: Object, default: null } });
const emit = defineEmits(['refresh']);

const store = useAppStore();
const api = useApi();
const modals = useModals();
const { runWithOverlay } = useLongActionOverlay();
const { aiGenerateAvailable } = useAiGenerateAvailable();
const notifications = useNotifications();

function openDocs(docKey) {
  modals.openModal('docs', { docKey });
}

const releaseNotes = ref('');
const draft = ref(false);
const prerelease = ref(false);
const releaseStatus = ref('');
const releaseStatusSuccess = ref(false);
const actionsUrl = ref('');
const recentCommits = ref([]);
const suggestedBump = ref('');
const releasedTags = ref([]);
const releasesUrl = ref('');
const projectToken = ref('');
const copyFeedback = ref(false);
const changelogPreview = ref([]);
const changelogLoading = ref(false);
const changelogError = ref('');

const canBump = computed(() => (props.info?.projectType || '').toLowerCase() === 'npm');
const releaseHint = computed(() => {
  const t = (props.info?.projectType || '').toLowerCase();
  if (t !== 'npm') return 'Tag and push current version from your manifest.';
  return 'Creates a git tag vX.Y.Z and pushes it. With a GitHub token you can add release notes, draft, or pre-release.';
});

function getToken() {
  const tok = projectToken.value?.trim();
  if (tok) return tok;
  return null;
}

async function loadReleasedVersions() {
  if (!props.info?.hasGit || !props.info?.gitRemote) {
    releasedTags.value = props.info?.allTags || [];
    releasesUrl.value = '';
    return;
  }
  try {
    const url = await api.getReleasesUrl?.(props.info.gitRemote);
    releasesUrl.value = url || '';
    const token = getToken() || (await api.getGitHubToken?.()) || null;
    const res = await api.getGitHubReleases?.(props.info.gitRemote, token);
    if (res?.ok && res?.releases?.length) {
      releasedTags.value = res.releases.map((r) => r.tag_name);
    } else {
      releasedTags.value = props.info?.allTags || [];
    }
  } catch (_) {
    releasedTags.value = props.info?.allTags || [];
    releasesUrl.value = '';
  }
}

async function loadRecentCommits() {
  const path = store.selectedPath;
  if (!path || !props.info?.hasGit) {
    recentCommits.value = [];
    suggestedBump.value = '';
    return;
  }
  try {
    const result = await api.getRecentCommits?.(path, 7);
    if (!result?.ok || !result?.commits?.length) {
      recentCommits.value = [];
      suggestedBump.value = '';
      return;
    }
    recentCommits.value = result.commits.slice(0, 7);
    const suggested = await api.getSuggestedBump?.(result.commits);
    suggestedBump.value = suggested || '';
  } catch (_) {
    recentCommits.value = [];
    suggestedBump.value = '';
  }
}

watch(() => [props.info?.path, props.info?.gitRemote, props.info?.hasGit], loadReleasedVersions, { immediate: true });
watch(() => props.info?.path, loadRecentCommits, { immediate: true });

watch(() => store.selectedPath, () => {
  const proj = store.selectedProject;
  projectToken.value = proj?.githubToken ?? '';
});

watch(() => props.info?.path, () => {
  const proj = store.selectedProject;
  projectToken.value = proj?.githubToken ?? '';
}, { immediate: true });

async function loadFromCommits() {
  const path = store.selectedPath;
  const sinceTag = props.info?.latestTag || null;
  if (!path || !api.getCommitsSinceTag) return;
  try {
    const result = await api.getCommitsSinceTag(path, sinceTag);
    if (result?.ok && result?.commits?.length) {
      releaseNotes.value = result.commits.join('\n');
    } else {
      releaseNotes.value = result?.error || 'Could not load commits.';
    }
  } catch (_) {
    releaseNotes.value = 'Could not load commits. Try restarting the app.';
  }
}

async function previewChangelog() {
  const path = store.selectedPath;
  const sinceTag = props.info?.latestTag || null;
  if (!path || !api.getCommitsSinceTag) return;
  changelogLoading.value = true;
  changelogError.value = '';
  try {
    const result = await api.getCommitsSinceTag(path, sinceTag);
    if (result?.ok && result?.commits?.length) {
      changelogPreview.value = result.commits;
    } else {
      changelogPreview.value = [];
      changelogError.value = result?.error || 'No commits or git failed.';
    }
  } catch (_) {
    changelogPreview.value = [];
    changelogError.value = 'Could not load commits.';
  } finally {
    changelogLoading.value = false;
  }
}

function useChangelogForReleaseNotes() {
  if (changelogPreview.value.length) {
    releaseNotes.value = changelogPreview.value.join('\n');
  }
}

async function copyChangelog() {
  if (changelogPreview.value.length) {
    const text = changelogPreview.value.join('\n');
    await api.copyToClipboard?.(text);
    showCopyFeedback();
  }
}

async function generateWithOllama() {
  const path = store.selectedPath;
  const sinceTag = props.info?.latestTag || null;
  if (!path || !api.ollamaGenerateReleaseNotes) return;
  try {
    const result = await api.ollamaGenerateReleaseNotes(path, sinceTag);
    if (result?.ok && result?.text != null) {
      releaseNotes.value = result.text;
    } else {
      releaseNotes.value = result?.error || 'Could not generate. Check Ollama in Settings.';
    }
  } catch (_) {
    releaseNotes.value = 'Could not generate. Check Ollama in Settings.';
  }
}

async function copyVersion() {
  if (props.info?.version) {
    await api.copyToClipboard?.(props.info.version);
    showCopyFeedback();
  }
}

async function copyTag() {
  if (props.info?.latestTag) {
    await api.copyToClipboard?.(props.info.latestTag);
    showCopyFeedback();
  }
}

async function copyReleaseNotes() {
  const text = releaseNotes.value || '';
  if (text) await api.copyToClipboard?.(text);
  showCopyFeedback();
}

function showCopyFeedback() {
  copyFeedback.value = true;
  setTimeout(() => { copyFeedback.value = false; }, 2000);
}

function openReleaseTag(tag) {
  if (releasesUrl.value) api.openUrl?.(releasesUrl.value + '/tag/' + encodeURIComponent(tag));
}

async function downloadForTag(tagName) {
  if (!props.info?.gitRemote) return;
  try {
    const result = await api.getGitHubReleases?.(props.info.gitRemote, getToken() || undefined);
    if (!result?.ok || !result?.releases?.length) return;
    const release = result.releases.find((r) => r.tag_name === tagName);
    if (!release?.assets?.length) return;
    if (release.assets.length === 1) {
      const a = release.assets[0];
      await api.downloadAsset?.(a.browser_download_url, a.name);
      releaseStatus.value = `Saved ${a.name}.`;
      releaseStatusSuccess.value = true;
      return;
    }
    modals.openModal('pickAsset', { assets: release.assets });
  } catch (_) {}
}

function saveProjectToken() {
  const proj = store.projects.find((p) => p.path === store.selectedPath);
  if (!proj) return;
  proj.githubToken = projectToken.value?.trim() || undefined;
  api.setProjects?.(toPlainProjects(store.projects));
}

function release(bump) {
  const path = store.selectedPath;
  if (!path || !api.release) return;
  releaseStatus.value = 'Releasing…';
  releaseStatusSuccess.value = false;
  actionsUrl.value = '';
  const opts = {
    releaseNotes: releaseNotes.value?.trim() || undefined,
    draft: draft.value,
    prerelease: prerelease.value,
  };
  const token = getToken();
  if (token) opts.githubToken = token;
  runWithOverlay(api.release(path, bump, false, opts))
    .then((result) => {
      if (result?.ok) {
        let msg = `Tag ${result.tag || 'v?'} created and pushed.`;
        if (result.releaseError) msg += ` GitHub release note: ${result.releaseError}`;
        else if (result.actionsUrl) msg += ' Open the Actions tab to see workflow runs.';
        releaseStatus.value = msg;
        releaseStatusSuccess.value = true;
        if (result.actionsUrl) actionsUrl.value = result.actionsUrl;
        notifications.add({ title: 'Release created', message: result.tag ? `Tag ${result.tag} created and pushed.` : msg, type: 'success' });
        emit('refresh');
        loadReleasedVersions();
      } else {
        const err = result?.error || 'Release failed.';
        releaseStatus.value = err;
        releaseStatusSuccess.value = false;
        notifications.add({ title: 'Release failed', message: err, type: 'error' });
      }
    })
    .catch((e) => {
      const err = e?.message || 'Release failed.';
      releaseStatus.value = err;
      releaseStatusSuccess.value = false;
      notifications.add({ title: 'Release failed', message: err, type: 'error' });
    });
}

function tagAndPush() {
  const path = store.selectedPath;
  if (!path || !api.gitTagAndPush) return;
  releaseStatus.value = 'Tagging and pushing…';
  releaseStatusSuccess.value = false;
  actionsUrl.value = '';
  runWithOverlay(api.gitTagAndPush(path, releaseNotes.value || ''))
    .then(() => {
      releaseStatus.value = 'Tag pushed.';
      releaseStatusSuccess.value = true;
      notifications.add({ title: 'Tag pushed', message: 'Tag created and pushed.', type: 'success' });
      emit('refresh');
      loadReleasedVersions();
    })
    .catch((e) => {
      const err = e?.message || 'Failed.';
      releaseStatus.value = err;
      releaseStatusSuccess.value = false;
      notifications.add({ title: 'Tag push failed', message: err, type: 'error' });
    });
}

function openActions() {
  if (actionsUrl.value) api.openUrl?.(actionsUrl.value);
}
</script>
