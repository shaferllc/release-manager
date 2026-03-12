import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsView from './SettingsView.vue';
import { flushPromises, goToAccountSection, goToApplicationSection } from './SettingsView.spec-helpers';

describe('SettingsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    window.releaseManager = {
      ...window.releaseManager,
      getLicenseStatus: vi.fn().mockResolvedValue({ hasLicense: false }),
      logoutFromLicenseServer: vi.fn().mockResolvedValue(),
      getLicenseServerConfig: vi.fn().mockResolvedValue({}),
      getLicenseServerEnvironments: vi.fn().mockResolvedValue([]),
      setLicenseServerConfig: vi.fn().mockResolvedValue(),
      switchPlan: vi.fn().mockResolvedValue({ ok: true }),
    };
  });

  it('renders settings content', () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    expect(wrapper.text()).toMatch(/Settings/);
  });

  it('renders section nav with Account, Git, Application', () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    expect(wrapper.text()).toMatch(/Account/);
    expect(wrapper.text()).toMatch(/Git/);
    expect(wrapper.text()).toMatch(/Application/);
  });

  it('switches section when nav button clicked', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    const gitBtn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('Git'));
    expect(gitBtn).toBeDefined();
    await gitBtn.trigger('click');
    expect(gitBtn.classes()).toContain('settings-nav-btn-active');
  });

  it('shows Account section when Account nav clicked', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAccountSection(wrapper);
    expect(wrapper.text()).toMatch(/Account/);
  });

  it('shows Application section when Application nav clicked', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    const appBtn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('Application'));
    expect(appBtn).toBeDefined();
    await appBtn.trigger('click');
    expect(appBtn.classes()).toContain('settings-nav-btn-active');
    expect(wrapper.text()).toMatch(/Application/);
  });
});
