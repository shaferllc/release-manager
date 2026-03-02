<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-card modal-card-diff-side-by-side flex flex-col max-w-[92vw] max-h-[95vh] min-h-[70vh] w-full">
      <div class="modal-header flex-shrink-0">
        <h3 class="modal-title truncate flex-1 min-w-0">{{ displayTitle }}</h3>
        <button type="button" class="modal-close" aria-label="Close" @click="close">×</button>
      </div>
      <div v-if="error" class="p-4 text-sm text-rm-warning">{{ error }}</div>
      <div v-else-if="loading" class="p-4 text-sm text-rm-muted">Loading diff…</div>
      <div v-else class="diff-side-by-side flex-1 min-h-0 flex flex-col border-t border-rm-border">
        <!-- Column headers -->
        <div class="diff-side-by-side-header flex flex-shrink-0 text-xs font-medium text-rm-muted border-b border-rm-border bg-rm-surface/50">
          <div class="diff-pane diff-pane-old flex-1 min-w-0 flex items-center gap-2 px-3 py-2">
            <span>Old</span>
            <span v-if="filePath" class="truncate">{{ filePath }}</span>
          </div>
          <div class="diff-pane diff-pane-new flex-1 min-w-0 flex items-center gap-2 px-3 py-2 border-l border-rm-border">
            <span>New</span>
          </div>
        </div>
        <!-- Two panes scroll together -->
        <div class="diff-side-by-side-body flex-1 min-h-0 overflow-auto">
          <table class="diff-side-by-side-table w-full text-xs font-mono border-collapse">
            <tbody>
              <tr
                v-for="(row, i) in rowsWithInsert"
                :key="i"
                class="diff-row"
                :class="rowTypeClass(row)"
              >
                <td class="diff-cell diff-cell-old">
                  <div class="diff-cell-inner flex items-stretch">
                    <span class="diff-line-num shrink-0">{{ row.oldLineNum != null ? row.oldLineNum : '' }}</span>
                    <span class="diff-line-content flex-1 min-w-0">{{ row.oldContent ?? '' }}</span>
                    <span class="diff-actions shrink-0">
                      <button
                        v-if="row.oldContent != null"
                        type="button"
                        class="diff-copy-btn"
                        title="Copy old line"
                        @click="copyLine(row.oldContent)"
                      >
                        Copy
                      </button>
                    </span>
                  </div>
                </td>
                <td class="diff-cell diff-cell-new border-l border-rm-border">
                  <div class="diff-cell-inner flex items-stretch">
                    <span class="diff-line-num shrink-0">{{ row.newLineNum != null ? row.newLineNum : '' }}</span>
                    <span class="diff-line-content flex-1 min-w-0">{{ row.newContent ?? '' }}</span>
                    <span class="diff-actions shrink-0">
                      <button
                        v-if="row.newContent != null || row.oldContent != null"
                        type="button"
                        class="diff-copy-btn"
                        :title="'Copy ' + (row.newContent != null ? 'new' : 'old') + ' line'"
                        @click="copyLine(row.newContent != null ? row.newContent : row.oldContent)"
                      >
                        Copy
                      </button>
                      <button
                        v-if="canUseOld(row)"
                        type="button"
                        class="diff-use-old-btn"
                        title="Use old (left) — set this line to the old version"
                        @click="useOld(row)"
                      >
                        Use old
                      </button>
                      <button
                        v-if="canUseNew(row)"
                        type="button"
                        class="diff-use-new-btn"
                        title="Use new (right) — set this line back to the new version"
                        @click="useNew(row)"
                      >
                        Use new
                      </button>
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer flex-shrink-0 flex flex-wrap items-center gap-2 p-3 border-t border-rm-border">
        <button type="button" class="btn-secondary btn-compact text-xs" @click="close">Close</button>
        <button
          v-if="!props.commitSha && props.dirPath && props.filePath"
          type="button"
          class="btn-secondary btn-compact text-xs text-rm-warning hover:bg-rm-warning/10"
          title="Discard all changes in this file"
          @click="discardEntireFile"
        >
          Discard entire file
        </button>
        <span v-if="revertStatus" class="text-xs" :class="revertStatus.ok ? 'text-rm-success' : 'text-rm-warning'">{{ revertStatus.ok ? 'Reverted. Refresh to see changes.' : revertStatus.error }}</span>
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
  commitSha: { type: String, default: '' },
  title: { type: String, default: '' },
});
const emit = defineEmits(['close', 'refresh']);

const api = useApi();
const loading = ref(true);
const error = ref('');
const rows = ref([]);
const revertStatus = ref(null);

const displayTitle = computed(() => props.title || (props.commitSha ? `Diff: ${props.filePath} @ ${props.commitSha.slice(0, 7)}` : `Diff: ${props.filePath}`));

/** Compute insertBeforeNewLine for remove-only rows so we can offer "Restore". */
const rowsWithInsert = computed(() => {
  const list = rows.value;
  const out = list.map((r) => ({ ...r }));
  for (let i = 0; i < out.length; i++) {
    if (out[i].type === 'remove' && out[i].newLineNum == null) {
      for (let j = i + 1; j < out.length; j++) {
        if (out[j].newLineNum != null) {
          out[i].insertBeforeNewLine = out[j].newLineNum;
          break;
        }
      }
      if (out[i].insertBeforeNewLine == null) {
        const prev = out.slice(0, i).reverse().find((r) => r.newLineNum != null);
        out[i].insertBeforeNewLine = prev ? prev.newLineNum + 1 : 1;
      }
    }
  }
  return out;
});

function rowTypeClass(row) {
  if (row.type === 'add') return 'diff-row-add';
  if (row.type === 'remove') return 'diff-row-remove';
  return 'diff-row-context';
}

function canRevertRow(row) {
  if (!props.dirPath || !props.filePath) return false;
  if (row.type === 'add') return true;
  if (row.type === 'remove') return true;
  if (row.type === 'context' && row.oldContent !== row.newContent) return false;
  if (row.type === 'context') return false;
  return row.newLineNum != null && (row.oldContent != null || row.type === 'add');
}

async function revertRow(row) {
  revertStatus.value = null;
  try {
    if (row.type === 'add') {
      const res = await api.revertFileLine?.(props.dirPath, props.filePath, 'delete', row.newLineNum, null);
      revertStatus.value = res;
    } else if (row.type === 'remove' && row.insertBeforeNewLine != null) {
      const res = await api.revertFileLine?.(props.dirPath, props.filePath, 'insert', row.insertBeforeNewLine, row.oldContent);
      revertStatus.value = res;
    } else if (row.newLineNum != null && row.oldContent != null) {
      const res = await api.revertFileLine?.(props.dirPath, props.filePath, 'replace', row.newLineNum, row.oldContent);
      revertStatus.value = res;
    }
    if (revertStatus.value?.ok) {
      emit('refresh');
      setTimeout(() => { revertStatus.value = null; }, 3000);
    }
  } catch (e) {
    revertStatus.value = { ok: false, error: e?.message || String(e) };
  }
}

async function copyLine(text) {
  if (text != null && api.copyToClipboard) await api.copyToClipboard(text);
}

async function discardEntireFile() {
  if (!props.dirPath || !props.filePath || !api.discardFile) return;
  if (!window.confirm(`Discard all changes in "${props.filePath}"? This cannot be undone.`)) return;
  revertStatus.value = null;
  try {
    await api.discardFile(props.dirPath, props.filePath);
    emit('refresh');
    close();
  } catch (e) {
    revertStatus.value = { ok: false, error: e?.message || String(e) };
  }
}

async function load() {
  if (!props.dirPath || !props.filePath) {
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const options = props.commitSha ? { commitSha: props.commitSha } : {};
    const result = await api.getFileDiffStructured?.(props.dirPath, props.filePath, options);
    if (result?.error) {
      error.value = result.error;
      rows.value = [];
    } else if (result?.ok) {
      rows.value = result.rows || [];
    } else {
      rows.value = [];
    }
  } catch (e) {
    error.value = e?.message || String(e);
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

watch(() => [props.dirPath, props.filePath, props.commitSha], load, { immediate: true });

function close() {
  emit('close');
}
</script>

<style scoped>
.modal-card-diff-side-by-side {
  max-width: 92vw;
  max-height: 95vh;
  min-height: 70vh;
  width: 100%;
}
.diff-side-by-side-body {
  font-size: 12px;
}
.diff-pane {
  min-width: 0;
}
.diff-cell-inner {
  padding: 2px 8px;
  min-height: 1.5em;
  gap: 8px;
}
.diff-line-num {
  width: 2.5rem;
  text-align: right;
  color: var(--rm-muted);
  user-select: none;
  flex-shrink: 0;
}
.diff-line-content {
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: break-word;
}
.diff-actions {
  display: flex;
  gap: 4px;
  opacity: 0.7;
}
.diff-row:hover .diff-actions {
  opacity: 1;
}
.diff-copy-btn,
.diff-revert-btn {
  padding: 1px 6px;
  font-size: 10px;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  background: rgb(var(--rm-surface));
  color: rgb(var(--rm-accent));
}
.diff-copy-btn:hover,
.diff-revert-btn:hover {
  background: rgb(var(--rm-accent) / 0.2);
}
.diff-revert-btn {
  color: rgb(var(--rm-warning));
}
.diff-row-add .diff-cell-old {
  background: rgb(var(--rm-bg));
}
.diff-row-add .diff-cell-new {
  background: rgb(var(--rm-success) / 0.08);
}
.diff-row-remove .diff-cell-old {
  background: rgb(var(--rm-warning) / 0.1);
}
.diff-row-remove .diff-cell-new {
  background: rgb(var(--rm-bg));
}
.diff-row-context .diff-cell-old,
.diff-row-context .diff-cell-new {
  background: rgb(var(--rm-surface) / 0.3);
}
</style>
