<template>
  <section class="card mb-6 detail-tab-panel detail-email-card flex flex-col min-h-0" data-detail-tab="email">
    <!-- Toolbar: SMTP server -->
    <div class="email-toolbar rounded-rm border border-rm-border bg-rm-surface/50 px-4 py-3 mb-5 flex flex-wrap items-center gap-4">
      <p class="text-sm text-rm-muted m-0 flex-1 min-w-0 max-w-xl">
        Catch outgoing emails from your app. Point your app's SMTP to this server and view messages here.
      </p>
      <div class="email-actions flex items-center gap-2 flex-wrap">
        <span
          class="email-status-pill text-xs font-medium px-2.5 py-1 rounded-full border"
          :class="smtpStatus.running ? 'bg-rm-accent/15 text-rm-accent border-rm-accent/30' : 'bg-rm-surface/50 text-rm-muted border-rm-border'"
        >
          {{ smtpStatus.running ? `Running on port ${smtpStatus.port}` : 'Stopped' }}
        </span>
        <button
          type="button"
          class="email-btn email-btn-primary"
          :disabled="smtpStatus.running || startingSmtp"
          @click="startSmtp"
        >
          {{ startingSmtp ? 'Starting…' : 'Start SMTP server' }}
        </button>
        <button
          type="button"
          class="email-btn email-btn-stop"
          :disabled="!smtpStatus.running || stoppingSmtp"
          @click="stopSmtp"
        >
          {{ stoppingSmtp ? 'Stopping…' : 'Stop' }}
        </button>
        <button
          type="button"
          class="email-btn email-btn-secondary"
          :disabled="emails.length === 0"
          @click="clearAll"
        >
          Clear all
        </button>
      </div>
    </div>

    <!-- Connection info when running -->
    <div v-if="smtpStatus.running" class="email-connection rounded-rm border border-rm-border bg-rm-surface/30 px-4 py-2.5 mb-5 flex flex-wrap items-center gap-3 text-sm">
      <span class="text-rm-muted">Configure your app:</span>
      <code class="email-code">MAIL_HOST=127.0.0.1</code>
      <code class="email-code">MAIL_PORT={{ smtpStatus.port }}</code>
      <code class="email-code">MAIL_USERNAME=null</code>
      <code class="email-code">MAIL_PASSWORD=null</code>
      <code class="email-code">MAIL_ENCRYPTION=null</code>
    </div>

    <!-- Inbox + message view -->
    <div class="email-inbox-wrap rounded-rm border border-rm-border bg-rm-surface/30 overflow-hidden shadow-sm flex flex-col min-h-0 flex-1">
      <div class="email-inbox-header flex items-center justify-between gap-3 px-4 py-3 border-b border-rm-border bg-rm-surface/50">
        <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Inbox</h3>
        <span v-if="emails.length" class="text-xs text-rm-muted">{{ emails.length }} email{{ emails.length === 1 ? '' : 's' }}</span>
      </div>

      <div class="email-inbox-body flex min-h-0 flex-1">
        <!-- Email list -->
        <div class="email-list border-r border-rm-border flex flex-col min-w-0 w-80 shrink-0">
          <ul class="email-list-ul overflow-y-auto flex-1">
            <li
              v-for="email in emails"
              :key="email.id"
              class="email-list-item"
              :class="{ 'email-list-item-selected': selectedEmail?.id === email.id }"
              @click="selectedEmail = email"
            >
              <div class="email-list-item-from text-rm-text font-medium truncate">{{ email.from || '—' }}</div>
              <div class="email-list-item-subject text-rm-muted text-xs truncate">{{ email.subject }}</div>
              <div class="email-list-item-date text-rm-muted text-xs">{{ formatDate(email.date) }}</div>
            </li>
          </ul>
          <div v-if="emails.length === 0" class="email-empty-list flex flex-col items-center justify-center py-12 px-4 text-center">
            <svg class="w-10 h-10 text-rm-muted mb-3 opacity-60" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
            <p class="text-sm text-rm-muted m-0">No emails yet</p>
            <p class="text-xs text-rm-muted m-0 mt-1">Start the SMTP server and send mail from your app</p>
          </div>
        </div>

        <!-- Message view -->
        <div class="email-message flex flex-col flex-1 min-w-0">
          <template v-if="selectedEmail">
            <div class="email-message-meta px-4 py-3 border-b border-rm-border bg-rm-surface/30 flex flex-col gap-1">
              <div class="flex flex-wrap gap-x-4 gap-y-0 text-sm">
                <span class="text-rm-muted">From:</span>
                <span class="text-rm-text">{{ selectedEmail.from }}</span>
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-0 text-sm">
                <span class="text-rm-muted">To:</span>
                <span class="text-rm-text">{{ selectedEmail.to }}</span>
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-0 text-sm">
                <span class="text-rm-muted">Subject:</span>
                <span class="text-rm-text font-medium">{{ selectedEmail.subject }}</span>
              </div>
            </div>
            <div class="email-message-tabs flex gap-1 px-4 py-2 border-b border-rm-border bg-rm-surface/20 shrink-0">
              <button
                type="button"
                class="email-tab"
                :class="{ 'email-tab-active': viewMode === 'html' }"
                @click="viewMode = 'html'"
              >
                HTML
              </button>
              <button
                type="button"
                class="email-tab"
                :class="{ 'email-tab-active': viewMode === 'text' }"
                @click="viewMode = 'text'"
              >
                Plain text
              </button>
              <button
                type="button"
                class="email-tab"
                :class="{ 'email-tab-active': viewMode === 'raw' }"
                @click="viewMode = 'raw'"
              >
                Raw
              </button>
              <button
                type="button"
                class="email-tab"
                :class="{ 'email-tab-active': viewMode === 'headers' }"
                @click="viewMode = 'headers'"
              >
                Headers
              </button>
            </div>
            <div class="email-message-content flex-1 overflow-auto p-4 min-h-0">
              <div v-if="viewMode === 'html'" class="email-html-body prose prose-invert max-w-none" v-html="selectedEmail.sanitizedHtml || '<p class=\'text-rm-muted\'>No HTML content</p>'"></div>
              <pre v-else-if="viewMode === 'text'" class="email-pre text-sm text-rm-text whitespace-pre-wrap break-words m-0">{{ selectedEmail.text || 'No plain text content' }}</pre>
              <pre v-else-if="viewMode === 'raw'" class="email-pre text-xs text-rm-muted whitespace-pre-wrap break-words m-0 font-mono">{{ selectedEmail.raw || '' }}</pre>
              <pre v-else-if="viewMode === 'headers'" class="email-pre text-xs text-rm-muted whitespace-pre-wrap break-words m-0 font-mono">{{ selectedEmail.headers || '{}' }}</pre>
            </div>
          </template>
          <div v-else class="email-no-selection flex flex-col items-center justify-center flex-1 py-12 text-rm-muted text-sm">
            <p class="m-0">Select an email to view</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useApi } from '../../composables/useApi';

const api = useApi();

const smtpStatus = ref({ running: false, port: null, defaultPort: 1025 });
const emails = ref([]);
const selectedEmail = ref(null);
const viewMode = ref('html');
const startingSmtp = ref(false);
const stoppingSmtp = ref(false);

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function refreshSmtpStatus() {
  try {
    const s = await api.getEmailSmtpStatus?.() ?? {};
    smtpStatus.value = { running: !!s.running, port: s.port ?? null, defaultPort: s.defaultPort ?? 1025 };
  } catch {
    smtpStatus.value = { running: false, port: null, defaultPort: 1025 };
  }
}

async function refreshEmails() {
  try {
    const list = await api.getEmails?.() ?? [];
    emails.value = list;
    const stillSelected = selectedEmail.value && list.find((e) => e.id === selectedEmail.value.id);
    if (!stillSelected) selectedEmail.value = list[0] || null;
  } catch {
    emails.value = [];
  }
}

async function startSmtp() {
  startingSmtp.value = true;
  try {
    await api.startEmailSmtpServer?.(smtpStatus.value.defaultPort);
    await refreshSmtpStatus();
  } finally {
    startingSmtp.value = false;
  }
}

async function stopSmtp() {
  stoppingSmtp.value = true;
  try {
    await api.stopEmailSmtpServer?.();
    await refreshSmtpStatus();
  } finally {
    stoppingSmtp.value = false;
  }
}

async function clearAll() {
  if (emails.value.length === 0) return;
  await api.clearEmails?.();
  selectedEmail.value = null;
  await refreshEmails();
}

onMounted(async () => {
  await refreshSmtpStatus();
  await refreshEmails();
  if (api.onEmailReceived) api.onEmailReceived(refreshEmails);
});

onUnmounted(() => {});
</script>

<style scoped>
.email-btn {
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
.email-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.email-btn-primary {
  background: rgb(var(--rm-accent));
  color: white;
  border-color: rgb(var(--rm-accent));
}
.email-btn-primary:hover:not(:disabled) {
  background: rgb(var(--rm-accent-hover));
  border-color: rgb(var(--rm-accent-hover));
}
.email-btn-stop {
  background: rgb(var(--rm-surface));
  color: rgb(var(--rm-text));
  border-color: rgb(var(--rm-border));
}
.email-btn-stop:hover:not(:disabled) {
  background: rgba(var(--rm-danger), 0.12);
  border-color: rgba(var(--rm-danger), 0.4);
  color: rgb(var(--rm-danger));
}
.email-btn-secondary {
  background: rgb(var(--rm-surface));
  color: rgb(var(--rm-text));
  border-color: rgb(var(--rm-border));
}
.email-btn-secondary:hover:not(:disabled) {
  background: rgb(var(--rm-surface-hover));
}
.email-code {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgb(var(--rm-bg));
  border: 1px solid rgb(var(--rm-border));
  font-size: 12px;
  font-family: ui-monospace, monospace;
}
.email-list-item {
  padding: 10px 12px;
  border-bottom: 1px solid rgb(var(--rm-border));
  cursor: pointer;
  transition: background 0.1s;
}
.email-list-item:hover {
  background: rgb(var(--rm-surface) / 0.6);
}
.email-list-item-selected {
  background: rgb(var(--rm-accent) / 0.12);
  border-left: 3px solid rgb(var(--rm-accent));
  padding-left: 9px;
}
.email-tab {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: transparent;
  border: none;
  color: rgb(var(--rm-muted));
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.email-tab:hover {
  color: rgb(var(--rm-text));
  background: rgb(var(--rm-surface));
}
.email-tab-active {
  color: rgb(var(--rm-accent));
  background: rgb(var(--rm-accent) / 0.1);
}
.email-pre {
  font-family: ui-monospace, monospace;
}
.email-html-body :deep(a) {
  color: rgb(var(--rm-accent));
}
.email-html-body :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>
