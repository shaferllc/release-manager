import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DocsView from './DocsView.vue';

describe('DocsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders Documentation sidebar and Overview section', () => {
    const wrapper = mount(DocsView, { global: { plugins: [createPinia()] } });
    expect(wrapper.text()).toMatch(/Documentation|Overview/);
  });

  it('shows built-in sections in nav', () => {
    const wrapper = mount(DocsView, { global: { plugins: [createPinia()] } });
    expect(wrapper.text()).toMatch(/What is Shipwell|Supported project types/);
  });
});
