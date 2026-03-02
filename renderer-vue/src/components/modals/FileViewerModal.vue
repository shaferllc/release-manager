<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-card modal-card-wide flex flex-col max-h-[85vh]">
      <div class="modal-header flex-shrink-0">
        <h3 class="modal-title truncate flex-1 min-w-0">{{ filePath || 'File' }}</h3>
        <button type="button" class="modal-close" aria-label="Close" @click="close">×</button>
      </div>
      <div class="modal-file-content m-0 p-4 flex-1 overflow-auto text-xs font-mono border-t border-rm-border" v-html="renderedContent"></div>
      <div class="modal-footer flex-shrink-0 flex flex-wrap items-center gap-2 p-3 border-t border-rm-border">
        <button type="button" class="btn-secondary btn-compact text-xs" @click="openInEditor">Open in editor</button>
        <button type="button" class="btn-secondary btn-compact text-xs" title="Show line-by-line blame" @click="showBlame">Blame</button>
        <button v-if="showDiffBtn" type="button" class="btn-secondary btn-compact text-xs" title="Back to diff view" @click="showDiff">Show diff</button>
        <button type="button" class="btn-secondary btn-compact text-xs" @click="close">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useApi } from '../../composables/useApi';

const props = defineProps({
  dirPath: { type: String, default: '' },
  filePath: { type: String, default: '' },
  isUntracked: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const api = useApi();
const viewMode = ref('diff'); // 'diff' | 'blame'
const content = ref('');
const showDiffBtn = computed(() => viewMode.value === 'blame');

async function loadDiff() {
  if (!props.dirPath || !props.filePath) return;
  viewMode.value = 'diff';
  try {
    const result = await api.getFileDiff?.(props.dirPath, props.filePath, props.isUntracked);
    content.value = result?.error || result?.content || result || '';
  } catch (e) {
    content.value = String(e?.message || e);
  }
}

async function loadBlame() {
  if (!props.dirPath || !props.filePath) return;
  viewMode.value = 'blame';
  try {
    const result = await api.getBlame?.(props.dirPath, props.filePath);
    content.value = result?.error || result?.content || result || '';
  } catch (e) {
    content.value = String(e?.message || e);
  }
}

const renderedContent = computed(() => {
  const raw = content.value;
  if (!raw) return '';
  return raw
    .split('\n')
    .map((line) => {
      let cls = '';
      if (line.startsWith('diff --git ')) cls = 'diff-header';
      else if (line.startsWith('index ')) cls = 'diff-meta';
      else if (line.startsWith('--- ')) cls = 'diff-file-old';
      else if (line.startsWith('+++ ')) cls = 'diff-file-new';
      else if (line.startsWith('@@') && line.includes('@@')) cls = 'diff-hunk';
      else if (line.startsWith('+')) cls = 'diff-add';
      else if (line.startsWith('-')) cls = 'diff-remove';
      else cls = 'diff-context';
      return `<div class="${cls}">${escapeHtml(line)}</div>`;
    })
    .join('\n');
});

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

watch(() => [props.dirPath, props.filePath], loadDiff, { immediate: true });

function close() {
  emit('close');
}

function openInEditor() {
  api.openFileInEditor?.(props.dirPath, props.filePath);
}

function showBlame() {
  loadBlame();
}

function showDiff() {
  loadDiff();
}
</script>
