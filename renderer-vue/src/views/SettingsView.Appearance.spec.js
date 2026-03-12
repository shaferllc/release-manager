import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsView from './SettingsView.vue';
import { flushPromises, goToAppearanceSection } from './SettingsView.spec-helpers';

describe('SettingsView > Appearance', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    window.releaseManager = {
      ...window.releaseManager,
      getLicenseStatus: vi.fn().mockResolvedValue({ hasLicense: false }),
      getTheme: vi.fn().mockResolvedValue({ theme: 'dark' }),
      setTheme: vi.fn().mockResolvedValue(),
      getAppZoomFactor: vi.fn().mockResolvedValue(1),
      setAppZoomFactor: vi.fn().mockResolvedValue(),
      getPreference: vi.fn().mockImplementation((key) => {
        const prefs = {
          appearanceAccent: 'green',
          appearanceFontSize: 'comfortable',
          appearanceRadius: 'sharp',
          appearanceReducedMotion: false,
          appearanceReduceTransparency: false,
          appearanceHighContrast: false,
          appearanceZoomFactor: 1,
          terminalPopoutSize: 'default',
          terminalPopoutAlwaysOnTop: false,
          terminalPopoutFullscreenable: true,
          detailUseTabs: true,
        };
        return Promise.resolve(prefs[key]);
      }),
      setPreference: vi.fn().mockResolvedValue(),
    };
  });

  it('renders Appearance section with Theme, Accent, Density', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAppearanceSection(wrapper);
    expect(wrapper.text()).toMatch(/Theme/);
    expect(wrapper.text()).toMatch(/Accent color/);
    expect(wrapper.text()).toMatch(/Density/);
  });

  it('shows Theme buttons (Dark, Light, System)', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAppearanceSection(wrapper);
    expect(wrapper.text()).toMatch(/Dark/);
    expect(wrapper.text()).toMatch(/Light/);
    expect(wrapper.text()).toMatch(/System/);
  });

  it('shows Accent color swatches', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAppearanceSection(wrapper);
    const swatches = wrapper.findAll('.accent-swatch');
    expect(swatches.length).toBeGreaterThanOrEqual(3);
  });

  it('calls setTheme when theme button is clicked', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAppearanceSection(wrapper);
    const lightBtn = wrapper.findAll('button.appearance-option-btn').find((b) => b.text().includes('Light'));
    expect(lightBtn.exists()).toBe(true);
    await lightBtn.trigger('click');
    await flushPromises();
    expect(window.releaseManager.setTheme).toHaveBeenCalledWith('light');
  });

  it('calls setPreference when accent swatch is clicked', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAppearanceSection(wrapper);
    const swatches = wrapper.findAll('.accent-swatch');
    expect(swatches.length).toBeGreaterThan(0);
    await swatches[1].trigger('click');
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('appearanceAccent', expect.any(String));
  });

  it('shows Density, UI zoom, Corner style selects', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAppearanceSection(wrapper);
    expect(wrapper.text()).toMatch(/Density/);
    expect(wrapper.text()).toMatch(/UI zoom/);
    expect(wrapper.text()).toMatch(/Corner style/);
  });

  it('shows Reduce motion, Reduce transparency, High contrast toggles', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAppearanceSection(wrapper);
    expect(wrapper.text()).toMatch(/Reduce motion/);
    expect(wrapper.text()).toMatch(/Reduce transparency/);
    expect(wrapper.text()).toMatch(/High contrast/);
  });

  it('calls setPreference when Reduce motion is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAppearanceSection(wrapper);
    const section = wrapper.findAll('.settings-section').find((s) => s.text().includes('Reduce motion'));
    expect(section.exists()).toBe(true);
    const checkboxes = section.findAllComponents({ name: 'Checkbox' });
    expect(checkboxes.length).toBeGreaterThanOrEqual(1);
    await checkboxes[0].vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('appearanceReducedMotion', true);
  });

  it('shows Use tabs in project detail toggle', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAppearanceSection(wrapper);
    expect(wrapper.text()).toMatch(/Use tabs in project detail/);
  });

  it('shows Terminal popout section with Size, Always on top, Allow fullscreen', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAppearanceSection(wrapper);
    expect(wrapper.text()).toMatch(/Terminal popout/);
    expect(wrapper.text()).toMatch(/Always on top/);
    expect(wrapper.text()).toMatch(/Allow fullscreen/);
  });

  it('calls setPreference when Density Select is changed', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAppearanceSection(wrapper);
    const selects = wrapper.findAllComponents({ name: 'Select' });
    const densitySelect = selects.find((s) => s.props('options')?.some?.((o) => o.value === 'tighter'));
    expect(densitySelect.exists()).toBe(true);
    await densitySelect.vm.$emit('update:modelValue', 'tighter');
    await densitySelect.vm.$emit('change');
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('appearanceFontSize', 'tighter');
  });

  it('calls setAppZoomFactor when UI zoom Select is changed', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToAppearanceSection(wrapper);
    const selects = wrapper.findAllComponents({ name: 'Select' });
    const zoomSelect = selects.find((s) => s.props('options')?.some?.((o) => o.value === 1.1));
    expect(zoomSelect.exists()).toBe(true);
    await zoomSelect.vm.$emit('update:modelValue', 1.1);
    await zoomSelect.vm.$emit('change');
    await flushPromises();
    expect(window.releaseManager.setAppZoomFactor).toHaveBeenCalledWith(1.1);
  });
});
