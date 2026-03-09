<template>
  <div class="dashboard-view flex-1 flex flex-col min-h-0 overflow-y-auto">
    <!-- Hero -->
    <header class="dash-hero">
      <div class="dash-hero-text">
        <h1 class="dash-hero-headline">{{ greeting }}</h1>
        <p class="dash-hero-sub">
          <template v-if="license.isLoggedIn?.value">
            Signed in as <strong>{{ license.licenseEmail?.value || 'user' }}</strong>
            <span class="dash-plan-badge" :class="`plan-${license.tier?.value || 'free'}`">{{ license.tierLabel?.value || 'Free' }}</span>
          </template>
          <template v-else>Sign in to unlock all features and sync your plan.</template>
        </p>
      </div>
    </header>

    <!-- Stats strip -->
    <section class="dash-stats">
      <div class="dash-stat-card" @click="filter = 'all'">
        <span class="dash-stat-value">{{ summary.total }}</span>
        <span class="dash-stat-label">Projects</span>
      </div>
      <div class="dash-stat-card accent" @click="filter = 'needs-release'">
        <span class="dash-stat-value">{{ summary.needsRelease }}</span>
        <span class="dash-stat-label">Need release</span>
      </div>
      <div class="dash-stat-card">
        <span class="dash-stat-value">{{ summary.noTag }}</span>
        <span class="dash-stat-label">No tags yet</span>
      </div>
      <div class="dash-stat-card">
        <span class="dash-stat-value">{{ summary.totalAhead }}</span>
        <span class="dash-stat-label">Commits ahead</span>
      </div>
    </section>

    <!-- Quick actions -->
    <section v-if="rows.length" class="dash-quick-actions">
      <button class="dash-action-btn" :disabled="releasing" @click="releaseAllPatch">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
        {{ releasing ? 'Releasing…' : `Patch all (${needsReleaseRows.length})` }}
      </button>
      <button class="dash-action-btn" @click="openTerminal">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
        Terminal
      </button>
      <button class="dash-action-btn" @click="goToSettings">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09c-.658.003-1.25.396-1.51 1z"/></svg>
        Settings
      </button>
      <button class="dash-action-btn" :disabled="openingShipwell" @click="openInShipwell">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        {{ openingShipwell ? 'Opening…' : 'Open in Shipwell' }}
      </button>
    </section>

    <!-- Needs attention -->
    <section v-if="needsReleaseRows.length" class="dash-attention">
      <h2 class="dash-section-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Needs attention
      </h2>
      <div class="dash-attention-grid">
        <div v-for="p in needsReleaseRows" :key="p.path" class="dash-attention-card" @click="selectProject(p.path)">
          <div class="dash-attention-top">
            <span class="dash-attention-name">{{ p.name }}</span>
            <span class="dash-attention-version">{{ p.version || '—' }}</span>
          </div>
          <div class="dash-attention-meta">
            <span v-if="p.commitsSinceLatestTag > 0" class="dash-attention-stat accent">
              {{ p.commitsSinceLatestTag }} unreleased commit{{ p.commitsSinceLatestTag === 1 ? '' : 's' }}
            </span>
            <span v-if="p.ahead > 0" class="dash-attention-stat">
              {{ p.ahead }} ahead
            </span>
            <span class="dash-attention-branch">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
              {{ p.branch || '—' }}
            </span>
          </div>
          <div class="dash-attention-actions">
            <button class="dash-attention-release" @click.stop="releasePatch(p.path)">Patch release</button>
            <button class="dash-attention-open" @click.stop="selectProject(p.path)">Open</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Projects table -->
    <section class="dash-projects">
      <div class="dash-projects-header">
        <h2 class="dash-section-title">All projects</h2>
        <div class="dash-projects-controls">
          <Select v-model="filter" :options="filterOptions" optionLabel="label" optionValue="value" class="min-w-[8rem]" />
          <Select v-model="sort" :options="sortOptions" optionLabel="label" optionValue="value" class="min-w-[8rem]" />
        </div>
      </div>
      <DataTable
        v-if="rows.length"
        :value="rows"
        dataKey="path"
        size="small"
        tableClass="dashboard-table"
        rowHover
        @row-click="(e) => selectProject(e.data.path)"
      >
        <Column field="name" header="Name">
          <template #body="{ data }">
            <span class="font-medium">{{ data.name || '—' }}</span>
          </template>
        </Column>
        <Column field="version" header="Version">
          <template #body="{ data }"><span class="font-mono text-sm text-rm-muted">{{ data.version || '—' }}</span></template>
        </Column>
        <Column field="latestTag" header="Latest tag">
          <template #body="{ data }"><span class="font-mono text-sm text-rm-muted">{{ data.latestTag || '—' }}</span></template>
        </Column>
        <Column header="Unreleased">
          <template #body="{ data }">
            <span :class="data.commitsSinceLatestTag > 0 ? 'text-rm-accent font-medium' : 'text-rm-muted'">{{ unreleasedLabel(data) }}</span>
          </template>
        </Column>
        <Column field="branch" header="Branch">
          <template #body="{ data }">
            <span class="inline-flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
              {{ data.branch || '—' }}
            </span>
          </template>
        </Column>
        <Column header="Status">
          <template #body="{ data }">
            <span v-if="data.needsRelease" class="dash-badge dash-badge-warn">needs release</span>
            <span v-else class="dash-badge dash-badge-ok">up to date</span>
          </template>
        </Column>
      </DataTable>
      <div v-else class="dash-empty-projects">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-rm-muted/40"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        <p class="text-sm text-rm-muted mt-3">No projects yet. Add a project folder to get started.</p>
        <Button severity="primary" size="small" class="mt-2" @click="onAddProject">Add project</Button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Select from 'primevue/select';
import { useAppStore } from '../stores/app';
import { useApi } from '../composables/useApi';
import { useLicense } from '../composables/useLicense';
import { useDashboard } from '../composables/useDashboard';

const store = useAppStore();
const api = useApi();
const license = useLicense();

const {
  filterOptions,
  sortOptions,
  filter,
  sort,
  rows,
  summary,
  unreleasedLabel,
  selectProject,
  load,
} = useDashboard();

const releasing = ref(false);

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
});

const needsReleaseRows = computed(() => rows.value.filter((r) => r.needsRelease));

async function onAddProject() {
  const dir = await api.showDirectoryDialog?.();
  if (dir) {
    store.addProject(dir);
    load();
  }
}


async function releasePatch(dirPath) {
  try {
    await api.release?.(dirPath, 'patch', false, {});
    await load();
  } catch (_) {}
}

async function releaseAllPatch() {
  if (releasing.value) return;
  const targets = needsReleaseRows.value;
  if (!targets.length) return;
  releasing.value = true;
  try {
    for (const p of targets) {
      try {
        await api.release?.(p.path, 'patch', false, {});
      } catch (_) {}
    }
    await load();
  } finally {
    releasing.value = false;
  }
}


function openTerminal() {
  if (store.selectedPath || store.projects.length) {
    store.setViewMode('detail');
    if (!store.selectedPath && store.projects.length) store.setSelectedPath(store.projects[0].path);
    store.detailTab = 'terminal';
  }
}

function goToSettings() {
  store.setViewMode('settings');
}

const openingShipwell = ref(false);

async function openInShipwell() {
  if (openingShipwell.value) return;
  const serverUrl = license.serverUrl?.value;
  if (!serverUrl) return;
  openingShipwell.value = true;
  try {
    await api.syncProjectsToShipwell?.();
    await api.syncReleasesToShipwell?.().catch(() => {});
    window.releaseManager?.openUrl?.(serverUrl.replace(/\/+$/, '') + '/projects');
  } catch (_) {} finally {
    openingShipwell.value = false;
  }
}
</script>

<style scoped>
.dashboard-view {
  background: rgb(var(--rm-bg));
}

/* Hero */
.dash-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  padding: 1.5rem 2rem 1.25rem;
  background: linear-gradient(135deg, rgb(var(--rm-accent) / 0.08) 0%, transparent 60%);
  border-bottom: 1px solid rgb(var(--rm-border));
}
.dash-hero-headline {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: rgb(var(--rm-text));
  margin: 0 0 0.25rem;
  line-height: 1.2;
}
.dash-hero-sub {
  font-size: 0.8125rem;
  color: rgb(var(--rm-muted));
  margin: 0;
  line-height: 1.5;
}
.dash-hero-sub strong { color: rgb(var(--rm-text)); }
.dash-plan-badge {
  display: inline-block;
  padding: 0.0625rem 0.4rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-left: 0.375rem;
  vertical-align: middle;
}
.plan-free { background: rgb(var(--rm-muted) / 0.15); color: rgb(var(--rm-muted)); }
.plan-plus { background: rgb(59 130 246 / 0.15); color: rgb(96 165 250); }
.plan-pro { background: rgb(var(--rm-accent) / 0.15); color: rgb(var(--rm-accent)); }
/* Stats */
.dash-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  padding: 1.25rem 2rem;
}
.dash-stat-card {
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(var(--rm-border));
  border-radius: 10px;
  padding: 0.875rem 1rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.dash-stat-card:hover {
  border-color: rgb(var(--rm-accent) / 0.4);
  background: rgb(var(--rm-accent) / 0.04);
}
.dash-stat-card.accent { border-color: rgb(var(--rm-accent) / 0.3); }
.dash-stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: rgb(var(--rm-text));
  line-height: 1;
  margin-bottom: 0.25rem;
  font-variant-numeric: tabular-nums;
}
.dash-stat-card.accent .dash-stat-value { color: rgb(var(--rm-accent)); }
.dash-stat-label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: rgb(var(--rm-muted));
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Quick actions */
.dash-quick-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0 2rem 1.25rem;
  flex-wrap: wrap;
}
.dash-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  border: 1px solid rgb(var(--rm-border));
  background: rgb(var(--rm-surface));
  color: rgb(var(--rm-text));
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.dash-action-btn:hover {
  border-color: rgb(var(--rm-accent) / 0.5);
  background: rgb(var(--rm-accent) / 0.06);
  color: rgb(var(--rm-accent));
}
.dash-action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Section titles */
.dash-section-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
  margin: 0;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

/* Needs attention */
.dash-attention {
  padding: 0 2rem 1.25rem;
}
.dash-attention .dash-section-title {
  margin-bottom: 0.625rem;
  color: rgb(251 191 36);
}
.dash-attention-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
  gap: 0.625rem;
}
.dash-attention-card {
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(251 191 36 / 0.25);
  border-radius: 8px;
  padding: 0.75rem 0.875rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.dash-attention-card:hover {
  border-color: rgb(251 191 36 / 0.5);
  background: rgb(251 191 36 / 0.04);
}
.dash-attention-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
}
.dash-attention-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dash-attention-version {
  font-size: 0.6875rem;
  font-family: ui-monospace, monospace;
  color: rgb(var(--rm-muted));
  flex-shrink: 0;
}
.dash-attention-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.6875rem;
  color: rgb(var(--rm-muted));
  margin-bottom: 0.5rem;
}
.dash-attention-stat.accent {
  color: rgb(var(--rm-accent));
  font-weight: 600;
}
.dash-attention-branch {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.dash-attention-actions {
  display: flex;
  gap: 0.375rem;
}
.dash-attention-release {
  padding: 0.25rem 0.5rem;
  border-radius: 5px;
  border: none;
  background: rgb(var(--rm-accent) / 0.12);
  color: rgb(var(--rm-accent));
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s;
}
.dash-attention-release:hover {
  background: rgb(var(--rm-accent) / 0.22);
}
.dash-attention-open {
  padding: 0.25rem 0.5rem;
  border-radius: 5px;
  border: 1px solid rgb(var(--rm-border));
  background: transparent;
  color: rgb(var(--rm-muted));
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.12s, border-color 0.12s;
}
.dash-attention-open:hover {
  color: rgb(var(--rm-text));
  border-color: rgb(var(--rm-text) / 0.3);
}

/* Projects */
.dash-projects {
  padding: 0 2rem 2rem;
  flex: 1;
}
.dash-projects-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.625rem;
}
.dash-projects-controls {
  display: flex;
  gap: 0.5rem;
}
.dash-empty-projects {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  border: 1px dashed rgb(var(--rm-border));
  border-radius: 10px;
  text-align: center;
}

/* Badges */
.dash-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.dash-badge-warn {
  background: rgb(251 191 36 / 0.15);
  color: rgb(251 191 36);
}
.dash-badge-ok {
  background: rgb(var(--rm-accent) / 0.12);
  color: rgb(var(--rm-accent));
}
</style>
