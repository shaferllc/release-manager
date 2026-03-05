<template>
  <div class="terminal-panel terminal-shape flex flex-col border border-rm-border bg-rm-bg overflow-hidden" :style="{ minHeight: minHeight + 'px' }">
    <div class="terminal-panel-header flex items-center gap-1 border-b border-rm-border bg-rm-surface/80 shrink-0" @click.stop>
      <div class="terminal-tabs flex items-center gap-0 min-w-0 flex-1 overflow-x-auto">
        <Button
          v-for="tab in tabs"
          :key="tab.id"
          variant="text"
          size="small"
          class="terminal-tab shrink-0 px-2.5 py-2 text-xs font-medium min-w-0 border-b-2 transition-colors"
          :class="activeTabId === tab.id ? 'text-rm-accent border-rm-accent bg-rm-accent/10' : 'text-rm-muted border-transparent hover:text-rm-text hover:bg-rm-surface-hover/50'"
          :title="tab.dirPath"
          @click="activeTabId = tab.id"
        >
          <span class="truncate max-w-[10rem] inline-block align-middle">{{ tab.label }}</span>
          <Button
            v-if="tabs.length > 1"
            variant="text"
            size="small"
            class="terminal-tab-close ml-1 p-0.5 rounded min-w-0 hover:bg-rm-surface-hover text-rm-muted hover:text-rm-text"
            aria-label="Close tab"
            @click.stop="closeTab(tab.id)"
          >
            ×
          </Button>
        </Button>
        <Button
          variant="text"
          size="small"
          class="terminal-tab-new shrink-0 px-2 py-2 min-w-0 text-rm-muted hover:text-rm-accent hover:bg-rm-accent/10 text-xs"
          title="New terminal tab"
          aria-label="New tab"
          @click="addTab"
        >
          +
        </Button>
      </div>
      <div class="terminal-panel-actions flex items-center gap-1 shrink-0 pr-1">
        <Button
          v-if="activeTab"
          variant="text"
          size="small"
          class="text-[10px] px-1 py-1 min-w-0 text-rm-muted hover:text-rm-accent"
          title="Pop out in new window"
          @click="popOut(activeTab)"
        >
          Pop out
        </Button>
        <Button variant="text" size="small" class="text-[10px] px-1 py-1 min-w-0 text-rm-accent hover:underline" @click="clearActive">Clear</Button>
        <Button variant="text" size="small" class="text-[10px] px-1 py-1 min-w-0 text-rm-muted hover:text-rm-text" aria-label="Close terminal" @click="$emit('close')">×</Button>
      </div>
    </div>
    <div class="terminal-panel-body flex-1 min-h-0 flex flex-col overflow-hidden">
      <template v-for="tab in tabs" :key="tab.id">
        <InlineTerminal
          v-show="activeTabId === tab.id"
          :ref="(el) => setTerminalRef(el, tab.id)"
          :dir-path="tab.dirPath"
          :min-height="minHeight - 44"
          :show-scripts="true"
          :show-pop-out="false"
          :expand-output="true"
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
  setTerminalRef,
  popOut,
} = useTerminalPanel(store, () => props.initialDirPath);
</script>

<style scoped>
.terminal-tabs {
  scrollbar-width: thin;
}
.terminal-tab {
  white-space: nowrap;
}
</style>
