import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { useAiGenerateAvailable } from './useAiGenerateAvailable';
import { useLicense } from './useLicense';

describe('useAiGenerateAvailable', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getAiGenerateAvailable: vi.fn().mockResolvedValue(false),
        getLicenseStatus: vi.fn().mockResolvedValue({ hasLicense: false }),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns aiGenerateAvailable', () => {
    const TestComp = defineComponent({
      setup() {
        return useAiGenerateAvailable();
      },
      render: () => h('div'),
    });
    const wrapper = mount(TestComp, { global: { plugins: [createPinia()] } });
    expect(wrapper.vm.aiGenerateAvailable).toBeDefined();
  });

  it('aiGenerateAvailable is false when not logged in', async () => {
    const api = globalThis.window?.releaseManager;
    api.getAiGenerateAvailable.mockResolvedValue(true);
    const TestComp = defineComponent({
      setup() {
        return useAiGenerateAvailable();
      },
      render: () => h('div'),
    });
    const wrapper = mount(TestComp, { global: { plugins: [createPinia()] } });
    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.vm.aiGenerateAvailable).toBe(false);
  });

  it('aiGenerateAvailable is false when API returns false', async () => {
    const api = globalThis.window?.releaseManager;
    api.getLicenseStatus.mockResolvedValue({ hasLicense: true, permissions: { tabs: ['dashboard'] } });
    api.getAiGenerateAvailable.mockResolvedValue(false);
    const { loadStatus } = useLicense();
    await loadStatus();

    const TestComp = defineComponent({
      setup() {
        return useAiGenerateAvailable();
      },
      render: () => h('div'),
    });
    const wrapper = mount(TestComp, { global: { plugins: [createPinia()] } });
    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.vm.aiGenerateAvailable).toBe(false);
  });

  it('aiGenerateAvailable is true when logged in and API returns true', async () => {
    const api = globalThis.window?.releaseManager;
    api.getLicenseStatus.mockResolvedValue({ hasLicense: true, permissions: { tabs: ['dashboard'] } });
    api.getAiGenerateAvailable.mockResolvedValue(true);
    const { loadStatus } = useLicense();
    await loadStatus();

    const TestComp = defineComponent({
      setup() {
        return useAiGenerateAvailable();
      },
      render: () => h('div'),
    });
    const wrapper = mount(TestComp, { global: { plugins: [createPinia()] } });
    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.vm.aiGenerateAvailable).toBe(true);
  });
});
