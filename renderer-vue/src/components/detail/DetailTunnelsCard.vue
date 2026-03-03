<template>
  <section class="card mb-6 detail-tab-panel detail-tunnels-card flex flex-col min-h-0" data-detail-tab="tunnels">
    <!-- Toolbar -->
    <div class="tunnels-toolbar rounded-rm border border-rm-border bg-rm-surface/50 px-4 py-3 mb-5 flex flex-wrap items-center gap-4">
      <p class="text-sm text-rm-muted m-0 flex-1 min-w-0 max-w-xl">
        Expose local ports via secure public URLs. Share your dev server, test webhooks, or demo without deploying.
      </p>
    </div>

    <p v-if="tunnelError" class="text-sm text-rm-danger mb-3">{{ tunnelError }}</p>

    <!-- Start tunnel form -->
    <div class="tunnels-form rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-4 mb-5 flex flex-wrap items-end gap-4">
      <label class="tunnels-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Local port</span>
        <input v-model.number="newPort" type="number" min="1" max="65535" class="tunnels-input w-24" placeholder="3000" />
      </label>
      <label class="tunnels-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Subdomain (optional)</span>
        <input v-model="newSubdomain" type="text" class="tunnels-input w-40" placeholder="myapp" />
      </label>
      <button
        type="button"
        class="tunnels-btn tunnels-btn-primary"
        :disabled="!validPort || starting"
        @click="startNew"
      >
        {{ starting ? 'Starting…' : 'Start tunnel' }}
      </button>
    </div>

    <!-- Active tunnels -->
    <div class="tunnels-list-wrap rounded-rm border border-rm-border bg-rm-surface/30 overflow-hidden shadow-sm">
      <div class="tunnels-list-header flex items-center justify-between gap-3 px-4 py-3 border-b border-rm-border bg-rm-surface/50">
        <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Active tunnels</h3>
        <span v-if="tunnels.length" class="text-xs text-rm-muted">{{ tunnels.length }} active</span>
      </div>

      <ul v-if="tunnels.length" class="divide-y divide-rm-border">
        <li v-for="t in tunnels" :key="t.id" class="tunnels-item flex flex-wrap items-center gap-3 px-4 py-3">
          <div class="tunnels-item-main min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-rm-muted text-sm">Port {{ t.port }}</span>
              <span v-if="t.subdomain" class="text-xs text-rm-muted">· {{ t.subdomain }}</span>
            </div>
            <a :href="t.url" target="_blank" rel="noopener noreferrer" class="tunnels-url text-rm-accent hover:underline truncate block font-mono text-sm mt-0.5">{{ t.url }}</a>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" class="tunnels-btn tunnels-btn-copy" title="Copy URL" @click="copyUrl(t.url)">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button type="button" class="tunnels-btn tunnels-btn-stop" @click="stopTunnel(t.id)">
              Stop
            </button>
          </div>
        </li>
      </ul>

      <div v-else class="tunnels-empty flex flex-col items-center justify-center py-14 px-6 text-center">
        <div class="tunnels-empty-icon mb-4 rounded-full bg-rm-surface border border-rm-border flex items-center justify-center text-rm-muted" aria-hidden="true">
          <svg class="w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <h4 class="text-base font-semibold text-rm-text m-0 mb-1.5">No active tunnels</h4>
        <p class="text-sm text-rm-muted m-0 max-w-sm">
          Enter a local port (e.g. 3000 for your dev server) and click <strong>Start tunnel</strong> to get a public URL.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useApi } from '../../composables/useApi';

const api = useApi();

const tunnels = ref([]);
const newPort = ref(3000);
const newSubdomain = ref('');
const starting = ref(false);
const tunnelError = ref('');

const validPort = computed(() => {
  const p = Number(newPort.value);
  return Number.isInteger(p) && p >= 1 && p <= 65535;
});

async function refreshTunnels() {
  try {
    const list = await api.getTunnels?.() ?? [];
    tunnels.value = list;
  } catch {
    tunnels.value = [];
  }
}

async function startNew() {
  if (!validPort.value || !api.startTunnel) return;
  tunnelError.value = '';
  starting.value = true;
  try {
    const result = await api.startTunnel(newPort.value, newSubdomain.value?.trim() || null);
    if (result.ok) {
      await refreshTunnels();
      newSubdomain.value = '';
    } else {
      tunnelError.value = result.error || 'Failed to start tunnel';
    }
  } finally {
    starting.value = false;
  }
}

async function stopTunnel(id) {
  if (!api.stopTunnel) return;
  await api.stopTunnel(id);
  await refreshTunnels();
}

async function copyUrl(url) {
  if (api.copyToClipboard) await api.copyToClipboard(url);
}

onMounted(async () => {
  await refreshTunnels();
  if (api.onTunnelsChanged) api.onTunnelsChanged(refreshTunnels);
});

onUnmounted(() => {});
</script>

<style scoped>
.tunnels-input {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgb(var(--rm-border));
  background: rgb(var(--rm-bg));
  color: rgb(var(--rm-text));
  font-size: 13px;
}
.tunnels-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}
.tunnels-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.tunnels-btn-primary {
  background: rgb(var(--rm-accent));
  color: white;
  border-color: rgb(var(--rm-accent));
}
.tunnels-btn-primary:hover:not(:disabled) {
  background: rgb(var(--rm-accent-hover));
  border-color: rgb(var(--rm-accent-hover));
}
.tunnels-btn-copy {
  padding: 8px;
  background: rgb(var(--rm-surface));
  color: rgb(var(--rm-muted));
  border-color: rgb(var(--rm-border));
}
.tunnels-btn-copy:hover {
  background: rgb(var(--rm-surface-hover));
  color: rgb(var(--rm-text));
}
.tunnels-btn-stop {
  background: rgb(var(--rm-surface));
  color: rgb(var(--rm-text));
  border-color: rgb(var(--rm-border));
}
.tunnels-btn-stop:hover {
  background: rgba(var(--rm-danger), 0.12);
  border-color: rgba(var(--rm-danger), 0.4);
  color: rgb(var(--rm-danger));
}
.tunnels-url {
  word-break: break-all;
}
.tunnels-empty-icon {
  width: 72px;
  height: 72px;
}
</style>
