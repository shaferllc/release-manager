<template>
  <Dialog
    :visible="true"
    :header="title"
    :style="{ width: '42rem' }"
    :modal="true"
    :dismissableMask="true"
    class="max-h-[85vh] flex flex-col"
    @update:visible="(v) => { if (!v) close(); }"
    @hide="close"
  >
    <div class="m-0 flex-1 overflow-auto text-xs font-mono border-t border-rm-border whitespace-pre-wrap p-4">{{ content }}</div>
    <template #footer>
      <Button severity="secondary" size="small" class="text-xs shrink-0" @click="copySha">Copy SHA</Button>
      <Button severity="secondary" size="small" class="text-xs shrink-0" @click="cherryPick">Cherry-pick</Button>
      <Button severity="danger" size="small" class="text-xs shrink-0" @click="revert">Revert</Button>
      <Button v-if="isHead" severity="secondary" size="small" class="text-xs shrink-0" title="Amend this commit (only for HEAD)" @click="amend">Amend</Button>
      <template v-if="commitFiles.length">
        <span class="text-xs text-rm-muted shrink-0">Side-by-side:</span>
        <Select v-model="sideBySideFile" :options="sideBySideFileOptions" optionLabel="label" optionValue="value" class="text-xs px-2 py-1 max-w-[14rem] truncate" />
        <Button severity="primary" size="small" class="text-xs shrink-0" title="Open side-by-side diff (old | new) with copy and revert line" @click="openSideBySide">Open</Button>
      </template>
      <Button severity="secondary" size="small" class="text-xs shrink-0" @click="close">Close</Button>
    </template>
  </Dialog>
</template>

<script setup>
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import { useCommitDetail } from '../../composables/useCommitDetail';

const props = defineProps({
  dirPath: { type: String, default: '' },
  sha: { type: String, default: '' },
  isHead: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'refresh', 'open-diff-side-by-side']);

const {
  content,
  title,
  commitFiles,
  sideBySideFile,
  sideBySideFileOptions,
  close,
  openSideBySide,
  copySha,
  cherryPick,
  revert,
  amend,
} = useCommitDetail(
  () => props.dirPath,
  () => props.sha,
  () => props.isHead,
  emit
);
</script>
