import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { useCollapsible } from './useCollapsible';

// Component that uses useCollapsible to test behavior
const TestComponent = defineComponent({
  setup() {
    const { collapsed, toggle } = useCollapsible('git');
    return () => h('div', [
      h('span', { class: 'collapsed' }, String(collapsed.value)),
      h('button', { onClick: toggle }, 'Toggle'),
    ]);
  },
});

describe('useCollapsible', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window?.releaseManager) {
      globalThis.window.releaseManager.getPreference = vi.fn().mockResolvedValue({});
      globalThis.window.releaseManager.setPreference = vi.fn().mockResolvedValue();
    }
  });

  it('starts collapsed false', async () => {
    const wrapper = mount(TestComponent, {
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.find('.collapsed').text()).toBe('false');
  });

  it('toggle flips collapsed', async () => {
    const wrapper = mount(TestComponent, {
      global: { plugins: [createPinia()] },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.collapsed').text()).toBe('true');
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.collapsed').text()).toBe('false');
  });

  it('load sets collapsed true when getPreference returns sectionKey true', async () => {
    globalThis.window.releaseManager.getPreference = vi.fn().mockResolvedValue({ git: true });
    const wrapper = mount(TestComponent, {
      global: { plugins: [createPinia()] },
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(wrapper.find('.collapsed').text()).toBe('true');
  });

  it('load catches getPreference errors', async () => {
    globalThis.window.releaseManager.getPreference = vi.fn().mockRejectedValue(new Error('fail'));
    const wrapper = mount(TestComponent, {
      global: { plugins: [createPinia()] },
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(wrapper.find('.collapsed').text()).toBe('false');
  });

  it('toggle catches setPreference errors', async () => {
    globalThis.window.releaseManager.getPreference = vi.fn().mockResolvedValue({});
    globalThis.window.releaseManager.setPreference = vi.fn().mockRejectedValue(new Error('save failed'));
    const wrapper = mount(TestComponent, {
      global: { plugins: [createPinia()] },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.collapsed').text()).toBe('true');
  });

  it('toggle uses empty object when getPreference returns falsy', async () => {
    globalThis.window.releaseManager.getPreference = vi.fn().mockResolvedValue(null);
    globalThis.window.releaseManager.setPreference = vi.fn().mockResolvedValue();
    const wrapper = mount(TestComponent, {
      global: { plugins: [createPinia()] },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.collapsed').text()).toBe('true');
  });

  it('toggle uses empty object when getPreference returns non-object', async () => {
    globalThis.window.releaseManager.getPreference = vi.fn().mockResolvedValue('not-an-object');
    globalThis.window.releaseManager.setPreference = vi.fn().mockResolvedValue();
    const wrapper = mount(TestComponent, {
      global: { plugins: [createPinia()] },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('.collapsed').text()).toBe('true');
    expect(globalThis.window.releaseManager.setPreference).toHaveBeenCalledWith(
      'collapsedSections',
      expect.objectContaining({ git: true })
    );
  });
});
