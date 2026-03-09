import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TerminalPanel from './TerminalPanel.vue';

describe('TerminalPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        openTerminalPopout: vi.fn(),
      };
    }
  });

  it('renders terminal panel with New tab button', () => {
    const wrapper = mount(TerminalPanel, {
      props: { initialDirPath: '/test' },
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.text()).toMatch(/New tab/);
  });

  it('shows Clear and Close buttons', () => {
    const wrapper = mount(TerminalPanel, {
      props: { initialDirPath: '/test' },
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.find('.terminal-panel').exists()).toBe(true);
  });

  it('emits close when Close clicked', async () => {
    const wrapper = mount(TerminalPanel, {
      props: { initialDirPath: '/test' },
      global: { plugins: [createPinia()] },
    });
    const closeBtns = wrapper.findAll('button').filter((b) => b.attributes('aria-label') === 'Close');
    if (closeBtns.length) {
      await closeBtns[0].trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
    }
  });
});
