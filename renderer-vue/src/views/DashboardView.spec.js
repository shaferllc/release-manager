import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import DashboardView from './DashboardView.vue';

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Projects panel and toolbar', async () => {
    const wrapper = mount(DashboardView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    expect(wrapper.text()).toContain('Projects');
    expect(wrapper.text()).toMatch(/Filter|Sort|Refresh/);
  });

  it('shows empty message when no projects match', async () => {
    const wrapper = mount(DashboardView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    expect(wrapper.text()).toMatch(/No projects match|project/);
  });
});
