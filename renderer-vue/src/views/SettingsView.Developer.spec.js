import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsView from './SettingsView.vue';
import { flushPromises, goToDeveloperSection } from './SettingsView.spec-helpers';

describe('SettingsView > Developer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    window.releaseManager = {
      ...window.releaseManager,
      getLicenseStatus: vi.fn().mockResolvedValue({ hasLicense: false }),
      setPreference: vi.fn().mockResolvedValue(),
    };
  });

  it('renders Developer section with Enable debug logging', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToDeveloperSection(wrapper);
    expect(wrapper.text()).toMatch(/Developer/);
    expect(wrapper.text()).toMatch(/Options for debugging and troubleshooting/);
    expect(wrapper.text()).toMatch(/Enable debug logging/);
  });

  it('shows debug logging description', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToDeveloperSection(wrapper);
    expect(wrapper.text()).toMatch(/Log app actions/);
    expect(wrapper.text()).toMatch(/project load|IPC|preferences|nav/);
    expect(wrapper.text()).toMatch(/DevTools|terminal/);
  });

  it('calls setPreference when Enable debug logging is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToDeveloperSection(wrapper);
    const section = wrapper.findAll('.settings-section').find((s) => s.text().includes('Enable debug logging'));
    expect(section.exists()).toBe(true);
    const checkbox = section.findComponent({ name: 'Checkbox' });
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('debug', true);
  });
});
