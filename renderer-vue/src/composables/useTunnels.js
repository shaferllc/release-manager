import { ref, computed, onMounted } from 'vue';
import { useApi } from './useApi';

/**
 * Composable for the Tunnels tab: list tunnels, start (port + optional subdomain),
 * stop, copy URL, and subscribe to tunnel list updates. No arguments.
 */
export function useTunnels() {
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

  return {
    tunnels,
    newPort,
    newSubdomain,
    starting,
    tunnelError,
    validPort,
    refreshTunnels,
    startNew,
    stopTunnel,
    copyUrl,
  };
}
