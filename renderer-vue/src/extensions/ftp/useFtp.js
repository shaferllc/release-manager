import { ref, computed, watch, onMounted } from 'vue';
import { useApi } from '../../composables/useApi';

/**
 * Composable for the FTP tab: connection state, form, file list, and actions.
 */
export function useFtp() {
  const api = useApi();

  const status = ref({ connected: false, host: null });
  const form = ref({
    host: '',
    port: 21,
    user: 'anonymous',
    password: 'guest',
    secure: false,
  });
  const connecting = ref(false);
  const connectError = ref('');
  const currentPath = ref('');
  const list = ref([]);
  const listError = ref('');
  const loading = ref(false);

  const pathParts = computed(() => {
    const p = (currentPath.value || '').replace(/^\/+/, '').replace(/\/+$/, '');
    return p ? p.split('/').filter(Boolean) : [];
  });

  const sortedList = computed(() => {
    const items = [...list.value];
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });
    return items;
  });

  function remotePathFor(name) {
    const base = (currentPath.value || '').replace(/\/+$/, '');
    return base ? `${base}/${name}` : name;
  }

  async function refreshStatus() {
    try {
      status.value = await api.getFtpStatus?.() ?? { connected: false, host: null };
    } catch {
      status.value = { connected: false, host: null };
    }
  }

  async function connect() {
    if (!api.ftpConnect) return;
    connectError.value = '';
    connecting.value = true;
    try {
      const result = await api.ftpConnect({
        host: form.value.host?.trim() || 'localhost',
        port: form.value.port || 21,
        user: form.value.user ?? 'anonymous',
        password: form.value.password ?? 'guest',
        secure: form.value.secure,
      });
      if (result.ok) {
        await refreshStatus();
        currentPath.value = '';
        listError.value = '';
        await loadList();
      } else {
        connectError.value = result.error || 'Connection failed';
      }
    } finally {
      connecting.value = false;
    }
  }

  async function disconnect() {
    if (!api.ftpDisconnect) return;
    await api.ftpDisconnect();
    await refreshStatus();
    currentPath.value = '';
    list.value = [];
    listError.value = '';
  }

  function setPath(path) {
    currentPath.value = path;
    loadList();
  }

  function enterDir(name) {
    const base = (currentPath.value || '').replace(/\/+$/, '');
    currentPath.value = base ? `${base}/${name}` : name;
    loadList();
  }

  async function loadList() {
    if (!api.ftpList || !status.value.connected) return;
    loading.value = true;
    listError.value = '';
    try {
      const result = await api.ftpList(currentPath.value || '.');
      if (result.ok) {
        list.value = result.list || [];
      } else {
        listError.value = result.error || 'Failed to list';
        list.value = [];
      }
    } catch (e) {
      listError.value = e?.message || 'Failed to list';
      list.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function downloadFile(item) {
    if (item.isDirectory || !api.ftpDownload || !api.showSaveDialog) return;
    const remote = remotePathFor(item.name);
    const { canceled, filePath } = await api.showSaveDialog({ title: 'Save file', defaultPath: item.name });
    if (canceled || !filePath) return;
    try {
      const result = await api.ftpDownload(remote, filePath);
      if (!result.ok) listError.value = result.error || 'Download failed';
    } catch (e) {
      listError.value = e?.message || 'Download failed';
    }
  }

  async function upload() {
    if (!api.ftpUpload || !api.showOpenDialog) return;
    const { canceled, filePaths } = await api.showOpenDialog({ title: 'Select file(s) to upload', multiSelect: true });
    if (canceled || !filePaths?.length) return;
    listError.value = '';
    for (const localPath of filePaths) {
      const name = localPath.split(/[/\\]/).pop();
      const remote = remotePathFor(name);
      try {
        const result = await api.ftpUpload(localPath, remote);
        if (!result.ok) {
          listError.value = result.error || 'Upload failed';
          break;
        }
      } catch (e) {
        listError.value = e?.message || 'Upload failed';
        break;
      }
    }
    await loadList();
  }

  async function removeFile(item) {
    if (item.isDirectory || !api.ftpRemove) return;
    if (!confirm(`Delete "${item.name}" on the server?`)) return;
    try {
      const result = await api.ftpRemove(remotePathFor(item.name));
      if (result.ok) await loadList();
      else listError.value = result.error || 'Delete failed';
    } catch (e) {
      listError.value = e?.message || 'Delete failed';
    }
  }

  watch(status, (s) => {
    if (s.connected) loadList();
  }, { immediate: false });

  onMounted(() => {
    refreshStatus();
  });

  return {
    status,
    form,
    connecting,
    connectError,
    currentPath,
    list,
    listError,
    loading,
    pathParts,
    sortedList,
    connect,
    disconnect,
    setPath,
    enterDir,
    loadList,
    downloadFile,
    upload,
    removeFile,
  };
}
