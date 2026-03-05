<template>
  <section class="card mb-6 detail-tab-panel detail-tunnels-card flex flex-col min-h-0" data-detail-tab="tunnels">
    <!-- Toolbar -->
    <div class="tunnels-toolbar rounded-rm border border-rm-border bg-rm-surface/50 px-4 py-3 mb-5 flex flex-wrap items-center gap-4">
      <p class="text-sm text-rm-muted m-0 flex-1 min-w-0 max-w-xl">
        Expose local ports via secure public URLs. Share your dev server, test webhooks, or demo without deploying.
      </p>
    </div>

    <Message v-if="tunnelError" severity="error" class="text-sm mb-3">{{ tunnelError }}</Message>

    <!-- Start tunnel form -->
    <div class="tunnels-form rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-4 mb-5 flex flex-wrap items-end gap-4">
      <label class="tunnels-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Local port</span>
        <InputText v-model.number="newPort" type="number" min="1" max="65535" class="w-24" placeholder="3000" />
      </label>
      <label class="tunnels-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Subdomain (optional)</span>
        <InputText v-model="newSubdomain" type="text" class="w-40" placeholder="myapp" />
      </label>
      <Button
        severity="primary"
        size="small"
        :disabled="!validPort || starting"
        @click="startNew"
      >
        {{ starting ? 'Starting…' : 'Start tunnel' }}
      </Button>
    </div>

    <!-- Active tunnels -->
    <Panel class="tunnels-list-wrap">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full">
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Active tunnels</h3>
          <span class="text-xs text-rm-muted">{{ tunnels.length }} active</span>
        </div>
      </template>
      <ul v-if="tunnels.length" class="divide-y divide-rm-border">
        <li v-for="t in tunnels" :key="t.id" class="tunnels-item flex flex-wrap items-center gap-3 px-4 py-3">
          <div class="tunnels-item-main min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-rm-muted text-sm">Port {{ t.port }}</span>
              <span v-if="t.subdomain" class="text-xs text-rm-muted">· {{ t.subdomain }}</span>
            </div>
            <Button variant="link" :label="t.url" class="tunnels-url text-rm-accent truncate block font-mono text-sm mt-0.5 p-0 min-w-0 h-auto justify-start text-left" @click="openUrl(t.url)" />
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <Button variant="text" size="small" class="!p-2" title="Copy URL" @click="copyUrl(t.url)">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </Button>
            <Button severity="danger" size="small" @click="stopTunnel(t.id)">
              Stop
            </Button>
          </div>
        </li>
      </ul>

      <div v-else class="empty-state">
        <div class="empty-state-icon">
          <svg class="w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <h4 class="empty-state-title">No active tunnels</h4>
        <div class="empty-state-body">
          Enter a local port (e.g. 3000 for your dev server) and click <strong>Start tunnel</strong> to get a public URL.
        </div>
      </div>
    </Panel>
  </section>
</template>

<script setup>
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Panel from 'primevue/panel';
import { useApi } from '../../composables/useApi';
import { useTunnels } from './useTunnels';

const api = useApi();
const {
  tunnels,
  newPort,
  newSubdomain,
  starting,
  tunnelError,
  validPort,
  startNew,
  stopTunnel,
  copyUrl,
} = useTunnels();

function openUrl(url) {
  if (url && api.openUrl) api.openUrl(url);
}
</script>

<style scoped>
.tunnels-url {
  word-break: break-all;
}
</style>
