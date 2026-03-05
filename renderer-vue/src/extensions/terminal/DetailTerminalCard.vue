<template>
  <section class="card mb-6 detail-tab-panel detail-terminal-card flex flex-col min-h-0" data-detail-tab="terminal">
    <div v-if="projectPath" class="terminal-extension-panel flex-1 min-h-[320px] flex flex-col overflow-hidden">
      <TerminalPanel
        :min-height="320"
        :initial-dir-path="projectPath"
        class="terminal-extension-panel-inner flex-1 min-h-0 border-0"
      />
    </div>
    <div v-else class="py-12 px-4 text-center text-rm-muted text-sm">
      <p class="m-0">Select a project to open a terminal in its directory.</p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useAppStore } from '../../stores/app';
import TerminalPanel from '../../components/detail/TerminalPanel.vue';

const props = defineProps({ info: { type: Object, default: null } });

const store = useAppStore();

const projectPath = computed(() => props.info?.path ?? store.selectedPath ?? '');
</script>
