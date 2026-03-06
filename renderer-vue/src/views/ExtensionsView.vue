<template>
  <Card class="extensions-view detail-tab-panel flex-1 flex flex-col min-h-0">
    <template #content>
    <div class="extensions-view-inner py-6 px-6 max-w-2xl space-y-6">
      <Toolbar class="extension-toolbar">
        <template #start>
          <p class="text-sm text-rm-muted m-0">
            Enable or disable detail-tab extensions. You can reorder tabs by dragging them in the project view. Install more from the marketplace.
          </p>
        </template>
      </Toolbar>

      <!-- Marketplace -->
      <Panel>
        <template #header>
          <div class="flex items-center justify-between gap-3 w-full">
            <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Marketplace</h3>
          </div>
        </template>
        <div class="space-y-4">
          <div class="flex flex-wrap items-end gap-2">
            <label class="flex flex-col gap-1 min-w-[200px] flex-1">
              <span class="text-xs text-rm-muted">Marketplace URL</span>
              <InputText
                v-model="marketplaceBaseUrl"
                placeholder="http://localhost:8000"
                class="w-full text-sm"
                @blur="saveMarketplaceUrl"
              />
            </label>
            <Button
              label="Browse"
              icon="pi pi-refresh"
              :loading="marketplaceLoading"
              size="small"
              @click="fetchMarketplace"
            />
          </div>
          <p v-if="marketplaceError" class="text-sm text-red-500 m-0">{{ marketplaceError }}</p>
          <div v-if="marketplaceList.length === 0 && !marketplaceLoading" class="py-4 text-center text-rm-muted text-sm">
            Enter a URL and click Browse to load extensions. For local dev run: <code class="text-xs bg-rm-surface px-1 rounded">php -S localhost:8000 -t marketplace/public</code>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="item in marketplaceList"
              :key="item.id"
              class="rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-rm-text">{{ item.name || item.id }}</span>
                  <Tag v-if="item.version" severity="secondary" class="text-[10px] px-1.5 py-0">{{ item.version }}</Tag>
                </div>
                <p v-if="item.description" class="text-sm text-rm-muted m-0 mt-0.5">{{ item.description }}</p>
              </div>
              <Button
                :label="isInstalled(item.id) ? 'Update' : 'Install'"
                size="small"
                :loading="installingId === item.id"
                :disabled="installingId != null"
                @click="installMarketplaceExtension(item)"
              />
            </div>
          </div>
        </div>
      </Panel>

      <!-- Installed (built-in + user) -->
      <Panel>
        <template #header>
          <div class="flex items-center justify-between gap-3 w-full">
            <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Installed</h3>
            <span v-if="extensions.length || installedUser.length" class="text-xs text-rm-muted">
              {{ extensions.length + installedUser.length }} extension{{ (extensions.length + installedUser.length) === 1 ? '' : 's' }}
            </span>
          </div>
        </template>
        <div v-if="extensions.length === 0 && installedUser.length === 0" class="py-8 px-6 text-center text-rm-muted text-sm">
          No extensions installed. Built-in extensions (Kanban, SSH, etc.) appear here when the app loads; install more from the marketplace above.
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="ext in extensions"
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
                  <span class="text-xs text-rm-muted">Updated with app</span>
                </div>
              </div>
            </div>
          </div>
          <div
            v-for="u in installedUser"
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
                  <Tag severity="contrast" class="text-[10px] px-1.5 py-0">From marketplace</Tag>
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
                  <span class="text-xs text-rm-muted">Restart app to load changes</span>
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
import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { getDetailTabExtensions } from '../extensions/registry';
import { useFeatureFlags } from '../composables/useFeatureFlags';

const extensions = computed(() => getDetailTabExtensions());

const marketplaceBaseUrl = ref('');
const marketplaceList = ref([]);
const marketplaceLoading = ref(false);
const marketplaceError = ref('');
const installingId = ref(null);
const installedUser = ref([]);

const MARKETPLACE_PREF = 'extensionsMarketplaceBaseUrl';

onMounted(async () => {
  marketplaceBaseUrl.value = (await window.releaseManager.getPreference(MARKETPLACE_PREF)) || 'http://localhost:8000';
  installedUser.value = await window.releaseManager.getInstalledUserExtensions();
});

function saveMarketplaceUrl() {
  window.releaseManager.setPreference(MARKETPLACE_PREF, marketplaceBaseUrl.value || '');
}

async function fetchMarketplace() {
  marketplaceError.value = '';
  marketplaceLoading.value = true;
  try {
    const base = marketplaceBaseUrl.value?.trim() || 'http://localhost:8000';
    const result = await window.releaseManager.getMarketplaceExtensions(base);
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
    const base = marketplaceBaseUrl.value?.trim() || 'http://localhost:8000';
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
