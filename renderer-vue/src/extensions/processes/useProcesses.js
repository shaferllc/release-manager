import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useApi } from '../../composables/useApi';

/**
 * Composable for the Processes (Dev stack) tab. Call with (getInfo) where getInfo() returns props.info.
 */
export function useProcesses(getInfo) {
  const api = useApi();

  const processStatus = ref([]);
  const processesConfig = ref({});
  const suggestedProcesses = ref([]);
  const addingSuggested = ref(false);
  const showAddProcess = ref(false);
  const startingAll = ref(false);
  const stoppingAll = ref(false);
  const startingSingle = ref(null);
  const stoppingSingle = ref(null);
  const expandedOutput = ref(null);
  const outputCache = ref({});
  const newProcess = ref({ name: '', command: '' });

  const projectPath = computed(() => (getInfo?.()?.path || '').trim());

  const processesForProject = computed(() => {
    const path = projectPath.value;
    if (!path) return [];
    return processStatus.value.filter((s) => s.projectPath === path);
  });

  const hasRunning = computed(() => processesForProject.value.some((p) => p.status === 'running'));

  const currentProcessIds = computed(() => {
    const path = projectPath.value;
    const config = processesConfig.value[path];
    const procs = config?.processes || [];
    return new Set(procs.map((p) => (p.id != null ? String(p.id) : (p.name || '').trim())));
  });

  const suggestedNotYetAdded = computed(() =>
    suggestedProcesses.value.filter((p) => !currentProcessIds.value.has((p.id || p.name || '').trim()))
  );

  let outputPollTimer = null;

  function processKey(projectPathVal, processId) {
    return `${(projectPathVal || '').trim()}\0${(processId || '').trim()}`;
  }

  function outputLines(proc) {
    const key = processKey(proc.projectPath, proc.processId);
    return outputCache.value[key] || [];
  }

  async function loadConfig() {
    try {
      const config = await api.getProcessesConfig?.();
      processesConfig.value = config && typeof config === 'object' ? config : {};
    } catch {
      processesConfig.value = {};
    }
  }

  async function loadSuggested() {
    const path = projectPath.value;
    if (!path || !api.getSuggestedProcesses) return;
    try {
      const result = await api.getSuggestedProcesses(path);
      suggestedProcesses.value = Array.isArray(result?.suggested) ? result.suggested : [];
    } catch {
      suggestedProcesses.value = [];
    }
  }

  async function addSuggestedProcesses() {
    const path = projectPath.value;
    const toAdd = suggestedNotYetAdded.value;
    if (!path || !toAdd.length || !api.setProcessesConfig) return;
    addingSuggested.value = true;
    try {
      const config = { ...processesConfig.value };
      const projectConfig = config[path] || { processes: [] };
      const processes = [...(projectConfig.processes || [])];
      for (const p of toAdd) {
        const id = (p.id || p.name || '').trim() || `process-${processes.length}`;
        processes.push({ id, name: p.name || id, command: p.command || '' });
      }
      config[path] = { processes };
      api.setProcessesConfig(config);
      processesConfig.value = config;
      await refreshStatus();
    } finally {
      addingSuggested.value = false;
    }
  }

  async function refreshStatus() {
    try {
      const list = await api.getProcessStatus?.() ?? [];
      processStatus.value = list;
    } catch {
      processStatus.value = [];
    }
    if (expandedOutput.value) {
      const proc = processStatus.value.find(
        (p) => p.projectPath === projectPath.value && p.processId === expandedOutput.value
      );
      if (!proc || proc.status !== 'running') {
        if (outputPollTimer) clearInterval(outputPollTimer);
        outputPollTimer = null;
      }
    }
    const config = { ...processesConfig.value };
    for (const s of processStatus.value) {
      if (!config[s.projectPath]) config[s.projectPath] = { processes: [] };
      const procs = config[s.projectPath].processes || [];
      if (!procs.some((p) => (p.id != null ? String(p.id) : (p.name || '').trim()) === s.processId)) {
        procs.push({ id: s.processId, name: s.name, command: s.command });
        config[s.projectPath] = { processes: procs };
      }
    }
    processesConfig.value = config;
  }

  async function startAll() {
    const path = projectPath.value;
    if (!path || !api.startAllProcesses) return;
    startingAll.value = true;
    try {
      await api.startAllProcesses(path);
      await refreshStatus();
    } finally {
      startingAll.value = false;
    }
  }

  async function stopAll() {
    const path = projectPath.value;
    if (!path || !api.stopAllProcesses) return;
    stoppingAll.value = true;
    try {
      await api.stopAllProcesses(path);
      await refreshStatus();
    } finally {
      stoppingAll.value = false;
    }
  }

  async function startOne(proc) {
    if (!api.startProcess) return;
    startingSingle.value = proc.processId;
    try {
      await api.startProcess(proc.projectPath, proc.processId, proc.name, proc.command);
      await refreshStatus();
    } finally {
      startingSingle.value = null;
    }
  }

  async function stopOne(proc) {
    if (!api.stopProcess) return;
    stoppingSingle.value = proc.processId;
    try {
      await api.stopProcess(proc.projectPath, proc.processId);
      await refreshStatus();
    } finally {
      stoppingSingle.value = null;
    }
  }

  function fetchOutputForExpanded() {
    if (!expandedOutput.value) return;
    const proc = processesForProject.value.find((p) => p.processId === expandedOutput.value);
    if (!proc || proc.status !== 'running') return;
    const key = processKey(proc.projectPath, proc.processId);
    api.getProcessOutput?.(proc.projectPath, proc.processId, 100).then((r) => {
      outputCache.value = { ...outputCache.value, [key]: r?.lines || [] };
    });
  }

  function toggleOutput(proc) {
    if (expandedOutput.value === proc.processId) {
      expandedOutput.value = null;
      if (outputPollTimer) clearInterval(outputPollTimer);
      outputPollTimer = null;
      return;
    }
    expandedOutput.value = proc.processId;
    fetchOutputForExpanded();
    if (proc.status === 'running') {
      if (outputPollTimer) clearInterval(outputPollTimer);
      outputPollTimer = setInterval(fetchOutputForExpanded, 2000);
    }
  }

  function addProcess() {
    const path = projectPath.value;
    const name = (newProcess.value.name || '').trim();
    const command = (newProcess.value.command || '').trim();
    if (!path || !name || !command || !api.setProcessesConfig) return;
    const config = { ...processesConfig.value };
    const projectConfig = config[path] || { processes: [] };
    const processes = [...(projectConfig.processes || [])];
    const id = name.toLowerCase().replace(/\s+/g, '-') || `process-${processes.length}`;
    processes.push({ id, name, command });
    config[path] = { processes };
    api.setProcessesConfig(config);
    processesConfig.value = config;
    newProcess.value = { name: '', command: '' };
    showAddProcess.value = false;
    refreshStatus();
  }

  onMounted(async () => {
    await loadConfig();
    await refreshStatus();
    await loadSuggested();
    if (api.onProcessStatusChanged) api.onProcessStatusChanged(refreshStatus);
  });

  onUnmounted(() => {
    if (outputPollTimer) clearInterval(outputPollTimer);
  });

  watch(projectPath, () => {
    expandedOutput.value = null;
    outputCache.value = {};
    loadSuggested();
  });

  return {
    projectPath,
    processStatus,
    processesConfig,
    suggestedProcesses,
    addingSuggested,
    showAddProcess,
    startingAll,
    stoppingAll,
    startingSingle,
    stoppingSingle,
    expandedOutput,
    outputCache,
    newProcess,
    processesForProject,
    hasRunning,
    currentProcessIds,
    suggestedNotYetAdded,
    processKey,
    outputLines,
    loadConfig,
    loadSuggested,
    addSuggestedProcesses,
    refreshStatus,
    startAll,
    stopAll,
    startOne,
    stopOne,
    fetchOutputForExpanded,
    toggleOutput,
    addProcess,
  };
}
