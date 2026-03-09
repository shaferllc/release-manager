import { computed, ref, watch } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';
import * as debug from '../utils/debug';

const METHOD_OPTIONS = [
  { value: 'getProjectInfo', label: 'getProjectInfo (project overview)' },
  { value: 'getGitStatus', label: 'getGitStatus (git clean / dirty)' },
  { value: 'runProjectTests', label: 'runProjectTests (test script)' },
  { value: 'runProjectCoverage', label: 'runProjectCoverage (coverage script)' },
  { value: 'release', label: 'release (bump & release)' },
  { value: 'invokeApi', label: 'invokeApi (raw call)' },
];

/**
 * Composable for the detail API playground: select method, edit params, call API, view response and MCP snippet.
 * @returns {Object} methodOptions, methodName, paramsText, busy, error, rawResponse, presetStatus, projectPath, projectType, formattedResponse, mcpSnippet, usePathOnly, usePathAndType, callApi, copyResponse
 */
export function useDetailApi() {
  const store = useAppStore();
  const api = useApi();

  const methodName = ref('getProjectInfo');
  const paramsText = ref('');
  const busy = ref(false);
  const error = ref('');
  const rawResponse = ref(null);
  const presetStatus = ref('');

  const projectPath = computed(() => store.selectedPath || store.selectedProject?.path || '');
  const projectType = computed(() => (store.selectedProject?.type || '').toLowerCase());

  function setDefaultParams() {
    if (!projectPath.value) {
      paramsText.value = '[]';
      return;
    }
    if (methodName.value === 'invokeApi') {
      paramsText.value = JSON.stringify(['getProjectInfo', projectPath.value], null, 2);
    } else if (methodName.value === 'getProjectInfo' || methodName.value === 'getGitStatus') {
      paramsText.value = JSON.stringify([projectPath.value], null, 2);
    } else if (methodName.value === 'runProjectTests' || methodName.value === 'runProjectCoverage') {
      paramsText.value = JSON.stringify([projectPath.value, projectType.value || 'npm'], null, 2);
    } else if (methodName.value === 'release') {
      paramsText.value = JSON.stringify([projectPath.value, 'patch', false, {}], null, 2);
    } else {
      paramsText.value = JSON.stringify([projectPath.value], null, 2);
    }
  }

  watch(methodName, setDefaultParams);
  watch(projectPath, setDefaultParams, { immediate: true });

  function usePathOnly() {
    if (!projectPath.value) return;
    paramsText.value = JSON.stringify([projectPath.value], null, 2);
    showPresetStatus('Params set to [path]');
  }

  function usePathAndType() {
    if (!projectPath.value) return;
    paramsText.value = JSON.stringify([projectPath.value, projectType.value || 'npm'], null, 2);
    showPresetStatus('Params set to [path, type]');
  }

  function showPresetStatus(message) {
    presetStatus.value = message;
    setTimeout(() => {
      if (presetStatus.value === message) presetStatus.value = '';
    }, 1500);
  }

  async function callApi() {
    error.value = '';
    rawResponse.value = null;
    if (!projectPath.value) {
      error.value = 'Select a project first.';
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(paramsText.value || '[]');
      if (!Array.isArray(parsed)) throw new Error('Params must be a JSON array');
    } catch (e) {
      error.value = e?.message || 'Invalid JSON in params.';
      return;
    }

    busy.value = true;
    try {
      debug.log('api', 'detailApi.call', { method: methodName.value, params: parsed });
      let res;
      if (methodName.value === 'invokeApi') {
        const innerMethod = typeof parsed[0] === 'string' ? parsed[0] : '';
        const innerParams = Array.isArray(parsed[1]) ? parsed[1] : parsed.slice(1) || [];
        res = await api.invokeApi?.(innerMethod, innerParams);
      } else {
        res = await api.invokeApi?.(methodName.value, parsed);
      }
      rawResponse.value = res ?? null;
    } catch (e) {
      error.value = e?.message || 'Call failed.';
    } finally {
      busy.value = false;
    }
  }

  const formattedResponse = computed(() => {
    if (!rawResponse.value) return '';
    try {
      return JSON.stringify(rawResponse.value, null, 2).replace(/\\n/g, '\n');
    } catch (_) {
      return String(rawResponse.value);
    }
  });

  const mcpSnippet = computed(() => {
    let params = [];
    try {
      params = JSON.parse(paramsText.value || '[]');
      if (!Array.isArray(params)) params = [];
    } catch (_) {
      params = [];
    }
    let mcpMethod = methodName.value;
    let mcpParams = params;
    if (methodName.value === 'invokeApi' && params.length) {
      mcpMethod = typeof params[0] === 'string' ? params[0] : '';
      mcpParams = Array.isArray(params[1]) ? params[1] : params.slice(1);
    }
    const body = {
      tool: 'release_manager_call',
      args: { method: mcpMethod, params: mcpParams },
    };
    try {
      return JSON.stringify(body, null, 2);
    } catch (_) {
      return String(body);
    }
  });

  async function copyResponse() {
    if (!formattedResponse.value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(formattedResponse.value);
      }
    } catch (_) {}
  }

  return {
    methodOptions: METHOD_OPTIONS,
    methodName,
    paramsText,
    busy,
    error,
    rawResponse,
    presetStatus,
    projectPath,
    projectType,
    formattedResponse,
    mcpSnippet,
    usePathOnly,
    usePathAndType,
    callApi,
    copyResponse,
  };
}
