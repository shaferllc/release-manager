<template>
  <nav class="nav-bar select-none">
    <div class="nav-left no-drag">
      <h1 class="nav-brand" aria-label="Shipwell">
        <img :src="logoUrl" alt="" class="nav-logo" @error="showLogoFallback" />
        <span ref="logoFallback" class="nav-logo-fallback hidden" aria-hidden="true">S</span>
      </h1>

      <button v-tooltip.bottom="'Toggle sidebar (⌘B)'" class="nav-icon-btn" :class="{ 'is-active': store.sidebarVisible }" aria-label="Toggle sidebar" @click="store.toggleSidebar()">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
      </button>

      <div class="nav-view-group">
        <Select
          :model-value="store.viewMode"
          :options="viewOptionsForSelect"
          option-label="label"
          option-value="value"
          placeholder="View"
          class="nav-view-select"
          @update:model-value="selectView"
        />
      </div>
    </div>

    <div class="nav-right no-drag">
      <span
        v-if="license.isLoggedIn?.value"
        v-tooltip.bottom="connectivityTooltip"
        class="nav-connectivity-indicator"
        :class="license.isOfflineCache?.value ? 'nav-connectivity-offline' : 'nav-connectivity-online'"
        aria-label="Connection status"
      />
      <div class="nav-icon-group">
        <button v-tooltip.bottom="'Dark theme'" class="nav-icon-btn" :class="{ 'is-active': store.theme === 'dark' }" aria-label="Dark theme" @click="setTheme('dark')">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
        <button v-tooltip.bottom="'Light theme'" class="nav-icon-btn" :class="{ 'is-active': store.theme === 'light' }" aria-label="Light theme" @click="setTheme('light')">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>
      </div>

      <div class="nav-separator" />

      <button v-tooltip.bottom="'Refresh (⌘R)'" class="nav-icon-btn" aria-label="Refresh" :class="{ refreshing: isRefreshing }" @click="onRefresh">
        <svg class="refresh-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9A9 9 0 0 1 3 15" />
        </svg>
      </button>

      <button v-tooltip.bottom="'Sync all projects'" class="nav-icon-btn" aria-label="Sync all" :disabled="syncingAll || !store.projects.length" @click="onSyncAll">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3v8"/><path d="M5 6l3-3 3 3"/><path d="M16 21v-8"/><path d="M13 18l3 3 3-3"/><rect x="3" y="10" width="18" height="4" rx="1"/>
        </svg>
      </button>

      <button v-tooltip.bottom="'Command palette (⌘⇧P)'" class="nav-icon-btn" aria-label="Command palette" @click="openCommandPalette">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </button>

      <template v-if="license.isLoggedIn?.value && license.isTeam?.value">
        <div class="nav-separator" />
        <template v-if="teamsList.length > 0">
          <Select
            :model-value="activeTeamId"
            :options="teamsList"
            option-label="name"
            option-value="id"
            placeholder="Team"
            class="nav-team-select"
            :disabled="teamsList.length <= 1"
            v-tooltip.bottom="teamsList.length <= 1 ? 'You have one team' : 'Switch team'"
            @update:model-value="onTeamChange"
          />
          <button v-tooltip.bottom="'Create team'" class="nav-icon-btn nav-create-team-btn" aria-label="Create team" @click="openCreateTeamModal">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </template>
        <Button v-else severity="secondary" size="small" class="nav-create-team-btn-text" @click="openCreateTeamModal">
          Create team
        </Button>
      </template>

      <Dialog
        v-model:visible="createTeamVisible"
        header="Create team"
        modal
        :style="{ width: '360px' }"
        :dismissableMask="true"
        class="nav-create-team-dialog"
        @hide="closeCreateTeamModal"
      >
        <div class="space-y-3">
          <label class="block text-sm font-medium text-rm-text" for="nav-create-team-name">Team name</label>
          <InputText
            id="nav-create-team-name"
            v-model="newTeamName"
            placeholder="e.g. My Team"
            class="w-full"
            autofocus
            @keydown.enter="handleCreateTeam"
          />
          <p v-if="createTeamError" class="text-sm text-red-500 m-0">{{ createTeamError }}</p>
        </div>
        <template #footer>
          <Button variant="text" size="small" label="Cancel" @click="closeCreateTeamModal" />
          <Button severity="primary" size="small" label="Create" :loading="createTeamLoading" :disabled="!newTeamName.trim()" @click="handleCreateTeam" />
        </template>
      </Dialog>

      <div class="nav-separator" />

      <Button v-tooltip.bottom="'Add a project'" severity="primary" size="small" class="nav-add-btn" @click="toggleAddMenu">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add project
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="ml-0.5 opacity-60"><polyline points="6 9 12 15 18 9"/></svg>
      </Button>
      <Menu ref="addMenuRef" :model="addMenuItems" :popup="true" />

      <button v-tooltip.bottom="'Sign out of your account'" class="nav-signout" aria-label="Sign out" @click="onSignOut">Sign out</button>
    </div>

    <span v-if="navStatus" class="nav-status">{{ navStatus }}</span>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Menu from 'primevue/menu';
import Select from 'primevue/select';
import { useAppStore } from '../stores/app';
import { useApi } from '../composables/useApi';
import { useLicense } from '../composables/useLicense';
import { useCommandPalette } from '../commandPalette/useCommandPalette';
import { useAnnouncer } from '../composables/useAnnouncer';
import { useNotifications } from '../composables/useNotifications';
import * as debug from '../utils/debug';

const emit = defineEmits(['refresh', 'sync-all', 'add-project', 'add-from-shipwell', 'bulk-import', 'team-changed']);

const store = useAppStore();
const api = useApi();
const license = useLicense();
const commandPalette = useCommandPalette();
const notifications = useNotifications();
const { announcePolite } = useAnnouncer();

function openCommandPalette() {
  commandPalette.toggle();
}
const logoFallback = ref(null);
const isRefreshing = ref(false);
const syncingAll = ref(false);
const navStatus = ref('');
const teamsList = ref([]);
const activeTeamId = ref(null);
const createTeamVisible = ref(false);
const newTeamName = ref('');
const createTeamError = ref('');
const createTeamLoading = ref(false);

function openCreateTeamModal() {
  newTeamName.value = '';
  createTeamError.value = '';
  createTeamVisible.value = true;
}

function closeCreateTeamModal() {
  createTeamVisible.value = false;
  newTeamName.value = '';
  createTeamError.value = '';
}

async function handleCreateTeam() {
  const name = newTeamName.value?.trim();
  if (!name || !api.createTeam) return;
  createTeamLoading.value = true;
  createTeamError.value = '';
  try {
    const res = await api.createTeam(name);
    if (res?.ok) {
      closeCreateTeamModal();
      await loadTeams();
      if (res.team?.id) {
        await api.setActiveTeamId?.(res.team.id);
        activeTeamId.value = res.team.id;
      }
      await license.loadStatus?.();
      emit('team-changed');
      announcePolite('Team created');
    } else {
      createTeamError.value = res?.error || 'Failed to create team';
    }
  } catch (e) {
    createTeamError.value = e?.message || 'Failed to create team';
  } finally {
    createTeamLoading.value = false;
  }
}

async function loadTeams() {
  if (!license.isLoggedIn?.value || !api.getTeams) return;
  try {
    const [res, id] = await Promise.all([
      api.getTeams?.().catch(() => ({ teams: [] })),
      api.getActiveTeamId?.().catch(() => null),
    ]);
    teamsList.value = res?.teams || [];
    activeTeamId.value = id || null;
    if (teamsList.value.length && !activeTeamId.value) {
      activeTeamId.value = teamsList.value[0]?.id ?? null;
    }
  } catch (_) {
    teamsList.value = [];
  }
}

async function onTeamChange(teamId) {
  if (teamId == null) return;
  try {
    await api.setActiveTeamId?.(teamId);
    emit('team-changed');
    announcePolite('Team switched');
  } catch (_) {}
}

watch(() => license.isLoggedIn?.value, (loggedIn) => {
  if (loggedIn) loadTeams();
  else { teamsList.value = []; activeTeamId.value = null; }
}, { immediate: true });
const logoUrl = 'icon-128.png';
function showLogoFallback(e) {
  e.target.style.display = 'none';
  logoFallback.value?.classList.remove('hidden');
}

const VIEW_LABELS = {
  detail: 'Project',
  dashboard: 'Dashboard',
  settings: 'Settings',
  extensions: 'Extensions',
  docs: 'Documentation',
  changelog: 'Changelog',
  api: 'API',
};

const viewOptions = [
  { value: 'dashboard', label: VIEW_LABELS.dashboard },
  { value: 'settings', label: VIEW_LABELS.settings },
  { value: 'docs', label: VIEW_LABELS.docs },
  { value: 'changelog', label: VIEW_LABELS.changelog },
  { value: 'api', label: VIEW_LABELS.api },
];

const connectivityTooltip = computed(() => {
  if (license.isOfflineCache?.value && license.offlineGrace?.value?.daysRemaining != null) {
    const d = license.offlineGrace.value.daysRemaining;
    return `Offline — ${d} day${d === 1 ? '' : 's'} remaining before sign-in required`;
  }
  return license.isOfflineCache?.value ? 'Offline' : 'Online';
});

const viewOptionsForSelect = computed(() => {
  if (!license.isLoggedIn?.value) {
    return viewOptions.filter((o) => o.value === 'settings').map((o) => ({ ...o, label: 'Log in' }));
  }
  const extras = [];
  if (store.viewMode === 'detail') {
    extras.push({ value: 'detail', label: VIEW_LABELS.detail });
  }
  return [...extras, ...viewOptions];
});

function selectView(value) {
  debug.log('nav', 'viewMode', value);
  store.setViewMode(value);
  if (api.setPreference) api.setPreference('state.viewMode', value);
  const labels = { dashboard: 'Dashboard', detail: 'Project', settings: 'Settings', extensions: 'Extensions' };
  announcePolite(`Navigated to ${labels[value] || value}`);
}

function setTheme(theme) {
  debug.log('theme', 'setTheme', theme);
  store.setTheme(theme);
  if (api.setTheme) api.setTheme(theme);
  document.documentElement.setAttribute('data-theme', theme);
}

function onRefresh() {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  navStatus.value = 'Refreshing…';
  emit('refresh');
  setTimeout(() => {
    isRefreshing.value = false;
    if (navStatus.value === 'Refreshing…') navStatus.value = '';
  }, 800);
}

function onSyncAll() {
  if (syncingAll.value) return;
  if (!store.projects?.length) return;
  syncingAll.value = true;
  navStatus.value = 'Syncing…';
  emit('sync-all');
}

function finishSync() {
  syncingAll.value = false;
  navStatus.value = 'Done';
  setTimeout(() => {
    if (navStatus.value === 'Done') navStatus.value = '';
  }, 1200);
}

defineExpose({ finishSync });

const addMenuRef = ref(null);
const addMenuItems = ref([
  { label: 'Add local folder', icon: 'pi pi-folder', command: () => emit('add-project') },
  { label: 'Bulk import from folder', icon: 'pi pi-folder-open', command: () => emit('bulk-import') },
  { label: 'Add from Shipwell', icon: 'pi pi-cloud-download', command: () => emit('add-from-shipwell') },
]);

function toggleAddMenu(event) {
  addMenuRef.value?.toggle(event);
}

async function onSignOut() {
  await api.logoutFromLicenseServer?.();
  await license.loadStatus();
}

onMounted(() => {
  if (api.getTheme) {
    api.getTheme()
      .then(({ effective }) => {
        store.setTheme(effective);
        document.documentElement.setAttribute('data-theme', effective);
      })
      .catch(() => {
        const fallback = 'dark';
        store.setTheme(fallback);
        document.documentElement.setAttribute('data-theme', fallback);
      });
  }
  if (api.onTheme) api.onTheme((effective) => { store.setTheme(effective); document.documentElement.setAttribute('data-theme', effective); });
  loadTeams();
});
</script>

<style scoped>
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.375rem 0.75rem;
  background: rgb(var(--rm-surface));
  border-bottom: 1px solid rgb(var(--rm-border));
  flex-shrink: 0;
  height: 2.75rem;
  position: relative;
}

.nav-left,
.nav-right {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0;
  cursor: default;
  margin: 0;
  padding: 0 0.25rem;
}
.nav-logo {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 6px;
  pointer-events: none;
}
.nav-logo-fallback {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 6px;
  background: rgb(var(--rm-accent) / 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--rm-accent));
  font-size: 0.75rem;
  font-weight: 700;
}

.nav-view-group {
  display: flex;
  align-items: center;
}
.nav-view-select {
  min-width: 7rem;
  font-size: 0.8125rem;
}
.nav-team-select {
  min-width: 6rem;
  max-width: 10rem;
  font-size: 0.75rem;
}
.nav-team-select :deep(.p-select) {
  padding: 0.2rem 0.5rem;
  min-height: 1.75rem;
}
.nav-create-team-btn {
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
}
.nav-create-team-btn-text {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.nav-icon-group {
  display: flex;
  align-items: center;
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(var(--rm-border));
  border-radius: 6px;
  overflow: hidden;
}
.nav-icon-group .nav-icon-btn {
  border-radius: 0;
  border: none;
}
.nav-icon-group .nav-icon-btn + .nav-icon-btn {
  border-left: 1px solid rgb(var(--rm-border));
}

.nav-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: rgb(var(--rm-muted));
  cursor: pointer;
  transition: color 0.12s, background 0.12s;
  padding: 0;
  flex-shrink: 0;
}
.nav-icon-btn:hover {
  color: rgb(var(--rm-text));
  background: rgb(var(--rm-surface-hover) / 0.5);
}
.nav-icon-btn.is-active {
  color: rgb(var(--rm-accent));
  background: rgb(var(--rm-accent) / 0.12);
}
.nav-icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.nav-icon-btn.refreshing .refresh-icon {
  animation: nav-spin 0.7s linear infinite;
}

.nav-connectivity-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.nav-connectivity-online {
  background: rgb(var(--rm-success));
}
.nav-connectivity-offline {
  background: rgb(var(--rm-warning));
}

.nav-separator {
  width: 1px;
  height: 1.25rem;
  background: rgb(var(--rm-border));
  flex-shrink: 0;
  margin: 0 0.125rem;
}

.nav-add-btn {
  font-size: 0.75rem;
  padding: 0.3rem 0.625rem;
  gap: 0.3rem;
  font-weight: 600;
  border-radius: 6px;
  line-height: 1;
}

.nav-signout {
  background: none;
  border: none;
  color: rgb(var(--rm-muted));
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.25rem 0.375rem;
  border-radius: 4px;
  transition: color 0.12s, background 0.12s;
  white-space: nowrap;
}
.nav-signout:hover {
  color: rgb(var(--rm-text));
  background: rgb(var(--rm-surface-hover) / 0.5);
}

.nav-status {
  position: absolute;
  bottom: -1.25rem;
  right: 0.75rem;
  font-size: 0.625rem;
  color: rgb(var(--rm-muted));
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
}

@keyframes nav-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
