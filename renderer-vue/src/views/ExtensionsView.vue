<template>
  <div class="extensions-view flex flex-1 flex-col min-h-0">
    <div class="extensions-view-inner py-8 px-8 max-w-2xl">
      <h2 class="text-xl font-semibold text-rm-text m-0 mb-1">Extensions</h2>
      <p class="text-sm text-rm-muted m-0 mb-6">
        Enable or disable detail-tab extensions. You can reorder tabs by dragging them in the project view. Extensions are updated with the app.
      </p>

      <div v-if="extensions.length === 0" class="rounded-rm border border-rm-border bg-rm-surface/30 px-6 py-8 text-center text-rm-muted text-sm">
        No extensions are installed. Built-in extensions (Kanban, SSH) are loaded from the app.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="ext in extensions"
          :key="ext.id"
          class="extension-card rounded-rm border border-rm-border bg-rm-surface/30 overflow-hidden"
        >
          <div class="extension-card-inner px-4 py-4 flex flex-col sm:flex-row sm:items-start gap-4">
            <div class="extension-icon shrink-0 w-10 h-10 rounded-rm border border-rm-border bg-rm-bg flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 text-rm-muted" v-html="ext.icon" aria-hidden="true"></div>
            <div class="extension-body min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <h3 class="text-base font-semibold text-rm-text m-0">{{ ext.label }}</h3>
                <Tag v-if="ext.version" severity="secondary" class="text-[10px] px-1.5 py-0">{{ ext.version }}</Tag>
              </div>
              <p v-if="ext.description" class="text-sm text-rm-muted m-0 mb-3">{{ ext.description }}</p>
              <div class="flex flex-wrap items-center gap-4">
                <label v-if="ext.featureFlagId" class="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    :model-value="isEnabled(ext)"
                    :binary="true"
                    :input-id="'ext-enable-' + ext.id"
                    @update:model-value="(v) => setEnabled(ext, v)"
                  />
                  <span class="text-sm text-rm-text">{{ isEnabled(ext) ? 'Enabled' : 'Disabled' }}</span>
                </label>
                <span v-else class="text-xs text-rm-muted">Always on</span>
                <span class="text-xs text-rm-muted">Updated with app</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import Checkbox from 'primevue/checkbox';
import Tag from 'primevue/tag';
import { getDetailTabExtensions } from '../extensions/registry';
import { useFeatureFlags } from '../composables/useFeatureFlags';

const extensions = computed(() => getDetailTabExtensions());

const { tabFlags, setTabFlag } = useFeatureFlags();

function isEnabled(ext) {
  if (!ext.featureFlagId) return true;
  return tabFlags.value[ext.featureFlagId] !== false;
}

async function setEnabled(ext, enabled) {
  if (!ext.featureFlagId) return;
  await setTabFlag(ext.featureFlagId, enabled);
}
</script>
