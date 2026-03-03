<template>
  <section class="card mb-6 collapsible-card detail-tab-panel" data-detail-tab="tests" :class="{ 'is-collapsed': collapsed }">
    <div class="collapsible-card-header-row">
      <button type="button" class="collapsible-card-header" :aria-expanded="!collapsed" @click="toggle">
        <span class="collapsible-card-title">Tests</span>
        <svg class="collapsible-card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
    <div class="collapsible-card-body">
    <div class="card-section">
      <span class="card-label">Tests</span>
      <p class="m-0 mb-4 text-sm text-rm-muted">Run test scripts defined in package.json or composer.json. Use <strong>Run & suggest fix</strong> to run tests and ask AI (Ollama) for a fix suggestion when they fail.</p>
      <div v-if="scripts.length" class="flex flex-wrap gap-2 mb-4">
        <button
          v-for="s in scripts"
          :key="s"
          type="button"
          class="btn-secondary btn-compact text-xs"
          :disabled="running === s || suggestingFix"
          @click="run(s)"
        >
          {{ s }}{{ running === s ? '…' : '' }}
        </button>
        <button
          v-if="aiGenerateAvailable"
          type="button"
          class="btn-primary btn-compact text-xs"
          :disabled="running !== '' || suggestingFix || !api.ollamaSuggestTestFix"
          @click="runAndSuggestFix"
        >
          {{ suggestingFix ? 'Asking AI…' : 'Run & suggest fix' }}
        </button>
      </div>
      <p v-else class="m-0 text-sm text-rm-muted">No test scripts found.</p>
      <pre v-if="output" class="m-0 p-4 rounded-rm bg-rm-surface text-xs font-mono text-rm-text overflow-auto max-h-64 border border-rm-border">{{ output }}</pre>
    </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useCollapsible } from '../../composables/useCollapsible';
import { useAppStore } from '../../stores/app';
import { useApi } from '../../composables/useApi';
import { useModals } from '../../composables/useModals';
import { useLongActionOverlay } from '../../composables/useLongActionOverlay';
import { useAiGenerateAvailable } from '../../composables/useAiGenerateAvailable';

const props = defineProps({ info: { type: Object, default: null } });

const store = useAppStore();
const api = useApi();
const modals = useModals();
const { runWithOverlay } = useLongActionOverlay();
const { collapsed, toggle } = useCollapsible('tests');
const { aiGenerateAvailable } = useAiGenerateAvailable();
const scripts = ref([]);
const running = ref('');
const suggestingFix = ref(false);
const output = ref('');

async function load() {
  const path = store.selectedPath;
  const type = (props.info?.projectType || '').toLowerCase();
  if (!path || !api.getProjectTestScripts || (type !== 'npm' && type !== 'php')) {
    scripts.value = [];
    return;
  }
  try {
    const result = await api.getProjectTestScripts(path, type);
    scripts.value = result?.ok && Array.isArray(result?.scripts) ? result.scripts : [];
  } catch {
    scripts.value = [];
  }
}

watch(() => [store.selectedPath, props.info?.projectType], load, { immediate: true });

async function run(scriptName) {
  const path = store.selectedPath;
  const type = (props.info?.projectType || '').toLowerCase();
  if (!path || !api.runProjectTests) return;
  running.value = scriptName;
  output.value = '';
  try {
    const result = await runWithOverlay(api.runProjectTests(path, type, scriptName));
    output.value = result?.stdout != null ? result.stdout : (result?.stderr || result?.error || 'No output');
  } catch (e) {
    output.value = e?.message || 'Run failed.';
  } finally {
    running.value = '';
  }
}

async function runAndSuggestFix() {
  const path = store.selectedPath;
  const type = (props.info?.projectType || '').toLowerCase();
  const scriptName = scripts.value[0] || 'test';
  if (!path || !api.runProjectTests || !api.ollamaSuggestTestFix) return;
  suggestingFix.value = true;
  output.value = '';
  try {
    const result = await runWithOverlay(api.runProjectTests(path, type, scriptName));
    const stdout = result?.stdout ?? '';
    const stderr = result?.stderr ?? '';
    const combined = [stdout, stderr].filter(Boolean).join('\n');
    output.value = combined || result?.error || 'No output';
    const failed = result?.ok === false || (result?.exitCode != null && result.exitCode !== 0);
    if (failed) {
      const fixResult = await runWithOverlay(api.ollamaSuggestTestFix(scriptName, stdout, stderr));
      if (fixResult?.ok && fixResult?.text) {
        modals.openModal('diffFull', { title: 'Suggested fix (AI)', content: fixResult.text });
      } else {
        modals.openModal('diffFull', {
          title: 'Suggested fix (AI)',
          content: fixResult?.error || 'Could not get suggestion. Check Ollama in Settings.',
        });
      }
    }
  } catch (e) {
    output.value = e?.message || 'Run failed.';
  } finally {
    suggestingFix.value = false;
  }
}
</script>
