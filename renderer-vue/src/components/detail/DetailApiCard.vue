<template>
  <section class="card mb-6 detail-tab-panel detail-api-card" data-detail-tab="api">
    <div class="card-section">
      <span class="card-label">Project API & MCP</span>
      <p class="m-0 mb-4 text-sm text-rm-muted">
        Call Shipwell API methods for this project, and see how MCP tools would invoke them. This panel always
        uses the currently selected project path.
      </p>

      <div class="mb-4 text-xs text-rm-muted flex flex-wrap items-center gap-3">
        <span class="inline-flex items-center gap-1.5">
          <strong class="font-medium text-rm-text">Path</strong>
          <span class="font-mono break-all">{{ api.projectPath || '—' }}</span>
        </span>
        <span v-if="api.projectType" class="inline-flex items-center gap-1.5">
          <strong class="font-medium text-rm-text">Type</strong>
          <span class="font-mono">{{ api.projectType }}</span>
        </span>
      </div>

      <div class="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,4fr)] mb-6">
        <!-- Left: API request builder -->
        <div class="flex flex-col gap-3">
          <div>
            <label class="block text-xs font-medium text-rm-muted mb-1">API method</label>
            <Select v-model="api.methodName" :options="api.methodOptions" optionLabel="label" optionValue="value" class="text-xs" />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-medium text-rm-muted">Params (JSON array)</label>
              <div class="flex gap-2">
                <Button
                  variant="text"
                  size="small"
                  class="text-[11px]"
                  title="Set params to [projectPath]"
                  @click="api.usePathOnly"
                >[path]</Button>
                <Button
                  variant="text"
                  size="small"
                  class="text-[11px]"
                  title="Set params to [projectPath, projectType]"
                  @click="api.usePathAndType"
                >[path, type]</Button>
              </div>
            </div>
            <Textarea
              v-model="api.paramsText"
              class="font-mono text-xs min-h-[96px]"
              spellcheck="false"
            />
            <p v-if="api.presetStatus" class="m-0 mt-1 text-[11px] text-rm-accent">{{ api.presetStatus }}</p>
          </div>

          <div class="flex items-center gap-2 mt-1">
            <Button
              severity="primary"
              size="small"
              class="text-xs"
              :disabled="api.busy || !api.projectPath"
              title="Call the selected API method for this project"
              @click="api.callApi"
            >
              {{ api.busy ? 'Calling…' : 'Call API' }}
            </Button>
            <span v-if="api.error" class="text-xs text-rm-warning truncate" :title="api.error">{{ api.error }}</span>
          </div>
        </div>

        <!-- Right: Response viewer -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-medium text-rm-muted">Response</span>
            <Button
              severity="secondary"
              size="small"
              class="text-[11px]"
              :disabled="!api.formattedResponse"
              title="Copy response JSON to clipboard"
              @click="api.copyResponse"
            >
              Copy
            </Button>
          </div>
          <pre
            class="detail-api-output m-0 p-3 rounded-rm bg-rm-surface text-xs font-mono text-rm-text min-h-[8rem] border border-rm-border whitespace-pre-wrap break-words"
          >{{ api.formattedResponse }}</pre>
        </div>
      </div>

      <div class="card-section mt-4 border-t border-rm-border pt-4">
        <span class="card-label block mb-2">MCP tool preview (per project)</span>
        <p class="m-0 mb-3 text-xs text-rm-muted">
          This shows how an MCP client (like Cursor) would call the
          <code class="bg-rm-surface px-1 rounded text-[10px]">release_manager_call</code>
          tool for this project. You can copy this snippet into an MCP playground or client config; it will resolve to
          the same API call as above.
        </p>
        <pre
          class="m-0 p-3 rounded-rm bg-rm-surface text-[11px] font-mono text-rm-text border border-rm-border whitespace-pre-wrap break-words"
        >{{ api.mcpSnippet }}</pre>
      </div>
    </div>
  </section>
</template>

<script setup>
import Button from 'primevue/button';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useDetailApi } from '../../composables/useDetailApi';

const api = useDetailApi();
</script>
