import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';

vi.mock('../composables/useLicense', () => ({
  useLicense: () => ({
    hasLicense: ref(true),
    isLoggedIn: ref(true),
    tier: ref('pro'),
    tierLabel: ref('Pro'),
    isTabAllowed: () => true,
  }),
}));

import Sidebar from './Sidebar.vue';

describe('Sidebar', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.releaseManager = {
      ...window.releaseManager,
      getProjects: vi.fn().mockResolvedValue([]),
      setProjects: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
      getPreference: vi.fn().mockResolvedValue(null),
      setPreference: vi.fn().mockResolvedValue(),
      syncProjectsToShipwell: vi.fn().mockResolvedValue(),
    };
  });

  it('renders Projects title and Dashboard button', () => {
    const wrapper = mount(Sidebar, {
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.text()).toContain('Projects');
    expect(wrapper.text()).toContain('Dashboard');
  });

  it('shows add project hint when no projects', () => {
    const wrapper = mount(Sidebar, {
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.text()).toMatch(/Add project|No projects/i);
  });

  it('shows project list when store has projects', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([{ path: '/foo', name: 'Foo' }]);
    const wrapper = mount(Sidebar, {
      global: { plugins: [pinia] },
    });
    expect(wrapper.text()).toContain('Foo');
  });

  it('selects project when row is clicked', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([{ path: '/foo', name: 'Foo' }]);
    const wrapper = mount(Sidebar, {
      global: { plugins: [pinia] },
    });
    const row = wrapper.find('.project-list-item > div');
    expect(row.exists()).toBe(true);
    await row.trigger('click');
    expect(store.selectedPath).toBe('/foo');
    expect(store.viewMode).toBe('detail');
  });

  it('batch bar hidden when fewer than 2 selected', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([{ path: '/foo', name: 'Foo', type: 'npm' }]);
    store.toggleProjectSelection('/foo');
    const wrapper = mount(Sidebar, {
      global: { plugins: [pinia] },
    });
    expect(wrapper.find('.batch-bar').exists()).toBe(false);
  });

  it('batch bar shown when 2+ selected', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setProjects([
      { path: '/a', name: 'A', type: 'npm' },
      { path: '/b', name: 'B', type: 'npm' },
    ]);
    store.toggleProjectSelection('/a');
    store.toggleProjectSelection('/b');
    const wrapper = mount(Sidebar, {
      global: { plugins: [pinia] },
    });
    expect(wrapper.find('.batch-bar').exists()).toBe(true);
    expect(wrapper.text()).toContain('2 selected');
  });
});
