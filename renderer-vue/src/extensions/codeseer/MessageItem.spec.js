import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MessageItem from './MessageItem.vue';

describe('MessageItem', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        openFileInEditor: vi.fn(),
      };
    }
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
  });

  it('renders message type and payload', () => {
    const wrapper = mount(MessageItem, {
      props: {
        message: { type: 'dump', payload: 'Hello' },
      },
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.text()).toContain('dump');
    expect(wrapper.text()).toContain('Hello');
  });

  it('renders file:line when meta provided', () => {
    const wrapper = mount(MessageItem, {
      props: {
        message: { type: 'trace', meta: { file: '/path/to/file.php', line: 42 } },
      },
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.text()).toContain('file.php');
    expect(wrapper.text()).toContain('42');
  });

  it('copy button calls clipboard.writeText', async () => {
    const wrapper = mount(MessageItem, {
      props: {
        message: { type: 'dump', payload: 'test payload' },
      },
      global: { plugins: [createPinia()] },
    });
    await wrapper.find('.codeseer-message-copy').trigger('click');
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    const callArg = navigator.clipboard.writeText.mock.calls[0][0];
    expect(callArg).toContain('test payload');
  });

  it('openInEditor called when file link clicked', async () => {
    const api = globalThis.window?.releaseManager;
    const wrapper = mount(MessageItem, {
      props: {
        message: { type: 'trace', meta: { file: '/path/to/file.php', line: 10 } },
        info: { path: '/project' },
      },
      global: { plugins: [createPinia()] },
    });
    await wrapper.find('.codeseer-message-file-link').trigger('click');
    expect(api.openFileInEditor).toHaveBeenCalledWith('/project', '/path/to/file.php', 10);
  });
});
