<template>
  <section class="card mb-6 detail-tab-panel detail-ssh-card flex flex-col min-h-0" data-detail-tab="ssh">
    <!-- Toolbar -->
    <div class="ssh-toolbar rounded-rm border border-rm-border bg-rm-surface/50 px-4 py-3 mb-5 flex flex-wrap items-center gap-4">
      <p class="text-sm text-rm-muted m-0 flex-1 min-w-0 max-w-xl">
        Save SSH connection details and open an interactive session in your system terminal with one click.
      </p>
    </div>

    <p v-if="sshError" class="text-sm text-rm-danger mb-3">{{ sshError }}</p>

    <!-- Add / Edit form -->
    <div class="ssh-form rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-4 mb-5 flex flex-wrap items-end gap-4">
      <label class="ssh-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Name</span>
        <RmInput v-model="form.name" type="text" class="w-40" placeholder="My server" />
      </label>
      <label class="ssh-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Host</span>
        <RmInput v-model="form.host" type="text" class="w-48" placeholder="host.example.com" />
      </label>
      <label class="ssh-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">Port</span>
        <RmInput v-model.number="form.port" type="number" min="1" max="65535" class="w-20" placeholder="22" />
      </label>
      <label class="ssh-field">
        <span class="text-xs font-medium text-rm-muted block mb-1">User</span>
        <RmInput v-model="form.user" type="text" class="w-32" placeholder="root" />
      </label>
      <label class="ssh-field flex-1 min-w-[200px]">
        <span class="text-xs font-medium text-rm-muted block mb-1">Identity file (optional)</span>
        <RmInput v-model="form.identityFile" type="text" class="w-full" placeholder="~/.ssh/id_rsa" />
      </label>
      <div class="flex items-center gap-2 shrink-0">
        <RmButton
          variant="primary"
          size="compact"
          :disabled="!form.host?.trim()"
          @click="saveConnection"
        >
          {{ editingId ? 'Update' : 'Add connection' }}
        </RmButton>
        <RmButton v-if="editingId" variant="ghost" size="compact" @click="cancelEdit">
          Cancel
        </RmButton>
      </div>
    </div>

    <!-- Connections list -->
    <RmListPanel class="ssh-list-wrap">
      <template #title>Saved connections</template>
      <template #meta>{{ connections.length }} saved</template>

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
            <RmButton variant="primary" size="compact" title="Open in terminal" @click="connect(c)">
              Connect
            </RmButton>
            <RmButton variant="ghost" size="compact" title="Edit" @click="startEdit(c)">
              Edit
            </RmButton>
            <RmButton variant="danger" size="compact" title="Remove" @click="removeConnection(c)">
              Delete
            </RmButton>
          </div>
        </li>
      </ul>

      <RmEmptyState
        v-else
        title="No SSH connections yet"
      >
        Add a connection with host, user, and optional port or identity file. Click <strong>Connect</strong> to open an SSH session in your system terminal.
        <template #icon>
          <svg class="w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
        </template>
      </RmEmptyState>
    </RmListPanel>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RmButton, RmInput, RmEmptyState, RmListPanel } from '../ui';
import { useApi } from '../../composables/useApi';

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
</script>
