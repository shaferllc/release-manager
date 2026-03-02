<template>
  <template v-if="activeModal">
    <SwitchWithChangesModal v-if="activeModal === 'switchWithChanges'" @stash-pop="onSwitchStashPop" @stash-only="onSwitchStashOnly" @cancel="onSwitchCancel" @close="onModalClose" />
    <CommitDetailModal
      v-else-if="activeModal === 'commitDetail' && modalPayload"
      :dir-path="modalPayload.dirPath"
      :sha="modalPayload.sha"
      :is-head="modalPayload.isHead"
      @close="onModalClose"
      @refresh="onModalRefresh"
      @open-diff-side-by-side="onOpenDiffSideBySide"
    />
    <DiffFullModal
      v-else-if="activeModal === 'diffFull' && modalPayload"
      :title="modalPayload.title"
      :content="modalPayload.content"
      @close="onModalClose"
    />
    <DiffSideBySideModal
      v-else-if="activeModal === 'diffSideBySide' && modalPayload"
      :dir-path="modalPayload.dirPath"
      :file-path="modalPayload.filePath"
      :commit-sha="modalPayload.commitSha || ''"
      :title="modalPayload.title"
      @close="onModalClose"
      @refresh="onModalRefresh"
    />
    <FileViewerModal
      v-else-if="activeModal === 'fileViewer' && modalPayload"
      :dir-path="modalPayload.dirPath"
      :file-path="modalPayload.filePath"
      :is-untracked="modalPayload.isUntracked"
      @close="onModalClose"
    />
    <ChooseVersionModal
      v-else-if="activeModal === 'chooseVersion' && modalPayload"
      :git-remote="modalPayload.gitRemote"
      :token="modalPayload.token"
      @close="onModalClose"
      @select="onChooseVersionSelect"
    />
    <PickAssetModal
      v-else-if="activeModal === 'pickAsset' && modalPayload"
      :assets="modalPayload.assets || []"
      @close="onModalClose"
      @select="onPickAssetSelect"
    />
    <DocsModal
      v-else-if="activeModal === 'docs' && modalPayload"
      :doc-key="modalPayload.docKey"
      @close="onModalClose"
    />
    <BisectRefPickerModal
      v-else-if="activeModal === 'bisectRefPicker' && modalPayload"
      :default-bad="modalPayload.defaultBad"
      :default-good="modalPayload.defaultGood"
      @close="onModalClose"
      @confirm="onBisectConfirm"
    />
  </template>
</template>

<script setup>
import { computed } from 'vue';
import { useModals } from '../composables/useModals';
import { useApi } from '../composables/useApi';
import SwitchWithChangesModal from './modals/SwitchWithChangesModal.vue';
import CommitDetailModal from './modals/CommitDetailModal.vue';
import DiffFullModal from './modals/DiffFullModal.vue';
import DiffSideBySideModal from './modals/DiffSideBySideModal.vue';
import FileViewerModal from './modals/FileViewerModal.vue';
import ChooseVersionModal from './modals/ChooseVersionModal.vue';
import PickAssetModal from './modals/PickAssetModal.vue';
import DocsModal from './modals/DocsModal.vue';
import BisectRefPickerModal from './modals/BisectRefPickerModal.vue';

const { activeModal: activeModalRef, modalPayload: modalPayloadRef, closeModal, openModal } = useModals();
const api = useApi();

const activeModal = computed(() => activeModalRef.value);
const modalPayload = computed(() => modalPayloadRef.value);

const emit = defineEmits(['switch-stash-pop', 'switch-stash-only', 'choose-version', 'pick-asset', 'bisect-confirm', 'refresh']);

function onModalClose() {
  closeModal();
}

function onOpenDiffSideBySide(payload) {
  closeModal();
  openModal('diffSideBySide', payload);
}

function onModalRefresh() {
  modalPayloadRef.value?.onRefresh?.();
  emit('refresh');
}

async function onSwitchStashPop() {
  const payload = modalPayloadRef.value;
  if (payload?.dirPath && typeof payload?.doCheckout === 'function') {
    try {
      await api.gitStashPush?.(payload.dirPath, '', {});
      await payload.doCheckout();
      await api.gitStashPop?.(payload.dirPath);
      emit('refresh');
    } catch (_) {}
  }
  closeModal();
}

async function onSwitchStashOnly() {
  const payload = modalPayloadRef.value;
  if (payload?.dirPath && typeof payload?.doCheckout === 'function') {
    try {
      await api.gitStashPush?.(payload.dirPath, '', {});
      await payload.doCheckout();
      emit('refresh');
    } catch (_) {}
  }
  closeModal();
}

function onSwitchCancel() {
  modalPayloadRef.value?.onCancel?.();
  closeModal();
}

function onChooseVersionSelect(release) {
  modalPayloadRef.value?.onSelect?.(release);
  emit('choose-version', release);
  closeModal();
}

function onPickAssetSelect(asset) {
  modalPayloadRef.value?.onComplete?.();
  emit('pick-asset', asset);
  closeModal();
}

function onBisectConfirm({ badRef, goodRef }) {
  modalPayloadRef.value?.onConfirm?.({ badRef, goodRef });
  emit('bisect-confirm', { badRef, goodRef });
  closeModal();
}
</script>
