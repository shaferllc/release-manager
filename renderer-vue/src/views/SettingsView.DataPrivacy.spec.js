import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsView from './SettingsView.vue';
import { flushPromises, goToDataPrivacySection } from './SettingsView.spec-helpers';

describe('SettingsView > Data & privacy', () => {
  function getDataPrivacyCheckbox(wrapper, labelText) {
    const section = wrapper.findAll('.settings-section').find((s) => s.text().includes('Usage data'));
    const row = section.findAll('.settings-row-clickable').find((r) => r.text().includes(labelText));
    return row.findComponent({ name: 'Checkbox' });
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    window.releaseManager = {
      ...window.releaseManager,
      getLicenseStatus: vi.fn().mockResolvedValue({ hasLicense: false }),
      setPreference: vi.fn().mockResolvedValue(),
      exportSettingsToFile: vi.fn().mockResolvedValue({ ok: true }),
      importSettingsFromFile: vi.fn().mockResolvedValue({ ok: true }),
      resetSettings: vi.fn().mockReturnValue({ ok: true }),
    };
  });

  it('renders Data & privacy section with Usage data, Crash reports', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToDataPrivacySection(wrapper);
    expect(wrapper.text()).toMatch(/Usage data/);
    expect(wrapper.text()).toMatch(/Crash reports/);
  });

  it('shows Settings backup with Export, Import, Reset buttons', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToDataPrivacySection(wrapper);
    expect(wrapper.text()).toMatch(/Settings backup/);
    expect(wrapper.text()).toMatch(/Export/);
    expect(wrapper.text()).toMatch(/Import/);
    expect(wrapper.text()).toMatch(/Reset/);
  });

  it('shows Cloud sync and Project sync', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToDataPrivacySection(wrapper);
    expect(wrapper.text()).toMatch(/Cloud sync/);
    expect(wrapper.text()).toMatch(/Project sync/);
    expect(wrapper.text()).toMatch(/Sync now/);
    expect(wrapper.text()).toMatch(/Pull from web/);
    expect(wrapper.text()).toMatch(/Sync projects to web/);
  });

  it('shows Custom events section', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToDataPrivacySection(wrapper);
    expect(wrapper.text()).toMatch(/Custom events/);
  });

  it('calls setPreference when Usage data is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToDataPrivacySection(wrapper);
    const checkbox = getDataPrivacyCheckbox(wrapper, 'Usage data');
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('telemetry', true);
  });

  it('calls setPreference when Crash reports is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToDataPrivacySection(wrapper);
    const checkbox = getDataPrivacyCheckbox(wrapper, 'Crash reports');
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('crashReports', true);
  });

  it('calls exportSettingsToFile when Export is clicked', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToDataPrivacySection(wrapper);
    const section = wrapper.findAll('.settings-section').find((s) => s.text().includes('Settings backup'));
    const exportBtn = section.findAll('button').find((b) => b.text().includes('Export'));
    expect(exportBtn.exists()).toBe(true);
    await exportBtn.trigger('click');
    await flushPromises();
    expect(window.releaseManager.exportSettingsToFile).toHaveBeenCalled();
  });

  it('calls importSettingsFromFile when Import is clicked', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToDataPrivacySection(wrapper);
    const section = wrapper.findAll('.settings-section').find((s) => s.text().includes('Settings backup'));
    const importBtn = section.findAll('button').find((b) => b.text().includes('Import'));
    expect(importBtn.exists()).toBe(true);
    await importBtn.trigger('click');
    await flushPromises();
    expect(window.releaseManager.importSettingsFromFile).toHaveBeenCalled();
  });

  it('calls resetSettings when Reset is clicked and user confirms', async () => {
    const origConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToDataPrivacySection(wrapper);
    const section = wrapper.findAll('.settings-section').find((s) => s.text().includes('Settings backup'));
    const resetBtn = section.findAll('button').find((b) => b.text().includes('Reset'));
    expect(resetBtn.exists()).toBe(true);
    await resetBtn.trigger('click');
    await flushPromises();
    expect(window.releaseManager.resetSettings).toHaveBeenCalled();
    window.confirm = origConfirm;
  });

  it('does not call resetSettings when Reset is clicked and user cancels', async () => {
    const origConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(false);
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToDataPrivacySection(wrapper);
    const section = wrapper.findAll('.settings-section').find((s) => s.text().includes('Settings backup'));
    const resetBtn = section.findAll('button').find((b) => b.text().includes('Reset'));
    expect(resetBtn.exists()).toBe(true);
    await resetBtn.trigger('click');
    await flushPromises();
    expect(window.releaseManager.resetSettings).not.toHaveBeenCalled();
    window.confirm = origConfirm;
  });
});
