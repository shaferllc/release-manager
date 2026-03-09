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
    window.releaseManager = {
      ...window.releaseManager,
      getAllProjectsInfo: vi.fn().mockResolvedValue([]),
    };
  });

  it('renders greeting and stats strip', async () => {
    const wrapper = mount(DashboardView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    expect(wrapper.text()).toContain('Projects');
    expect(wrapper.text()).toMatch(/Need release|No tags yet|Commits ahead/);
  });

  it('shows empty message when no projects', async () => {
    const wrapper = mount(DashboardView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    expect(wrapper.text()).toMatch(/No projects|Add project|Add a project/);
  });

  it('shows project rows when getAllProjectsInfo returns data', async () => {
    window.releaseManager.getAllProjectsInfo = vi.fn().mockResolvedValue([
      { path: '/proj/a', name: 'Project A', version: '1.0.0', branch: 'main', ahead: 0, behind: 0, latestTag: 'v1.0.0', commitsSinceLatestTag: 0 },
    ]);
    const wrapper = mount(DashboardView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.text()).toContain('Project A');
  });

  it('stats strip shows Projects count', async () => {
    const wrapper = mount(DashboardView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    expect(wrapper.text()).toMatch(/Projects/);
    expect(wrapper.find('.dash-stat-card').exists()).toBe(true);
  });
});
