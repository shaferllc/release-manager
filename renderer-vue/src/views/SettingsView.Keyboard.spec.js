import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsView from './SettingsView.vue';
import { goToKeyboardSection } from './SettingsView.spec-helpers';

describe('SettingsView > Keyboard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    window.releaseManager = {
      ...window.releaseManager,
      getLicenseStatus: vi.fn().mockResolvedValue({ hasLicense: false }),
    };
  });

  it('renders Keyboard section with title and description', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToKeyboardSection(wrapper);
    expect(wrapper.text()).toMatch(/Keyboard/);
    expect(wrapper.text()).toMatch(/All available keyboard shortcuts/);
  });

  it('shows Navigation section with Command palette and Toggle sidebar', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToKeyboardSection(wrapper);
    expect(wrapper.text()).toMatch(/Navigation/);
    expect(wrapper.text()).toMatch(/Command palette/);
    expect(wrapper.text()).toMatch(/Toggle sidebar/);
  });

  it('shows Project detail section with release and action shortcuts', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToKeyboardSection(wrapper);
    expect(wrapper.text()).toMatch(/Project detail/);
    expect(wrapper.text()).toMatch(/Release patch/);
    expect(wrapper.text()).toMatch(/Release minor/);
    expect(wrapper.text()).toMatch(/Release major/);
    expect(wrapper.text()).toMatch(/Sync from remote/);
    expect(wrapper.text()).toMatch(/Download latest release/);
  });

  it('shows Codeseer clear and Focus Git filter shortcuts', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToKeyboardSection(wrapper);
    expect(wrapper.text()).toMatch(/Clear Codeseer messages/);
    expect(wrapper.text()).toMatch(/Focus Git filter/);
  });

  it('shows Standard section with OS defaults', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToKeyboardSection(wrapper);
    expect(wrapper.text()).toMatch(/Standard/);
    expect(wrapper.text()).toMatch(/Quit application/);
    expect(wrapper.text()).toMatch(/Close window/);
    expect(wrapper.text()).toMatch(/Minimize window/);
    expect(wrapper.text()).toMatch(/Reload window/);
    expect(wrapper.text()).toMatch(/Zoom in/);
    expect(wrapper.text()).toMatch(/Zoom out/);
    expect(wrapper.text()).toMatch(/Reset zoom/);
    expect(wrapper.text()).toMatch(/Toggle Developer Tools/);
    expect(wrapper.text()).toMatch(/Toggle fullscreen/);
  });

  it('shows Command palette commands section', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToKeyboardSection(wrapper);
    expect(wrapper.text()).toMatch(/Command palette commands/);
    expect(wrapper.text()).toMatch(/Go to Project/);
    expect(wrapper.text()).toMatch(/Go to Dashboard/);
    expect(wrapper.text()).toMatch(/Go to Settings/);
  });

  it('displays modifier key for platform (⌘ or Ctrl)', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToKeyboardSection(wrapper);
    const text = wrapper.text();
    const isMac = navigator.platform?.includes('Mac');
    if (isMac) {
      expect(text).toMatch(/⌘/);
    } else {
      expect(text).toMatch(/Ctrl/);
    }
  });
});
