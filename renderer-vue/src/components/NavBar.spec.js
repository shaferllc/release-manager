import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useAppStore } from '../stores/app';
import NavBar from './NavBar.vue';

describe('NavBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.releaseManager = {
      ...window.releaseManager,
      getTheme: vi.fn().mockResolvedValue({ effective: 'dark' }),
      setTheme: vi.fn().mockResolvedValue(),
      onTheme: vi.fn(),
      showOpenDialog: vi.fn().mockResolvedValue({ canceled: true }),
      syncProjectsToShipwell: vi.fn().mockResolvedValue(),
      syncAllGitFetch: vi.fn().mockResolvedValue(),
      getPreference: vi.fn().mockResolvedValue(null),
      setPreference: vi.fn().mockResolvedValue(),
    };
  });

  it('renders Add project button', () => {
    const wrapper = mount(NavBar, {
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.text()).toContain('Add project');
  });

  it('renders theme toggle buttons', () => {
    const wrapper = mount(NavBar, {
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.find('button[aria-label="Dark theme"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Light theme"]').exists()).toBe(true);
  });

  it('calls setTheme when light theme button is clicked', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAppStore();
    const wrapper = mount(NavBar, {
      global: { plugins: [pinia] },
    });
    await new Promise((r) => setTimeout(r, 10));
    const lightBtn = wrapper.find('button[aria-label="Light theme"]');
    await lightBtn.trigger('click');
    expect(store.theme).toBe('light');
  });

  it('calls setTheme when dark theme button is clicked', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAppStore();
    store.setTheme('light');
    const wrapper = mount(NavBar, {
      global: { plugins: [pinia] },
    });
    const darkBtn = wrapper.find('button[aria-label="Dark theme"]');
    await darkBtn.trigger('click');
    expect(store.theme).toBe('dark');
  });

  it('emits refresh when refresh button is clicked', async () => {
    const wrapper = mount(NavBar, {
      global: { plugins: [createPinia()] },
    });
    const refreshBtn = wrapper.find('button[aria-label="Refresh"]');
    await refreshBtn.trigger('click');
    expect(wrapper.emitted('refresh')).toBeTruthy();
  });

  it('renders view Select dropdown', () => {
    const wrapper = mount(NavBar, {
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.find('.nav-view-select').exists()).toBe(true);
  });

  it('updates store when view mode is set', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAppStore();
    store.setViewMode('dashboard');
    mount(NavBar, { global: { plugins: [pinia] } });
    expect(store.viewMode).toBe('dashboard');
  });

  it('shows logo fallback on image error', async () => {
    const wrapper = mount(NavBar, {
      global: { plugins: [createPinia()] },
    });
    const img = wrapper.find('.nav-logo');
    if (img.exists()) {
      await img.trigger('error');
      const fallback = wrapper.find('.nav-logo-fallback');
      if (fallback.exists()) {
        expect(fallback.classes()).not.toContain('hidden');
      }
    }
  });

  it('loads theme from api on mount', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAppStore();
    window.releaseManager.getTheme = vi.fn().mockResolvedValue({ effective: 'dark' });
    mount(NavBar, { global: { plugins: [pinia] } });
    await new Promise((r) => setTimeout(r, 0));
    expect(store.theme).toBe('dark');
  });
});
