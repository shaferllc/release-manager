import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import DetailHeader from './DetailHeader.vue';

describe('DetailHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders project name when info is provided', () => {
    const wrapper = mount(DetailHeader, {
      props: { info: { path: '/my/project', name: 'My Project' } },
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.text()).toContain('My Project');
  });

  it('renders path when info is provided', () => {
    const wrapper = mount(DetailHeader, {
      props: { info: { path: '/some/path', name: 'My Project' } },
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.text()).toContain('/some/path');
  });
});
