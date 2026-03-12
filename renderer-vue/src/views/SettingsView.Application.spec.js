import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useModals } from '../composables/useModals';
import SettingsView from './SettingsView.vue';
import { flushPromises, goToApplicationSection } from './SettingsView.spec-helpers';

describe('SettingsView > Application', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    window.releaseManager = {
      ...window.releaseManager,
      getLicenseStatus: vi.fn().mockResolvedValue({ hasLicense: false }),
      getLaunchAtLogin: vi.fn().mockResolvedValue({ openAtLogin: false }),
      setLaunchAtLogin: vi.fn().mockResolvedValue({ ok: true }),
      getConfirmBeforeQuit: vi.fn().mockResolvedValue(false),
      setConfirmBeforeQuit: vi.fn().mockResolvedValue(),
      checkForUpdatesNow: vi.fn().mockResolvedValue({ ok: true }),
      downloadUpdate: vi.fn().mockResolvedValue(),
      quitAndInstall: vi.fn(),
      getPreference: vi.fn().mockImplementation((key) => {
        const prefs = { defaultView: 'last', checkForUpdates: 'auto' };
        return Promise.resolve(prefs[key]);
      }),
      setPreference: vi.fn().mockResolvedValue(),
    };
  });

  it('renders Application section with Startup, Updates, Quit & setup', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToApplicationSection(wrapper);
    expect(wrapper.text()).toMatch(/Startup/);
    expect(wrapper.text()).toMatch(/Updates/);
    expect(wrapper.text()).toMatch(/Quit & setup/);
  });

  it('shows Launch at login toggle and Open to select', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToApplicationSection(wrapper);
    expect(wrapper.text()).toMatch(/Launch at login/);
    expect(wrapper.text()).toMatch(/Open to/);
    expect(wrapper.text()).toMatch(/Start the app when you log in/);
  });

  it('calls setLaunchAtLogin when Launch at login is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToApplicationSection(wrapper);
    const section = wrapper.findAll('.settings-section').find((s) => s.text().includes('Launch at login'));
    expect(section.exists()).toBe(true);
    const checkboxes = section.findAllComponents({ name: 'Checkbox' });
    expect(checkboxes.length).toBeGreaterThanOrEqual(1);
    await checkboxes[0].vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setLaunchAtLogin).toHaveBeenCalledWith(true);
  });

  it('calls setPreference when Open to select is changed', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToApplicationSection(wrapper);
    const selects = wrapper.findAllComponents({ name: 'Select' });
    const openToSelect = selects.find((s) => s.props('options')?.some?.((o) => o.value === 'dashboard'));
    expect(openToSelect.exists()).toBe(true);
    await openToSelect.vm.$emit('update:modelValue', 'dashboard');
    await openToSelect.vm.$emit('change');
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('defaultView', 'dashboard');
  });

  it('shows Check for updates select and Check now button', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToApplicationSection(wrapper);
    expect(wrapper.text()).toMatch(/Check for updates/);
    expect(wrapper.text()).toMatch(/Check now/);
  });

  it('calls checkForUpdatesNow when Check now is clicked', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToApplicationSection(wrapper);
    const checkNowBtn = wrapper.findAll('button').find((b) => b.text().includes('Check now'));
    expect(checkNowBtn.exists()).toBe(true);
    await checkNowBtn.trigger('click');
    await flushPromises();
    expect(window.releaseManager.checkForUpdatesNow).toHaveBeenCalled();
  });

  it('shows update available and Download when checkForUpdatesNow returns update', async () => {
    window.releaseManager.checkForUpdatesNow = vi.fn().mockResolvedValue({ updateAvailable: true, version: '1.2.3' });
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToApplicationSection(wrapper);
    const checkNowBtn = wrapper.findAll('button').find((b) => b.text().includes('Check now'));
    await checkNowBtn.trigger('click');
    await flushPromises();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toMatch(/Update available|1\.2\.3/);
    expect(wrapper.text()).toMatch(/Download/);
  });

  it('shows up to date message when checkForUpdatesNow returns ok', async () => {
    window.releaseManager.checkForUpdatesNow = vi.fn().mockResolvedValue({ ok: true });
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToApplicationSection(wrapper);
    const checkNowBtn = wrapper.findAll('button').find((b) => b.text().includes('Check now'));
    await checkNowBtn.trigger('click');
    await flushPromises();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toMatch(/up to date|You're up to date/i);
  });

  it('calls setPreference when Check for updates select is changed', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToApplicationSection(wrapper);
    const selects = wrapper.findAllComponents({ name: 'Select' });
    const checkSelect = selects.find((s) => s.props('options')?.some?.((o) => o.value === 'manual'));
    expect(checkSelect.exists()).toBe(true);
    await checkSelect.vm.$emit('update:modelValue', 'manual');
    await checkSelect.vm.$emit('change');
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('checkForUpdates', 'manual');
  });

  it('shows Confirm before closing and Setup wizard', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToApplicationSection(wrapper);
    expect(wrapper.text()).toMatch(/Confirm before closing/);
    expect(wrapper.text()).toMatch(/Setup wizard/);
    expect(wrapper.text()).toMatch(/Run setup wizard/);
  });

  it('calls setConfirmBeforeQuit when Confirm before closing is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToApplicationSection(wrapper);
    const section = wrapper.findAll('.settings-section').find((s) => s.text().includes('Confirm before closing'));
    const checkboxes = section.findAllComponents({ name: 'Checkbox' });
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    await checkboxes[1].vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setConfirmBeforeQuit).toHaveBeenCalledWith(true);
  });

  it('opens setup wizard modal when Run setup wizard is clicked', async () => {
    const modals = useModals();
    modals.closeModal();
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToApplicationSection(wrapper);
    const setupBtn = wrapper.findAll('button').find((b) => b.text().includes('Run setup wizard'));
    expect(setupBtn.exists()).toBe(true);
    await setupBtn.trigger('click');
    await flushPromises();
    expect(modals.activeModal.value).toBe('setupWizard');
    modals.closeModal();
  });

  it('calls quitAndInstall when Restart now is clicked (when update downloaded)', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.setUpdateDownloaded(true);
    const wrapper = mount(SettingsView, { global: { plugins: [pinia] } });
    await goToApplicationSection(wrapper);
    await wrapper.vm.$nextTick();
    const restartBtn = wrapper.findAll('button').find((b) => b.text().includes('Restart now'));
    expect(restartBtn).toBeDefined();
    expect(restartBtn.exists()).toBe(true);
    await restartBtn.trigger('click');
    expect(window.releaseManager.quitAndInstall).toHaveBeenCalled();
  });
});
