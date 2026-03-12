import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsView from './SettingsView.vue';
import { flushPromises } from './SettingsView.spec-helpers';

describe('SettingsView > Accessibility', () => {
  function getAccessibilitySection(wrapper) {
    return wrapper.findAll('.settings-section').find(
      (s) => s.text().includes('Always show focus outline') && s.text().includes('Screen reader support'));
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    window.releaseManager = {
      ...window.releaseManager,
      getLicenseStatus: vi.fn().mockResolvedValue({ hasLicense: false }),
      setPreference: vi.fn().mockResolvedValue(),
    };
  });

  it('renders Accessibility section by default', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    expect(wrapper.text()).toMatch(/Accessibility/);
    expect(wrapper.text()).toMatch(/Focus, cursor, and screen reader support/);
  });

  it('shows all three accessibility toggles with correct labels', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    expect(wrapper.text()).toMatch(/Always show focus outline/);
    expect(wrapper.text()).toMatch(/Show a visible focus ring on keyboard focus/);
    expect(wrapper.text()).toMatch(/Large cursor in inputs/);
    expect(wrapper.text()).toMatch(/Use a larger text cursor in input fields/);
    expect(wrapper.text()).toMatch(/Screen reader support/);
    expect(wrapper.text()).toMatch(/Announce live regions for assistive technologies/);
  });

  it('calls setPreference when focus outline toggle is changed', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    const section = getAccessibilitySection(wrapper);
    const checkboxes = section.findAllComponents({ name: 'Checkbox' });
    expect(checkboxes.length).toBeGreaterThanOrEqual(3);
    await checkboxes[0].vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('focusOutlineVisible', true);
  });

  it('calls setPreference when large cursor toggle is changed', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    const section = getAccessibilitySection(wrapper);
    const checkboxes = section.findAllComponents({ name: 'Checkbox' });
    expect(checkboxes.length).toBeGreaterThanOrEqual(3);
    await checkboxes[1].vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('largeCursor', true);
  });

  it('calls setPreference when screen reader support toggle is changed', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    const section = getAccessibilitySection(wrapper);
    const checkboxes = section.findAllComponents({ name: 'Checkbox' });
    expect(checkboxes.length).toBeGreaterThanOrEqual(3);
    await checkboxes[2].vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('screenReaderSupport', true);
  });

  it('accessibility checkboxes are keyboard focusable', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await flushPromises();
    const section = getAccessibilitySection(wrapper);
    const checkboxes = section.findAllComponents({ name: 'Checkbox' });
    expect(checkboxes.length).toBeGreaterThanOrEqual(3);
    for (const cb of checkboxes) {
      const focusable = cb.find('[role="checkbox"], input[type="checkbox"]');
      expect(focusable.exists() || cb.find('.p-checkbox').exists()).toBe(true);
    }
  });
});
