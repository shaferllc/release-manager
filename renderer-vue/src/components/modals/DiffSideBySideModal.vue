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
    <Message v-if="error" severity="warn" class="m-4 text-sm">{{ error }}</Message>
      <div v-else-if="loading" class="p-4 flex flex-col items-center gap-3 text-sm text-rm-muted">
        <ProgressSpinner aria-hidden="true" class="!w-8 !h-8" />
        <span>Loading diff…</span>
      </div>
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
                      <Button
                        v-if="row.oldContent != null"
                        variant="text"
                        size="small"
                        class="diff-copy-btn min-w-0"
                        title="Copy old line"
                        @click="copyLine(row.oldContent)"
                      >
                        Copy
                      </Button>
                    </span>
                  </div>
                </td>
                <td class="diff-cell diff-cell-new border-l border-rm-border">
                  <div class="diff-cell-inner flex items-stretch">
                    <span class="diff-line-num shrink-0">{{ row.newLineNum != null ? row.newLineNum : '' }}</span>
                    <span class="diff-line-content flex-1 min-w-0">{{ row.newContent ?? '' }}</span>
                    <span class="diff-actions shrink-0">
                      <Button
                        v-if="row.newContent != null || row.oldContent != null"
                        variant="text"
                        size="small"
                        class="diff-copy-btn min-w-0"
                        :title="'Copy ' + (row.newContent != null ? 'new' : 'old') + ' line'"
                        @click="copyLine(row.newContent != null ? row.newContent : row.oldContent)"
                      >
                        Copy
                      </Button>
                      <Button
                        v-if="canUseOld(row)"
                        variant="text"
                        size="small"
                        class="diff-use-old-btn min-w-0"
                        title="Use old (left) — set this line to the old version"
                        @click="useOld(row)"
                      >
                        Use old
                      </Button>
                      <Button
                        v-if="canUseNew(row)"
                        variant="text"
                        size="small"
                        class="diff-use-new-btn min-w-0"
                        title="Use new (right) — set this line back to the new version"
                        @click="useNew(row)"
                      >
                        Use new
                      </Button>
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
        v-if="!commitSha && dirPath && filePath"
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
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import { useDiffSideBySide } from '../../composables/useDiffSideBySide';

const props = defineProps({
  dirPath: { type: String, default: '' },
  filePath: { type: String, default: '' },
  commitSha: { type: String, default: '' },
  /** When set, show staged (index vs HEAD) or unstaged (working tree vs index) diff; undefined = working tree vs HEAD */
  staged: { type: Boolean, default: undefined },
  title: { type: String, default: '' },
});
const emit = defineEmits(['close', 'refresh']);

const {
  loading,
  error,
  revertStatus,
  dirPath,
  filePath,
  commitSha,
  displayTitle,
  rowsWithInsert,
  rowTypeClass,
  canUseOld,
  canUseNew,
  useOld,
  useNew,
  copyLine,
  discardEntireFile,
  close,
} = useDiffSideBySide(
  () => props.dirPath,
  () => props.filePath,
  () => props.commitSha,
  () => props.staged,
  () => props.title,
  emit
);
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
