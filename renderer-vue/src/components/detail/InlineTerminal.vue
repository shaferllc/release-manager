<template>
  <div class="inline-terminal flex flex-col rounded-rm border-0 bg-transparent overflow-hidden h-full min-h-0" :style="minHeight ? { minHeight: minHeight + 'px' } : {}" @click="focusInput">
    <div v-if="!compactHeader" class="inline-terminal-header flex items-center justify-between gap-2 px-2 py-1.5 border-b border-rm-border bg-rm-surface/80 shrink-0" @click.stop>
      <span class="text-xs font-medium text-rm-muted truncate">Terminal · {{ displayPath }}</span>
      <div class="flex items-center gap-1 shrink-0">
        <button v-if="showScripts && scripts.length" type="button" class="text-[10px] text-rm-muted hover:text-rm-accent border-0 bg-transparent cursor-pointer px-1" title="Run script" @click="scriptsOpen = !scriptsOpen">{{ scriptsOpen ? 'Hide scripts' : 'Run script' }}</button>
        <button type="button" class="text-[10px] text-rm-muted hover:text-rm-accent border-0 bg-transparent cursor-pointer px-1" title="Copy output" @click="copyOutput">Copy</button>
        <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent cursor-pointer px-1" @click="clear">Clear</button>
        <button v-if="showPopOut" type="button" class="text-[10px] text-rm-muted hover:text-rm-accent border-0 bg-transparent cursor-pointer px-1" title="Pop out in new window" @click="$emit('pop-out')">Pop out</button>
        <button type="button" class="text-[10px] text-rm-muted hover:text-rm-text border-0 bg-transparent cursor-pointer px-1" aria-label="Close terminal" @click="$emit('close')">×</button>
      </div>
    </div>
    <div v-if="showScripts && scriptsOpen && scripts.length" class="inline-terminal-scripts px-2 py-1.5 border-b border-rm-border bg-rm-surface/50 shrink-0 flex flex-wrap gap-1">
      <button
        v-for="name in scripts"
        :key="name"
        type="button"
        class="text-xs px-2 py-1 rounded-rm bg-rm-surface hover:bg-rm-accent/20 text-rm-text hover:text-rm-accent border border-rm-border cursor-pointer"
        @click="runScript(name)"
      >
        {{ name }}
      </button>
    </div>
    <div ref="outputEl" class="inline-terminal-output flex-1 min-h-0 overflow-auto p-2 font-mono text-xs text-rm-text whitespace-pre-wrap break-words cursor-text" :class="{ 'inline-terminal-output-expand': expandOutput }" @click="focusInput">
      <template v-for="(block, i) in blocks" :key="i">
        <div class="inline-terminal-prompt text-rm-muted">{{ promptLine(block.cwd) }}</div>
        <div v-if="block.command" class="inline-terminal-command text-rm-text">{{ block.command }}</div>
        <div v-if="block.running" class="inline-terminal-running flex items-center gap-2 text-rm-muted">
          <span class="inline-terminal-spinner" aria-hidden="true"></span>
          <span>Running…</span>
        </div>
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
        @keydown.down="historyDown"
        @keydown.up="historyUp"
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
  compactHeader: { type: Boolean, default: false },
  showScripts: { type: Boolean, default: false },
  showPopOut: { type: Boolean, default: true },
  expandOutput: { type: Boolean, default: false },
});
defineEmits(['close', 'pop-out']);

const api = useApi();
const input = ref('');
const inputEl = ref(null);
const outputEl = ref(null);
const blocks = ref([]);
const running = ref(false);
const scripts = ref([]);
const scriptsOpen = ref(false);
const projectType = ref('npm');
const HISTORY_MAX = 50;
const history = ref([]);
const historyIndex = ref(-1);
const historyTemp = ref('');

const displayPath = computed(() => {
  const p = props.dirPath || '';
  if (p.length <= 40) return p;
  return '…' + p.slice(-38);
});

function promptLine(cwd) {
  const p = (cwd || '').replace(/\\/g, '/').replace(/^.*\//, '') || '~';
  return `$ ${p} $`;
}

function clear() {
  blocks.value = [];
}

function copyOutput() {
  const text = blocks.value
    .map((b) => {
      let s = promptLine(b.cwd) + '\n';
      if (b.command) s += b.command + '\n';
      if (b.stdout) s += b.stdout;
      if (b.stderr) s += b.stderr;
      if (b.exitCode != null && b.exitCode !== 0) s += `(exit ${b.exitCode})`;
      return s;
    })
    .join('\n');
  if (text && api.copyToClipboard) api.copyToClipboard(text);
}

function historyUp(e) {
  if (history.value.length === 0) return;
  e.preventDefault();
  if (historyIndex.value < 0) historyTemp.value = input.value;
  historyIndex.value = Math.min(historyIndex.value + 1, history.value.length - 1);
  input.value = history.value[history.value.length - 1 - historyIndex.value];
}

function historyDown(e) {
  if (history.value.length === 0) return;
  e.preventDefault();
  historyIndex.value -= 1;
  if (historyIndex.value < 0) {
    input.value = historyTemp.value;
    historyIndex.value = -1;
    return;
  }
  input.value = history.value[history.value.length - 1 - historyIndex.value];
}

async function loadScripts() {
  if (!props.dirPath || !api.getProjectInfo || !api.getProjectTestScripts) return;
  try {
    const info = await api.getProjectInfo(props.dirPath);
    const type = info?.projectType || info?.type || 'npm';
    projectType.value = type;
    const res = await api.getProjectTestScripts(props.dirPath, type);
    scripts.value = Array.isArray(res?.scripts) ? res.scripts : [];
  } catch {
    scripts.value = [];
    projectType.value = 'npm';
  }
}

async function runScript(name) {
  if (!name || !props.dirPath) return;
  const cmd = projectType.value === 'php' ? `composer run-script ${name}` : `npm run ${name}`;
  input.value = cmd.replace(/\s+/g, ' ').trim();
  nextTick(() => runCommand());
}

async function runCommand() {
  const cmd = input.value?.trim();
  input.value = '';
  historyIndex.value = -1;
  if (!cmd || !props.dirPath) return;
  if (history.value[history.value.length - 1] !== cmd) {
    history.value.push(cmd);
    if (history.value.length > HISTORY_MAX) history.value.shift();
  }
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
  if (props.showScripts) loadScripts();
}, { immediate: true });

onMounted(() => {
  nextTick(focusInput);
  if (props.showScripts && props.dirPath) loadScripts();
});

defineExpose({ clear });
</script>

<style scoped>
.inline-terminal-output {
  max-height: 320px;
}
.inline-terminal-output-expand {
  max-height: none;
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
.inline-terminal-running {
  margin-bottom: 8px;
}
.inline-terminal-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgb(var(--rm-border));
  border-top-color: rgb(var(--rm-accent));
  border-radius: 50%;
  animation: inline-terminal-spin 0.7s linear infinite;
}
@keyframes inline-terminal-spin {
  to {
    transform: rotate(360deg);
  }
}
.inline-terminal-input::placeholder {
  color: rgb(var(--rm-muted) / 0.7);
}
</style>
