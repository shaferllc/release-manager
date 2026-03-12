<template>
  <Card class="extensions-view detail-tab-panel flex-1 flex flex-col min-h-0">
    <template #content>
    <div class="extensions-view-inner py-6 px-6 space-y-6">

      <!-- Analytics summary (Pro/Team only) -->
      <div v-if="license.isLoggedIn?.value && license.hasFeature?.('usage_analytics') && analytics.overview.value" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="analytics-stat rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-3">
          <span class="text-[10px] uppercase tracking-wider text-rm-muted block">Available</span>
          <span class="text-lg font-bold text-rm-text">{{ analytics.totalExtensions.value ?? '—' }}</span>
        </div>
        <div class="analytics-stat rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-3">
          <span class="text-[10px] uppercase tracking-wider text-rm-muted block">Your installs</span>
          <span class="text-lg font-bold text-rm-text">{{ analytics.totalInstalls.value ?? '—' }}</span>
        </div>
        <div class="analytics-stat rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-3">
          <span class="text-[10px] uppercase tracking-wider text-rm-muted block">Most popular</span>
          <span class="text-sm font-semibold text-rm-text truncate block" :title="analytics.mostPopular.value?.name">{{ analytics.mostPopular.value?.name || '—' }}</span>
        </div>
        <div class="analytics-stat rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-3">
          <span class="text-[10px] uppercase tracking-wider text-rm-muted block">Zero installs</span>
          <span class="text-lg font-bold text-rm-text">{{ analytics.zeroInstalls.value ?? '—' }}</span>
        </div>
      </div>

      <Panel>
        <template #header>
          <div class="flex items-center justify-between gap-3 w-full">
            <div class="flex items-center gap-3">
              <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Extensions</h3>
              <SelectButton
                v-model="filterMode"
                :options="filterOptions"
                optionLabel="label"
                optionValue="value"
                :allowEmpty="false"
                class="ext-filter-btn"
              />
            </div>
            <div class="flex items-center gap-2">
              <InputText
                v-model="searchQuery"
                placeholder="Search extensions..."
                class="w-48 text-sm"
              />
              <Button
                label="Refresh"
                icon="pi pi-refresh"
                :loading="syncing"
                size="small"
                severity="secondary"
                @click="refresh"
              />
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <p v-if="registryError" class="text-sm text-red-500 m-0">{{ registryError }}</p>

          <div v-if="syncing && !registryFetched" class="py-8 text-center text-rm-muted text-sm">
            <i class="pi pi-spin pi-spinner mr-1"></i>
            Loading extensions...
          </div>

          <div v-else-if="filteredRegistry.length === 0 && registryFetched" class="py-6 text-center text-rm-muted text-sm">
            <template v-if="searchQuery">No extensions match "<strong>{{ searchQuery }}</strong>".</template>
            <template v-else-if="filterMode === 'installed'">No extensions installed yet. Install extensions from the "All" or "Not installed" view.</template>
            <template v-else-if="filterMode === 'not_installed'">All available extensions are installed.</template>
            <template v-else>No extensions available yet.</template>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="item in filteredRegistry"
              :key="item.id"
              class="ext-card rounded-rm border px-4 py-3 flex flex-col gap-2"
              :class="item.accessible === false ? 'border-rm-border/50 opacity-70 bg-rm-surface/10' : isInstalled(item.slug || item.id) ? 'border-rm-accent/30 bg-rm-accent/[0.04]' : 'border-rm-border bg-rm-surface/30'"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-rm-text text-sm">{{ item.name || item.id }}</span>
                  <Tag v-if="item.version" severity="secondary" class="text-[10px] px-1.5 py-0">v{{ item.version }}</Tag>
                  <Tag v-if="item.required_plan && item.required_plan !== 'free'" :severity="item.accessible === false ? 'warn' : 'info'" class="text-[10px] px-1.5 py-0">
                    <svg v-if="item.accessible === false" xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="mr-0.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    {{ item.required_plan.charAt(0).toUpperCase() + item.required_plan.slice(1) }}
                  </Tag>
                  <span v-if="getInstallCount(item) != null" class="install-count text-[10px] text-rm-muted inline-flex items-center gap-0.5" :title="getInstallCount(item) + ' installs'">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {{ formatInstallCount(getInstallCount(item)) }}
                  </span>
                </div>
                <p v-if="item.description" class="text-xs text-rm-muted m-0 mt-1 line-clamp-2">{{ item.description }}</p>
                <span v-if="item.author" class="text-[10px] text-rm-muted mt-0.5 block">by {{ item.author }}</span>
              </div>
              <div class="flex items-center gap-2 mt-auto pt-1 flex-wrap">
                <!-- Installed but plan no longer allows it -->
                <template v-if="isInstalled(item.slug || item.id) && item.accessible === false">
                  <Tag severity="warn" class="text-[10px] px-1.5 py-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="mr-0.5 inline"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Locked
                  </Tag>
                  <Button
                    label="Upgrade"
                    icon="pi pi-lock"
                    size="small"
                    severity="warn"
                    text
                    @click="openUpgrade"
                  />
                  <Button
                    label="Uninstall"
                    size="small"
                    severity="danger"
                    text
                    :loading="uninstallingId === (item.slug || item.id)"
                    :disabled="uninstallingId != null"
                    @click="uninstallById(item.slug || item.id)"
                  />
                </template>
                <!-- Not installed and plan doesn't allow -->
                <template v-else-if="item.accessible === false">
                  <Button
                    :label="'Upgrade to ' + (item.required_plan === 'team' ? 'Team' : 'Pro')"
                    icon="pi pi-lock"
                    size="small"
                    severity="warn"
                    @click="openUpgrade"
                  />
                </template>
                <!-- Installed and plan allows -->
                <template v-else-if="isInstalled(item.slug || item.id)">
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <ToggleSwitch
                      :modelValue="extPrefs.isEnabled(item.slug || item.id)"
                      @update:modelValue="(v) => extPrefs.setEnabled(item.slug || item.id, v)"
                      class="ext-switch"
                    />
                    <span class="text-xs" :class="extPrefs.isEnabled(item.slug || item.id) ? 'text-green-500' : 'text-rm-muted'">
                      {{ extPrefs.isEnabled(item.slug || item.id) ? 'Enabled' : 'Disabled' }}
                    </span>
                  </label>
                  <Button
                    v-if="item.version && installedVersion(item.slug || item.id) && item.version !== installedVersion(item.slug || item.id)"
                    label="Update"
                    icon="pi pi-sync"
                    size="small"
                    severity="secondary"
                    :loading="installingId === (item.slug || item.id)"
                    :disabled="installingId != null"
                    @click="installFromRegistry(item)"
                  />
                  <Button
                    label="Uninstall"
                    size="small"
                    severity="danger"
                    text
                    :loading="uninstallingId === (item.slug || item.id)"
                    :disabled="uninstallingId != null"
                    @click="uninstallById(item.slug || item.id)"
                  />
                </template>
                <!-- Not installed, plan allows -->
                <Button
                  v-else
                  label="Install"
                  icon="pi pi-download"
                  size="small"
                  :loading="installingId === (item.slug || item.id)"
                  :disabled="installingId != null"
                  @click="installFromRegistry(item)"
                />
              </div>
            </div>
          </div>
        </div>
      </Panel>

    </div>
    </template>
  </Card>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import Card from 'primevue/card';
import Panel from 'primevue/panel';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ToggleSwitch from 'primevue/toggleswitch';
import SelectButton from 'primevue/selectbutton';
import { useLicense } from '../composables/useLicense';
import { useExtensionPrefs } from '../composables/useExtensionPrefs';
import { useNotifications } from '../composables/useNotifications';
import { useExtensionAnalytics } from '../composables/useExtensionAnalytics';

const license = useLicense();
const extPrefs = useExtensionPrefs();
const extNotifications = useNotifications();
const analytics = useExtensionAnalytics();

const searchQuery = ref('');
const filterMode = ref('all');
const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Installed', value: 'installed' },
  { label: 'Not installed', value: 'not_installed' },
];
const installingId = ref(null);
const uninstallingId = ref(null);
const installedUser = ref([]);
const syncing = ref(false);

const registryList = ref([]);
const registryFetched = ref(false);
const registryError = ref('');

const filteredRegistry = computed(() => {
  let list = registryList.value;

  if (filterMode.value === 'installed') {
    list = list.filter((item) => isInstalled(item.slug || item.id));
  } else if (filterMode.value === 'not_installed') {
    list = list.filter((item) => !isInstalled(item.slug || item.id));
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(
      (item) =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.id || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.slug || '').toLowerCase().includes(q)
    );
  }

  return list;
});

function getInstallCount(item) {
  const id = item.slug || item.id;
  if (item.install_count != null) return item.install_count;
  const counts = analytics.installCounts.value;
  if (counts[id] != null) return counts[id];
  return null;
}

function formatInstallCount(n) {
  if (n == null) return '';
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

let previousTier = null;

onMounted(async () => {
  previousTier = license.tier?.value || 'free';
  await refresh();
  if (license.isLoggedIn?.value && license.hasFeature?.('usage_analytics')) analytics.fetchOverview();
  window.releaseManager?.sendTelemetry?.('view.extensions_opened', {});
});

watch(() => license.tier?.value, async (newTier) => {
  if (!newTier || newTier === previousTier) return;
  previousTier = newTier;
  await refresh();
});

async function refresh() {
  syncing.value = true;
  registryError.value = '';
  await extPrefs.fetchFromWeb();
  try {
    await window.releaseManager.syncPlanExtensions?.();
  } catch (_) {}
  installedUser.value = await window.releaseManager.getInstalledUserExtensions();
  try {
    const result = await window.releaseManager.getGitHubExtensionRegistry();
    registryFetched.value = true;
    if (!result.ok) {
      registryError.value = result.error || 'Failed to load extensions';
      registryList.value = [];
    } else {
      registryList.value = result.data || [];
    }
  } catch (e) {
    registryError.value = e.message || 'Failed to load extensions';
  } finally {
    syncing.value = false;
  }
  if (license.isLoggedIn?.value && license.hasFeature?.('usage_analytics')) analytics.fetchOverview();
}

function openUpgrade() {
  const base = license.serverUrl?.value;
  if (base) window.releaseManager?.openUrl?.(base.replace(/\/+$/, '') + '/pricing');
}

function isInstalled(idOrSlug) {
  return installedUser.value.some((u) => u.id === idOrSlug || u.id === String(idOrSlug));
}

function installedVersion(idOrSlug) {
  const u = installedUser.value.find((u) => u.id === idOrSlug || u.id === String(idOrSlug));
  return u?.version || null;
}

async function installFromRegistry(item) {
  if (item.accessible === false) {
    openUpgrade();
    return;
  }
  const extId = item.slug || item.id;
  const maxExt = license.maxExtensions?.value ?? 5;
  const alreadyInstalled = isInstalled(extId);
  if (!alreadyInstalled && maxExt > 0 && installedUser.value.length >= maxExt) {
    extNotifications.add({ title: 'Extension limit reached', message: `Your plan allows up to ${maxExt} extensions. Upgrade to install more.`, type: 'warn' });
    return;
  }
  installingId.value = extId;
  registryError.value = '';
  try {
    let result;
    if (item.github_repo) {
      result = await window.releaseManager.installExtensionFromGitHub(item);
    } else if (item.download_url) {
      result = await window.releaseManager.installExtension(extId, item, item.download_url);
    } else {
      registryError.value = 'No download source available for this extension';
      return;
    }
    if (result.ok) {
      installedUser.value = await window.releaseManager.getInstalledUserExtensions();
    } else if (result.required_plan) {
      extNotifications.add({ title: 'Plan required', message: result.error || `This extension requires a ${result.required_plan} plan.`, type: 'warn' });
    } else if (result.limitExceeded) {
      extNotifications.add({ title: 'Extension limit reached', message: result.error || `Your plan allows up to ${result.max} extensions. Upgrade to install more.`, type: 'warn' });
    } else {
      registryError.value = result.error || 'Install failed';
    }
  } finally {
    installingId.value = null;
  }
}

async function uninstallById(extId) {
  uninstallingId.value = extId;
  try {
    const result = await window.releaseManager.uninstallExtension(extId);
    if (result.ok) {
      installedUser.value = await window.releaseManager.getInstalledUserExtensions();
    } else {
      registryError.value = result.error || 'Uninstall failed';
    }
  } finally {
    uninstallingId.value = null;
  }
}

</script>

<style scoped>
.analytics-stat {
  transition: border-color 0.15s ease;
}
.analytics-stat:hover {
  border-color: var(--rm-accent, var(--p-primary-400));
}
.install-count {
  opacity: 0.7;
}
.ext-card {
  transition: border-color 0.15s ease;
}
.ext-card:hover {
  border-color: var(--rm-accent, var(--p-primary-400));
}
.ext-filter-btn :deep(.p-selectbutton) {
  gap: 0;
}
.ext-filter-btn :deep(.p-togglebutton) {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
}
.ext-switch :deep(.p-toggleswitch) {
  width: 2rem;
  height: 1rem;
}
.ext-switch :deep(.p-toggleswitch-slider:before) {
  width: 0.75rem;
  height: 0.75rem;
}
</style>
