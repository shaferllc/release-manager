<template>
  <section class="card mb-6 detail-tab-panel" data-detail-tab="tests">
    <div class="card-section">
      <span class="card-label">Tests</span>
      <p class="m-0 mb-4 text-sm text-rm-muted">Run test scripts defined in package.json or composer.json. Use <strong>Run & suggest fix</strong> to run tests and ask AI (Ollama) for a fix suggestion when they fail.</p>
      <div v-if="scripts.length" class="flex flex-wrap gap-2 mb-4">
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
      </div>
      <p v-else class="m-0 text-sm text-rm-muted">No test scripts found.</p>
      <pre v-if="output" class="m-0 p-4 rounded-rm bg-rm-surface text-xs font-mono text-rm-text overflow-auto max-h-64 border border-rm-border">{{ output }}</pre>
    </div>
  </section>
</template>

<script setup>
import Button from 'primevue/button';
import { useAppStore } from '../../stores/app';
import { useModals } from '../../composables/useModals';
import { useLongActionOverlay } from '../../composables/useLongActionOverlay';
import { useTests } from '../../composables/useTests';

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
</script>
