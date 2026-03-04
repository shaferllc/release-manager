import { ref, computed, watch } from 'vue';
import { useApi } from './useApi';
import { useAiGenerateAvailable } from './useAiGenerateAvailable';
import { toPlainProjects } from '../utils/plainProjects';

/**
 * Composable for the Version/Release tab: released tags, recent commits, changelog,
 * release notes, bump/tag-and-push, GitHub token. Call with (store, getInfo, modals, runWithOverlay, notifications, onRefresh).
 */
export function useVersion(store, getInfo, modals, runWithOverlay, notifications, onRefresh) {
  const api = useApi();
  const { aiGenerateAvailable } = useAiGenerateAvailable();

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

  const canBump = computed(() => (getInfo?.()?.projectType || '').toLowerCase() === 'npm');
  const releaseHint = computed(() => {
    const t = (getInfo?.()?.projectType || '').toLowerCase();
    if (t !== 'npm') return 'Tag and push current version from your manifest.';
    return 'Creates a git tag vX.Y.Z and pushes it. With a GitHub token you can add release notes, draft, or pre-release.';
  });

  function getToken() {
    const tok = projectToken.value?.trim();
    return tok || null;
  }

  async function loadReleasedVersions() {
    const info = getInfo?.();
    if (!info?.hasGit || !info?.gitRemote) {
      releasedTags.value = info?.allTags || [];
      releasesUrl.value = '';
      return;
    }
    try {
      const url = await api.getReleasesUrl?.(info.gitRemote);
      releasesUrl.value = url || '';
      const token = getToken() || (await api.getGitHubToken?.()) || null;
      const res = await api.getGitHubReleases?.(info.gitRemote, token);
      if (res?.ok && res?.releases?.length) {
        releasedTags.value = res.releases.map((r) => r.tag_name);
      } else {
        releasedTags.value = info?.allTags || [];
      }
    } catch (_) {
      releasedTags.value = getInfo?.()?.allTags || [];
      releasesUrl.value = '';
    }
  }

  async function loadRecentCommits() {
    const path = store.selectedPath;
    const info = getInfo?.();
    if (!path || !info?.hasGit) {
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

  watch(
    () => [getInfo?.()?.path, getInfo?.()?.gitRemote, getInfo?.()?.hasGit],
    loadReleasedVersions,
    { immediate: true }
  );
  watch(() => getInfo?.()?.path, loadRecentCommits, { immediate: true });

  watch(() => store.selectedPath, () => {
    const proj = store.selectedProject;
    projectToken.value = proj?.githubToken ?? '';
  });
  watch(
    () => getInfo?.()?.path,
    () => {
      const proj = store.selectedProject;
      projectToken.value = proj?.githubToken ?? '';
    },
    { immediate: true }
  );

  function openDocs(docKey) {
    modals.openModal('docs', { docKey });
  }

  async function loadFromCommits() {
    const path = store.selectedPath;
    const sinceTag = getInfo?.()?.latestTag || null;
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
    const sinceTag = getInfo?.()?.latestTag || null;
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
    const sinceTag = getInfo?.()?.latestTag || null;
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
    const info = getInfo?.();
    if (info?.version) {
      await api.copyToClipboard?.(info.version);
      showCopyFeedback();
    }
  }

  async function copyTag() {
    const info = getInfo?.();
    if (info?.latestTag) {
      await api.copyToClipboard?.(info.latestTag);
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
    const info = getInfo?.();
    if (!info?.gitRemote) return;
    try {
      const result = await api.getGitHubReleases?.(info.gitRemote, getToken() || undefined);
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
          onRefresh?.();
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
        onRefresh?.();
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

  return {
    releaseNotes,
    draft,
    prerelease,
    releaseStatus,
    releaseStatusSuccess,
    actionsUrl,
    recentCommits,
    suggestedBump,
    releasedTags,
    releasesUrl,
    projectToken,
    copyFeedback,
    changelogPreview,
    changelogLoading,
    changelogError,
    canBump,
    releaseHint,
    aiGenerateAvailable,
    openDocs,
    loadFromCommits,
    previewChangelog,
    useChangelogForReleaseNotes,
    copyChangelog,
    generateWithOllama,
    copyVersion,
    copyTag,
    copyReleaseNotes,
    openReleaseTag,
    downloadForTag,
    saveProjectToken,
    release,
    tagAndPush,
    openActions,
  };
}
