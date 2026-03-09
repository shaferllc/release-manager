<template>
  <Dialog
    :visible="true"
    :header="filePath || 'File'"
    :style="{ width: '42rem' }"
    :modal="true"
    :dismissableMask="true"
    class="max-h-[85vh] flex flex-col"
    @update:visible="(v) => { if (!v) close(); }"
    @hide="close"
  >
    <div class="modal-file-content m-0 flex-1 overflow-auto text-xs font-mono border-t border-rm-border p-4" v-html="renderedContent"></div>
    <template #footer>
      <Button severity="secondary" size="small" class="text-xs" @click="openInEditor">Open in editor</Button>
      <Button severity="secondary" size="small" class="text-xs" title="Show line-by-line blame" @click="showBlame">Blame</Button>
      <Button v-if="showDiffBtn" severity="secondary" size="small" class="text-xs" title="Back to diff view" @click="showDiff">Show diff</Button>
      <Button severity="secondary" size="small" class="text-xs" @click="close">Close</Button>
    </template>
  </Dialog>
</template>

<script setup>
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { useFileViewer } from '../../composables/useFileViewer';

const props = defineProps({
  dirPath: { type: String, default: '' },
  filePath: { type: String, default: '' },
  isUntracked: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const {
  filePath,
  renderedContent,
  showDiffBtn,
  close,
  openInEditor,
  showBlame,
  showDiff,
} = useFileViewer(
  () => props.dirPath,
  () => props.filePath,
  () => props.isUntracked,
  emit
);
</script>
