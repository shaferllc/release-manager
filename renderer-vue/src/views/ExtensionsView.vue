<template>
  <Card class="extensions-view detail-tab-panel flex-1 flex flex-col min-h-0">
    <template #content>
    <div class="extensions-view-inner py-6 px-6 max-w-3xl space-y-6">

      <!-- Marketplace -->
      <Panel>
        <template #header>
          <div class="flex items-center justify-between gap-3 w-full">
            <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Marketplace</h3>
            <div class="flex items-center gap-2">
              <Button
                label="Upload"
                icon="pi pi-upload"
                size="small"
                severity="secondary"
                @click="uploadToMarketplace"
                :loading="uploading"
              />
              <Button
                label="Refresh"
                icon="pi pi-refresh"
                :loading="marketplaceLoading"
                size="small"
                severity="secondary"
                @click="fetchMarketplace"
              />
            </div>
          </div>
        </template>
        <div class="space-y-4">
          <div class="flex flex-wrap items-end gap-2">
            <label class="flex flex-col gap-1 min-w-[200px] flex-1">
              <span class="text-xs text-rm-muted">Marketplace URL</span>
              <InputText
                v-model="marketplaceBaseUrl"
                placeholder="https://marketplace.example.com"
                class="w-full text-sm"
                @blur="saveMarketplaceUrl"
                @keydown.enter="fetchMarketplace"
              />
            </label>
            <label class="flex flex-col gap-1 min-w-[160px] flex-1">
              <span class="text-xs text-rm-muted">Search</span>
              <InputText
                v-model="searchQuery"
                placeholder="Filter extensions..."
                class="w-full text-sm"
              />
            </label>
          </div>

          <p v-if="marketplaceError" class="text-sm text-red-500 m-0">{{ marketplaceError }}</p>

          <div v-if="filteredMarketplaceList.length === 0 && !marketplaceLoading && marketplaceFetched" class="py-6 text-center text-rm-muted text-sm">
            <template v-if="searchQuery">No extensions match "<strong>{{ searchQuery }}</strong>".</template>
            <template v-else>No extensions available on this marketplace.</template>
          </div>

          <div v-else-if="!marketplaceFetched && !marketplaceLoading" class="py-6 text-center text-rm-muted text-sm">
            <i class="pi pi-cloud-download mr-1"></i>
            Loading marketplace...
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="item in filteredMarketplaceList"
              :key="item.id"
              class="rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-3 flex flex-col gap-2"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-rm-text text-sm">{{ item.name || item.id }}</span>
                  <Tag v-if="item.version" severity="secondary" class="text-[10px] px-1.5 py-0">{{ item.version }}</Tag>
                  <Tag v-if="isInstalled(item.id)" severity="success" class="text-[10px] px-1.5 py-0">Installed</Tag>
                </div>
                <p v-if="item.description" class="text-xs text-rm-muted m-0 mt-1 line-clamp-2">{{ item.description }}</p>
              </div>
              <div class="flex items-center gap-2 mt-auto">
                <Button
                  :label="isInstalled(item.id) ? 'Update' : 'Install'"
                  :icon="isInstalled(item.id) ? 'pi pi-sync' : 'pi pi-download'"
                  size="small"
                  :severity="isInstalled(item.id) ? 'secondary' : undefined"
                  :loading="installingId === item.id"
                  :disabled="installingId != null && installingId !== item.id"
                  @click="installMarketplaceExtension(item)"
                />
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <!-- Installed -->
      <Panel>
        <template #header>
          <div class="flex items-center justify-between gap-3 w-full">
            <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Installed</h3>
            <span v-if="allInstalledCount > 0" class="text-xs text-rm-muted">
              {{ allInstalledCount }} extension{{ allInstalledCount === 1 ? '' : 's' }}
            </span>
          </div>
        </template>

        <div v-if="allInstalledCount === 0" class="py-8 px-6 text-center text-rm-muted text-sm">
          No extensions installed yet. Browse the marketplace above to get started.
        </div>

        <div v-else class="space-y-6">
          <!-- Built-in extensions (if any are enabled in index.js) -->
          <template v-for="group in extensionsByCategory" :key="group.categoryId">
            <div class="space-y-3">
              <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider m-0">{{ group.label }}</h4>
              <div class="space-y-4">
                <div
                  v-for="ext in group.extensions"
                  :key="'builtin-' + ext.id"
                  class="extension-card rounded-rm border border-rm-border bg-rm-surface/30 overflow-hidden"
                >
                  <div class="extension-card-inner px-4 py-4 flex flex-col sm:flex-row sm:items-start gap-4">
                    <div class="extension-icon shrink-0 w-10 h-10 rounded-rm border border-rm-border bg-rm-bg flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 text-rm-muted" v-html="ext.icon" aria-hidden="true"></div>
                    <div class="extension-body min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2 mb-1">
                        <h3 class="text-base font-semibold text-rm-text m-0">{{ ext.label }}</h3>
                        <Tag v-if="ext.version" severity="secondary" class="text-[10px] px-1.5 py-0">{{ ext.version }}</Tag>
                        <Tag severity="info" class="text-[10px] px-1.5 py-0">Built-in</Tag>
                      </div>
                      <p v-if="ext.description" class="text-sm text-rm-muted m-0 mb-3">{{ ext.description }}</p>
                      <div class="flex flex-wrap items-center gap-4">
                        <label class="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            :model-value="isEnabled(ext)"
                            :binary="true"
                            :input-id="'ext-enable-' + ext.id"
                            @update:model-value="(v) => setEnabled(ext, v)"
                          />
                          <span class="text-sm text-rm-text">{{ isEnabled(ext) ? 'Enabled' : 'Disabled' }}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- User-installed -->
          <div v-if="installedUserVisible.length" class="space-y-3">
            <h4 class="text-xs font-semibold text-rm-muted uppercase tracking-wider m-0">From marketplace</h4>
            <div class="space-y-4">
              <div
                v-for="u in installedUserVisible"
                :key="'user-' + u.id"
                class="extension-card rounded-rm border border-rm-border bg-rm-surface/30 overflow-hidden"
              >
                <div class="extension-card-inner px-4 py-4 flex flex-col sm:flex-row sm:items-start gap-4">
                  <div class="extension-icon shrink-0 w-10 h-10 rounded-rm border border-rm-border bg-rm-bg flex items-center justify-center text-rm-muted">
                    <i class="pi pi-puzzle-piece" aria-hidden="true"></i>
                  </div>
                  <div class="extension-body min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                      <h3 class="text-base font-semibold text-rm-text m-0">{{ u.name || u.id }}</h3>
                      <Tag v-if="u.version" severity="secondary" class="text-[10px] px-1.5 py-0">{{ u.version }}</Tag>
                    </div>
                    <p v-if="u.description" class="text-sm text-rm-muted m-0 mb-3">{{ u.description }}</p>
                    <div class="flex flex-wrap items-center gap-4">
                      <label class="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          :model-value="isEnabledById(u.id)"
                          :binary="true"
                          :input-id="'ext-user-enable-' + u.id"
                          @update:model-value="(v) => setEnabledById(u.id, v)"
                        />
                        <span class="text-sm text-rm-text">{{ isEnabledById(u.id) ? 'Enabled' : 'Disabled' }}</span>
                      </label>
                      <Button
                        label="Uninstall"
                        icon="pi pi-trash"
                        size="small"
                        severity="danger"
                        text
                        :loading="uninstallingId === u.id"
                        :disabled="uninstallingId != null && uninstallingId !== u.id"
                        @click="uninstallExtension(u)"
                      />
                      <span class="text-xs text-rm-muted">Restart app to load changes</span>
                    </div>
                  </div>
                </div>
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
import { computed, ref, onMounted } from 'vue';
import Card from 'primevue/card';
import Checkbox from 'primevue/checkbox';
import Panel from 'primevue/panel';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { getDetailTabExtensions } from '../extensions/registry';
import { groupExtensionsByCategory } from '../extensions/tabCategories';
import { useFeatureFlags } from '../composables/useFeatureFlags';
import { useHiddenExtensions } from '../composables/useHiddenExtensions';

const { isHidden: isExtensionHidden } = useHiddenExtensions();
const extensions = computed(() => getDetailTabExtensions().filter((e) => e && !isExtensionHidden(e.id)));
const extensionsByCategory = computed(() => groupExtensionsByCategory(extensions.value));

const marketplaceBaseUrl = ref('');
const marketplaceList = ref([]);
const marketplaceLoading = ref(false);
const marketplaceFetched = ref(false);
const marketplaceError = ref('');
const searchQuery = ref('');
const installingId = ref(null);
const uninstallingId = ref(null);
const uploading = ref(false);
const installedUser = ref([]);
const installedUserVisible = computed(() => installedUser.value.filter((u) => u && !isExtensionHidden(u.id)));

const allInstalledCount = computed(() => extensions.value.length + installedUserVisible.value.length);

const filteredMarketplaceList = computed(() => {
  if (!searchQuery.value.trim()) return marketplaceList.value;
  const q = searchQuery.value.toLowerCase();
  return marketplaceList.value.filter(
    (item) =>
      (item.name || '').toLowerCase().includes(q) ||
      (item.id || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
  );
});

const MARKETPLACE_PREF = 'extensionsMarketplaceBaseUrl';

onMounted(async () => {
  marketplaceBaseUrl.value = (await window.releaseManager.getPreference(MARKETPLACE_PREF)) || '';
  installedUser.value = await window.releaseManager.getInstalledUserExtensions();
  if (marketplaceBaseUrl.value) {
    fetchMarketplace();
  }
});

function saveMarketplaceUrl() {
  window.releaseManager.setPreference(MARKETPLACE_PREF, marketplaceBaseUrl.value || '');
}

async function fetchMarketplace() {
  const base = marketplaceBaseUrl.value?.trim();
  if (!base) {
    marketplaceError.value = 'Enter a marketplace URL first.';
    return;
  }
  marketplaceError.value = '';
  marketplaceLoading.value = true;
  try {
    saveMarketplaceUrl();
    const result = await window.releaseManager.getMarketplaceExtensions(base);
    marketplaceFetched.value = true;
    if (!result.ok) {
      marketplaceError.value = result.error || 'Failed to load marketplace';
      marketplaceList.value = [];
    } else {
      marketplaceList.value = result.data || [];
    }
  } finally {
    marketplaceLoading.value = false;
  }
}

function isInstalled(id) {
  return installedUser.value.some((u) => u.id === id);
}

async function installMarketplaceExtension(item) {
  installingId.value = item.id;
  try {
    const base = marketplaceBaseUrl.value?.trim() || '';
    const result = await window.releaseManager.installExtension(item.id, { ...item, baseUrl: base }, base);
    if (result.ok) {
      installedUser.value = await window.releaseManager.getInstalledUserExtensions();
      marketplaceError.value = '';
    } else {
      marketplaceError.value = result.error || 'Install failed';
    }
  } finally {
    installingId.value = null;
  }
}

async function uninstallExtension(ext) {
  uninstallingId.value = ext.id;
  try {
    const result = await window.releaseManager.uninstallExtension(ext.id);
    if (result.ok) {
      installedUser.value = await window.releaseManager.getInstalledUserExtensions();
    } else {
      marketplaceError.value = result.error || 'Uninstall failed';
    }
  } finally {
    uninstallingId.value = null;
  }
}

async function uploadToMarketplace() {
  const base = marketplaceBaseUrl.value?.trim();
  if (!base) {
    marketplaceError.value = 'Enter a marketplace URL before uploading.';
    return;
  }
  uploading.value = true;
  marketplaceError.value = '';
  try {
    const dialogResult = await window.releaseManager.showOpenDialog({
      title: 'Select extension .zip to upload',
      filters: [{ name: 'ZIP files', extensions: ['zip'] }],
      properties: ['openFile'],
    });
    if (dialogResult.canceled || !dialogResult.filePaths?.length) return;
    const filePath = dialogResult.filePaths[0];
    const result = await window.releaseManager.uploadExtensionToMarketplace(base, filePath);
    if (result.ok) {
      await fetchMarketplace();
    } else {
      marketplaceError.value = result.error || 'Upload failed';
    }
  } finally {
    uploading.value = false;
  }
}

const { tabFlags, setTabFlag } = useFeatureFlags();

function isEnabled(ext) {
  const flagId = ext.featureFlagId ?? ext.id;
  return tabFlags.value[flagId] !== false;
}

async function setEnabled(ext, enabled) {
  const flagId = ext.featureFlagId ?? ext.id;
  await setTabFlag(flagId, enabled);
}

function isEnabledById(extId) {
  return tabFlags.value[extId] !== false;
}

async function setEnabledById(extId, enabled) {
  await setTabFlag(extId, enabled);
}
</script>
