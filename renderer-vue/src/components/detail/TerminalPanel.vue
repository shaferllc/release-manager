<template>
  <div class="terminal-panel terminal-shape flex flex-col border border-rm-border bg-rm-bg overflow-hidden" :style="{ minHeight: minHeight + 'px' }">
    <div class="terminal-panel-header flex items-center gap-1 border-b border-rm-border bg-rm-surface/80 shrink-0" @click.stop>
      <div class="terminal-tabs flex items-center gap-0 min-w-0 flex-1 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="terminal-tab shrink-0 px-2.5 py-2 text-xs font-medium border-0 bg-transparent cursor-pointer border-b-2 transition-colors"
          :class="activeTabId === tab.id ? 'text-rm-accent border-rm-accent bg-rm-accent/10' : 'text-rm-muted border-transparent hover:text-rm-text hover:bg-rm-surface-hover/50'"
          :title="tab.dirPath"
          @click="activeTabId = tab.id"
        >
          <span class="truncate max-w-[10rem] inline-block align-middle">{{ tab.label }}</span>
          <button
            v-if="tabs.length > 1"
            type="button"
            class="terminal-tab-close ml-1 p-0.5 rounded hover:bg-rm-surface-hover border-0 bg-transparent cursor-pointer text-rm-muted hover:text-rm-text"
            aria-label="Close tab"
            @click.stop="closeTab(tab.id)"
          >
            ×
          </button>
        </button>
        <button
          type="button"
          class="terminal-tab-new shrink-0 px-2 py-2 text-rm-muted hover:text-rm-accent hover:bg-rm-accent/10 border-0 bg-transparent cursor-pointer text-xs"
          title="New terminal tab"
          aria-label="New tab"
          @click="addTab"
        >
          +
        </button>
      </div>
      <div class="terminal-panel-actions flex items-center gap-1 shrink-0 pr-1">
        <button
          v-if="activeTab"
          type="button"
          class="text-[10px] text-rm-muted hover:text-rm-accent border-0 bg-transparent cursor-pointer px-1 py-1"
          title="Pop out in new window"
          @click="popOut(activeTab)"
        >
          Pop out
        </button>
        <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent cursor-pointer px-1 py-1" @click="clearActive">Clear</button>
        <button type="button" class="text-[10px] text-rm-muted hover:text-rm-text border-0 bg-transparent cursor-pointer px-1 py-1" aria-label="Close terminal" @click="$emit('close')">×</button>
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
import { ref, computed, watch } from 'vue';
import { useAppStore } from '../../stores/app';
import InlineTerminal from './InlineTerminal.vue';

const props = defineProps({
  minHeight: { type: Number, default: 280 },
  initialDirPath: { type: String, default: '' },
});
defineEmits(['close']);

const store = useAppStore();

let nextId = 1;
function genId() {
  return `t-${nextId++}-${Date.now()}`;
}
function dirToLabel(dirPath) {
  if (!dirPath) return 'Terminal';
  const p = (dirPath || '').replace(/\\/g, '/');
  const parts = p.split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : p || 'Terminal';
}

const tabs = ref([]);
const activeTabId = ref(null);

function ensureTabs() {
  if (tabs.value.length === 0) {
    const path = props.initialDirPath || store.selectedPath || '';
    const id = genId();
    tabs.value.push({ id, dirPath: path, label: dirToLabel(path) });
    activeTabId.value = id;
  }
}

function addTab() {
  const path = store.selectedPath || props.initialDirPath || (tabs.value[0]?.dirPath) || '';
  const id = genId();
  tabs.value.push({ id, dirPath: path, label: dirToLabel(path) });
  activeTabId.value = id;
}

function closeTab(id) {
  const idx = tabs.value.findIndex((t) => t.id === id);
  if (idx < 0) return;
  tabs.value.splice(idx, 1);
  delete terminalRefs.value[id];
  if (tabs.value.length === 0) {
    activeTabId.value = null;
    return;
  }
  if (activeTabId.value === id) {
    activeTabId.value = tabs.value[Math.min(idx, tabs.value.length - 1)].id;
  }
}

function clearActive() {
  const ref = activeTabId.value ? terminalRefs.value[activeTabId.value] : null;
  if (ref && typeof ref.clear === 'function') ref.clear();
}

const activeTab = computed(() => tabs.value.find((t) => t.id === activeTabId.value));
const terminalRefs = ref({});

function setTerminalRef(el, tabId) {
  if (el) terminalRefs.value[tabId] = el;
}

function popOut(tab) {
  if (tab?.dirPath && window.releaseManager?.openTerminalPopout) {
    window.releaseManager.openTerminalPopout(tab.dirPath);
  }
}

watch(
  () => props.initialDirPath || store.selectedPath,
  (path) => {
    ensureTabs();
    if (tabs.value.length === 1 && path) {
      tabs.value[0].dirPath = path;
      tabs.value[0].label = dirToLabel(path);
    }
  },
  { immediate: true }
);
ensureTabs();
</script>

<style scoped>
.terminal-tabs {
  scrollbar-width: thin;
}
.terminal-tab {
  white-space: nowrap;
}
</style>
