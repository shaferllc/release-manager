import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useAppStore } from '../stores/app';
import NavBar from './NavBar.vue';

describe('NavBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders app title and Add project button', () => {
    const wrapper = mount(NavBar, {
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.text()).toContain('Shipwell');
    expect(wrapper.text()).toContain('Add project');
  });

  it('emits add-project when Add project is clicked', async () => {
    const wrapper = mount(NavBar, {
      global: { plugins: [createPinia()] },
    });
    await wrapper.find('button.btn-primary').trigger('click');
    expect(wrapper.emitted('add-project')).toHaveLength(1);
  });

  it('shows View dropdown with default label', () => {
    const wrapper = mount(NavBar, {
      global: { plugins: [createPinia()] },
    });
    expect(wrapper.text()).toContain('View');
    expect(wrapper.find('.view-dropdown-label').text()).toBe('Project');
  });

  it('calls setTheme when theme button is clicked', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAppStore();
    const wrapper = mount(NavBar, {
      global: { plugins: [pinia] },
    });
    const lightBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Light');
    await lightBtn.trigger('click');
    expect(store.theme).toBe('light');
  });

  it('calls setTheme when dark theme button is clicked', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAppStore();
    const wrapper = mount(NavBar, {
      global: { plugins: [pinia] },
    });
    const darkBtn = wrapper.findAll('button').find((b) => b.attributes('title') === 'Dark');
    await darkBtn.trigger('click');
    expect(store.theme).toBe('dark');
  });

  it('emits refresh when refresh button is clicked', async () => {
    const wrapper = mount(NavBar, {
      global: { plugins: [createPinia()] },
    });
    const refreshBtn = wrapper.find('button.refresh-btn');
    await refreshBtn.trigger('click');
    expect(wrapper.emitted('refresh')).toHaveLength(1);
  });

  it('calls selectView and updates store when view option is clicked', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAppStore();
    const wrapper = mount(NavBar, {
      global: { plugins: [pinia] },
    });
    await wrapper.find('.view-dropdown-btn').trigger('click');
    const options = wrapper.findAll('.view-dropdown-option');
    const dashboardOpt = options.find((el) => el.text().includes('Dashboard'));
    await dashboardOpt.trigger('click');
    expect(store.viewMode).toBe('dashboard');
  });

  it('hides logo and shows fallback on image error', async () => {
    const wrapper = mount(NavBar, {
      global: { plugins: [createPinia()] },
    });
    const img = wrapper.find('.app-logo');
    const fallback = wrapper.find('h1').findAll('span').find((s) => s.text() === 'R');
    expect(fallback.classes()).toContain('hidden');
    await img.trigger('error');
    expect(fallback.classes()).not.toContain('hidden');
  });

  it('closes view dropdown when clicking outside', async () => {
    const wrapper = mount(NavBar, {
      global: { plugins: [createPinia()] },
      attachTo: document.body,
    });
    await wrapper.find('.view-dropdown-btn').trigger('click');
    expect(wrapper.find('.view-dropdown-menu').classes()).not.toContain('hidden');
    await document.body.click();
    expect(wrapper.find('.view-dropdown-menu').classes()).toContain('hidden');
    wrapper.unmount();
  });

  it('loads theme from api.getTheme on mount', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAppStore();
    window.releaseManager.getTheme = vi.fn().mockResolvedValue({ effective: 'dark' });
    mount(NavBar, { global: { plugins: [pinia] } });
    await new Promise((r) => setTimeout(r, 0));
    expect(store.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('subscribes to api.onTheme on mount', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAppStore();
    let themeCb;
    window.releaseManager.onTheme = vi.fn((cb) => { themeCb = cb; });
    mount(NavBar, { global: { plugins: [pinia] } });
    expect(themeCb).toBeDefined();
    themeCb('light');
    expect(store.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
