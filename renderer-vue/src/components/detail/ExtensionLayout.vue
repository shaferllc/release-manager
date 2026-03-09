<template>
  <Card
    class="mb-4 detail-tab-panel flex flex-col min-h-0"
    :class="contentClass"
    :data-detail-tab="tabId"
  >
    <template #content>
      <Toolbar class="extension-toolbar">
        <template #start>
          <slot name="toolbar-start" />
        </template>
        <template #end>
          <slot name="toolbar-end" />
        </template>
      </Toolbar>
      <slot />
    </template>
  </Card>
</template>

<script setup>
import Card from 'primevue/card';
import Toolbar from 'primevue/toolbar';

defineProps({
  /** Detail tab id for data-detail-tab (e.g. "bookmarks", "dependencies") */
  tabId: { type: String, required: true },
  /** Extra class for the Card root (e.g. "detail-bookmarks-card") */
  contentClass: { type: String, default: '' },
});
</script>
