import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TerminalPopoutView from './TerminalPopoutView.vue';

describe('TerminalPopoutView', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getTerminalPopoutState: vi.fn().mockResolvedValue({ dirPath: '' }),
        closeTerminalPopoutWindow: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('renders header with Close window button', async () => {
    const wrapper = mount(TerminalPopoutView, { global: { plugins: [createPinia()] } });
    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.text()).toMatch(/Close window|Terminal/);
  });

  it('shows "No directory" when dirPath is empty', async () => {
    const wrapper = mount(TerminalPopoutView, { global: { plugins: [createPinia()] } });
    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.text()).toMatch(/No directory|Close and open from the main window/);
  });

  it('shows InlineTerminal when dirPath is set', async () => {
    const api = globalThis.window?.releaseManager;
    api.getTerminalPopoutState.mockResolvedValue({ dirPath: '/tmp/my-project' });
    const wrapper = mount(TerminalPopoutView, { global: { plugins: [createPinia()] } });
    await new Promise((r) => setTimeout(r, 80));
    expect(wrapper.findComponent({ name: 'InlineTerminal' }).exists()).toBe(true);
  });

  it('calls closeTerminalPopoutWindow when Close window clicked', async () => {
    const api = globalThis.window?.releaseManager;
    const wrapper = mount(TerminalPopoutView, { global: { plugins: [createPinia()] } });
    await new Promise((r) => setTimeout(r, 50));
    await wrapper.find('button').trigger('click');
    expect(api.closeTerminalPopoutWindow).toHaveBeenCalled();
  });
});
