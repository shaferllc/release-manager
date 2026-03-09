import { ref, readonly } from 'vue';

const activeModal = ref(null);
const modalPayload = ref(null);

export function useModals() {
  function openModal(name, payload = null) {
    activeModal.value = name;
    modalPayload.value = payload;
  }

  function closeModal() {
    activeModal.value = null;
    modalPayload.value = null;
  }

  return {
    activeModal: readonly(activeModal),
    modalPayload: readonly(modalPayload),
    openModal,
    closeModal,
  };
}

export { activeModal, modalPayload };
