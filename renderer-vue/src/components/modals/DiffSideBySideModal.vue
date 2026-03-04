<template>
  <Dialog
    :visible="true"
    :header="displayTitle"
    :style="{ width: '92vw', maxWidth: 'none' }"
    :modal="true"
    :dismissableMask="true"
    class="rm-modal-diff-side-by-side flex flex-col max-w-[92vw] max-h-[95vh] min-h-[70vh] w-full"
    @update:visible="(v) => { if (!v) close(); }"
    @hide="close"
  >
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
    <template #footer>
      <Button severity="secondary" size="small" class="text-xs" @click="close">Close</Button>
      <Button
        v-if="!props.commitSha && props.dirPath && props.filePath"
        severity="secondary"
        size="small"
        class="text-xs text-rm-warning hover:bg-rm-warning/10"
        title="Discard all changes in this file"
        @click="discardEntireFile"
      >
        Discard entire file
      </Button>
      <span v-if="revertStatus" class="text-xs" :class="revertStatus.ok ? 'text-rm-success' : 'text-rm-warning'">{{ revertStatus.ok ? 'Reverted. Refresh to see changes.' : revertStatus.error }}</span>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { useApi } from '../../composables/useApi';

const props = defineProps({
  dirPath: { type: String, default: '' },
  filePath: { type: String, default: '' },
  commitSha: { type: String, default: '' },
  /** When set, show staged (index vs HEAD) or unstaged (working tree vs index) diff; undefined = working tree vs HEAD */
  staged: { type: Boolean, default: undefined },
  title: { type: String, default: '' },
});
const emit = defineEmits(['close', 'refresh']);

const api = useApi();
const loading = ref(true);
const error = ref('');
const rows = ref([]);
const revertStatus = ref(null);

const displayTitle = computed(() => {
  if (props.title) return props.title;
  if (props.commitSha) return `Diff: ${props.filePath} @ ${props.commitSha.slice(0, 7)}`;
  if (props.staged === true) return `Diff (staged): ${props.filePath}`;
  if (props.staged === false) return `Diff (unstaged): ${props.filePath}`;
  return `Diff: ${props.filePath}`;
});

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

/** Show "Use old" when this line has new content and we can set file to old (and not already reverted). Only for working tree diff. */
function canUseOld(row) {
  if (props.commitSha || !props.dirPath || !props.filePath || row.revertedToOld) return false;
  if (row.type === 'add') return true;
  if (row.type === 'remove') return true;
  if (row.type === 'context' && row.oldContent !== row.newContent) return false;
  if (row.type === 'context') return false;
  return row.newLineNum != null && (row.oldContent != null || row.type === 'add');
}

/** Show "Use new" when we previously reverted this line to old and can re-apply new. Only for working tree diff. */
function canUseNew(row) {
  if (props.commitSha || !props.dirPath || !props.filePath || !row.revertedToOld) return false;
  return row.originalNewContent !== undefined;
}

async function useOld(row) {
  revertStatus.value = null;
  try {
    if (row.type === 'add') {
      const res = await api.revertFileLine?.(props.dirPath, props.filePath, 'delete', row.newLineNum, null);
      revertStatus.value = res;
      if (res?.ok) {
        row.originalNewContent = row.newContent;
        row.newContent = null;
        row.revertedToOld = true;
      }
    } else if (row.type === 'remove' && row.insertBeforeNewLine != null) {
      const res = await api.revertFileLine?.(props.dirPath, props.filePath, 'insert', row.insertBeforeNewLine, row.oldContent);
      revertStatus.value = res;
      if (res?.ok) {
        row.originalNewContent = row.newContent;
        row.newContent = row.oldContent;
        row.revertedToOld = true;
      }
    } else if (row.newLineNum != null && row.oldContent != null) {
      const res = await api.revertFileLine?.(props.dirPath, props.filePath, 'replace', row.newLineNum, row.oldContent);
      revertStatus.value = res;
      if (res?.ok) {
        row.originalNewContent = row.newContent;
        row.newContent = row.oldContent;
        row.revertedToOld = true;
      }
    }
    if (revertStatus.value?.ok) {
      emit('refresh');
      setTimeout(() => { revertStatus.value = null; }, 3000);
    }
  } catch (e) {
    revertStatus.value = { ok: false, error: e?.message || String(e) };
  }
}

async function useNew(row) {
  revertStatus.value = null;
  try {
    if (row.type === 'add') {
      const res = await api.revertFileLine?.(props.dirPath, props.filePath, 'insert', row.newLineNum, row.originalNewContent ?? row.newContent);
      revertStatus.value = res;
      if (res?.ok) {
        row.newContent = row.originalNewContent;
        row.revertedToOld = false;
      }
    } else if (row.type === 'remove' && row.insertBeforeNewLine != null) {
      const res = await api.revertFileLine?.(props.dirPath, props.filePath, 'delete', row.insertBeforeNewLine, null);
      revertStatus.value = res;
      if (res?.ok) {
        row.newContent = null;
        row.revertedToOld = false;
      }
    } else if (row.newLineNum != null && row.originalNewContent !== undefined) {
      const res = await api.revertFileLine?.(props.dirPath, props.filePath, 'replace', row.newLineNum, row.originalNewContent);
      revertStatus.value = res;
      if (res?.ok) {
        row.newContent = row.originalNewContent;
        row.revertedToOld = false;
      }
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
    const options = props.commitSha ? { commitSha: props.commitSha } : { staged: props.staged };
    const result = await api.getFileDiffStructured?.(props.dirPath, props.filePath, options);
    if (result?.error) {
      error.value = result.error;
      rows.value = [];
    } else if (result?.ok) {
      const raw = result.rows || [];
      rows.value = raw.map((r) => ({
        ...r,
        originalNewContent: r.newContent,
        revertedToOld: false,
      }));
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

watch(() => [props.dirPath, props.filePath, props.commitSha, props.staged], load, { immediate: true });

function close() {
  emit('close');
}
</script>

<style scoped>
.rm-modal-diff-side-by-side {
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
.diff-use-old-btn,
.diff-use-new-btn {
  padding: 1px 6px;
  font-size: 10px;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  background: rgb(var(--rm-surface));
}
.diff-copy-btn {
  color: rgb(var(--rm-muted));
}
.diff-copy-btn:hover {
  background: rgb(var(--rm-surface-hover));
  color: rgb(var(--rm-text));
}
.diff-use-old-btn {
  color: rgb(var(--rm-warning));
}
.diff-use-old-btn:hover {
  background: rgb(var(--rm-warning) / 0.2);
}
.diff-use-new-btn {
  color: rgb(var(--rm-accent));
}
.diff-use-new-btn:hover {
  background: rgb(var(--rm-accent) / 0.2);
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
