<template>
  <section class="card mb-6 detail-tab-panel" data-detail-tab="version">
    <div class="card-section flex flex-wrap items-center gap-x-5 gap-y-3 pt-0">
        <Button variant="text" size="small" class="doc-trigger p-1 rounded-rm min-w-0 text-rm-muted hover:text-rm-accent hover:bg-rm-surface-hover text-xs font-normal shrink-0" title="Documentation" aria-label="Documentation" @click="openDocs('version-release')">(i)</Button>
        <div class="flex items-center gap-2.5">
          <span class="card-label text-rm-muted mb-0">Version</span>
          <span class="text-xl font-mono font-semibold text-rm-accent">{{ info?.version || '—' }}</span>
          <span v-if="info?.projectType" class="text-xs font-medium text-rm-muted">{{ info.projectType }}</span>
          <Button v-if="info?.version" variant="text" size="small" class="text-xs" title="Copy version" aria-label="Copy version" @click="copyVersion">Copy</Button>
        </div>
        <div class="flex items-center gap-2.5 text-sm">
          <span class="text-rm-muted">Latest tag</span>
          <span class="font-mono text-rm-text">{{ info?.latestTag || '—' }}</span>
          <Button v-if="info?.latestTag" variant="text" size="small" class="text-xs" title="Copy tag" aria-label="Copy tag" @click="copyTag">Copy</Button>
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
            <Button v-if="releasesUrl" variant="link" :label="tag" class="text-rm-accent p-0 min-w-0 h-auto" @click="openReleaseTag(tag)" />
            <span v-else>{{ tag }}</span>
            <Button v-if="releasesUrl" variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-muted hover:text-rm-accent" @click="downloadForTag(tag)">Download</Button>
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
            <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" :disabled="changelogLoading" @click="previewChangelog">
              {{ changelogLoading ? 'Loading…' : (changelogPreview.length ? 'Refresh' : 'Preview') }}
            </Button>
            <Button v-if="changelogPreview.length" variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="useChangelogForReleaseNotes">Use for release notes</Button>
            <Button v-if="changelogPreview.length" variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="copyChangelog">Copy</Button>
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
              <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="loadFromCommits">Load from commits</Button>
              <Button v-if="aiGenerateAvailable" variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="generateWithOllama">Generate with Ollama</Button>
              <Button variant="text" size="small" class="text-xs" title="Copy to clipboard" aria-label="Copy release notes" @click="copyReleaseNotes">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </Button>
              <span v-if="copyFeedback" class="text-xs text-rm-accent">Copied!</span>
            </div>
          </div>
          <Textarea v-model="releaseNotes" class="release-notes-input w-full min-h-[5rem]" rows="3" placeholder="Optional. Used as GitHub release body." />
        </div>
        <div v-if="canBump" class="flex flex-wrap gap-6 mb-5 text-sm">
          <label class="flex items-center gap-2 cursor-pointer">
            <Checkbox v-model="draft" binary />
            <span>Draft release</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <Checkbox v-model="prerelease" binary />
            <span>Pre-release</span>
          </label>
        </div>
        <div class="flex flex-wrap gap-3">
          <Button v-if="canBump" severity="primary" class="inline-flex items-center gap-x-1.5 shrink-0" @click="release('patch')">Patch</Button>
          <Button v-if="canBump" severity="secondary" class="inline-flex items-center gap-x-1.5 shrink-0" @click="release('minor')">Minor</Button>
          <Button v-if="canBump" severity="secondary" class="inline-flex items-center gap-x-1.5 shrink-0" @click="release('major')">Major</Button>
          <Button v-if="!canBump" severity="primary" class="inline-flex items-center gap-x-1.5 shrink-0" @click="tagAndPush">Tag and push</Button>
        </div>
        <p v-if="canBump" class="mt-3 text-xs text-rm-muted">Shortcuts: <kbd class="px-1 rounded bg-rm-surface font-mono text-xs">⌘1</kbd> Patch, <kbd class="px-1 rounded bg-rm-surface font-mono text-xs">⌘2</kbd> Minor, <kbd class="px-1 rounded bg-rm-surface font-mono text-xs">⌘3</kbd> Major, <kbd class="px-1 rounded bg-rm-surface font-mono text-xs">⌘S</kbd> Sync, <kbd class="px-1 rounded bg-rm-surface font-mono text-xs">⌘D</kbd> Download</p>
        <p class="release-status mt-4 text-sm" :class="releaseStatusSuccess ? 'text-rm-success' : 'text-rm-muted'">{{ releaseStatus }}</p>
        <p v-if="actionsUrl" class="mt-2">
          <Button variant="link" label="Open Actions →" class="text-rm-accent text-sm p-0 min-w-0 h-auto" @click="openActions" />
        </p>
      </div>

      <!-- Per-project GitHub token -->
      <div class="card-section card-section-muted border-t border-rm-border">
        <label class="card-label text-rm-muted mb-3 block">GitHub token (optional override)</label>
        <InputText v-model="projectToken" type="password" class="w-full" placeholder="Leave empty to use token from Settings." autocomplete="off" @blur="saveProjectToken" />
      </div>
  </section>
</template>

<script setup>
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import { useAppStore } from '../../stores/app';
import { useModals } from '../../composables/useModals';
import { useLongActionOverlay } from '../../composables/useLongActionOverlay';
import { useNotifications } from '../../composables/useNotifications';
import { useVersion } from '../../composables/useVersion';

const props = defineProps({ info: { type: Object, default: null } });
const emit = defineEmits(['refresh']);

const store = useAppStore();
const modals = useModals();
const { runWithOverlay } = useLongActionOverlay();
const notifications = useNotifications();

const {
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
} = useVersion(store, () => props.info, modals, runWithOverlay, notifications, () => emit('refresh'));
</script>
