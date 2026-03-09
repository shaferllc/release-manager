<template>
  <Card class="changelog-view detail-tab-panel flex-1 flex flex-col min-h-0 overflow-auto">
    <template #content>
    <div class="py-6 px-6">
      <Toolbar class="extension-toolbar">
        <template #start>
          <p class="text-sm text-rm-muted m-0">
            Release notes and version history for Shipwell.
          </p>
        </template>
      </Toolbar>
      <Panel>
        <template #header>
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Changelog</h3>
        </template>
        <Message v-if="error" severity="warn" class="text-sm">{{ error }}</Message>
        <div v-else-if="content" class="changelog-body prose-changelog text-sm text-rm-text" v-html="content"></div>
        <div v-else class="flex flex-col items-center gap-3 py-12 text-rm-muted text-sm">
          <ProgressSpinner aria-hidden="true" class="!w-8 !h-8" />
          <span>Loading…</span>
        </div>
      </Panel>
    </div>
    </template>
  </Card>
</template>

<script setup>
import Card from 'primevue/card';
import Message from 'primevue/message';
import Panel from 'primevue/panel';
import ProgressSpinner from 'primevue/progressspinner';
import Toolbar from 'primevue/toolbar';
import { useChangelog } from '../composables/useChangelog';

const { content, error } = useChangelog();
</script>

<style scoped>
.prose-changelog :deep(a) { color: rgb(var(--rm-accent)); }
.prose-changelog :deep(a:hover) { text-decoration: underline; }
</style>
