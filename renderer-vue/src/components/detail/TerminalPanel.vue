<template>
  <div class="terminal-panel flex flex-col rounded-rm border border-rm-border bg-rm-bg overflow-hidden" :style="{ minHeight: minHeight + 'px' }">
    <!-- Tab bar: clear tabs + new-tab button -->
    <div class="terminal-panel-header flex items-center border-b border-rm-border bg-rm-surface shrink-0 px-1" @click.stop>
      <div class="terminal-tabs flex items-center gap-0.5 min-w-0 flex-1 overflow-x-auto py-1">
        <Button
          v-for="tab in tabs"
          :key="tab.id"
          variant="text"
          size="small"
          class="terminal-tab shrink-0 px-3 py-2 text-xs font-medium rounded-md border min-h-[2.25rem] flex items-center gap-2"
          :class="activeTabId === tab.id ? 'text-rm-accent border-rm-border bg-rm-bg shadow-sm' : 'text-rm-muted border-transparent hover:text-rm-text hover:bg-rm-surface-hover/70'"
          :title="tab.dirPath"
          @click="activeTabId = tab.id"
        >
          <span class="truncate max-w-[10rem]">{{ tab.label }}</span>
          <Button
            v-if="tabs.length > 1"
            variant="text"
            size="small"
            icon="pi pi-times"
            class="terminal-tab-close w-6 h-6 min-w-0 p-0 rounded text-rm-muted hover:text-rm-text hover:bg-rm-surface-hover"
            aria-label="Close tab"
            @click.stop="closeTab(tab.id)"
          />
        </Button>
        <Button
          variant="outlined"
          size="small"
          icon="pi pi-plus"
          label="New tab"
          class="terminal-tab-new shrink-0 rounded-md text-xs border-rm-border text-rm-muted hover:text-rm-accent hover:border-rm-accent/50 hover:bg-rm-accent/5"
          v-tooltip.top="'New terminal tab'"
          aria-label="New tab"
          @click="addTab"
        />
      </div>
      <div class="terminal-panel-actions flex items-center gap-0.5 shrink-0 pr-2 border-l border-rm-border pl-2">
        <Button v-if="activeTab" variant="text" size="small" icon="pi pi-external-link" class="w-8 h-8 min-w-0 rounded text-rm-muted hover:text-rm-accent" v-tooltip.top="'Pop out'" @click="popOut(activeTab)" />
        <Button variant="text" size="small" icon="pi pi-trash" class="w-8 h-8 min-w-0 rounded text-rm-muted hover:text-rm-accent" v-tooltip.top="'Clear'" @click="clearActive" />
        <Button variant="text" size="small" icon="pi pi-times" class="w-8 h-8 min-w-0 rounded text-rm-muted hover:text-rm-text" v-tooltip.top="'Close'" aria-label="Close" @click="$emit('close')" />
      </div>
    </div>
    <div class="terminal-panel-body flex-1 min-h-0 flex flex-col overflow-hidden bg-rm-bg">
      <template v-for="tab in tabs" :key="tab.id">
        <InlineTerminal
          v-show="activeTabId === tab.id"
          :ref="(el) => setTerminalRef(el, tab.id)"
          :dir-path="tab.dirPath"
          :min-height="minHeight - 42"
          :show-scripts="true"
          :show-pop-out="false"
          :expand-output="true"
          :compact-header="true"
          class="terminal-panel-tab-content h-full"
          @close="closeTab(tab.id)"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import { useAppStore } from '../../stores/app';
import { useTerminalPanel } from '../../composables/useTerminalPanel';
import InlineTerminal from './InlineTerminal.vue';

const props = defineProps({
  minHeight: { type: Number, default: 280 },
  initialDirPath: { type: String, default: '' },
});
defineEmits(['close']);

const store = useAppStore();

const {
  tabs,
  activeTabId,
  activeTab,
  addTab,
  closeTab,
  clearActive,
  runInActiveTerminal,
  setTerminalRef,
  popOut,
} = useTerminalPanel(store, () => props.initialDirPath);

defineExpose({ runInActiveTerminal });
</script>

<style scoped>
.terminal-tabs {
  scrollbar-width: thin;
}
.terminal-tab {
  white-space: nowrap;
}
.terminal-tab:focus-visible {
  outline: 2px solid rgb(var(--rm-accent));
  outline-offset: -2px;
}
</style>
