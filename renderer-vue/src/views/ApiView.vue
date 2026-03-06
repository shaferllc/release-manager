<template>
  <Card class="api-view detail-tab-panel flex-1 flex flex-col min-h-0 overflow-auto">
    <template #content>
    <div class="api-view-inner w-full max-w-5xl mx-auto py-6 px-6">
      <Toolbar class="extension-toolbar">
        <template #start>
          <p class="text-sm text-rm-muted m-0">
            Control Shipwell over HTTP. Enable the server, then send <strong>POST /api</strong> with JSON body. Browse methods by category or search by name or intent.
          </p>
        </template>
      </Toolbar>
      <div class="mb-6 p-4 rounded-rm bg-rm-surface/60 border border-rm-border text-xs text-rm-muted max-w-2xl">
        <span class="font-medium text-rm-text">Request:</span> <code class="bg-rm-bg/80 px-1 rounded">{ "method": "methodName", "params": [] }</code><br />
        <span class="font-medium text-rm-text">Response:</span> <code class="bg-rm-bg/80 px-1 rounded">{ "ok": true, "result": ... }</code> or <code class="bg-rm-bg/80 px-1 rounded">{ "ok": false, "error": "..." }</code>
      </div>

      <Panel class="mb-4">
        <template #header>
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">API server</h3>
        </template>
          <div class="card-section pt-0">
          <div class="api-server-row flex flex-wrap items-center gap-6">
            <label class="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <Checkbox v-model="enabled" binary @update:model-value="onToggleEnabled" />
              Enable API server
            </label>
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-rm-muted">Port</label>
              <InputText v-model.number="port" type="number" min="1" max="65535" class="w-20 text-center" @blur="onPortBlur" />
            </div>
            <Tag v-if="status.running" severity="info">Running</Tag>
          </div>
          <div v-if="status.running" class="mt-4 flex flex-wrap items-center gap-2">
            <label class="text-xs font-medium text-rm-muted">Base URL</label>
            <pre class="api-url-block m-0 flex-1 min-w-0 p-3 rounded-rm bg-rm-bg text-sm text-rm-text overflow-x-auto">{{ baseUrl }}</pre>
            <Button severity="secondary" size="small" class="text-xs shrink-0" @click="copyBaseUrl">Copy</Button>
          </div>
          <p v-else class="m-0 mt-4 text-sm text-rm-muted">Server is stopped. Enable it to get a base URL.</p>
          <p v-if="copyStatus" class="m-0 mt-2 text-xs font-medium text-rm-accent">{{ copyStatus }}</p>
        </div>
      </Panel>

      <Panel class="mb-4">
        <template #header>
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">MCP server</h3>
        </template>
          <div class="card-section pt-0">
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
            <Button
              severity="primary"
              size="small"
              class="text-xs"
              :disabled="mcpStatus.running || mcpBusy"
              @click="startMcp"
            >
              {{ mcpBusy ? 'Starting…' : 'Start' }}
            </Button>
            <Button
              severity="secondary"
              size="small"
              class="text-xs"
              :disabled="!mcpStatus.running || mcpBusy"
              @click="stopMcp"
            >
              Stop
            </Button>
            <Button
              severity="secondary"
              size="small"
              class="text-xs"
              :disabled="!appPath"
              title="Open terminal at app folder; run npm run mcp there"
              @click="openTerminalForMcp"
            >
              Open in Terminal
            </Button>
          </div>
          <Message v-if="mcpError" severity="warn" class="text-xs">{{ mcpError }}</Message>
          <p v-if="appPath" class="m-0 text-xs text-rm-muted">
            App path: <code class="bg-rm-surface px-1 rounded text-[11px] break-all">{{ appPath }}</code>
          </p>
        </div>
      </Panel>

      <Panel class="mb-4">
        <template #header>
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">API Tester</h3>
        </template>
          <div class="card-section pt-0">
          <p class="m-0 mb-5 text-sm text-rm-muted">Select a method, set parameters, and send a request. Works via the app; enable the API server above to test over HTTP.</p>
          <div class="tester-row mb-4">
            <label class="text-xs font-medium text-rm-muted shrink-0">Method</label>
            <Select v-model="selectedMethod" :options="methodOptions" optionLabel="label" optionValue="value" class="flex-1 min-w-0 max-w-md" />
          </div>
          <div v-if="selectedDoc && selectedDoc.params && selectedDoc.params.length" class="tester-params mb-4 space-y-3">
            <h4 class="api-doc-section-title m-0">Parameters</h4>
            <div v-for="p in selectedDoc.params" :key="p.name" class="tester-param flex flex-col gap-1 sm:flex-row sm:items-center">
              <label class="sm:w-40 font-mono text-xs font-medium text-rm-text shrink-0">{{ p.name }}</label>
              <template v-if="isJsonParam(p)">
                <Textarea
                  v-model="builderParamValues[p.name]"
                  class="flex-1 font-mono text-xs min-h-[3.5rem]"
                  :placeholder="jsonPlaceholder(p)"
                  spellcheck="false"
                />
              </template>
              <template v-else-if="p.type === 'boolean'">
                <label class="flex items-center gap-2 cursor-pointer text-sm text-rm-muted">
                  <Checkbox
                    :model-value="builderParamValues[p.name] === 'true'"
                    binary
                    @update:model-value="(v) => (builderParamValues[p.name] = v ? 'true' : 'false')"
                  />
                  {{ builderParamValues[p.name] === 'true' ? 'true' : 'false' }}
                </label>
              </template>
              <template v-else-if="p.type === 'number'">
                <InputText v-model="builderParamValues[p.name]" type="number" class="flex-1 max-w-xs" />
              </template>
              <template v-else>
                <InputText v-model="builderParamValues[p.name]" type="text" class="flex-1" :placeholder="defaultPlaceholder(p)" />
              </template>
              <span v-if="p.description" class="sm:col-span-2 text-xs text-rm-muted mt-0.5 sm:mt-0 sm:ml-2">{{ p.description }}</span>
            </div>
          </div>
          <details class="tester-request mb-4 rounded-rm border border-rm-border overflow-hidden">
            <summary class="api-doc-section-title cursor-pointer px-3 py-2 bg-rm-surface/60 hover:bg-rm-surface">Request body</summary>
            <pre class="api-code-block m-0 p-4 bg-rm-bg text-xs overflow-x-auto">{{ requestBodyPreview || '{}' }}</pre>
          </details>
          <div class="flex flex-wrap items-center gap-2 mb-4">
            <Button
              severity="primary"
              size="small"
              class="text-sm"
              :disabled="!selectedMethod || sending"
              @click="sendRequest"
            >
              {{ sending ? 'Sending…' : 'Send request' }}
            </Button>
            <Button severity="secondary" size="small" class="text-sm" @click="fillSampleParams" :disabled="!selectedDoc">Fill sample</Button>
          </div>
          <div v-if="lastResponse !== null" class="tester-response rounded-rm border border-rm-border overflow-hidden">
            <div class="flex flex-wrap items-center gap-3 px-3 py-2.5 bg-rm-surface/60 border-b border-rm-border">
              <span class="text-xs font-semibold uppercase tracking-wide" :class="lastResponse.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                {{ responseStatusLabel }}
              </span>
              <span v-if="lastResponse.duration !== undefined" class="text-xs text-rm-muted">{{ lastResponse.duration }} ms</span>
              <span v-if="lastResponse.via" class="text-xs text-rm-muted">{{ lastResponse.via }}</span>
              <Button severity="secondary" size="small" class="text-xs ml-auto" @click="copyResponse">Copy response</Button>
            </div>
            <pre class="api-code-block m-0 p-4 text-xs overflow-x-auto max-h-80 overflow-y-auto">{{ responseBodyDisplay }}</pre>
          </div>
        </div>
      </Panel>

      <Panel class="mb-4">
        <template #header>
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Method documentation</h3>
        </template>
          <div class="card-section pt-0">
          <p class="m-0 mb-4 text-sm text-rm-muted">Pick a category or search, then click a method for full docs and a copy-paste example.</p>
          <div class="api-filters flex flex-wrap items-center gap-4 mb-4">
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-rm-muted shrink-0">Category</label>
              <Select v-model="selectedCategory" :options="selectedCategoryOptions" optionLabel="label" optionValue="value" class="api-select min-w-[12rem]" />
            </div>
            <div class="flex items-center gap-2 flex-1 min-w-[10rem]">
              <label class="text-xs font-medium text-rm-muted shrink-0">Search</label>
              <InputText
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
                <Button
                  v-for="doc in filteredDocs"
                  :key="doc.name"
                  variant="outlined"
                  size="small"
                  class="api-method-pill text-xs font-medium px-2.5 py-1.5 rounded-rm min-w-0 justify-start"
                  :class="selectedMethod === doc.name ? 'api-method-pill-active' : 'api-method-pill-inactive'"
                  @click="selectMethod(doc.name)"
                >
                  {{ doc.name }}
                </Button>
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
                    <Button severity="secondary" size="small" class="text-xs" @click="copySampleResponse(selectedDoc.sampleResponse)">Copy JSON</Button>
                    <Button
                      severity="secondary"
                      size="small"
                      class="text-xs"
                      :disabled="!baseUrl || sampleLoading"
                      @click="trySample(selectedDoc.name)"
                    >
                      {{ sampleLoading ? 'Calling…' : 'Try sample' }}
                    </Button>
                  </div>
                  <div v-if="sampleResult !== null" class="mt-3">
                    <h5 class="api-doc-section-title m-0 mb-1">Live response</h5>
                    <pre class="api-code-block m-0 p-4 rounded-rm bg-rm-bg text-xs text-rm-text overflow-x-auto">{{ sampleResult }}</pre>
                  </div>
                </div>
                <div class="api-doc-section pt-4 border-t border-rm-border">
                  <h4 class="api-doc-section-title">Example</h4>
                  <pre class="api-code-block m-0 mt-1 p-4 rounded-rm bg-rm-bg text-xs text-rm-text overflow-x-auto">{{ exampleForMethod(selectedDoc.name) }}</pre>
                  <Button severity="secondary" size="small" class="text-xs mt-2" @click="copyExample(selectedDoc.name)">Copy curl</Button>
                </div>
              </div>
              <p v-else-if="selectedMethod && !selectedDoc" class="m-0 text-sm text-rm-muted">No documentation for this method.</p>
              <p v-else class="m-0 text-sm text-rm-muted">Select a method to see its documentation and example.</p>
            </div>
          </div>
        </div>
      </Panel>
    </div>
    </template>
  </Card>
</template>

<script setup>
import Button from 'primevue/button';
import Card from 'primevue/card';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Panel from 'primevue/panel';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Toolbar from 'primevue/toolbar';
import Textarea from 'primevue/textarea';
import { useApiView } from '../composables/useApiView';

const {
  status,
  enabled,
  port,
  baseUrl,
  copyStatus,
  onToggleEnabled,
  onPortBlur,
  copyBaseUrl,
  mcpStatus,
  mcpBusy,
  mcpError,
  appPath,
  startMcp,
  stopMcp,
  openTerminalForMcp,
  selectedMethod,
  methodOptions,
  selectedDoc,
  builderParamValues,
  requestBodyPreview,
  sending,
  sendRequest,
  fillSampleParams,
  lastResponse,
  responseStatusLabel,
  responseBodyDisplay,
  copyResponse,
  isJsonParam,
  jsonPlaceholder,
  defaultPlaceholder,
  selectedCategory,
  methodFilter,
  filteredDocs,
  selectedCategoryOptions,
  selectMethod,
  exampleForMethod,
  copyExample,
  copySampleResponse,
  trySample,
  sampleLoading,
  sampleResult,
} = useApiView();
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
