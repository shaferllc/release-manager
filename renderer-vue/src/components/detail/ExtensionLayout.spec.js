import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ExtensionLayout from './ExtensionLayout.vue';

describe('ExtensionLayout', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders Card with tabId as data attribute', () => {
    const wrapper = mount(ExtensionLayout, {
      props: { tabId: 'bookmarks' },
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.find('[data-detail-tab="bookmarks"]').exists()).toBe(true);
  });

  it('applies contentClass to Card', () => {
    const wrapper = mount(ExtensionLayout, {
      props: { tabId: 'dependencies', contentClass: 'detail-deps-card' },
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.find('.detail-deps-card').exists()).toBe(true);
  });

  it('renders default slot content', () => {
    const wrapper = mount(ExtensionLayout, {
      props: { tabId: 'test' },
      slots: { default: '<p>Slot content</p>' },
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.text()).toContain('Slot content');
  });
});
