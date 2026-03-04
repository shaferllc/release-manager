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
        <RmInput v-model.number="newPort" type="number" min="1" max="65535" class="w-24" placeholder="3000" />
      </label>
      <label class="tunnels-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Subdomain (optional)</span>
        <RmInput v-model="newSubdomain" type="text" class="w-40" placeholder="myapp" />
      </label>
      <RmButton
        variant="primary"
        size="compact"
        :disabled="!validPort || starting"
        @click="startNew"
      >
        {{ starting ? 'Starting…' : 'Start tunnel' }}
      </RmButton>
    </div>

    <!-- Active tunnels -->
    <RmListPanel class="tunnels-list-wrap">
      <template #title>Active tunnels</template>
      <template #meta>{{ tunnels.length }} active</template>

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
            <RmButton variant="ghost" size="compact" class="!p-2" title="Copy URL" @click="copyUrl(t.url)">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </RmButton>
            <RmButton variant="danger" size="compact" @click="stopTunnel(t.id)">
              Stop
            </RmButton>
          </div>
        </li>
      </ul>

      <RmEmptyState v-else title="No active tunnels">
        Enter a local port (e.g. 3000 for your dev server) and click <strong>Start tunnel</strong> to get a public URL.
        <template #icon>
          <svg class="w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </template>
      </RmEmptyState>
    </RmListPanel>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { RmButton, RmInput, RmEmptyState, RmListPanel } from '../ui';
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
.tunnels-url {
  word-break: break-all;
}
</style>
