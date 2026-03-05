<template>
  <section class="card mb-6 detail-tab-panel detail-ssh-card flex flex-col min-h-0" data-detail-tab="ssh">
    <!-- Toolbar -->
    <div class="ssh-toolbar rounded-rm border border-rm-border bg-rm-surface/50 px-4 py-3 mb-5 flex flex-wrap items-center gap-4">
      <p class="text-sm text-rm-muted m-0 flex-1 min-w-0 max-w-xl">
        Save SSH connection details and open an interactive session in your system terminal with one click.
      </p>
    </div>

    <Message v-if="sshError" severity="error" class="text-sm mb-3">{{ sshError }}</Message>

    <!-- Add / Edit form -->
    <div class="ssh-form rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-4 mb-5 flex flex-wrap items-end gap-4">
      <label class="ssh-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Name</span>
        <InputText v-model="form.name" type="text" class="w-40" placeholder="My server" />
      </label>
      <label class="ssh-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Host</span>
        <InputText v-model="form.host" type="text" class="w-48" placeholder="host.example.com" />
      </label>
      <label class="ssh-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Port</span>
        <InputText v-model.number="form.port" type="number" min="1" max="65535" class="w-20" placeholder="22" />
      </label>
      <label class="ssh-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">User</span>
        <InputText v-model="form.user" type="text" class="w-32" placeholder="root" />
      </label>
      <label class="ssh-field flex-1 min-w-[200px]">
        <span class="text-xs font-medium text-rm-muted block mb-1">Identity file (optional)</span>
        <InputText v-model="form.identityFile" type="text" class="w-full" placeholder="~/.ssh/id_rsa" />
      </label>
      <div class="flex items-center gap-2 shrink-0">
        <Button
          severity="primary"
          size="small"
          :disabled="!form.host?.trim()"
          @click="saveConnection"
        >
          {{ editingId ? 'Update' : 'Add connection' }}
        </Button>
        <Button v-if="editingId" variant="text" size="small" @click="cancelEdit">
          Cancel
        </Button>
      </div>
    </div>

    <!-- Connections list -->
    <Panel class="ssh-list-wrap">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full">
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Saved connections</h3>
          <span class="text-xs text-rm-muted">{{ connections.length }} saved</span>
        </div>
      </template>
      <ul v-if="connections.length" class="divide-y divide-rm-border">
        <li v-for="c in connections" :key="c.id" class="ssh-item flex flex-wrap items-center gap-3 px-4 py-3">
          <div class="ssh-item-main min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-medium text-rm-text">{{ c.name || c.host }}</span>
              <span class="text-rm-muted text-sm">{{ c.user }}@{{ c.host }}</span>
              <span v-if="c.port && c.port !== 22" class="text-xs text-rm-muted">port {{ c.port }}</span>
            </div>
            <p v-if="c.identityFile" class="text-xs text-rm-muted m-0 mt-0.5 font-mono truncate">{{ c.identityFile }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <Button severity="primary" size="small" title="Open in terminal" @click="connect(c)">
              Connect
            </Button>
            <Button variant="text" size="small" title="Edit" @click="startEdit(c)">
              Edit
            </Button>
            <Button severity="danger" size="small" title="Remove" @click="removeConnection(c)">
              Delete
            </Button>
          </div>
        </li>
      </ul>

      <div v-else class="empty-state">
        <div class="empty-state-icon">
          <svg class="w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
        </div>
        <h4 class="empty-state-title">No SSH connections yet</h4>
        <div class="empty-state-body">
          Add a connection with host, user, and optional port or identity file. Click <strong>Connect</strong> to open an SSH session in your system terminal.
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
import { useSsh } from './useSsh';

const {
  connections,
  form,
  editingId,
  sshError,
  cancelEdit,
  startEdit,
  saveConnection,
  removeConnection,
  connect,
} = useSsh();
</script>
