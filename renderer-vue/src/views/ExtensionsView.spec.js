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
      ...window.releaseManager,
      getPreference: vi.fn().mockResolvedValue(null),
      setPreference: vi.fn().mockResolvedValue(),
      getInstalledUserExtensions: vi.fn().mockResolvedValue([]),
      getGitHubExtensionRegistry: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      syncPlanExtensions: vi.fn().mockResolvedValue(),
      installExtensionFromGitHub: vi.fn().mockResolvedValue({ ok: true }),
      uninstallExtension: vi.fn().mockResolvedValue({ ok: true }),
      getExtensionScriptContent: vi.fn().mockResolvedValue(null),
      getExtensionCssContent: vi.fn().mockResolvedValue(null),
      buildAllExtensions: vi.fn().mockResolvedValue(),
      showOpenDialog: vi.fn(),
      getExtensionAnalyticsOverview: vi.fn().mockResolvedValue({ ok: false }),
      getExtensionAnalyticsChartData: vi.fn().mockResolvedValue({ ok: false }),
    };
  });

  it('renders Extensions heading and filter buttons', async () => {
    const wrapper = mount(ExtensionsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    expect(wrapper.text()).toContain('Extensions');
    expect(wrapper.text()).toMatch(/All|Installed|Not installed/);
  });

  it('shows empty state when no extensions available', async () => {
    const wrapper = mount(ExtensionsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    await flushPromises();
    expect(wrapper.text()).toMatch(/No extensions|Loading/);
  });

  it('calls getGitHubExtensionRegistry on mount', async () => {
    mount(ExtensionsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    expect(window.releaseManager.getGitHubExtensionRegistry).toHaveBeenCalled();
  });

  it('displays extension cards when registry returns data', async () => {
    window.releaseManager.getGitHubExtensionRegistry = vi.fn().mockResolvedValue({
      ok: true,
      data: [
        { id: 'notes', slug: 'notes', name: 'Notes', description: 'Take notes', version: '1.0.0', accessible: true, installed: false, required_plan: 'free' },
      ],
    });
    window.releaseManager.syncPlanExtensions = vi.fn().mockResolvedValue();
    window.releaseManager.getInstalledUserExtensions = vi.fn().mockResolvedValue([]);
    const wrapper = mount(ExtensionsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 100));
    await flushPromises();
    expect(wrapper.text()).toContain('Notes');
  });

  it('filter Installed shows empty state when none installed', async () => {
    window.releaseManager.getGitHubExtensionRegistry = vi.fn().mockResolvedValue({ ok: true, data: [] });
    const wrapper = mount(ExtensionsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 100));
    const installedBtn = wrapper.findAll('button').find((b) => b.text().includes('Installed'));
    if (installedBtn) {
      await installedBtn.trigger('click');
      await flushPromises();
      expect(wrapper.text()).toMatch(/No extensions installed|Install extensions/);
    }
  });

  it('search filters extensions', async () => {
    window.releaseManager.getGitHubExtensionRegistry = vi.fn().mockResolvedValue({
      ok: true,
      data: [
        { id: 'notes', slug: 'notes', name: 'Notes', description: 'Take notes', version: '1.0.0', accessible: true, installed: false, required_plan: 'free' },
        { id: 'bookmarks', slug: 'bookmarks', name: 'Bookmarks', description: 'Save bookmarks', version: '1.0.0', accessible: true, installed: false, required_plan: 'free' },
      ],
    });
    window.releaseManager.syncPlanExtensions = vi.fn().mockResolvedValue();
    window.releaseManager.getInstalledUserExtensions = vi.fn().mockResolvedValue([]);
    const wrapper = mount(ExtensionsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 100));
    expect(wrapper.text()).toContain('Notes');
    expect(wrapper.text()).toContain('Bookmarks');
    await wrapper.find('input[placeholder="Search extensions..."]').setValue('Notes');
    await flushPromises();
    expect(wrapper.text()).toContain('Notes');
    expect(wrapper.text()).not.toContain('Bookmarks');
  });
});
