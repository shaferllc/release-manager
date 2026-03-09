<template>
  <section class="codeseer-card detail-tab-panel flex flex-col min-h-0" data-detail-tab="codeseer">
    <div class="codeseer-toolbar flex flex-wrap items-center gap-4 px-4 py-3 mb-4 rounded-lg border bg-rm-surface/50">
      <p class="text-sm text-rm-muted m-0 flex-1 min-w-0">
        PHP debugging: receive dumps via TCP port <strong>{{ status?.tcp?.port ?? 23523 }}</strong>.
        Use <code class="text-xs bg-rm-surface px-1.5 py-0.5 rounded">cs('hello')</code> in PHP to send output here.
      </p>
      <div class="flex items-center gap-2">
        <span v-if="status?.tcp?.listening" class="text-xs text-green-500">● Listening</span>
        <span v-else-if="status?.tcp" class="text-xs text-amber-500">Port in use</span>
        <button
          type="button"
          class="px-3 py-1.5 text-sm rounded border border-rm-border bg-rm-surface hover:bg-rm-surface/80"
          @click="clear"
        >
          Clear
        </button>
      </div>
    </div>

    <div class="codeseer-type-tabs flex items-center gap-0 border-b border-rm-border mb-3 overflow-x-auto">
      <button
        type="button"
        class="codeseer-type-tab px-4 py-2.5 text-sm font-medium border-b-2"
        :class="allTypesActive ? 'border-rm-accent text-rm-accent' : 'border-transparent text-rm-muted hover:text-rm-text'"
        @click="setAllTypes(true)"
      >
        All
      </button>
      <button
        v-for="t in effectiveTypes"
        :key="t"
        type="button"
        class="codeseer-type-tab px-4 py-2.5 text-sm font-medium border-b-2 shrink-0"
        :class="activeTypes.has(t) ? 'border-rm-accent text-rm-accent' : 'border-transparent text-rm-muted hover:text-rm-text'"
        @click="toggleType(t)"
      >
        {{ typeLabel(t) }}
      </button>
    </div>

    <div class="codeseer-search mb-3">
      <input
        v-model="searchQuery"
        type="search"
        class="w-full px-3 py-2 text-sm rounded border border-rm-border bg-rm-bg"
        placeholder="Search messages…"
        aria-label="Search messages"
      />
    </div>

    <div class="codeseer-list flex-1 min-h-0 overflow-auto p-4" ref="scrollRef">
      <ul class="codeseer-message-list list-none m-0 p-0 flex flex-col gap-3">
        <template v-for="(item, idx) in listWithHeaders" :key="item.key">
          <li v-if="item.type === 'header'" class="codeseer-group-header text-xs font-medium text-rm-muted py-2 px-0 border-b border-rm-border/60 mt-4 first:mt-0">{{ item.label }}</li>
          <MessageItem v-else :message="item.message" :info="info" />
        </template>
      </ul>
      <div v-if="messages.length === 0" class="codeseer-empty text-center py-16 px-6">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rm-surface border border-rm-border mb-4 text-rm-muted text-2xl">◆</div>
        <p class="text-rm-muted text-sm mb-1 font-medium">Listening for dumps</p>
        <p class="text-rm-muted/90 text-xs max-w-sm mx-auto">
          Run your PHP app and use <code class="bg-rm-surface border border-rm-border px-2 py-0.5 rounded text-rm-accent font-medium">cs('hello')</code> to send output here.
        </p>
      </div>
      <p v-else-if="filteredMessages.length === 0" class="text-center py-8 text-rm-muted text-sm">No messages match the current search or type.</p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import MessageItem from './MessageItem.vue';
import { MESSAGE_TYPES, TYPE_TAB_LABELS, getSearchableText, isPayloadEnvelope, normalizePayloadToMessage } from './messageUtils';

const props = defineProps({ info: { type: Object, default: null } });

const api = typeof window !== 'undefined' ? window.releaseManager : null;

const messages = ref([]);
const searchQuery = ref('');
const currentScreen = ref(null);
const activeTypes = ref(new Set(MESSAGE_TYPES));
const effectiveTypes = ref([...MESSAGE_TYPES]);
const status = ref(null);
const scrollRef = ref(null);

const allTypesActive = computed(() => effectiveTypes.value.length > 0 && effectiveTypes.value.every((t) => activeTypes.value.has(t)));

const filteredMessages = computed(() => {
  const list = [...messages.value];
  const types = activeTypes.value;
  const q = (searchQuery.value || '').trim().toLowerCase();
  return list.filter((msg) => {
    const typeOk = types.has(msg.type);
    const searchOk = !q || getSearchableText(msg).includes(q);
    return typeOk && searchOk;
  });
});

function timeBucketKey(msg) {
  const t = msg.meta?.time;
  if (!t) return '';
  const d = new Date(t);
  const today = new Date();
  const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  return isToday ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}

const listWithHeaders = computed(() => {
  const out = [];
  let lastBucket = null;
  for (const msg of filteredMessages.value) {
    const bucket = timeBucketKey(msg);
    if (bucket && bucket !== lastBucket) {
      lastBucket = bucket;
      out.push({ type: 'header', key: `h-${bucket}`, label: bucket });
    }
    out.push({ type: 'message', key: msg.uuid || `m-${out.length}`, message: msg });
  }
  return out;
});

function typeLabel(t) {
  return TYPE_TAB_LABELS[t] || t;
}

function setAllTypes(on) {
  if (on) activeTypes.value = new Set(effectiveTypes.value);
  else activeTypes.value = new Set();
}

function toggleType(t) {
  const next = new Set(activeTypes.value);
  if (next.has(t)) next.delete(t);
  else next.add(t);
  if (next.size === 0) next.add(effectiveTypes.value[0]);
  activeTypes.value = next;
}

function generateUuid() {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function addMessage(msg) {
  if (isPayloadEnvelope(msg)) {
    const envelopeMeta = {
      time: msg.meta?.time,
      label: msg.meta?.label,
      envelope_uuid: msg.uuid,
      screen: msg.meta?.screen,
    };
    for (const p of msg.payloads) {
      addMessage(normalizePayloadToMessage(p, envelopeMeta));
    }
    return;
  }
  if (msg.type === 'codeseer_clear_all' || msg.type === 'clear') {
    messages.value = [];
    return;
  }
  if (msg.type === 'codeseer_new_screen' || msg.type === 'screen') return;
  const screen = msg.meta?.screen != null ? String(msg.meta.screen) : '';
  const normalized = { ...msg, screen, uuid: msg.uuid || generateUuid() };
  messages.value = [...messages.value, normalized];
  const max = 500;
  if (messages.value.length > max) messages.value = messages.value.slice(-max);
}

async function loadInitialMessages() {
  if (!api?.codeseerGetMessages) return;
  try {
    const list = await api.codeseerGetMessages({ limit: 200 });
    if (Array.isArray(list)) messages.value = list.map((m) => ({ ...m, uuid: m.uuid || generateUuid() }));
  } catch (_) {}
}

async function fetchStatus() {
  if (!api?.codeseerGetConnectionsStatus) return;
  try {
    status.value = await api.codeseerGetConnectionsStatus();
  } catch (_) {}
}

async function clear() {
  if (api?.codeseerClear) await api.codeseerClear();
  messages.value = [];
}

onMounted(() => {
  if (!api) return;
  loadInitialMessages();
  fetchStatus();
  if (api.codeseerOnMessage) api.codeseerOnMessage(addMessage);
  if (api.codeseerOnServerReady) api.codeseerOnServerReady((data) => { status.value = { tcp: { port: data?.port ?? 23523, listening: true } }; });
  if (api.codeseerOnServerError) api.codeseerOnServerError(() => { status.value = { tcp: { port: 23523, listening: false } }; });
  if (api.codeseerOnClearRequest) api.codeseerOnClearRequest(() => { messages.value = []; });
});
</script>

<style scoped>
.codeseer-card {
  font-family: inherit;
}
.codeseer-type-tab {
  background: none;
  border: none;
  cursor: pointer;
}
.codeseer-message-list :deep(li[class*="header"]) {
  font-size: 12px;
  font-weight: 500;
  color: var(--rm-muted);
  padding: 8px 0;
  border-bottom: 1px solid var(--rm-border);
  margin-top: 16px;
}
.codeseer-message-list :deep(li[class*="header"]:first-child) {
  margin-top: 0;
}
</style>
