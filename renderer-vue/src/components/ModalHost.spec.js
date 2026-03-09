import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import ModalHost from './ModalHost.vue';

const DialogStub = {
  name: 'DialogStub',
  props: ['visible', 'header'],
  template: `<div v-if="visible" class="modal-stub"><div class="modal-header">{{ header }}</div><slot /></div>`,
};

describe('ModalHost', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const { closeModal } = require('../composables/useModals').useModals();
    closeModal();
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        ...globalThis.window.releaseManager,
        gitStashPush: vi.fn().mockResolvedValue(undefined),
        gitStashPop: vi.fn().mockResolvedValue(undefined),
      };
    }
  });

  it('renders nothing when no modal active', () => {
    const wrapper = mount(ModalHost, {
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.text()).toBe('');
  });

  it('renders DocsModal when docs modal opened', async () => {
    const { useModals } = await import('../composables/useModals');
    const modals = useModals();
    modals.openModal('docs', { docKey: 'branch-sync' });
    const wrapper = mount(ModalHost, {
      global: {
        plugins: [createPinia()],
        stubs: { Dialog: DialogStub },
      },
    });
    await wrapper.vm.$nextTick();
    await flushPromises();
    expect(wrapper.find('.modal-stub').exists()).toBe(true);
    expect(wrapper.text()).toMatch(/Documentation|Branch|Merge|Rebase/);
  });

  it('renders DiffFullModal when diffFull modal opened', async () => {
    const { useModals } = await import('../composables/useModals');
    const modals = useModals();
    modals.openModal('diffFull', { title: 'Diff', content: 'line 1' });
    const wrapper = mount(ModalHost, {
      global: {
        plugins: [createPinia()],
        stubs: { Dialog: DialogStub },
      },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toMatch(/Diff|line 1/);
  });

  it('closeModal clears active modal', async () => {
    const { useModals } = await import('../composables/useModals');
    const modals = useModals();
    modals.openModal('docs', { docKey: 'test' });
    const wrapper = mount(ModalHost, {
      global: {
        plugins: [createPinia()],
        stubs: { Dialog: DialogStub },
      },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.modal-stub').exists()).toBe(true);
    modals.closeModal();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.modal-stub').exists()).toBe(false);
  });
});
