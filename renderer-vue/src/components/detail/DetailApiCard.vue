<template>
  <section class="card mb-6 detail-tab-panel detail-api-card" data-detail-tab="api">
    <div class="card-section">
      <RmCardHeader>Project API & MCP</RmCardHeader>
      <p class="m-0 mb-4 text-sm text-rm-muted">
        Call Shipwell API methods for this project, and see how MCP tools would invoke them. This panel always
        uses the currently selected project path.
      </p>

      <div class="mb-4 text-xs text-rm-muted flex flex-wrap items-center gap-3">
        <span class="inline-flex items-center gap-1.5">
          <strong class="font-medium text-rm-text">Path</strong>
          <span class="font-mono break-all">{{ projectPath || '—' }}</span>
        </span>
        <span v-if="projectType" class="inline-flex items-center gap-1.5">
          <strong class="font-medium text-rm-text">Type</strong>
          <span class="font-mono">{{ projectType }}</span>
        </span>
      </div>

      <div class="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,4fr)] mb-6">
        <!-- Left: API request builder -->
        <div class="flex flex-col gap-3">
          <div>
            <label class="block text-xs font-medium text-rm-muted mb-1">API method</label>
              <RmSelect v-model="methodName" :options="methodOptions" option-label="label" option-value="value" class="text-xs" />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-medium text-rm-muted">Params (JSON array)</label>
              <div class="flex gap-2">
                <RmButton
                  variant="ghost"
                  size="compact"
                  class="text-[11px]"
                  title="Set params to [projectPath]"
                  @click="usePathOnly"
                >[path]</RmButton>
                <RmButton
                  variant="ghost"
                  size="compact"
                  class="text-[11px]"
                  title="Set params to [projectPath, projectType]"
                  @click="usePathAndType"
                >[path, type]</RmButton>
              </div>
            </div>
            <RmTextarea
              v-model="paramsText"
              class="font-mono text-xs min-h-[96px]"
              spellcheck="false"
            />
            <p v-if="presetStatus" class="m-0 mt-1 text-[11px] text-rm-accent">{{ presetStatus }}</p>
          </div>

          <div class="flex items-center gap-2 mt-1">
            <RmButton
              variant="primary"
              size="compact"
              class="text-xs"
              :disabled="busy || !projectPath"
              title="Call the selected API method for this project"
              @click="callApi"
            >
              {{ busy ? 'Calling…' : 'Call API' }}
            </RmButton>
            <span v-if="error" class="text-xs text-rm-warning truncate" :title="error">{{ error }}</span>
          </div>
        </div>

        <!-- Right: Response viewer -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-medium text-rm-muted">Response</span>
            <RmButton
              variant="secondary"
              size="compact"
              class="text-[11px]"
              :disabled="!formattedResponse"
              title="Copy response JSON to clipboard"
              @click="copyResponse"
            >
              Copy
            </RmButton>
          </div>
          <pre
            class="detail-api-output m-0 p-3 rounded-rm bg-rm-surface text-xs font-mono text-rm-text min-h-[8rem] border border-rm-border whitespace-pre-wrap break-words"
          >{{ formattedResponse }}</pre>
        </div>
      </div>

      <div class="card-section mt-4 border-t border-rm-border pt-4">
        <RmCardHeader class="block mb-2">MCP tool preview (per project)</RmCardHeader>
        <p class="m-0 mb-3 text-xs text-rm-muted">
          This shows how an MCP client (like Cursor) would call the
          <code class="bg-rm-surface px-1 rounded text-[10px]">release_manager_call</code>
          tool for this project. You can copy this snippet into an MCP playground or client config; it will resolve to
          the same API call as above.
        </p>
        <pre
          class="m-0 p-3 rounded-rm bg-rm-surface text-[11px] font-mono text-rm-text border border-rm-border whitespace-pre-wrap break-words"
        >{{ mcpSnippet }}</pre>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { RmButton, RmCardHeader, RmSelect, RmTextarea } from '../ui';
import { useAppStore } from '../../stores/app';
import { useApi } from '../../composables/useApi';
import * as debug from '../../utils/debug';

const store = useAppStore();
const api = useApi();

const methodOptions = [
  { value: 'getProjectInfo', label: 'getProjectInfo (project overview)' },
  { value: 'getGitStatus', label: 'getGitStatus (git clean / dirty)' },
  { value: 'runProjectTests', label: 'runProjectTests (test script)' },
  { value: 'runProjectCoverage', label: 'runProjectCoverage (coverage script)' },
  { value: 'release', label: 'release (bump & release)' },
  { value: 'invokeApi', label: 'invokeApi (raw call)' },
];
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
    // Raw invokeApi: first element is method name, remaining elements are params
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

watch(methodName, () => {
  setDefaultParams();
});

watch(
  projectPath,
  () => {
    setDefaultParams();
  },
  { immediate: true }
);

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
    // Replace escaped \n sequences so multi-line output is readable in the pre block.
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
    args: {
      method: mcpMethod,
      params: mcpParams,
    },
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
</script>

