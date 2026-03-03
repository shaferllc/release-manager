<template>
  <section class="card mb-6 detail-tab-panel detail-ftp-card flex flex-col min-h-0" data-detail-tab="ftp">
    <!-- Toolbar -->
    <div class="ftp-toolbar rounded-rm border border-rm-border bg-rm-surface/50 px-4 py-3 mb-5 flex flex-wrap items-center gap-4">
      <p class="text-sm text-rm-muted m-0 flex-1 min-w-0 max-w-xl">
        Connect to an FTP server to browse and transfer files. Optional for projects that deploy or sync via FTP.
      </p>
      <span
        v-if="status.connected"
        class="ftp-status-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rm-success/15 text-rm-success border border-rm-success/30"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-rm-success" aria-hidden="true"></span>
        {{ status.host }}
      </span>
      <span
        v-else
        class="ftp-status-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rm-muted/20 text-rm-muted border border-rm-border"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-rm-muted" aria-hidden="true"></span>
        Disconnected
      </span>
    </div>

    <!-- Connection form (when disconnected) -->
    <div v-if="!status.connected" class="ftp-form rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-4 mb-5 flex flex-wrap items-end gap-4">
      <label class="ftp-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Host</span>
        <input v-model="form.host" type="text" class="ftp-input w-48" placeholder="ftp.example.com" />
      </label>
      <label class="ftp-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Port</span>
        <input v-model.number="form.port" type="number" min="1" max="65535" class="ftp-input w-20" placeholder="21" />
      </label>
      <label class="ftp-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Username</span>
        <input v-model="form.user" type="text" class="ftp-input w-36" placeholder="anonymous" autocomplete="username" />
      </label>
      <label class="ftp-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Password</span>
        <input v-model="form.password" type="password" class="ftp-input w-36" placeholder="guest" autocomplete="current-password" />
      </label>
      <label class="ftp-field flex items-center gap-2 cursor-pointer">
        <input v-model="form.secure" type="checkbox" class="ftp-checkbox" />
        <span class="text-xs font-medium text-rm-muted">FTPS (TLS)</span>
      </label>
      <button
        type="button"
        class="ftp-btn ftp-btn-primary"
        :disabled="connecting || !form.host?.trim()"
        @click="connect"
      >
        {{ connecting ? 'Connecting…' : 'Connect' }}
      </button>
    </div>
    <p v-if="connectError" class="text-sm text-rm-danger mb-3">{{ connectError }}</p>

    <!-- Connected: file browser -->
    <template v-if="status.connected">
      <div class="ftp-browser rounded-rm border border-rm-border bg-rm-surface/30 overflow-hidden shadow-sm flex flex-col min-h-0">
        <div class="ftp-browser-toolbar flex items-center justify-between gap-3 px-4 py-3 border-b border-rm-border bg-rm-surface/50 flex-wrap">
          <div class="flex items-center gap-2 min-w-0">
            <button type="button" class="ftp-btn ftp-btn-ghost shrink-0" title="Disconnect" @click="disconnect">
              Disconnect
            </button>
            <span class="text-rm-muted text-sm">·</span>
            <button
              type="button"
              class="ftp-btn ftp-btn-ghost shrink-0"
              :disabled="!currentPath"
              title="Refresh"
              @click="loadList"
            >
              Refresh
            </button>
            <button
              type="button"
              class="ftp-btn ftp-btn-primary shrink-0"
              title="Upload file(s)"
              @click="upload"
            >
              Upload
            </button>
          </div>
        </div>
        <div class="ftp-breadcrumb px-4 py-2 border-b border-rm-border bg-rm-surface/30 flex items-center gap-1 flex-wrap text-sm">
          <button type="button" class="ftp-breadcrumb-item text-rm-accent hover:underline" @click="setPath('')">
            /
          </button>
          <template v-for="(part, i) in pathParts" :key="i">
            <span class="text-rm-muted">/</span>
            <button
              type="button"
              class="ftp-breadcrumb-item text-rm-accent hover:underline"
              @click="setPath(pathParts.slice(0, i + 1).join('/'))"
            >
              {{ part }}
            </button>
          </template>
        </div>
        <div class="ftp-list-wrap overflow-auto min-h-0 flex-1">
          <ul v-if="list.length" class="divide-y divide-rm-border">
            <li
              v-for="item in sortedList"
              :key="item.name"
              class="ftp-item flex items-center gap-3 px-4 py-2.5 hover:bg-rm-surface/50 group"
            >
              <button
                type="button"
                class="ftp-item-main flex items-center gap-3 min-w-0 flex-1 text-left"
                @click="item.isDirectory ? enterDir(item.name) : null"
                @dblclick="item.isDirectory ? enterDir(item.name) : downloadFile(item)"
              >
                <span class="ftp-item-icon shrink-0 text-rm-muted" aria-hidden="true">
                  <svg v-if="item.isDirectory" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  <svg v-else class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </span>
                <span class="ftp-item-name truncate font-medium text-rm-text">{{ item.name }}</span>
                <span v-if="!item.isDirectory && item.size != null" class="ftp-item-size text-rm-muted text-sm shrink-0">
                  {{ formatSize(item.size) }}
                </span>
                <span v-if="item.modifiedAt" class="ftp-item-date text-rm-muted text-xs shrink-0">
                  {{ formatDate(item.modifiedAt) }}
                </span>
              </button>
              <div v-if="!item.isDirectory" class="ftp-item-actions shrink-0 opacity-0 group-hover:opacity-100 flex items-center gap-1">
                <button type="button" class="ftp-btn ftp-btn-small" title="Download" @click="downloadFile(item)">
                  Download
                </button>
                <button type="button" class="ftp-btn ftp-btn-small ftp-btn-danger" title="Delete" @click="removeFile(item)">
                  Delete
                </button>
              </div>
              <div v-else class="ftp-item-actions shrink-0 opacity-0 group-hover:opacity-100">
                <button type="button" class="ftp-btn ftp-btn-small" title="Open folder" @click="enterDir(item.name)">
                  Open
                </button>
              </div>
            </li>
          </ul>
          <div v-else-if="loading" class="ftp-loading flex items-center justify-center py-12 text-rm-muted text-sm">
            <span class="ftp-loading-spinner w-6 h-6 border-2 border-rm-border border-t-rm-accent rounded-full animate-spin mr-2" aria-hidden="true"></span>
            Loading…
          </div>
          <div v-else-if="listError" class="ftp-error px-4 py-6 text-sm text-rm-danger">
            {{ listError }}
          </div>
          <div v-else class="ftp-empty flex flex-col items-center justify-center py-14 px-6 text-center">
            <div class="ftp-empty-icon mb-4 rounded-full bg-rm-surface border border-rm-border flex items-center justify-center text-rm-muted" aria-hidden="true">
              <svg class="w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
            </div>
            <h4 class="text-base font-semibold text-rm-text m-0 mb-1.5">This folder is empty</h4>
            <p class="text-sm text-rm-muted m-0 max-w-sm">Use <strong>Upload</strong> to add files, or go back to open another folder.</p>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="ftp-disconnected rounded-rm border border-rm-border bg-rm-surface/30 overflow-hidden">
      <div class="ftp-empty flex flex-col items-center justify-center py-14 px-6 text-center">
        <div class="ftp-empty-icon mb-4 rounded-full bg-rm-surface border border-rm-border flex items-center justify-center text-rm-muted" aria-hidden="true">
          <svg class="w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
        </div>
        <h4 class="text-base font-semibold text-rm-text m-0 mb-1.5">Not connected</h4>
        <p class="text-sm text-rm-muted m-0 max-w-sm">Enter host, credentials, and click <strong>Connect</strong> to browse and transfer files.</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useApi } from '../../composables/useApi';

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

function remotePathFor(name) {
  const base = (currentPath.value || '').replace(/\/+$/, '');
  return base ? `${base}/${name}` : name;
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

function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

watch(status, (s) => {
  if (s.connected) loadList();
}, { immediate: false });

refreshStatus();
</script>

<style scoped>
.ftp-input {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgb(var(--rm-border));
  background: rgb(var(--rm-bg));
  color: rgb(var(--rm-text));
  font-size: 13px;
}
.ftp-checkbox {
  accent-color: rgb(var(--rm-accent));
}
.ftp-btn {
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
.ftp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ftp-btn-primary {
  background: rgb(var(--rm-accent));
  color: white;
  border-color: rgb(var(--rm-accent));
}
.ftp-btn-primary:hover:not(:disabled) {
  background: rgb(var(--rm-accent-hover));
  border-color: rgb(var(--rm-accent-hover));
}
.ftp-btn-ghost {
  background: transparent;
  color: rgb(var(--rm-muted));
  border-color: transparent;
}
.ftp-btn-ghost:hover:not(:disabled) {
  color: rgb(var(--rm-text));
  background: rgb(var(--rm-surface));
}
.ftp-btn-small {
  padding: 4px 10px;
  font-size: 12px;
  background: rgb(var(--rm-surface));
  color: rgb(var(--rm-text));
  border-color: rgb(var(--rm-border));
}
.ftp-btn-small:hover {
  background: rgb(var(--rm-surface-hover));
}
.ftp-btn-danger:hover {
  background: rgba(var(--rm-danger), 0.12);
  border-color: rgba(var(--rm-danger), 0.4);
  color: rgb(var(--rm-danger));
}
.ftp-breadcrumb-item {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: inherit;
}
.ftp-list-wrap {
  min-height: 200px;
}
.ftp-empty-icon {
  width: 72px;
  height: 72px;
}
</style>
