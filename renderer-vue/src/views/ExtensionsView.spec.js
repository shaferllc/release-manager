import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ExtensionsView from './ExtensionsView.vue';

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('ExtensionsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    window.releaseManager = {
      getPreference: vi.fn(),
      setPreference: vi.fn(),
      getInstalledUserExtensions: vi.fn(),
      getMarketplaceExtensions: vi.fn(),
      installExtension: vi.fn(),
    };
  });

  it('renders Marketplace and Installed sections', async () => {
    window.releaseManager.getPreference.mockResolvedValue('');
    window.releaseManager.getInstalledUserExtensions.mockResolvedValue([]);
    const wrapper = mount(ExtensionsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    expect(wrapper.text()).toContain('Marketplace');
    expect(wrapper.text()).toContain('Installed');
  });

  it('shows empty state when no extensions and no user extensions', async () => {
    window.releaseManager.getPreference.mockResolvedValue('');
    window.releaseManager.getInstalledUserExtensions.mockResolvedValue([]);
    const wrapper = mount(ExtensionsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    expect(wrapper.text()).toMatch(/No extensions installed|Built-in extensions/);
  });

  it('loads marketplace URL from preference on mount', async () => {
    window.releaseManager.getPreference.mockResolvedValue('https://market.example.com');
    window.releaseManager.getInstalledUserExtensions.mockResolvedValue([]);
    mount(ExtensionsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    expect(window.releaseManager.getPreference).toHaveBeenCalledWith('extensionsMarketplaceBaseUrl');
  });

  it('calls getInstalledUserExtensions on mount', async () => {
    window.releaseManager.getPreference.mockResolvedValue('');
    window.releaseManager.getInstalledUserExtensions.mockResolvedValue([]);
    mount(ExtensionsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    expect(window.releaseManager.getInstalledUserExtensions).toHaveBeenCalled();
  });
});
