import { ref, watch, computed } from 'vue';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';
import { useModals } from '../../../composables/useModals';

const DEFAULT_STATUS = { active: false, current: '', remaining: '', good: '', bad: '' };

/**
 * Composable for git bisect: status, actions, and test-script state.
 * @param {Object} options
 * @param {import('vue').Ref<string>} options.projectTypeRef - e.g. computed(() => (info?.projectType || '').toLowerCase())
 * @param {() => void} [options.onRefresh] - Called after any action that should refresh the parent (e.g. emit('refresh'))
 * @returns {Object} status, error, load, startBisect, markGood, markBad, markSkip, resetBisect, runTestsHere, runAutomatedBisect, canRunTests, testScripts, selectedBisectScript, bisectScriptOptions, runTestsBusy, bisectRunBusy, lastTestResult
 */
export function useBisect({ projectTypeRef, onRefresh = () => {} }) {
  const store = useAppStore();
  const api = useApi();
  const modals = useModals();

  const status = ref({ ...DEFAULT_STATUS });
  const error = ref('');
  const testScripts = ref([]);
  const selectedBisectScript = ref('');
  const runTestsBusy = ref(false);
  const bisectRunBusy = ref(false);
  const lastTestResult = ref(null);

  const bisectScriptOptions = computed(() => testScripts.value.map((s) => ({ value: s, label: s })));
  const canRunTests = computed(
    () => status.value.active && (projectTypeRef?.value === 'npm' || projectTypeRef?.value === 'php')
  );

  async function load() {
    const path = store.selectedPath;
    if (!path || !api.getBisectStatus) return;
    error.value = '';
    try {
      const r = await api.getBisectStatus(path);
      status.value = {
        active: !!r?.active,
        current: r?.current || '',
        remaining: r?.remaining ?? '',
        good: r?.good ?? '',
        bad: r?.bad ?? '',
      };
    } catch {
      status.value = { ...DEFAULT_STATUS };
    }
  }

  async function loadTestScripts() {
    if (!status.value.active || !store.selectedPath || !api.getProjectTestScripts) {
      testScripts.value = [];
      selectedBisectScript.value = '';
      return;
    }
    const type = projectTypeRef?.value ?? '';
    if (type !== 'npm' && type !== 'php') {
      testScripts.value = [];
      return;
    }
    try {
      const r = await api.getProjectTestScripts(store.selectedPath, type);
      const list = r?.ok && Array.isArray(r?.scripts) ? r.scripts : [];
      testScripts.value = list;
      if (list.length && !list.includes(selectedBisectScript.value)) selectedBisectScript.value = list[0];
    } catch {
      testScripts.value = [];
    }
  }

  watch(() => store.selectedPath, load, { immediate: true });
  watch([() => projectTypeRef?.value, () => status.value.active], loadTestScripts, { immediate: true });

  function startBisect() {
    const path = store.selectedPath;
    if (!path) return;
    modals.openModal('bisectRefPicker', {
      dirPath: path,
      defaultBad: 'HEAD',
      defaultGood: '',
      onConfirm: async ({ badRef, goodRef }) => {
        if (!api.bisectStart) return;
        error.value = '';
        try {
          await api.bisectStart(path, badRef, goodRef);
          await load();
          onRefresh();
        } catch (e) {
          error.value = e?.message || 'Bisect start failed.';
        }
      },
    });
  }

  async function markGood() {
    const path = store.selectedPath;
    if (!path || !api.bisectGood) return;
    error.value = '';
    try {
      await api.bisectGood(path);
      await load();
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Failed.';
    }
  }

  async function markBad() {
    const path = store.selectedPath;
    if (!path || !api.bisectBad) return;
    error.value = '';
    try {
      await api.bisectBad(path);
      await load();
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Failed.';
    }
  }

  async function markSkip() {
    const path = store.selectedPath;
    if (!path || !api.bisectSkip) return;
    error.value = '';
    try {
      await api.bisectSkip(path);
      await load();
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Skip failed.';
    }
  }

  async function resetBisect() {
    const path = store.selectedPath;
    if (!path || !api.bisectReset) return;
    error.value = '';
    try {
      await api.bisectReset(path);
      await load();
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Reset failed.';
    }
  }

  async function runTestsHere() {
    const path = store.selectedPath;
    const type = projectTypeRef?.value ?? '';
    if (!path || !api.runProjectTests || (type !== 'npm' && type !== 'php')) return;
    const script = testScripts.value[0] || 'test';
    runTestsBusy.value = true;
    lastTestResult.value = null;
    try {
      const result = await api.runProjectTests(path, type, script);
      lastTestResult.value = { ok: result?.exitCode === 0 };
    } catch {
      lastTestResult.value = { ok: false };
    } finally {
      runTestsBusy.value = false;
    }
  }

  async function runAutomatedBisect() {
    const path = store.selectedPath;
    const type = projectTypeRef?.value ?? '';
    const script = selectedBisectScript.value || testScripts.value[0] || 'test';
    if (!path || !api.bisectRun) return;
    const commandArgs = type === 'php' ? ['composer', 'run', script, '--no-ansi'] : ['npm', 'run', script, '--no-color'];
    bisectRunBusy.value = true;
    error.value = '';
    try {
      await api.bisectRun(path, commandArgs);
      await load();
      onRefresh();
    } catch (e) {
      error.value = e?.message || 'Bisect run failed.';
    } finally {
      bisectRunBusy.value = false;
    }
  }

  return {
    status,
    error,
    load,
    startBisect,
    markGood,
    markBad,
    markSkip,
    resetBisect,
    runTestsHere,
    runAutomatedBisect,
    canRunTests,
    testScripts,
    selectedBisectScript,
    bisectScriptOptions,
    runTestsBusy,
    bisectRunBusy,
    lastTestResult,
  };
}
