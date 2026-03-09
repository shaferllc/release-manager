<template>
  <li class="codeseer-message" :class="`codeseer-message-${message.type}`" :style="borderStyle">
    <div class="codeseer-message-meta">
      <span class="codeseer-message-type">{{ message.type }}</span>
      <button v-if="fileLineClickable" type="button" class="codeseer-message-file-link" :title="`Open in editor: ${message.meta?.file}:${message.meta?.line}`" @click="openInEditor">
        {{ fileDisplay }}:{{ message.meta?.line ?? '' }}
      </button>
      <span v-else class="codeseer-message-file">{{ fileDisplay }}:{{ message.meta?.line ?? '' }}</span>
      <span v-if="message.meta?.label" class="codeseer-message-label">{{ message.meta.label }}</span>
      <span v-if="message.meta?.time" class="codeseer-message-time">{{ timeStr }}</span>
      <button type="button" class="codeseer-message-copy" title="Copy message" @click="copy">Copy</button>
    </div>
    <div class="codeseer-message-payload"><pre class="codeseer-message-pre">{{ payloadText }}</pre></div>
  </li>
</template>

<script setup>
import { computed } from 'vue';
import { formatPayload } from './messageUtils';

const props = defineProps({
  message: { type: Object, required: true },
  info: { type: Object, default: null },
});
const api = typeof window !== 'undefined' ? window.releaseManager : null;

const meta = computed(() => props.message.meta || {});
const fileDisplay = computed(() => (meta.value.file ? meta.value.file.replace(/^.*[/\\]/, '') : ''));
const timeStr = computed(() => (meta.value.time ? new Date(meta.value.time).toLocaleTimeString() : ''));
const payloadText = computed(() => formatPayload(props.message));
const fileLineClickable = computed(() => !!(meta.value.file && api?.openFileInEditor));
const borderStyle = computed(() => (meta.value.color ? { borderLeftColor: meta.value.color, borderLeftWidth: '3px', borderLeftStyle: 'solid' } : {}));

function openInEditor() {
  if (meta.value.file && api?.openFileInEditor) {
    api.openFileInEditor(props.info?.path ?? '', meta.value.file, meta.value.line);
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(payloadText.value);
  } catch (_) {}
}
</script>

<style scoped>
.codeseer-message {
  list-style: none;
  padding: 10px 12px;
  border-radius: 6px;
  border-left: 3px solid transparent;
  background: var(--rm-surface, #1e1e1e);
  border: 1px solid var(--rm-border, #333);
}
.codeseer-message-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 11px;
}
.codeseer-message-type {
  font-weight: 600;
  font-variant: small-caps;
}
.codeseer-message-file-link,
.codeseer-message-file {
  font-family: ui-monospace, monospace;
  font-size: 11px;
}
.codeseer-message-file-link {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--rm-muted, #888);
  text-decoration: none;
}
.codeseer-message-file-link:hover {
  color: var(--rm-accent, #3b82f6);
  text-decoration: underline;
}
.codeseer-message-label { color: var(--rm-muted, #888); }
.codeseer-message-time { color: var(--rm-muted, #888); margin-left: auto; }
.codeseer-message-copy {
  padding: 2px 8px;
  font-size: 10px;
  border-radius: 4px;
  border: 1px solid var(--rm-border, #333);
  background: transparent;
  color: var(--rm-muted, #888);
  cursor: pointer;
}
.codeseer-message-copy:hover {
  background: var(--rm-surface, #2a2a2a);
  color: var(--rm-text, #fff);
}
.codeseer-message-payload { font-size: 12px; }
.codeseer-message-pre {
  margin: 0;
  font-family: ui-monospace, monospace;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
