import { ref, watch, computed } from 'vue';
import { useApi } from './useApi';
import { useAiGenerateAvailable } from './useAiGenerateAvailable';

/**
 * Composable for the Tests tab: load test scripts from package.json/composer.json,
 * run a script, run and get AI (Ollama) fix suggestion. Call with (store, getInfo, modals, runWithOverlay).
 */
export function useTests(store, getInfo, modals, runWithOverlay) {
  const api = useApi();
  const { aiGenerateAvailable } = useAiGenerateAvailable();

  const scripts = ref([]);
  const running = ref('');
  const suggestingFix = ref(false);
  const output = ref('');

  const ollamaSuggestAvailable = computed(() => !!api.ollamaSuggestTestFix);

  async function load() {
    const path = store.selectedPath;
    const type = (getInfo?.()?.projectType || '').toLowerCase();
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

  watch(
    () => [store.selectedPath, getInfo?.()?.projectType],
    load,
    { immediate: true }
  );

  async function run(scriptName) {
    const path = store.selectedPath;
    const type = (getInfo?.()?.projectType || '').toLowerCase();
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
    const type = (getInfo?.()?.projectType || '').toLowerCase();
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

  return {
    scripts,
    running,
    suggestingFix,
    output,
    aiGenerateAvailable,
    ollamaSuggestAvailable,
    run,
    runAndSuggestFix,
  };
}
