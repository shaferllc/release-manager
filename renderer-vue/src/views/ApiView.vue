<template>
  <div class="api-view flex-1 overflow-auto">
    <div class="api-view-inner w-full max-w-5xl mx-auto py-8 px-6">
      <header class="mb-8">
        <h2 class="text-2xl font-semibold text-rm-text tracking-tight m-0 mb-2">API</h2>
        <p class="text-sm text-rm-muted m-0 max-w-2xl">
          Control Shipwell over HTTP. Enable the server, then send <strong>POST /api</strong> with JSON body. Browse methods by category or search by name or intent.
        </p>
        <div class="mt-4 p-4 rounded-rm bg-rm-surface/60 border border-rm-border text-xs text-rm-muted max-w-2xl">
          <span class="font-medium text-rm-text">Request:</span> <code class="bg-rm-bg/80 px-1 rounded">{ "method": "methodName", "params": [] }</code><br />
          <span class="font-medium text-rm-text">Response:</span> <code class="bg-rm-bg/80 px-1 rounded">{ "ok": true, "result": ... }</code> or <code class="bg-rm-bg/80 px-1 rounded">{ "ok": false, "error": "..." }</code>
        </div>
      </header>

      <section class="card mb-6">
        <div class="card-section">
          <RmCardHeader>API server</RmCardHeader>
          <div class="api-server-row flex flex-wrap items-center gap-6">
            <RmCheckbox v-model="enabled" label="Enable API server" class="text-sm font-medium" @change="onToggleEnabled" />
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-rm-muted">Port</label>
              <RmInput v-model.number="port" type="number" min="1" max="65535" class="w-20 text-center" @blur="onPortBlur" />
            </div>
            <RmStatusPill v-if="status.running" variant="accent">Running</RmStatusPill>
          </div>
          <div v-if="status.running" class="mt-4 flex flex-wrap items-center gap-2">
            <label class="text-xs font-medium text-rm-muted">Base URL</label>
            <pre class="api-url-block m-0 flex-1 min-w-0 p-3 rounded-rm bg-rm-bg text-sm text-rm-text overflow-x-auto">{{ baseUrl }}</pre>
            <RmButton variant="secondary" size="compact" class="text-xs shrink-0" @click="copyBaseUrl">Copy</RmButton>
          </div>
          <p v-else class="m-0 mt-4 text-sm text-rm-muted">Server is stopped. Enable it to get a base URL.</p>
          <p v-if="copyStatus" class="m-0 mt-2 text-xs font-medium text-rm-accent">{{ copyStatus }}</p>
        </div>
      </section>

      <section class="card mb-6">
        <div class="card-section">
          <RmCardHeader>MCP server</RmCardHeader>
          <p class="m-0 mb-4 text-sm text-rm-muted">
            Start or stop the Model Context Protocol server used by Cursor and other MCP clients. When running from source, you can start it here or open a terminal and run <code class="bg-rm-surface px-1 rounded text-xs">npm run mcp</code>.
          </p>
          <div class="flex flex-wrap items-center gap-4 mb-3">
            <span
              class="text-xs font-medium px-2.5 py-1 rounded-full border"
              :class="mcpStatus.running ? 'bg-rm-accent/15 text-rm-accent border-rm-accent/30' : 'bg-rm-surface/50 text-rm-muted border-rm-border'"
            >
              {{ mcpStatus.running ? `Running (PID ${mcpStatus.pid ?? '?'})` : 'Not running' }}
            </span>
            <RmButton
              variant="primary"
              size="compact"
              class="text-xs"
              :disabled="mcpStatus.running || mcpBusy"
              @click="startMcp"
            >
              {{ mcpBusy ? 'Starting…' : 'Start' }}
            </RmButton>
            <RmButton
              variant="secondary"
              size="compact"
              class="text-xs"
              :disabled="!mcpStatus.running || mcpBusy"
              @click="stopMcp"
            >
              Stop
            </RmButton>
            <RmButton
              variant="secondary"
              size="compact"
              class="text-xs"
              :disabled="!appPath"
              title="Open terminal at app folder; run npm run mcp there"
              @click="openTerminalForMcp"
            >
              Open in Terminal
            </RmButton>
          </div>
          <p v-if="mcpError" class="m-0 text-xs text-rm-warning">{{ mcpError }}</p>
          <p v-if="appPath" class="m-0 text-xs text-rm-muted">
            App path: <code class="bg-rm-surface px-1 rounded text-[11px] break-all">{{ appPath }}</code>
          </p>
        </div>
      </section>

      <section class="card mb-6">
        <div class="card-section">
          <RmCardHeader>API Tester</RmCardHeader>
          <p class="m-0 mb-5 text-sm text-rm-muted">Select a method, set parameters, and send a request. Works via the app; enable the API server above to test over HTTP.</p>
          <div class="tester-row mb-4">
            <label class="text-xs font-medium text-rm-muted shrink-0">Method</label>
            <RmSelect v-model="selectedMethod" :options="methodOptions" option-label="label" option-value="value" class="flex-1 min-w-0 max-w-md" />
          </div>
          <div v-if="selectedDoc && selectedDoc.params && selectedDoc.params.length" class="tester-params mb-4 space-y-3">
            <h4 class="api-doc-section-title m-0">Parameters</h4>
            <div v-for="p in selectedDoc.params" :key="p.name" class="tester-param flex flex-col gap-1 sm:flex-row sm:items-center">
              <label class="sm:w-40 font-mono text-xs font-medium text-rm-text shrink-0">{{ p.name }}</label>
              <template v-if="isJsonParam(p)">
                <RmTextarea
                  v-model="builderParamValues[p.name]"
                  class="flex-1 font-mono text-xs min-h-[3.5rem]"
                  :placeholder="jsonPlaceholder(p)"
                  spellcheck="false"
                />
              </template>
              <template v-else-if="p.type === 'boolean'">
                <RmCheckbox v-model="builderParamValues[p.name]" :true-value="'true'" :false-value="'false'" :label="builderParamValues[p.name] === 'true' ? 'true' : 'false'" class="text-sm text-rm-muted" />
              </template>
              <template v-else-if="p.type === 'number'">
                <RmInput v-model="builderParamValues[p.name]" type="number" class="flex-1 max-w-xs" />
              </template>
              <template v-else>
                <RmInput v-model="builderParamValues[p.name]" type="text" class="flex-1" :placeholder="defaultPlaceholder(p)" />
              </template>
              <span v-if="p.description" class="sm:col-span-2 text-xs text-rm-muted mt-0.5 sm:mt-0 sm:ml-2">{{ p.description }}</span>
            </div>
          </div>
          <details class="tester-request mb-4 rounded-rm border border-rm-border overflow-hidden">
            <summary class="api-doc-section-title cursor-pointer px-3 py-2 bg-rm-surface/60 hover:bg-rm-surface">Request body</summary>
            <pre class="api-code-block m-0 p-4 bg-rm-bg text-xs overflow-x-auto">{{ requestBodyPreview || '{}' }}</pre>
          </details>
          <div class="flex flex-wrap items-center gap-2 mb-4">
            <RmButton
              variant="primary"
              size="compact"
              class="text-sm"
              :disabled="!selectedMethod || sending"
              @click="sendRequest"
            >
              {{ sending ? 'Sending…' : 'Send request' }}
            </RmButton>
            <RmButton variant="secondary" size="compact" class="text-sm" @click="fillSampleParams" :disabled="!selectedDoc">Fill sample</RmButton>
          </div>
          <div v-if="lastResponse !== null" class="tester-response rounded-rm border border-rm-border overflow-hidden">
            <div class="flex flex-wrap items-center gap-3 px-3 py-2.5 bg-rm-surface/60 border-b border-rm-border">
              <span class="text-xs font-semibold uppercase tracking-wide" :class="lastResponse.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                {{ responseStatusLabel }}
              </span>
              <span v-if="lastResponse.duration !== undefined" class="text-xs text-rm-muted">{{ lastResponse.duration }} ms</span>
              <span v-if="lastResponse.via" class="text-xs text-rm-muted">{{ lastResponse.via }}</span>
              <RmButton variant="secondary" size="compact" class="text-xs ml-auto" @click="copyResponse">Copy response</RmButton>
            </div>
            <pre class="api-code-block m-0 p-4 text-xs overflow-x-auto max-h-80 overflow-y-auto">{{ responseBodyDisplay }}</pre>
          </div>
        </div>
      </section>

      <section class="card mb-6">
        <div class="card-section">
          <RmCardHeader>Method documentation</RmCardHeader>
          <p class="m-0 mb-4 text-sm text-rm-muted">Pick a category or search, then click a method for full docs and a copy-paste example.</p>
          <div class="api-filters flex flex-wrap items-center gap-4 mb-4">
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-rm-muted shrink-0">Category</label>
              <RmSelect v-model="selectedCategory" :options="selectedCategoryOptions" option-label="label" option-value="value" class="api-select min-w-[12rem]" />
            </div>
            <div class="flex items-center gap-2 flex-1 min-w-[10rem]">
              <label class="text-xs font-medium text-rm-muted shrink-0">Search</label>
              <RmInput
                v-model="methodFilter"
                type="text"
                class="flex-1"
                placeholder="e.g. branch, release, commit, tag, composer, test"
                autocomplete="off"
              />
            </div>
          </div>
          <div class="api-methods-layout flex flex-col lg:flex-row gap-6">
            <div class="api-methods-list flex-shrink-0 lg:w-72">
              <div class="api-method-pills flex flex-wrap gap-1.5">
                <button
                  v-for="doc in filteredDocs"
                  :key="doc.name"
                  type="button"
                  class="api-method-pill text-xs font-medium px-2.5 py-1.5 rounded-rm border transition-colors text-left"
                  :class="selectedMethod === doc.name ? 'api-method-pill-active' : 'api-method-pill-inactive'"
                  @click="selectMethod(doc.name)"
                >
                  {{ doc.name }}
                </button>
              </div>
              <p v-if="filteredDocs.length === 0" class="m-0 mt-2 text-sm text-rm-muted">No methods match the filter.</p>
            </div>
            <div class="api-doc-detail flex-1 min-w-0">
              <div v-if="selectedDoc" class="api-doc-panel p-5 rounded-rm bg-rm-surface border border-rm-border space-y-4">
                <h3 class="api-doc-name m-0 text-base font-semibold text-rm-text">{{ selectedDoc.name }}</h3>
                <p class="m-0 text-sm text-rm-muted leading-relaxed">{{ selectedDoc.description }}</p>
                <div v-if="selectedDoc.params && selectedDoc.params.length" class="api-doc-section">
                  <h4 class="api-doc-section-title">Parameters</h4>
                  <dl class="m-0 space-y-2">
                    <div v-for="p in selectedDoc.params" :key="p.name" class="flex flex-wrap gap-x-2 gap-y-0.5">
                      <dt class="font-mono text-xs font-medium text-rm-text">{{ p.name }}</dt>
                      <dd class="m-0 text-sm text-rm-muted">
                        <span v-if="p.type" class="text-rm-muted/80">({{ p.type }})</span>
                        <span v-if="p.description"> — {{ p.description }}</span>
                      </dd>
                    </div>
                  </dl>
                </div>
                <div v-if="selectedDoc.returns" class="api-doc-section">
                  <h4 class="api-doc-section-title">Returns</h4>
                  <p class="m-0 text-sm text-rm-muted leading-relaxed">{{ selectedDoc.returns }}</p>
                </div>
                <div v-if="selectedDoc.sampleResponse" class="api-doc-section">
                  <h4 class="api-doc-section-title">Sample response</h4>
                  <pre class="api-code-block m-0 mt-1 p-4 rounded-rm bg-rm-bg text-xs text-rm-text overflow-x-auto">{{ selectedDoc.sampleResponse }}</pre>
                  <div class="flex flex-wrap items-center gap-2 mt-2">
                    <RmButton variant="secondary" size="compact" class="text-xs" @click="copySampleResponse(selectedDoc.sampleResponse)">Copy JSON</RmButton>
                    <RmButton
                      variant="secondary"
                      size="compact"
                      class="text-xs"
                      :disabled="!baseUrl || sampleLoading"
                      @click="trySample(selectedDoc.name)"
                    >
                      {{ sampleLoading ? 'Calling…' : 'Try sample' }}
                    </RmButton>
                  </div>
                  <div v-if="sampleResult !== null" class="mt-3">
                    <h5 class="api-doc-section-title m-0 mb-1">Live response</h5>
                    <pre class="api-code-block m-0 p-4 rounded-rm bg-rm-bg text-xs text-rm-text overflow-x-auto">{{ sampleResult }}</pre>
                  </div>
                </div>
                <div class="api-doc-section pt-4 border-t border-rm-border">
                  <h4 class="api-doc-section-title">Example</h4>
                  <pre class="api-code-block m-0 mt-1 p-4 rounded-rm bg-rm-bg text-xs text-rm-text overflow-x-auto">{{ exampleForMethod(selectedDoc.name) }}</pre>
                  <RmButton variant="secondary" size="compact" class="text-xs mt-2" @click="copyExample(selectedDoc.name)">Copy curl</RmButton>
                </div>
              </div>
              <p v-else-if="selectedMethod && !selectedDoc" class="m-0 text-sm text-rm-muted">No documentation for this method.</p>
              <p v-else class="m-0 text-sm text-rm-muted">Select a method to see its documentation and example.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { RmButton, RmCardHeader, RmCheckbox, RmInput, RmSelect, RmStatusPill, RmTextarea } from '../components/ui';
import { useApi } from '../composables/useApi';

const api = useApi();
const status = ref({ running: false, port: 3847, enabled: false });
const enabled = ref(false);
const port = ref(3847);
const docs = ref([]);
const selectedCategory = ref('');
const methodFilter = ref('');
const selectedMethod = ref(null);
const copyStatus = ref('');
const sampleLoading = ref(false);
const sampleResult = ref(null);
const builderParamValues = ref({});
const sending = ref(false);
const lastResponse = ref(null);
const mcpStatus = ref({ running: false, pid: undefined });
const mcpBusy = ref(false);
const mcpError = ref('');
const appPath = ref('');

const baseUrl = computed(() => {
  if (!status.value.running || !status.value.port) return '';
  return `http://127.0.0.1:${status.value.port}/api`;
});

const categoryOptions = computed(() => {
  const cats = new Set();
  docs.value.forEach((d) => {
    if (d.category) cats.add(d.category);
  });
  return Array.from(cats).sort();
});

const filteredDocs = computed(() => {
  let list = docs.value;
  const category = selectedCategory.value;
  if (category) list = list.filter((d) => d.category === category);
  const q = (methodFilter.value || '').trim().toLowerCase();
  if (!q) return list;
  return list.filter((d) => d.name.toLowerCase().includes(q) || (d.description && d.description.toLowerCase().includes(q)) || (d.category && d.category.toLowerCase().includes(q)));
});

const methodOptions = computed(() => [
  { value: '', label: '— Select method —' },
  ...filteredDocs.value.map((d) => ({ value: d.name, label: d.name })),
]);
const selectedCategoryOptions = computed(() => [
  { value: '', label: 'All categories' },
  ...categoryOptions.value.map((c) => ({ value: c, label: c })),
]);

const selectedDoc = computed(() => {
  const name = selectedMethod.value;
  if (!name) return null;
  return docs.value.find((d) => d.name === name) || null;
});

const requestBodyPreview = computed(() => {
  const method = selectedMethod.value;
  if (!method) return '';
  const params = buildParamsArray();
  return JSON.stringify({ method, params }, null, 2);
});

const responseStatusLabel = computed(() => {
  const r = lastResponse.value;
  if (!r) return '';
  if (r.status === 0) return 'Connection failed';
  return `${r.status} ${r.ok ? 'OK' : 'Error'}`;
});

const responseBodyDisplay = computed(() => {
  const r = lastResponse.value;
  if (!r || r.body == null) return '';
  const body = r.body;
  if (typeof body !== 'string') {
    try {
      return JSON.stringify(body, null, 2);
    } catch {
      return String(body);
    }
  }
  // Turn escaped \n sequences into real newlines so multi-line output is readable.
  return body.replace(/\\n/g, '\n');
});

const exampleCurl = computed(() => {
  const url = baseUrl.value || 'http://127.0.0.1:3847/api';
  return `curl -X POST ${url} \\
  -H "Content-Type: application/json" \\
  -d '{"method":"getProjects","params":[]}'`;
});

async function loadMcpStatus() {
  try {
    const s = await api.getMcpServerStatus?.();
    if (s) mcpStatus.value = { running: !!s.running, pid: s.pid };
  } catch (_) {}
}
async function loadAppPath() {
  try {
    const p = await api.getAppPath?.();
    appPath.value = p || '';
  } catch (_) {}
}
async function startMcp() {
  mcpError.value = '';
  mcpBusy.value = true;
  try {
    const r = await api.startMcpServer?.();
    if (r?.ok) await loadMcpStatus();
    else mcpError.value = r?.error || 'Failed to start';
  } catch (e) {
    mcpError.value = e?.message || 'Failed to start';
  } finally {
    mcpBusy.value = false;
  }
}
async function stopMcp() {
  mcpError.value = '';
  mcpBusy.value = true;
  try {
    await api.stopMcpServer?.();
    await loadMcpStatus();
  } catch (e) {
    mcpError.value = e?.message || 'Failed to stop';
  } finally {
    mcpBusy.value = false;
  }
}
function openTerminalForMcp() {
  const p = appPath.value;
  if (p && api.openInTerminal) api.openInTerminal(p);
}

async function loadStatus() {
  try {
    const s = await api.getApiServerStatus?.();
    if (s) {
      status.value = s;
      enabled.value = !!s.enabled;
      port.value = s.port || 3847;
    }
  } catch (_) {}
}

async function loadDocs() {
  try {
    const list = await api.getApiDocs?.();
    docs.value = Array.isArray(list) ? list : [];
  } catch (_) {
    docs.value = [];
  }
}

function onToggleEnabled() {
  api.setApiServerEnabled?.(enabled.value).then(() => loadStatus());
}

function onPortBlur() {
  const p = Number(port.value);
  if (!Number.isFinite(p) || p < 1 || p > 65535) return;
  api.setApiServerPort?.(p).then(() => loadStatus());
}

function selectMethod(m) {
  selectedMethod.value = m;
  sampleResult.value = null;
  syncBuilderParams();
}

function syncBuilderParams() {
  const doc = selectedDoc.value;
  const next = {};
  if (doc && doc.params) {
    doc.params.forEach((p, i) => {
      const def = getDefaultParamValueString(p, i);
      next[p.name] = builderParamValues.value[p.name] !== undefined && builderParamValues.value[p.name] !== '' ? builderParamValues.value[p.name] : def;
    });
  }
  builderParamValues.value = next;
}

function getDefaultParamValueString(p, index) {
  const name = (p && p.name) || '';
  const type = (p && p.type) || '';
  if (name === 'dirPath' || name === 'targetPath') return '/path/to/project';
  if (name === 'filePath' || name === 'relativePath') return '/path/to/file';
  if (name === 'branchName' || name === 'newBranchName' || name === 'oldName' || name === 'newName') return 'main';
  if (name === 'tagName' || name === 'sinceTag' || name === 'ref' || name === 'fromRef') return 'v1.0.0';
  if (name === 'sha') return 'abc1234';
  if (name === 'gitRemote') return 'https://github.com/owner/repo';
  if (name === 'url') return 'https://example.com';
  if (name === 'methodName') return 'getProjects';
  if (type === 'number') return '0';
  if (type === 'boolean') return 'false';
  if (type === 'Array' || name === 'packageNames' || name === 'projects' || name === 'commits') return '[]';
  if (type === 'object' || name === 'options') return '{}';
  return '';
}

function isJsonParam(p) {
  const t = (p && p.type) || '';
  const n = (p && p.name) || '';
  return t === 'Array' || t === 'object' || ['projects', 'packageNames', 'options', 'commits'].includes(n);
}

function jsonPlaceholder(p) {
  const t = (p && p.type) || '';
  const n = (p && p.name) || '';
  if (t === 'object' || n === 'options') return '{}';
  return '[]';
}

function defaultPlaceholder(p) {
  return getDefaultParamValueString(p);
}

function buildParamsArray() {
  const doc = selectedDoc.value;
  if (!doc || !doc.params || !doc.params.length) return [];
  return doc.params.map((p) => {
    const raw = builderParamValues.value[p.name];
    const type = (p.type || '').toLowerCase();
    if (type === 'number') return raw === '' ? 0 : Number(raw);
    if (type === 'boolean') return raw === 'true';
    if (isJsonParam(p)) {
      try {
        return raw?.trim() ? JSON.parse(raw) : (type === 'object' || p.name === 'options' ? {} : []);
      } catch {
        return type === 'object' || p.name === 'options' ? {} : [];
      }
    }
    return raw == null ? '' : String(raw);
  });
}

async function sendRequest() {
  const method = selectedMethod.value;
  if (!method) return;
  const params = buildParamsArray();
  sending.value = true;
  lastResponse.value = null;
  const start = performance.now();

  if (typeof api.invokeApi === 'function') {
    try {
      const result = await api.invokeApi(method, params);
      const duration = Math.round(performance.now() - start);
      lastResponse.value = {
        status: 200,
        ok: true,
        duration,
        via: 'Via app',
        body: JSON.stringify({ ok: true, result }, null, 2),
      };
    } catch (e) {
      const message = e && (e.message || (e.toString && e.toString())) || 'Unknown error';
      lastResponse.value = {
        status: 200,
        ok: false,
        duration: Math.round(performance.now() - start),
        via: 'Via app',
        body: JSON.stringify({ ok: false, error: message }, null, 2),
      };
    } finally {
      sending.value = false;
    }
    return;
  }

  const url = baseUrl.value;
  if (!url) {
    lastResponse.value = { status: 0, ok: false, body: 'Enable the API server above to test over HTTP.', via: null };
    sending.value = false;
    return;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, params }),
    });
    const duration = Math.round(performance.now() - start);
    let bodyText;
    try {
      const data = await res.json();
      bodyText = JSON.stringify(data, null, 2);
    } catch {
      bodyText = await res.text();
    }
    lastResponse.value = { status: res.status, ok: res.ok, duration, via: 'Via HTTP', body: bodyText };
  } catch (e) {
    lastResponse.value = {
      status: 0,
      ok: false,
      body: (e && (e.message || String(e))) || 'Request failed. Check that the API server is enabled and running.',
      via: null,
    };
  } finally {
    sending.value = false;
  }
}

function fillSampleParams() {
  syncBuilderParams();
}

function copyResponse() {
  if (lastResponse.value && lastResponse.value.body) copyToClipboard(lastResponse.value.body, 'Response');
}

async function trySample(methodName) {
  const url = baseUrl.value;
  if (!url) return;
  sampleLoading.value = true;
  sampleResult.value = null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'getSampleResponse', params: [methodName] }),
    });
    const data = await res.json();
    sampleResult.value = JSON.stringify(data, null, 2);
  } catch (e) {
    sampleResult.value = e && (e.message || String(e)) || 'Request failed';
  } finally {
    sampleLoading.value = false;
  }
}

function exampleParamsForMethod(m) {
  const doc = docs.value.find((d) => d.name === m);
  if (doc && doc.params && doc.params.length > 0) {
    const placeholders = doc.params.map((p) => {
      if (p.name === 'dirPath' || p.name === 'targetPath') return '"/path/to/project"';
      if (p.name === 'filePath' || p.name === 'relativePath') return '"/path/to/file"';
      if (p.name === 'branchName' || p.name === 'newBranchName' || p.name === 'oldName' || p.name === 'newName') return '"main"';
      if (p.name === 'tagName' || p.name === 'sinceTag' || p.name === 'ref' || p.name === 'fromRef') return '"v1.0.0"';
      if (p.name === 'sha') return '"abc1234"';
      if (p.name === 'gitRemote') return '"https://github.com/owner/repo"';
      if (p.name === 'url') return '"https://example.com"';
      if (p.type === 'number') return '0';
      if (p.type === 'boolean') return 'false';
      if (p.type === 'Array' || p.name === 'packageNames' || p.name === 'projects') return '[]';
      return '""';
    });
    return JSON.stringify(placeholders);
  }
  return '[]';
}

function exampleForMethod(m) {
  const url = baseUrl.value || 'http://127.0.0.1:3847/api';
  const params = exampleParamsForMethod(m);
  return `curl -X POST ${url} -H "Content-Type: application/json" -d '{"method":"${m}","params":${params}}'`;
}

function copyBaseUrl() {
  if (!baseUrl.value) return;
  copyToClipboard(baseUrl.value, 'URL');
}

function copyCurl() {
  copyToClipboard(exampleCurl.value, 'curl');
}

function copyExample(m) {
  copyToClipboard(exampleForMethod(m), 'example');
}

function copySampleResponse(json) {
  copyToClipboard(json, 'JSON');
}

function copyToClipboard(text, label) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      copyStatus.value = `${label} copied`;
      setTimeout(() => { copyStatus.value = ''; }, 2000);
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    copyStatus.value = `${label} copied`;
    setTimeout(() => { copyStatus.value = ''; }, 2000);
  }
}

onMounted(() => {
  loadStatus();
  loadDocs();
  loadMcpStatus();
  loadAppPath();
});

watch(enabled, () => loadStatus());
watch(port, () => loadStatus());
watch(selectedMethod, () => syncBuilderParams());
</script>

<style scoped>
.api-view-inner {
  box-sizing: border-box;
}
.api-code-block {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  line-height: 1.5;
  word-break: break-all;
  white-space: pre-wrap;
}
.api-url-block {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  line-height: 1.4;
}
.api-method-pill {
  max-width: 100%;
}
.api-method-pill-inactive {
  background: rgb(var(--rm-surface));
  border-color: rgb(var(--rm-border));
  color: rgb(var(--rm-text));
}
.api-method-pill-inactive:hover {
  background: rgb(var(--rm-surface-hover));
}
.api-method-pill-active {
  background: rgb(var(--rm-accent) / 0.15);
  border-color: rgb(var(--rm-accent) / 0.5);
  color: rgb(var(--rm-accent));
}
.api-doc-section-title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgb(var(--rm-muted));
  margin: 0 0 0.5rem 0;
}
.api-doc-name {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
}
.api-methods-list {
  max-height: 24rem;
  overflow-y: auto;
}
.tester-param label:first-child {
  word-break: break-all;
}
.tester-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.tester-request summary {
  list-style: none;
}
.tester-request summary::-webkit-details-marker {
  display: none;
}
@media (min-width: 1024px) {
  .api-methods-layout {
    align-items: flex-start;
  }
}
</style>
