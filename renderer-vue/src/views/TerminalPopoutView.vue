<template>
  <div class="terminal-popout flex flex-col h-full min-h-0 bg-rm-bg text-rm-text">
    <div class="terminal-popout-header flex items-center justify-between gap-2 px-3 py-2 border-b border-rm-border bg-rm-surface/80 shrink-0">
      <span class="text-sm font-medium text-rm-muted truncate">Terminal · {{ displayPath }}</span>
      <button
        type="button"
        class="btn-secondary btn-compact text-xs"
        title="Close window"
        @click="closeWindow"
      >
        Close window
      </button>
    </div>
    <div class="terminal-popout-body flex-1 min-h-0 overflow-hidden">
      <InlineTerminal
        v-if="dirPath"
        :dir-path="dirPath"
        :min-height="0"
        :show-scripts="true"
        :show-pop-out="false"
        :expand-output="true"
        compact-header
        class="h-full"
      />
      <div v-else class="p-4 text-rm-muted text-sm">
        <p class="m-0">No directory. Close and open from the main window.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import InlineTerminal from '../components/detail/InlineTerminal.vue';

const dirPath = ref('');

const displayPath = computed(() => {
  const p = dirPath.value || '';
  if (p.length <= 50) return p;
  return '…' + p.slice(-48);
});

function closeWindow() {
  if (window.releaseManager?.closeTerminalPopoutWindow) {
    window.releaseManager.closeTerminalPopoutWindow();
  }
}

onMounted(async () => {
  if (window.releaseManager?.getTerminalPopoutState) {
    try {
      const state = await window.releaseManager.getTerminalPopoutState();
      dirPath.value = state?.dirPath ?? '';
    } catch {
      dirPath.value = '';
    }
  }
});
</script>
