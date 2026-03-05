import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Button from 'primevue/button';
import DiffFullModal from './DiffFullModal.vue';

// Stub Dialog so we can assert on header, content, and footer without PrimeVue's Teleport/DOM
const DialogStub = {
  name: 'DialogStub',
  components: { Button },
  props: ['header'],
  template: `<div class="dialog-stub">
    <div class="dialog-header">{{ header }}</div>
    <slot />
    <Button variant="text" size="small" class="dialog-mask-dismiss" @click="$emit('update:visible', false)">Dismiss</Button>
    <div class="dialog-footer"><slot name="footer" /></div>
  </div>`,
};

describe('DiffFullModal', () => {
  beforeEach(() => {
    if (globalThis.window?.releaseManager) {
      globalThis.window.releaseManager.copyToClipboard = vi.fn().mockResolvedValue();
    }
  });
  it('renders title and content', () => {
    const wrapper = mount(DiffFullModal, {
      props: { title: 'Suggested fix', content: 'Hello world' },
      global: { stubs: { Dialog: DialogStub } },
    });
    expect(wrapper.find('.dialog-header').text()).toBe('Suggested fix');
    expect(wrapper.find('pre').text()).toBe('Hello world');
  });

  it('uses default title when not provided', () => {
    const wrapper = mount(DiffFullModal, {
      props: { content: 'x' },
      global: { stubs: { Dialog: DialogStub } },
    });
    expect(wrapper.find('.dialog-header').text()).toBe('Diff');
  });

  it('shows Diff when title is empty string', () => {
    const wrapper = mount(DiffFullModal, {
      props: { title: '', content: 'x' },
      global: { stubs: { Dialog: DialogStub } },
    });
    expect(wrapper.find('.dialog-header').text()).toBe('Diff');
  });

  it('emits close when Close button clicked', async () => {
    const wrapper = mount(DiffFullModal, {
      props: { content: 'x' },
      global: { stubs: { Dialog: DialogStub } },
    });
    const closeBtn = wrapper.find('.dialog-footer').findAll('button').find((b) => b.text().includes('Close'));
    expect(closeBtn).toBeDefined();
    await closeBtn.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('shows Copy button when content is present', () => {
    const wrapper = mount(DiffFullModal, {
      props: { content: 'something' },
      global: { stubs: { Dialog: DialogStub } },
    });
    const copyBtn = wrapper.find('.dialog-footer').findAll('button').find((b) => b.text().includes('Copy'));
    expect(copyBtn).toBeDefined();
  });

  it('calls copyToClipboard when Copy is clicked', async () => {
    const copyToClipboard = vi.fn().mockResolvedValue();
    if (globalThis.window) globalThis.window.releaseManager = { copyToClipboard };
    const wrapper = mount(DiffFullModal, {
      props: { content: 'text to copy' },
      global: { stubs: { Dialog: DialogStub } },
    });
    const copyBtn = wrapper.find('.dialog-footer').findAll('button').find((b) => b.text().includes('Copy'));
    expect(copyBtn).toBeDefined();
    await copyBtn.trigger('click');
    expect(copyToClipboard).toHaveBeenCalledWith('text to copy');
  });

  it('emits close when Dialog emits update:visible(false)', async () => {
    const wrapper = mount(DiffFullModal, {
      props: { content: 'x' },
      global: { stubs: { Dialog: DialogStub } },
    });
    await wrapper.find('.dialog-mask-dismiss').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
