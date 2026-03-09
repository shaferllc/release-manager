<template>
  <Card class="mb-4 detail-tab-panel" data-detail-tab="tests">
    <template #content>
      <div class="card-section">
      <span class="card-label">Tests</span>
      <p class="m-0 mb-4 text-sm text-rm-muted">Run test scripts defined in package.json or composer.json. Use <strong>Run & suggest fix</strong> to run tests and ask AI (Ollama) for a fix suggestion when they fail. Use <strong>Open terminal for Cursor</strong> to chat with Cursor in the terminal and easily create or fix tests.</p>
      <div class="flex flex-wrap gap-2 mb-4">
        <template v-if="scripts.length">
          <Button
            v-for="s in scripts"
            :key="s"
            severity="secondary"
            size="small"
            class="text-xs"
            :disabled="running === s || suggestingFix"
            @click="run(s)"
          >
            {{ s }}{{ running === s ? '…' : '' }}
          </Button>
          <Button
            v-if="aiGenerateAvailable"
            severity="primary"
            size="small"
            class="text-xs"
            :disabled="running !== '' || suggestingFix || !ollamaSuggestAvailable"
            @click="runAndSuggestFix"
          >
            {{ suggestingFix ? 'Asking AI…' : 'Run & suggest fix' }}
          </Button>
        </template>
        <Button
          v-if="terminalTabAvailable"
          severity="secondary"
          size="small"
          class="text-xs"
          icon="pi pi-terminal"
          label="Open terminal for Cursor"
          v-tooltip.top="'Switch to Terminal tab and print a suggested prompt to use in Cursor chat'"
          @click="openTerminalForCursor"
        />
      </div>
      <p v-if="!scripts.length" class="m-0 text-sm text-rm-muted">No test scripts found.</p>
      <pre v-if="output" class="m-0 p-4 rounded-rm bg-rm-surface text-xs font-mono text-rm-text overflow-auto max-h-64 border border-rm-border">{{ output }}</pre>
    </div>
    </template>
  </Card>
</template>

<script setup>
import Button from 'primevue/button';
import Card from 'primevue/card';
import { useAppStore } from '../../stores/app';
import { useModals } from '../../composables/useModals';
import { useLongActionOverlay } from '../../composables/useLongActionOverlay';
import { useTests } from '../../composables/useTests';
import { getDetailTabExtensions } from '../../extensions/registry';
import { computed } from 'vue';

const props = defineProps({ info: { type: Object, default: null } });

const store = useAppStore();
const modals = useModals();
const { runWithOverlay } = useLongActionOverlay();

const {
  scripts,
  running,
  suggestingFix,
  output,
  aiGenerateAvailable,
  ollamaSuggestAvailable,
  run,
  runAndSuggestFix,
} = useTests(store, () => props.info, modals, runWithOverlay);

const terminalTabAvailable = computed(() =>
  getDetailTabExtensions().some((e) => e.id === 'terminal')
);

function openTerminalForCursor() {
  if (!terminalTabAvailable.value || !store.setDetailTab || !store.setPendingTerminalCommand) return;
  const scriptList = scripts.value.length && scripts.value.every((s) => !String(s).includes("'") && !String(s).includes('"'))
    ? scripts.value.join(', ')
    : '';
  const msg = scriptList
    ? `Suggested prompt for Cursor: Help me write or fix tests for this project. Test scripts: ${scriptList}`
    : 'Suggested prompt for Cursor: Help me write or fix tests for this project. (See Tests tab for script names.)';
  const safeMsg = msg.replace(/'/g, "'\\''");
  store.setPendingTerminalCommand(`echo '${safeMsg}'`);
  store.setDetailTab('terminal');
}
</script>
