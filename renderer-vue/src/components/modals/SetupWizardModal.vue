<template>
  <Dialog
    :visible="true"
    :header="false"
    :style="{ width: '40rem', maxHeight: '90vh' }"
    :modal="true"
    :dismissableMask="false"
    :closable="false"
    class="setup-wizard-modal"
    :pt="{ header: { style: 'display:none' }, content: { style: 'padding:0;overflow:hidden;display:flex;flex-direction:column;min-height:0' } }"
  >
    <div class="wizard flex flex-col min-h-0" style="height: 520px">
      <!-- Hero area with step visual -->
      <div class="wizard-hero shrink-0" :class="`wizard-hero--${currentStep.id}`">
        <div class="wizard-hero-inner">
          <div class="wizard-hero-icon" v-html="currentStep.icon" />
          <div>
            <p class="wizard-hero-step">Step {{ currentIndex + 1 }} of {{ steps.length }}</p>
            <h2 class="wizard-hero-title">{{ currentStep.title }}</h2>
          </div>
        </div>
      </div>

      <!-- Step indicator dots -->
      <div class="wizard-dots shrink-0">
        <button
          v-for="(step, i) in steps"
          :key="step.id"
          type="button"
          class="wizard-dot"
          :class="{ 'wizard-dot--active': currentIndex === i, 'wizard-dot--done': currentIndex > i }"
          :aria-label="`Go to step ${i + 1}: ${step.title}`"
          @click="goTo(i)"
        />
      </div>

      <!-- Step content -->
      <div class="wizard-body flex-1 min-h-0 overflow-y-auto">
        <Transition :name="slideDirection" mode="out-in">
          <div :key="currentStep.id" class="wizard-panel">
            <p class="wizard-desc">{{ currentStep.description }}</p>

            <!-- Step-specific content -->
            <div v-if="currentStep.id === 'welcome'" class="wizard-features">
              <div v-for="f in welcomeFeatures" :key="f.label" class="wizard-feature">
                <span class="wizard-feature-icon" v-html="f.icon" />
                <div>
                  <span class="wizard-feature-label">{{ f.label }}</span>
                  <span class="wizard-feature-desc">{{ f.desc }}</span>
                </div>
              </div>
            </div>

            <div v-if="currentStep.id === 'add-project'" class="wizard-callout">
              <p class="wizard-callout-text">Click the <strong>+</strong> button in the sidebar, or use <kbd>{{ metaKey }}+N</kbd> to add your first project folder.</p>
              <Button label="Add a project now" icon="pi pi-plus" severity="primary" size="small" @click="doAddProject" />
            </div>

            <div v-if="currentStep.id === 'dashboard'" class="wizard-tips">
              <div class="wizard-tip" v-for="t in dashboardTips" :key="t.label">
                <span class="wizard-tip-bullet" />
                <div><strong>{{ t.label }}</strong> — {{ t.desc }}</div>
              </div>
            </div>

            <div v-if="currentStep.id === 'git'" class="wizard-tips">
              <div class="wizard-tip" v-for="t in gitTips" :key="t.label">
                <span class="wizard-tip-bullet" />
                <div><strong>{{ t.label }}</strong> — {{ t.desc }}</div>
              </div>
            </div>

            <div v-if="currentStep.id === 'version'" class="wizard-tips">
              <div class="wizard-tip" v-for="t in versionTips" :key="t.label">
                <span class="wizard-tip-bullet" />
                <div><strong>{{ t.label }}</strong> — {{ t.desc }}</div>
              </div>
            </div>

            <div v-if="currentStep.id === 'tests'" class="wizard-tips">
              <div class="wizard-tip" v-for="t in testsTips" :key="t.label">
                <span class="wizard-tip-bullet" />
                <div><strong>{{ t.label }}</strong> — {{ t.desc }}</div>
              </div>
            </div>

            <div v-if="currentStep.id === 'extensions'" class="wizard-callout">
              <p class="wizard-callout-text">Extensions add powerful tabs like Terminal, Runbooks, SSH, Tunnels, Agent Crew, and more. Enable them from the Extensions or Settings view.</p>
              <Button label="Browse extensions" icon="pi pi-th-large" severity="secondary" size="small" @click="doOpenExtensions" />
            </div>

            <div v-if="currentStep.id === 'shortcuts'" class="wizard-shortcuts">
              <div v-for="s in shortcuts" :key="s.keys" class="wizard-shortcut">
                <kbd class="wizard-kbd">{{ s.keys }}</kbd>
                <span>{{ s.desc }}</span>
              </div>
            </div>

            <div v-if="currentStep.id === 'done'" class="wizard-done">
              <p class="wizard-done-text">You can re-run this wizard anytime from <strong>Settings &rarr; Application</strong> or the command palette.</p>
              <div class="wizard-done-actions">
                <Button label="Open Dashboard" icon="pi pi-home" severity="secondary" size="small" @click="doGoDashboard" />
                <Button label="Go to Settings" icon="pi pi-cog" severity="secondary" size="small" @click="doGoSettings" />
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Footer -->
      <div class="wizard-footer shrink-0">
        <div class="wizard-footer-left">
          <Button
            v-if="currentIndex > 0"
            label="Back"
            severity="secondary"
            text
            size="small"
            icon="pi pi-arrow-left"
            @click="prev"
          />
        </div>
        <div class="wizard-footer-right">
          <Button
            v-if="currentIndex === 0"
            label="Skip setup"
            severity="secondary"
            text
            size="small"
            @click="close"
          />
          <Button
            v-if="currentIndex < steps.length - 1"
            label="Continue"
            severity="primary"
            size="small"
            icon="pi pi-arrow-right"
            iconPos="right"
            @click="next"
          />
          <Button
            v-else
            label="Get started"
            severity="primary"
            size="small"
            icon="pi pi-check"
            @click="close"
          />
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { ref, computed, inject } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useAppStore } from '../../stores/app';
import { useModals } from '../../composables/useModals';

const emit = defineEmits(['close']);

const store = useAppStore();
const modals = useModals();
const onAddProject = inject('onAddProject', null);

const currentIndex = ref(0);
const slideDirection = ref('wizard-slide-left');

const isMac = navigator.platform?.toLowerCase().includes('mac');
const metaKey = isMac ? '⌘' : 'Ctrl';

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to Shipwell',
    description: 'Shipwell is a desktop app for managing your Git projects, releases, tests, and more — all in one place. Let\'s walk through the key features.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
  },
  {
    id: 'add-project',
    title: 'Add your projects',
    description: 'Start by adding your local Git repositories. Each project gets its own sidebar entry with quick access to all tabs and tools.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>',
  },
  {
    id: 'dashboard',
    title: 'The Dashboard',
    description: 'The Dashboard gives you a bird\'s eye view of all your projects at once — recent commits, open pull requests, and quick actions.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  },
  {
    id: 'git',
    title: 'Git management',
    description: 'The Git tab is a full-featured Git client. Stage files, commit, push, pull, manage branches, stash changes, resolve merge conflicts, and more — without leaving the app.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7"/><path d="M6 9v12"/></svg>',
  },
  {
    id: 'version',
    title: 'Versioning & releases',
    description: 'Bump your project version (patch, minor, major), create Git tags, and draft release notes — all from the Version & Release tab.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  },
  {
    id: 'tests',
    title: 'Tests & coverage',
    description: 'Run your test suites directly from the app. Supports npm and PHP (PHPUnit/Pest) projects. View pass/fail results and track code coverage over time.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
  },
  {
    id: 'extensions',
    title: 'Extensions',
    description: 'Extensions expand what Shipwell can do. Install them from the marketplace to add new project tabs — Terminal, Runbooks, SSH, Tunnels, Notes, and more.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
  },
  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    description: 'Shipwell is built for speed. Use the command palette and keyboard shortcuts to navigate without touching the mouse.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/></svg>',
  },
  {
    id: 'done',
    title: 'You\'re all set!',
    description: 'That covers the essentials. Explore the app, add your projects, and make it yours.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  },
];

const currentStep = computed(() => steps[currentIndex.value]);

const welcomeFeatures = [
  { icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7"/><path d="M6 9v12"/></svg>', label: 'Git', desc: 'Branches, commits, push, pull, stash, tags, merge & rebase' },
  { icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>', label: 'Releases', desc: 'Bump versions, create tags, draft release notes' },
  { icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>', label: 'Tests', desc: 'Run npm/PHP tests, track coverage over time' },
  { icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>', label: 'Extensions', desc: 'Terminal, Runbooks, SSH, Tunnels, Notes, and more' },
  { icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>', label: 'Dashboard', desc: 'Overview of all projects, recent activity, quick actions' },
  { icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>', label: 'Pull requests', desc: 'View and manage PRs for each project' },
];

const dashboardTips = [
  { label: 'Project cards', desc: 'See the current branch, last commit, and status of every project at a glance.' },
  { label: 'Quick actions', desc: 'Pull, push, or open a project in one click from the dashboard.' },
  { label: 'Filtering', desc: 'Filter by project type, tags, or search by name to find projects fast.' },
  { label: 'Multi-select', desc: 'Select multiple projects to sync, tag, or perform bulk actions.' },
];

const gitTips = [
  { label: 'Staging', desc: 'Click files to stage or unstage them. Use the diff viewer to review changes before committing.' },
  { label: 'Branches', desc: 'Create, switch, rename, and delete branches. See tracking status and ahead/behind counts.' },
  { label: 'Stash', desc: 'Stash uncommitted changes, list stashes, apply or drop them when needed.' },
  { label: 'Tags', desc: 'Create annotated or lightweight tags. Push tags to remote with one click.' },
  { label: 'Merge & rebase', desc: 'Merge branches or rebase onto another branch with conflict resolution.' },
  { label: 'Remote sync', desc: 'Fetch, pull, and push with visual indicators for ahead/behind status.' },
];

const versionTips = [
  { label: 'Semantic versioning', desc: 'Bump patch, minor, or major with one click. Supports npm and Composer projects.' },
  { label: 'Git tags', desc: 'Automatically create a Git tag when you bump the version.' },
  { label: 'Release notes', desc: 'Draft changelogs from your commit history. Copy or export them.' },
  { label: 'GitHub releases', desc: 'View and link to your GitHub releases for each project.' },
];

const testsTips = [
  { label: 'Auto-detect', desc: 'Shipwell detects npm (Vitest, Jest) and PHP (PHPUnit, Pest) test setups automatically.' },
  { label: 'Run from the app', desc: 'Click Run to execute your test suite. Results are streamed in real time.' },
  { label: 'Coverage tracking', desc: 'View code coverage percentages and track changes over time with the coverage chart.' },
  { label: 'Cursor integration', desc: 'Open a terminal for your project and interact with Cursor AI to create or fix tests.' },
];

const shortcuts = [
  { keys: `${metaKey}+Shift+P`, desc: 'Open the command palette — search actions, views, and projects' },
  { keys: `${metaKey}+N`, desc: 'Add a new project' },
  { keys: `${metaKey}+1–9`, desc: 'Switch between projects in the sidebar' },
  { keys: `${metaKey}+,`, desc: 'Open Settings' },
  { keys: `${metaKey}+R`, desc: 'Refresh current project' },
  { keys: `${metaKey}+Shift+S`, desc: 'Sync all projects' },
  { keys: `${metaKey}+B`, desc: 'Toggle sidebar' },
  { keys: `${metaKey}+K`, desc: 'Quick search / filter projects' },
];

function goTo(index) {
  slideDirection.value = index > currentIndex.value ? 'wizard-slide-left' : 'wizard-slide-right';
  currentIndex.value = index;
}

function next() {
  slideDirection.value = 'wizard-slide-left';
  if (currentIndex.value < steps.length - 1) currentIndex.value++;
}

function prev() {
  slideDirection.value = 'wizard-slide-right';
  if (currentIndex.value > 0) currentIndex.value--;
}

function doAddProject() {
  modals.closeModal();
  store.setViewMode('detail');
  if (typeof onAddProject === 'function') onAddProject();
}

function doOpenExtensions() {
  modals.closeModal();
  store.setViewMode('extensions');
}

function doGoDashboard() {
  close();
  store.setViewMode('dashboard');
}

function doGoSettings() {
  close();
  store.setViewMode('settings');
}

function close() {
  emit('close');
}
</script>

<style scoped>
.wizard {
  background: rgb(var(--rm-bg));
  border-radius: 12px;
  overflow: hidden;
}

/* Hero */
.wizard-hero {
  padding: 1.5rem 2rem 1rem;
  background: linear-gradient(135deg, rgb(var(--rm-accent) / 0.12) 0%, rgb(var(--rm-accent) / 0.04) 100%);
  border-bottom: 1px solid rgb(var(--rm-border) / 0.5);
}
.wizard-hero-inner {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.wizard-hero-icon {
  width: 44px;
  height: 44px;
  padding: 10px;
  border-radius: 12px;
  background: rgb(var(--rm-accent) / 0.15);
  color: rgb(var(--rm-accent));
  flex-shrink: 0;
}
.wizard-hero-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
.wizard-hero-step {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgb(var(--rm-accent));
  margin: 0 0 0.125rem;
}
.wizard-hero-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: rgb(var(--rm-text));
  margin: 0;
  letter-spacing: -0.02em;
}

/* Dots */
.wizard-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 0.75rem 0 0;
}
.wizard-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: rgb(var(--rm-border));
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
}
.wizard-dot--active {
  background: rgb(var(--rm-accent));
  transform: scale(1.3);
}
.wizard-dot--done {
  background: rgb(var(--rm-accent) / 0.4);
}

/* Body */
.wizard-body {
  padding: 1.25rem 2rem;
}
.wizard-panel {
  min-height: 0;
}
.wizard-desc {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: rgb(var(--rm-muted));
  margin: 0 0 1rem;
}

/* Welcome features grid */
.wizard-features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.625rem;
}
.wizard-feature {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  background: rgb(var(--rm-surface) / 0.6);
  border: 1px solid rgb(var(--rm-border) / 0.5);
}
.wizard-feature-icon {
  color: rgb(var(--rm-accent));
  flex-shrink: 0;
  margin-top: 1px;
}
.wizard-feature-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
}
.wizard-feature-desc {
  display: block;
  font-size: 0.6875rem;
  color: rgb(var(--rm-muted));
  line-height: 1.4;
}

/* Tips list */
.wizard-tips {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.wizard-tip {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  font-size: 0.8125rem;
  color: rgb(var(--rm-text));
  line-height: 1.5;
}
.wizard-tip-bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(var(--rm-accent));
  flex-shrink: 0;
  margin-top: 6px;
}

/* Callout */
.wizard-callout {
  padding: 1rem;
  border-radius: 10px;
  background: rgb(var(--rm-surface) / 0.6);
  border: 1px solid rgb(var(--rm-border));
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.wizard-callout-text {
  font-size: 0.875rem;
  color: rgb(var(--rm-text));
  margin: 0;
  line-height: 1.5;
}
.wizard-callout-text kbd {
  display: inline-block;
  padding: 0.1em 0.4em;
  border-radius: 4px;
  background: rgb(var(--rm-bg));
  border: 1px solid rgb(var(--rm-border));
  font-family: ui-monospace, monospace;
  font-size: 0.8em;
}

/* Shortcuts */
.wizard-shortcuts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.wizard-shortcut {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.8125rem;
  color: rgb(var(--rm-text));
}
.wizard-kbd {
  display: inline-block;
  min-width: 5.5rem;
  text-align: center;
  padding: 0.2em 0.5em;
  border-radius: 5px;
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(var(--rm-border));
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgb(var(--rm-accent));
  flex-shrink: 0;
}

/* Done */
.wizard-done {
  text-align: center;
  padding: 1rem 0;
}
.wizard-done-text {
  font-size: 0.9375rem;
  color: rgb(var(--rm-muted));
  line-height: 1.6;
  margin: 0 0 1.25rem;
}
.wizard-done-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

/* Footer */
.wizard-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 2rem 1.25rem;
  border-top: 1px solid rgb(var(--rm-border) / 0.5);
}
.wizard-footer-left {
  min-width: 80px;
}
.wizard-footer-right {
  display: flex;
  gap: 0.5rem;
}

/* Transitions */
.wizard-slide-left-enter-active,
.wizard-slide-left-leave-active,
.wizard-slide-right-enter-active,
.wizard-slide-right-leave-active {
  transition: all 0.2s ease-out;
}
.wizard-slide-left-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.wizard-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
.wizard-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.wizard-slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
