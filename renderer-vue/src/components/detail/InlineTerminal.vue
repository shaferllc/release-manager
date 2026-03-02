<template>
  <div class="inline-terminal flex flex-col rounded-rm border border-rm-border bg-rm-bg overflow-hidden" :style="{ minHeight: minHeight + 'px' }" @click="focusInput">
    <div class="inline-terminal-header flex items-center justify-between gap-2 px-2 py-1.5 border-b border-rm-border bg-rm-surface/80 shrink-0" @click.stop>
      <span class="text-xs font-medium text-rm-muted truncate">Terminal · {{ displayPath }}</span>
      <div class="flex items-center gap-1 shrink-0">
        <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent cursor-pointer p-0" @click="clear">Clear</button>
        <button type="button" class="text-[10px] text-rm-muted hover:text-rm-text border-0 bg-transparent cursor-pointer p-0" aria-label="Close terminal" @click="$emit('close')">×</button>
      </div>
    </div>
    <div ref="outputEl" class="inline-terminal-output flex-1 min-h-0 overflow-auto p-2 font-mono text-xs text-rm-text whitespace-pre-wrap break-words cursor-text" @click="focusInput">
      <template v-for="(block, i) in blocks" :key="i">
        <div class="inline-terminal-prompt text-rm-muted">{{ promptLine(block.cwd) }}</div>
        <div v-if="block.command" class="inline-terminal-command text-rm-text">{{ block.command }}</div>
        <div v-if="block.running" class="inline-terminal-out text-rm-muted">…</div>
        <div v-else-if="block.stdout || block.stderr" class="inline-terminal-out">
          <span v-if="block.stdout">{{ block.stdout }}</span>
          <span v-if="block.stderr" class="text-rm-warning">{{ block.stderr }}</span>
          <span v-if="block.exitCode != null && block.exitCode !== 0" class="text-rm-warning">(exit {{ block.exitCode }})</span>
        </div>
      </template>
      <div class="inline-terminal-prompt text-rm-muted">{{ promptLine(dirPath) }}</div>
    </div>
    <div class="inline-terminal-input-row flex items-center gap-2 px-2 py-1.5 border-t border-rm-border bg-rm-surface/50 shrink-0">
      <span class="text-rm-muted font-mono text-xs shrink-0">$</span>
      <input
        ref="inputEl"
        v-model="input"
        type="text"
        autocomplete="off"
        spellcheck="false"
        class="inline-terminal-input flex-1 min-w-0 font-mono text-xs bg-transparent border-0 text-rm-text focus:outline-none focus:ring-2 focus:ring-rm-accent/50 focus:ring-inset"
        placeholder="Enter command…"
        @keydown.enter="runCommand"
        @click.stop
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useApi } from '../../composables/useApi';

const props = defineProps({
  dirPath: { type: String, default: '' },
  minHeight: { type: Number, default: 200 },
});
defineEmits(['close']);

const api = useApi();
const input = ref('');
const inputEl = ref(null);
const outputEl = ref(null);
const blocks = ref([]);
const running = ref(false);

const displayPath = computed(() => {
  const p = props.dirPath || '';
  if (p.length <= 40) return p;
  return '…' + p.slice(-38);
});

function promptLine(cwd) {
  const p = (cwd || '').replace(/^.*\//, '') || '~';
  return `$ ${p} $`;
}

function clear() {
  blocks.value = [];
}

async function runCommand() {
  const cmd = input.value?.trim();
  input.value = '';
  if (!cmd || !props.dirPath) return;
  const block = { cwd: props.dirPath, command: cmd, running: true };
  blocks.value.push(block);
  running.value = true;
  nextTick(scrollToBottom);
  try {
    const result = await api.runShellCommand?.(props.dirPath, cmd);
    block.running = false;
    block.stdout = result?.stdout ?? '';
    block.stderr = result?.stderr ?? '';
    block.exitCode = result?.exitCode ?? -1;
  } catch (e) {
    block.running = false;
    block.stderr = e?.message || String(e);
    block.exitCode = -1;
  }
  running.value = false;
  nextTick(scrollToBottom);
}

function scrollToBottom() {
  if (outputEl.value) outputEl.value.scrollTop = outputEl.value.scrollHeight;
}

function focusInput() {
  inputEl.value?.focus();
}

watch(() => props.dirPath, () => {
  nextTick(focusInput);
}, { immediate: true });

onMounted(() => {
  nextTick(focusInput);
});
</script>

<style scoped>
.inline-terminal-output {
  max-height: 320px;
}
.inline-terminal-prompt {
  margin-bottom: 2px;
}
.inline-terminal-command {
  margin-bottom: 4px;
}
.inline-terminal-out {
  margin-bottom: 8px;
}
.inline-terminal-input::placeholder {
  color: rgb(var(--rm-muted) / 0.7);
}
</style>
