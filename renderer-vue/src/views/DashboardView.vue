<template>
  <div class="dashboard-view flex-1 flex flex-col min-h-0 overflow-y-auto">
    <!-- Hero / Welcome -->
    <header class="dash-hero">
      <div class="dash-hero-inner">
        <div class="dash-hero-text">
          <h1 class="dash-hero-headline">
            {{ greeting }}
          </h1>
          <p class="dash-hero-sub">
            <template v-if="license.isLoggedIn?.value">
              Signed in as <strong>{{ license.licenseEmail?.value || 'user' }}</strong>
              <span class="dash-plan-badge" :class="`plan-${license.tier?.value || 'free'}`">{{ license.tierLabel?.value || 'Free' }}</span>
            </template>
            <template v-else>
              Sign in to unlock all features and sync your plan.
            </template>
          </p>
        </div>
        <div class="dash-hero-actions">
          <Button severity="primary" class="rm-btn" @click="onAddProject">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add project
          </Button>
          <Button severity="secondary" size="small" @click="load">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9A9 9 0 0 1 3 15"/></svg>
            Refresh
          </Button>
        </div>
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

    <!-- Feature grid -->
    <section class="dash-features">
      <h2 class="dash-section-title">What you can do</h2>
      <div class="dash-feature-grid">
        <div v-for="f in features" :key="f.title" class="dash-feature-card" :class="{ locked: f.locked }" @click="f.action?.()">
          <div class="dash-feature-icon" v-html="f.icon" />
          <div class="dash-feature-body">
            <h3 class="dash-feature-title">{{ f.title }}</h3>
            <p class="dash-feature-desc">{{ f.desc }}</p>
          </div>
          <span v-if="f.locked" class="dash-feature-lock" title="Upgrade your plan">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
        </div>
      </div>
    </section>

    <!-- Projects table -->
    <section class="dash-projects">
      <div class="dash-projects-header">
        <h2 class="dash-section-title">Projects</h2>
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
import { computed } from 'vue';
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

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
});

async function onAddProject() {
  const dir = await api.showDirectoryDialog?.();
  if (dir) {
    store.addProject(dir);
    load();
  }
}

const features = computed(() => {
  const isLoggedIn = license.isLoggedIn?.value;
  const isPro = license.isPro?.value;
  const isPlus = license.isPlus?.value;
  const hasPaid = isPro || isPlus;

  function go(tab) {
    return () => {
      if (store.selectedPath || store.projects.length) {
        store.setViewMode('detail');
        if (!store.selectedPath && store.projects.length) store.setSelectedPath(store.projects[0].path);
        store.detailTab = tab;
      }
    };
  }

  return [
    {
      title: 'Git Management',
      desc: 'Branches, commits, merge, rebase, cherry-pick, stash, and more.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>',
      action: go('git'),
    },
    {
      title: 'Version & Release',
      desc: 'Bump versions, create tags, push releases with one click.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
      action: go('version'),
    },
    {
      title: 'Pull Requests',
      desc: 'View, create, and merge PRs directly from the app.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>',
      locked: !hasPaid,
      action: go('pull-requests'),
    },
    {
      title: 'GitHub Issues',
      desc: 'Browse and manage issues for your repositories.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      locked: !hasPaid,
      action: go('github-issues'),
    },
    {
      title: 'AI Generation',
      desc: 'Commit messages, release notes, and test-fix suggestions powered by AI.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/></svg>',
      locked: !hasPaid,
    },
    {
      title: 'Terminal',
      desc: 'Run commands in an integrated terminal per project.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
      locked: !hasPaid,
      action: go('terminal'),
    },
    {
      title: 'Tests & Coverage',
      desc: 'Run test suites and view code coverage reports.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      action: go('tests'),
    },
    {
      title: 'Processes',
      desc: 'Start, stop, and monitor dev servers and background tasks.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
      locked: !hasPaid,
      action: go('processes'),
    },
    {
      title: 'Email Testing',
      desc: 'Built-in SMTP server to capture and preview outgoing emails.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
      locked: !hasPaid,
      action: go('email'),
    },
    {
      title: 'Tunnels',
      desc: 'Expose local servers to the internet with public URLs.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
      locked: !hasPaid,
      action: go('tunnels'),
    },
    {
      title: 'Dependencies',
      desc: 'Audit, update, and manage npm and Composer packages.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
      locked: !hasPaid,
      action: go('dependencies'),
    },
    {
      title: 'Kanban Board',
      desc: 'Track tasks and progress with a per-project board.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
      action: go('kanban'),
    },
    {
      title: 'SSH & FTP',
      desc: 'Manage SSH connections and transfer files over FTP.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
      locked: !hasPaid,
      action: go('ssh'),
    },
    {
      title: 'Notes & Wiki',
      desc: 'Markdown notes and a wiki for each project.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
      action: go('notes'),
    },
    {
      title: 'Agent Crew',
      desc: 'Run autonomous AI agents on your projects.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      locked: !hasPaid,
      action: go('agent-crew'),
    },
    {
      title: 'REST API',
      desc: 'Control the app programmatically via a local HTTP API.',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      locked: !hasPaid,
      action: () => store.setViewMode('api'),
    },
  ];
});
</script>

<style scoped>
.dashboard-view {
  background: rgb(var(--rm-bg));
}

/* Hero */
.dash-hero {
  padding: 2rem 2.5rem 1.5rem;
  background: linear-gradient(135deg, rgb(var(--rm-accent) / 0.08) 0%, transparent 60%);
  border-bottom: 1px solid rgb(var(--rm-border));
}
.dash-hero-inner {
  max-width: 72rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
}
.dash-hero-headline {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: rgb(var(--rm-text));
  margin: 0 0 0.375rem;
  line-height: 1.2;
}
.dash-hero-sub {
  font-size: 0.9375rem;
  color: rgb(var(--rm-muted));
  margin: 0;
  line-height: 1.5;
}
.dash-hero-sub strong {
  color: rgb(var(--rm-text));
}
.dash-plan-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-left: 0.5rem;
  vertical-align: middle;
}
.plan-free { background: rgb(var(--rm-muted) / 0.15); color: rgb(var(--rm-muted)); }
.plan-plus { background: rgb(59 130 246 / 0.15); color: rgb(96 165 250); }
.plan-pro { background: rgb(var(--rm-accent) / 0.15); color: rgb(var(--rm-accent)); }
.dash-hero-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  align-items: center;
}

/* Stats */
.dash-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  padding: 1.5rem 2.5rem;
  max-width: 72rem;
}
.dash-stat-card {
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(var(--rm-border));
  border-radius: 10px;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.dash-stat-card:hover {
  border-color: rgb(var(--rm-accent) / 0.4);
  background: rgb(var(--rm-accent) / 0.04);
}
.dash-stat-card.accent {
  border-color: rgb(var(--rm-accent) / 0.3);
}
.dash-stat-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: rgb(var(--rm-text));
  line-height: 1;
  margin-bottom: 0.25rem;
  font-variant-numeric: tabular-nums;
}
.dash-stat-card.accent .dash-stat-value {
  color: rgb(var(--rm-accent));
}
.dash-stat-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgb(var(--rm-muted));
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Section titles */
.dash-section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
  margin: 0;
  letter-spacing: -0.01em;
}

/* Features */
.dash-features {
  padding: 0 2.5rem 1.5rem;
  max-width: 72rem;
}
.dash-features .dash-section-title {
  margin-bottom: 1rem;
}
.dash-feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 0.75rem;
}
.dash-feature-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: 10px;
  border: 1px solid rgb(var(--rm-border));
  background: rgb(var(--rm-surface));
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, opacity 0.15s;
  position: relative;
}
.dash-feature-card:hover {
  border-color: rgb(var(--rm-accent) / 0.4);
  background: rgb(var(--rm-accent) / 0.04);
}
.dash-feature-card.locked {
  opacity: 0.5;
}
.dash-feature-card.locked:hover {
  opacity: 0.7;
}
.dash-feature-icon {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgb(var(--rm-accent) / 0.1);
  color: rgb(var(--rm-accent));
}
.dash-feature-body {
  min-width: 0;
  flex: 1;
}
.dash-feature-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
  margin: 0;
  line-height: 1.3;
}
.dash-feature-desc {
  font-size: 0.6875rem;
  color: rgb(var(--rm-muted));
  margin: 0.25rem 0 0;
  line-height: 1.4;
}
.dash-feature-lock {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  color: rgb(var(--rm-muted));
}

/* Projects */
.dash-projects {
  padding: 0 2.5rem 2.5rem;
  max-width: 72rem;
  flex: 1;
}
.dash-projects-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
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
