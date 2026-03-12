import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsView from './SettingsView.vue';
import { flushPromises, goToWindowSection } from './SettingsView.spec-helpers';

describe('SettingsView > Window', () => {
  function getWindowSection(wrapper) {
    return wrapper.findAll('.settings-section').find(
      (s) => s.text().includes('Always on top') && s.text().includes('Minimize to tray') && s.text().includes('Keep the app window above'),
    );
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    window.releaseManager = {
      ...window.releaseManager,
      getLicenseStatus: vi.fn().mockResolvedValue({ hasLicense: false }),
      getAlwaysOnTop: vi.fn().mockResolvedValue(false),
      getMinimizeToTray: vi.fn().mockResolvedValue(false),
      setAlwaysOnTop: vi.fn().mockResolvedValue(),
      setMinimizeToTray: vi.fn().mockResolvedValue(),
      setPreference: vi.fn().mockResolvedValue(),
    };
  });

  it('renders Window section with title and description', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToWindowSection(wrapper);
    expect(wrapper.text()).toMatch(/Window/);
    expect(wrapper.text()).toMatch(/Window behavior and tray/);
  });

  it('shows Always on top toggle with description', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToWindowSection(wrapper);
    expect(wrapper.text()).toMatch(/Always on top/);
    expect(wrapper.text()).toMatch(/Keep the app window above other windows/);
  });

  it('shows Minimize to tray toggle with description', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToWindowSection(wrapper);
    expect(wrapper.text()).toMatch(/Minimize to tray/);
    expect(wrapper.text()).toMatch(/Closing the window hides it to the system tray instead of quitting/);
  });

  it('calls setAlwaysOnTop when Always on top is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToWindowSection(wrapper);
    await flushPromises();
    const section = getWindowSection(wrapper);
    const checkboxes = section.findAllComponents({ name: 'Checkbox' });
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    await checkboxes[0].vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setAlwaysOnTop).toHaveBeenCalledWith(true);
  });

  it('calls setMinimizeToTray when Minimize to tray is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToWindowSection(wrapper);
    await flushPromises();
    const section = getWindowSection(wrapper);
    const checkboxes = section.findAllComponents({ name: 'Checkbox' });
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    await checkboxes[1].vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setMinimizeToTray).toHaveBeenCalledWith(true);
  });
});
