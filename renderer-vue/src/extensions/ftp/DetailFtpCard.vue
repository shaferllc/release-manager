<template>
  <section class="card mb-6 detail-tab-panel detail-ftp-card flex flex-col min-h-0" data-detail-tab="ftp">
    <div class="ftp-toolbar rounded-rm border border-rm-border bg-rm-surface/50 px-4 py-3 mb-5 flex flex-wrap items-center gap-4">
      <p class="text-sm text-rm-muted m-0 flex-1 min-w-0 max-w-xl">
        Connect to an FTP server to browse and transfer files. Optional for projects that deploy or sync via FTP.
      </p>
      <Tag v-if="status.connected" severity="success" class="inline-flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-rm-success" aria-hidden="true" />
        {{ status.host }}
      </Tag>
      <Tag v-else severity="secondary" class="inline-flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-rm-muted/50" aria-hidden="true" />
        Disconnected
      </Tag>
    </div>

    <div v-if="!status.connected" class="ftp-form rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-4 mb-5 flex flex-wrap items-end gap-4">
      <label class="ftp-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Host</span>
        <InputText v-model="form.host" type="text" class="w-48" placeholder="ftp.example.com" />
      </label>
      <label class="ftp-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Port</span>
        <InputText v-model.number="form.port" type="number" min="1" max="65535" class="w-20" placeholder="21" />
      </label>
      <label class="ftp-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Username</span>
        <InputText v-model="form.user" type="text" class="w-36" placeholder="anonymous" autocomplete="username" />
      </label>
      <label class="ftp-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Password</span>
        <InputText v-model="form.password" type="password" class="w-36" placeholder="guest" autocomplete="current-password" />
      </label>
      <label class="ftp-field flex items-center gap-2 cursor-pointer">
        <Checkbox v-model="form.secure" binary input-id="ftp-secure" />
        <span class="text-xs font-medium text-rm-muted" for="ftp-secure">FTPS (TLS)</span>
      </label>
      <Button severity="primary" size="small" :disabled="connecting || !form.host?.trim()" @click="connect">
        {{ connecting ? 'Connecting…' : 'Connect' }}
      </Button>
    </div>
    <Message v-if="connectError" severity="error" class="mb-3">{{ connectError }}</Message>

    <template v-if="status.connected">
      <div class="ftp-browser rounded-rm border border-rm-border bg-rm-surface/30 overflow-hidden shadow-sm flex flex-col min-h-0">
        <div class="ftp-browser-toolbar flex items-center justify-between gap-3 px-4 py-3 border-b border-rm-border bg-rm-surface/50 flex-wrap">
          <div class="flex items-center gap-2 min-w-0">
            <Button variant="text" size="small" class="shrink-0" v-tooltip.top="'Disconnect from FTP'" aria-label="Disconnect" @click="disconnect">Disconnect</Button>
            <span class="text-rm-muted text-sm">·</span>
            <Button variant="text" size="small" class="shrink-0" :disabled="!currentPath" v-tooltip.top="'Refresh current folder'" aria-label="Refresh" @click="loadList">Refresh</Button>
            <Button severity="primary" size="small" class="shrink-0" v-tooltip.top="'Upload file(s) to current folder'" aria-label="Upload files" @click="upload">Upload</Button>
          </div>
        </div>
        <div class="ftp-breadcrumb-wrap px-4 py-2 border-b border-rm-border bg-rm-surface/30">
          <Breadcrumb :home="breadcrumbHome" :model="breadcrumbItems">
            <template #item="{ item }">
              <Button variant="text" size="small" class="text-sm text-rm-accent hover:underline p-0 min-h-0 border-0 bg-transparent" @click="item.command?.()">{{ item.label }}</Button>
            </template>
            <template #separator>
              <span class="text-rm-muted px-0.5">/</span>
            </template>
          </Breadcrumb>
        </div>
        <div class="ftp-list-wrap overflow-auto min-h-0 flex-1">
          <ul v-if="list.length" class="divide-y divide-rm-border">
            <li v-for="item in sortedList" :key="item.name" class="ftp-item flex items-center gap-3 px-4 py-2.5 hover:bg-rm-surface/50 group">
              <Button variant="text" size="small" class="ftp-item-main flex items-center gap-3 min-w-0 flex-1 justify-start rounded-none" @click="item.isDirectory ? enterDir(item.name) : null" @dblclick="item.isDirectory ? enterDir(item.name) : downloadFile(item)">
                <span class="ftp-item-icon shrink-0 text-rm-muted" aria-hidden="true">
                  <svg v-if="item.isDirectory" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  <svg v-else class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </span>
                <span class="ftp-item-name truncate font-medium text-rm-text">{{ item.name }}</span>
                <span v-if="!item.isDirectory && item.size != null" class="ftp-item-size text-rm-muted text-sm shrink-0">{{ formatSize(item.size) }}</span>
                <span v-if="item.modifiedAt" class="ftp-item-date text-rm-muted text-xs shrink-0">{{ formatDateTimeShort(item.modifiedAt) }}</span>
              </Button>
              <div v-if="!item.isDirectory" class="ftp-item-actions shrink-0 opacity-0 group-hover:opacity-100 flex items-center gap-1">
                <Button severity="secondary" size="small" v-tooltip.top="'Download file'" aria-label="Download" @click="downloadFile(item)">Download</Button>
                <Button severity="danger" size="small" v-tooltip.top="'Delete file on server'" aria-label="Delete" @click="removeFile(item)">Delete</Button>
              </div>
              <div v-else class="ftp-item-actions shrink-0 opacity-0 group-hover:opacity-100">
                <Button severity="secondary" size="small" v-tooltip.top="'Open folder'" aria-label="Open folder" @click="enterDir(item.name)">Open</Button>
              </div>
            </li>
          </ul>
          <div v-else-if="loading" class="ftp-loading flex items-center justify-center gap-2 py-12 text-rm-muted text-sm"><ProgressSpinner aria-hidden="true" class="!w-6 !h-6" />Loading…</div>
          <Message v-else-if="listError" severity="error" class="mx-4 my-6">{{ listError }}</Message>
          <div v-else class="empty-state">
            <div class="empty-state-icon"><svg class="w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg></div>
            <h4 class="empty-state-title">This folder is empty</h4>
            <div class="empty-state-body">Use <strong>Upload</strong> to add files, or go back to open another folder.</div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="ftp-disconnected rounded-rm border border-rm-border bg-rm-surface/30 overflow-hidden">
      <div class="empty-state">
        <div class="empty-state-icon"><svg class="w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg></div>
        <h4 class="empty-state-title">Not connected</h4>
        <div class="empty-state-body">Enter host, credentials, and click <strong>Connect</strong> to browse and transfer files.</div>
      </div>
    </div>
  </section>
</template>

<script setup>
import Breadcrumb from 'primevue/breadcrumb';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import { computed } from 'vue';
import { useFtp } from './useFtp';
import { formatDateTimeShort } from '../../utils/formatDate';
import { formatSize } from '../../utils/formatSize';

const { status, form, connecting, connectError, currentPath, list, listError, loading, pathParts, sortedList, connect, disconnect, setPath, enterDir, loadList, downloadFile, upload, removeFile } = useFtp();

const breadcrumbHome = computed(() => ({ label: '/', command: () => setPath('') }));
const breadcrumbItems = computed(() =>
  pathParts.value.map((part, i) => ({
    label: part,
    command: () => setPath(pathParts.value.slice(0, i + 1).join('/')),
  }))
);
</script>

<style scoped>
.ftp-breadcrumb-wrap :deep(.p-breadcrumb-list) { display: flex; flex-wrap: wrap; align-items: center; gap: 0; }
.ftp-breadcrumb-wrap :deep(.p-breadcrumb-chevron) { display: none; }
.ftp-list-wrap { min-height: 200px; }
</style>
