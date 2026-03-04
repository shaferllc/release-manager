import { ref, onMounted } from 'vue';
import { useApi } from './useApi';

/**
 * Composable for the SSH tab: saved connections list, add/edit form,
 * and connect/open-in-terminal. Loads connections on mount.
 * @returns Refs and methods for DetailSshCard.
 */
export function useSsh() {
  const api = useApi();

  const connections = ref([]);
  const form = ref({
    name: '',
    host: '',
    port: 22,
    user: 'root',
    identityFile: '',
  });
  const editingId = ref(null);
  const sshError = ref('');

  function newId() {
    return 'ssh-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  async function loadConnections() {
    try {
      const list = await api.getSshConnections?.() ?? [];
      const arr = Array.isArray(list) ? list : [];
      const needsId = arr.some((c) => !c.id);
      connections.value = arr.map((c) => (c.id ? c : { ...c, id: newId() }));
      if (needsId && connections.value.length) await api.setSshConnections?.(connections.value);
    } catch {
      connections.value = [];
    }
  }

  function resetForm() {
    form.value = {
      name: '',
      host: '',
      port: 22,
      user: 'root',
      identityFile: '',
    };
    editingId.value = null;
    sshError.value = '';
  }

  function cancelEdit() {
    resetForm();
  }

  function startEdit(c) {
    editingId.value = c.id;
    form.value = {
      name: c.name || '',
      host: c.host || '',
      port: c.port || 22,
      user: c.user || 'root',
      identityFile: c.identityFile || '',
    };
    sshError.value = '';
  }

  async function saveConnection() {
    if (!form.value.host?.trim()) return;
    if (!api.setSshConnections) return;
    sshError.value = '';
    const name = (form.value.name || '').trim();
    const host = form.value.host.trim();
    const port = Math.max(1, Math.min(65535, parseInt(form.value.port, 10) || 22));
    const user = (form.value.user || '').trim() || 'root';
    const identityFile = (form.value.identityFile || '').trim();
    const entry = { name: name || host, host, port, user, identityFile };
    let list = [...connections.value];
    if (editingId.value) {
      const idx = list.findIndex((x) => x.id === editingId.value);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...entry };
      }
    } else {
      list.push({ id: newId(), ...entry });
    }
    await api.setSshConnections(list);
    await loadConnections();
    resetForm();
  }

  async function removeConnection(c) {
    if (!confirm(`Remove connection "${c.name || c.host}"?`)) return;
    if (!api.setSshConnections) return;
    const list = connections.value.filter((x) => x.id !== c.id);
    await api.setSshConnections(list);
    await loadConnections();
    if (editingId.value === c.id) resetForm();
  }

  async function connect(c) {
    if (!api.openSshInTerminal) return;
    sshError.value = '';
    try {
      const result = await api.openSshInTerminal({
        host: c.host,
        port: c.port || 22,
        user: c.user || 'root',
        identityFile: c.identityFile || undefined,
      });
      if (!result?.ok) sshError.value = result?.error || 'Failed to open terminal';
    } catch (e) {
      sshError.value = e?.message || 'Failed to open terminal';
    }
  }

  onMounted(() => {
    loadConnections();
  });

  return {
    connections,
    form,
    editingId,
    sshError,
    loadConnections,
    resetForm,
    cancelEdit,
    startEdit,
    saveConnection,
    removeConnection,
    connect,
  };
}
