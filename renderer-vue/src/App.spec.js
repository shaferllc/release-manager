import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import App from './App.vue';

describe('App', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;
  const originalHash = window.location.hash;

  beforeEach(() => {
    setActivePinia(createPinia());
    window.location.hash = '';
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getLicenseStatus: vi.fn().mockResolvedValue({
          hasLicense: true,
          permissions: { tabs: ['dashboard', 'git', 'version'] },
        }),
        setPreference: vi.fn(),
        sendTelemetry: vi.fn(),
        syncProjectsToShipwell: vi.fn().mockResolvedValue(undefined),
        syncReleasesToShipwell: vi.fn().mockResolvedValue(undefined),
      };
    }
  });

  afterEach(() => {
    window.location.hash = originalHash;
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('shows splash initially', async () => {
    const wrapper = mount(App, { global: { plugins: [createPinia()] } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.app-splash').exists()).toBe(true);
  });

  it('shows full app after license loads and splash duration', async () => {
    const { useLicense } = await import('./composables/useLicense');
    await useLicense().loadStatus();
    const wrapper = mount(App, { global: { plugins: [createPinia()] } });
    await new Promise((r) => setTimeout(r, 700));
    expect(wrapper.find('.main-content-area').exists()).toBe(true);
  });
});
