import { describe, it, expect, beforeEach } from 'vitest';
import { useModals } from './useModals';

describe('useModals', () => {
  beforeEach(() => {
    useModals().closeModal();
  });

  it('openModal sets activeModal and payload', () => {
    const { openModal, activeModal, modalPayload } = useModals();
    expect(activeModal.value).toBe(null);
    expect(modalPayload.value).toBe(null);
    openModal('docs', { docKey: 'foo' });
    expect(activeModal.value).toBe('docs');
    expect(modalPayload.value).toEqual({ docKey: 'foo' });
  });

  it('closeModal clears activeModal and payload', () => {
    const { openModal, closeModal, activeModal, modalPayload } = useModals();
    openModal('diffFull', { title: 'Test' });
    closeModal();
    expect(activeModal.value).toBe(null);
    expect(modalPayload.value).toBe(null);
  });

  it('openModal with no payload uses null', () => {
    const { openModal, modalPayload } = useModals();
    openModal('commitDetail');
    expect(modalPayload.value).toBe(null);
  });
});
