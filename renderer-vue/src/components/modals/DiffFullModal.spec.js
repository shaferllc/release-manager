import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import DiffFullModal from './DiffFullModal.vue';

describe('DiffFullModal', () => {
  beforeEach(() => {
    if (globalThis.window?.releaseManager) {
      globalThis.window.releaseManager.copyToClipboard = vi.fn().mockResolvedValue();
    }
  });
  it('renders title and content', () => {
    const wrapper = mount(DiffFullModal, {
      props: { title: 'Suggested fix', content: 'Hello world' },
    });
    expect(wrapper.find('h2').text()).toBe('Suggested fix');
    expect(wrapper.find('pre').text()).toBe('Hello world');
  });

  it('uses default title when not provided', () => {
    const wrapper = mount(DiffFullModal, {
      props: { content: 'x' },
    });
    expect(wrapper.find('h2').text()).toBe('Diff');
  });

  it('shows Diff when title is empty string', () => {
    const wrapper = mount(DiffFullModal, {
      props: { title: '', content: 'x' },
    });
    expect(wrapper.find('h2').text()).toBe('Diff');
  });

  it('emits close when Close button clicked', async () => {
    const wrapper = mount(DiffFullModal, {
      props: { content: 'x' },
    });
    const closeButtons = wrapper.findAll('button');
    await closeButtons[closeButtons.length - 1].trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('shows Copy button when content is present', () => {
    const wrapper = mount(DiffFullModal, {
      props: { content: 'something' },
    });
    const copyBtn = wrapper.findAll('button').find((b) => b.text() === 'Copy');
    expect(copyBtn).toBeDefined();
  });

  it('calls copyToClipboard when Copy is clicked', async () => {
    const copyToClipboard = vi.fn().mockResolvedValue();
    if (globalThis.window) globalThis.window.releaseManager = { copyToClipboard };
    const wrapper = mount(DiffFullModal, {
      props: { content: 'text to copy' },
    });
    const copyBtn = wrapper.findAll('button').find((b) => b.text() === 'Copy');
    await copyBtn.trigger('click');
    expect(copyToClipboard).toHaveBeenCalledWith('text to copy');
  });
});
