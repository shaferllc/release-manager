<template>
  <div class="inline-terminal flex flex-col overflow-hidden h-full min-h-0 bg-rm-bg" :style="minHeight ? { minHeight: minHeight + 'px' } : {}" @click="focusInput">
    <div v-if="!compactHeader" class="inline-terminal-header flex items-center gap-3 px-3 py-2.5 border-b border-rm-border bg-rm-surface shrink-0" @click.stop>
      <div class="inline-terminal-path flex items-center gap-2 min-w-0 flex-1 rounded-md border border-rm-border bg-rm-bg px-2.5 py-1.5">
        <i class="pi pi-folder text-rm-muted text-xs shrink-0" aria-hidden="true" />
        <span class="text-xs text-rm-text truncate font-mono" :title="dirPath">{{ displayPath }}</span>
      </div>
      <Button variant="text" size="small" icon="pi pi-copy" class="shrink-0 w-8 h-8 min-w-0 rounded text-rm-muted hover:text-rm-accent" v-tooltip.top="'Copy path'" @click="copyPath" />
      <div class="flex items-center gap-0.5 shrink-0">
        <Button
          v-if="showScripts && scripts.length"
          variant="text"
          size="small"
          :icon="scriptsOpen ? 'pi pi-chevron-up' : 'pi pi-play'"
          class="w-8 h-8 min-w-0 rounded text-rm-muted hover:text-rm-accent"
          v-tooltip.top="scriptsOpen ? 'Hide scripts' : 'Run script'"
          @click="scriptsOpen = !scriptsOpen"
        />
        <Button
          variant="text"
          size="small"
          icon="pi pi-copy"
          class="w-8 h-8 min-w-0 rounded text-rm-muted hover:text-rm-accent"
          v-tooltip.top="'Copy output'"
          @click="copyOutput"
        />
        <Button
          variant="text"
          size="small"
          icon="pi pi-trash"
          class="w-8 h-8 min-w-0 rounded text-rm-muted hover:text-rm-accent"
          v-tooltip.top="'Clear output'"
          @click="clear"
        />
        <Button
          v-if="showPopOut"
          variant="text"
          size="small"
          icon="pi pi-external-link"
          class="w-8 h-8 min-w-0 rounded text-rm-muted hover:text-rm-accent"
          v-tooltip.top="'Pop out in new window'"
          @click="$emit('pop-out')"
        />
        <Button
          variant="text"
          size="small"
          icon="pi pi-times"
          class="w-8 h-8 min-w-0 rounded text-rm-muted hover:text-rm-text"
          v-tooltip.top="'Close terminal'"
          aria-label="Close terminal"
          @click="$emit('close')"
        />
      </div>
    </div>
    <div v-if="showScripts && scriptsOpen && scripts.length" class="inline-terminal-scripts px-3 py-2 border-b border-rm-border bg-rm-surface/40 shrink-0 flex flex-wrap gap-2">
      <Button
        v-for="name in scripts"
        :key="name"
        variant="outlined"
        size="small"
        class="text-xs min-w-0"
        @click="runScript(name)"
      >
        {{ name }}
      </Button>
    </div>
    <div ref="outputEl" class="inline-terminal-output flex-1 min-h-0 overflow-auto px-4 py-3 font-mono text-[13px] text-rm-text whitespace-pre-wrap break-words cursor-text" :class="{ 'inline-terminal-output-expand': expandOutput }" @click="focusInput">
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
    <div class="inline-terminal-input-row flex items-center gap-2 px-4 py-2 border-t border-rm-border bg-rm-surface/50 shrink-0">
      <span class="text-rm-muted font-mono text-[13px] shrink-0">$</span>
      <InputText
        ref="inputEl"
        v-model="input"
        type="text"
        autocomplete="off"
        spellcheck="false"
        class="inline-terminal-input flex-1 min-w-0 font-mono text-[13px] bg-transparent border-0 text-rm-text focus:outline-none focus:ring-0"
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
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useApi } from '../../composables/useApi';
import { useInlineTerminal } from '../../composables/useInlineTerminal';

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
function copyPath() {
  if (props.dirPath) api.copyToClipboard?.(props.dirPath);
}

const {
  input,
  inputEl,
  outputEl,
  blocks,
  running,
  scripts,
  scriptsOpen,
  displayPath,
  promptLine,
  clear,
  copyOutput,
  historyUp,
  historyDown,
  runScript,
  runCommand,
  runCommandText,
  focusInput,
} = useInlineTerminal(() => props.dirPath, () => props.showScripts);

defineExpose({ clear, runCommandText });
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
