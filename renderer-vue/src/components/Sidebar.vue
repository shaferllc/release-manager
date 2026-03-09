<template>
  <div class="sidebar-wrapper flex shrink-0 h-full">
  <aside class="aside-panel" :style="sidebarStyle">
    <button
      class="sidebar-dashboard-btn"
      :class="{ 'is-active': store.viewMode === 'dashboard' }"
      @click="store.setViewMode('dashboard')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      Dashboard
    </button>
    <div class="aside-header">
      <span class="aside-title">Projects</span>
      <button
        v-if="store.projects.length > 0"
        class="filter-toggle-btn"
        :class="{ 'has-filters': hasActiveFilters }"
        title="Filter projects"
        aria-label="Filter projects"
        @click="toggleFilterPopover"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
      </button>
    </div>
    <Popover ref="filterPopoverRef">
      <div class="filter-popover-content">
        <span class="filter-popover-title">Filter projects</span>
        <label class="block text-[11px] font-medium text-rm-muted uppercase tracking-wider mb-1">Type</label>
        <Select v-model="filterType" :options="filterTypeOptions" optionLabel="label" optionValue="value" class="w-full mb-3" />
        <label class="block text-[11px] font-medium text-rm-muted uppercase tracking-wider mb-1">Tag</label>
        <Select v-model="filterTag" :options="filterTagOptions" optionLabel="label" optionValue="value" class="w-full mb-3" />
        <Button v-if="hasActiveFilters" variant="text" size="small" class="text-xs font-medium p-0 min-w-0 text-rm-accent hover:underline" @click="clearFilters">Clear filters</Button>
      </div>
    </Popover>
    <div v-if="license.isLoggedIn?.value && batchCount >= 2" class="batch-bar px-4 py-4 border-b border-rm-border flex-shrink-0" style="background: rgb(var(--rm-accent) / 0.06); border-left: 3px solid rgb(var(--rm-accent) / 0.5);">
      <p class="batch-bar-label m-0 text-xs font-semibold text-rm-text">{{ batchCount }} selected</p>
      <p class="batch-bar-hint m-0 mt-1.5 text-xs text-rm-muted">Release:</p>
      <div class="batch-bar-buttons flex flex-wrap gap-3 mt-3">
        <Button severity="primary" size="small" class="text-xs inline-flex items-center gap-x-1.5 shrink-0" @click="batchRelease('patch')">Patch</Button>
        <Button severity="secondary" size="small" class="text-xs inline-flex items-center gap-x-1.5 shrink-0" @click="batchRelease('minor')">Minor</Button>
        <Button severity="secondary" size="small" class="text-xs inline-flex items-center gap-x-1.5 shrink-0" @click="batchRelease('major')">Major</Button>
      </div>
    </div>
    <div class="project-list flex-1 min-h-0 overflow-y-auto">
      <p v-if="store.filteredProjects.length === 0" id="empty-projects-hint" class="p-4 text-sm text-rm-muted">
        <template v-if="store.projects.length === 0">Click “Add project” to add a folder (npm, Rust, Go, Python, or PHP: <code class="bg-rm-surface px-1 rounded text-xs">package.json</code>, <code class="bg-rm-surface px-1 rounded text-xs">Cargo.toml</code>, <code class="bg-rm-surface px-1 rounded text-xs">go.mod</code>, <code class="bg-rm-surface px-1 rounded text-xs">pyproject.toml</code>, or <code class="bg-rm-surface px-1 rounded text-xs">composer.json</code>).</template>
        <template v-else>
          {{ emptyHint }}
          <Button variant="text" size="small" class="block mt-2 text-xs font-medium p-0 min-w-0 text-rm-accent hover:underline" @click="clearFilters">Clear filters</Button>
        </template>
      </p>
      <ul v-else class="space-y-0.5 list-none m-0 p-0" role="list">
        <li
          v-for="p in store.filteredProjects"
          :key="p.path"
          class="project-list-item flex flex-col gap-0"
        >
          <div
            class="flex items-center gap-1.5 px-3 py-2 text-sm cursor-pointer transition-colors group w-full"
            :class="store.selectedPath === p.path ? 'bg-rm-accent/20 text-rm-accent font-medium' : 'text-rm-text hover:bg-rm-surface-hover'"
            @click="onRowClick($event, p.path)"
          >
            <Checkbox
              :model-value="isSelected(p.path)"
              binary
              class="shrink-0"
              @update:model-value="toggleSelect(p.path)"
              @click.stop
            />
            <Button
              variant="text"
              size="small"
              class="project-star-btn p-0.5 rounded shrink-0 min-w-0"
              :class="p.starred ? 'text-rm-accent' : 'text-rm-muted hover:text-rm-accent'"
              :title="p.starred ? 'Unstar (remove from top)' : 'Star (keep at top)'"
              :aria-label="p.starred ? 'Unstar' : 'Star'"
              @click.stop="toggleStar(p)"
            >
              <svg v-if="p.starred" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 6.86 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 6.86 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </Button>
            <span class="truncate flex-1 min-w-0" :title="p.path">{{ projectLabel(p) }}</span>
            <Button
              variant="text"
              size="small"
              class="project-remove-btn p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-rm-surface-hover text-rm-muted hover:text-rm-text transition-opacity shrink-0 min-w-0"
              title="Remove from list"
              aria-label="Remove from list"
              @click.stop="removeProject(p)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </Button>
          </div>
          <div v-if="runningAgentsForProject(p.path).length" class="sidebar-running-agents px-3 pb-2 pt-0 flex flex-wrap gap-1">
            <span
              v-for="slot in runningAgentsForProject(p.path)"
              :key="slot.id"
              class="inline-flex items-center gap-1 text-[10px] font-medium text-rm-accent bg-rm-accent/15 rounded px-1.5 py-0.5"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-rm-accent animate-pulse" aria-hidden="true" />
              {{ slotLabel(slot) }}
            </span>
          </div>
        </li>
      </ul>
    </div>
  </aside>
  <div class="sidebar-resizer" aria-label="Resize sidebar" @pointerdown="onResizerPointerDown" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import Popover from 'primevue/popover';
import { useAppStore } from '../stores/app';
import { useApi } from '../composables/useApi';
import { useLicense } from '../composables/useLicense';
import { useResizableSidebar } from '../composables/useResizableSidebar';
import { useNotifications } from '../composables/useNotifications';
import { useAnnouncer } from '../composables/useAnnouncer';
import { useAgentCrewSlots } from '../composables/useAgentCrewSlots';
import * as debug from '../utils/debug';
import { toPlainProjects } from '../utils/plainProjects';
const store = useAppStore();
const { runningByPath, loadSlots } = useAgentCrewSlots();
onMounted(() => { loadSlots(); });
const api = useApi();
const license = useLicense();
const notifications = useNotifications();
const { announcePolite } = useAnnouncer();

const filterTypeOptions = computed(() => [
  { value: '', label: 'All types' },
  ...store.allTypes.map((t) => ({ value: t, label: t })),
]);
const filterTagOptions = computed(() => [
  { value: '', label: 'All tags' },
  ...store.allTags.map((tag) => ({ value: tag, label: tag })),
]);

const filterPopoverRef = ref();
function toggleFilterPopover(e) {
  filterPopoverRef.value?.toggle(e);
}
const hasActiveFilters = computed(() => Boolean(store.filterByType || store.filterByTag));

const { sidebarStyle, onResizerPointerDown } = useResizableSidebar({
  preferenceKey: 'mainSidebarWidth',
  defaultWidth: 256,
  minWidth: 180,
  maxWidth: 420,
});
const batchCount = computed(() => store.selectedPaths?.size ?? 0);

function isSelected(path) {
  return store.selectedPaths?.has?.(path) ?? false;
}
function toggleSelect(path) {
  store.toggleProjectSelection(path);
}
function batchRelease(bump) {
  const paths = [...(store.selectedPaths || [])];
  if (paths.length < 2) return;
  if (!window.confirm(`Release ${paths.length} projects with ${bump} bump? This will run in sequence.`)) return;
  api.sendTelemetry?.('release.batch', { count: paths.length, bump });
  paths.forEach((p) => {
    const proj = store.projects.find((x) => x.path === p);
    if ((proj?.type || '').toLowerCase() === 'npm') api.release?.(p, bump, false, {});
  });
  store.clearProjectSelection();
}

const filterType = computed({
  get: () => store.filterByType,
  set: (v) => store.setFilterByType(v),
});
const filterTag = computed({
  get: () => store.filterByTag,
  set: (v) => store.setFilterByTag(v),
});

const emptyHint = computed(() => 'No projects match the current filters.');

function clearFilters() {
  debug.log('store', 'clearFilters');
  store.setFilterByType('');
  store.setFilterByTag('');
}

function projectLabel(p) {
  const name = p.name || p.path?.split(/[/\\]/).pop() || p.path || 'Project';
  return name;
}

function runningAgentsForProject(path) {
  return runningByPath.value.get(path) || [];
}

function slotLabel(slot) {
  const i = (slot.order ?? 0) + 1;
  return `Agent ${i}`;
}

function onRowClick(e, path) {
  if (e.target.closest('.project-star-btn') || e.target.closest('.project-remove-btn')) return;
  selectProject(path);
}

function selectProject(path) {
  debug.log('store', 'selectedPath', path);
  store.setViewMode('detail');
  store.setSelectedPath(path);
  const proj = store.projects.find((p) => p.path === path);
  const name = proj?.name || path?.split(/[/\\]/).pop() || 'project';
  api.sendTelemetry?.('project.selected', { type: proj?.type || '' });
  announcePolite(`Opened project ${name}`);
}

async function toggleStar(p) {
  debug.log('project', 'toggleStar', p.path);
  store.toggleStar(p.path);
  await api.setProjects?.(toPlainProjects(store.projects));
}

async function removeProject(p) {
  const name = p.name || p.path?.split(/[/\\]/).filter(Boolean).pop() || 'this project';
  if (!window.confirm(`Remove "${name}" from the list?`)) return;
  debug.log('project', 'removeProject', p.path);
  store.removeProject(p.path);
  await api.setProjects?.(toPlainProjects(store.projects));
  notifications.add({ title: 'Project removed', message: `"${name}" removed from the list.`, type: 'info' });
}
</script>

<style scoped>
.sidebar-dashboard-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  border-bottom: 1px solid rgb(var(--rm-border));
  background: transparent;
  color: rgb(var(--rm-muted));
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.1s, background 0.1s;
}
.sidebar-dashboard-btn:hover {
  color: rgb(var(--rm-text));
  background: rgb(var(--rm-surface-hover));
}
.sidebar-dashboard-btn.is-active {
  color: rgb(var(--rm-accent));
  background: rgb(var(--rm-accent) / 0.08);
}
.aside-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 0.5rem;
}

.filter-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: rgb(var(--rm-muted));
  cursor: pointer;
  transition: color 0.12s, background 0.12s;
  padding: 0;
  flex-shrink: 0;
}
.filter-toggle-btn:hover {
  color: rgb(var(--rm-text));
  background: rgb(var(--rm-surface-hover) / 0.5);
}
.filter-toggle-btn.has-filters {
  color: rgb(var(--rm-accent));
  background: rgb(var(--rm-accent) / 0.12);
}

.sidebar-resizer {
  width: 4px;
  flex-shrink: 0;
  cursor: col-resize;
  background: transparent;
  align-self: stretch;
  transition: background 0.12s;
  position: relative;
}
.sidebar-resizer::after {
  content: '';
  position: absolute;
  inset: 0 -2px;
}
.sidebar-resizer:hover {
  background: rgb(var(--rm-accent) / 0.25);
}
.sidebar-resizer:active {
  background: rgb(var(--rm-accent) / 0.4);
}

.filter-popover-content {
  width: 14rem;
}
.filter-popover-title {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
  margin-bottom: 0.75rem;
}
</style>
