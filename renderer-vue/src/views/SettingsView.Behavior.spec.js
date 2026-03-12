import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsView from './SettingsView.vue';
import { flushPromises, goToBehaviorSection } from './SettingsView.spec-helpers';

describe('SettingsView > Behavior', () => {
  function getBehaviorCheckbox(wrapper, labelText) {
    const section = wrapper.findAll('.settings-section').find((s) => s.text().includes('Double-click to open project'));
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
    };
  });

  it('renders Behavior section with Double-click to open, Default project sort', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    expect(wrapper.text()).toMatch(/Double-click to open project/);
    expect(wrapper.text()).toMatch(/Default project sort/);
  });

  it('shows Lock sidebar width, Open project in new tab, Compact sidebar', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    expect(wrapper.text()).toMatch(/Lock sidebar width/);
    expect(wrapper.text()).toMatch(/Open project in new tab/);
    expect(wrapper.text()).toMatch(/Compact sidebar/);
  });

  it('shows Show project path, Remember last opened tab, Confirm destructive actions', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    expect(wrapper.text()).toMatch(/Show project path in sidebar/);
    expect(wrapper.text()).toMatch(/Remember last opened tab/);
    expect(wrapper.text()).toMatch(/Confirm destructive actions/);
  });

  it('shows Confirm before discarding, Confirm before force push, Open links in default browser', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    expect(wrapper.text()).toMatch(/Confirm before discarding changes/);
    expect(wrapper.text()).toMatch(/Confirm before force push/);
    expect(wrapper.text()).toMatch(/Open links in default browser/);
  });

  it('shows Debug bar, Notify on release, Notify when project sync completes', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    expect(wrapper.text()).toMatch(/Debug bar visible/);
    expect(wrapper.text()).toMatch(/Notify on release success\/failure/);
    expect(wrapper.text()).toMatch(/Notify when project sync completes/);
  });

  it('shows Auto-refresh interval, Recent projects list length, Show tips', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    expect(wrapper.text()).toMatch(/Auto-refresh interval/);
    expect(wrapper.text()).toMatch(/Recent projects list length/);
    expect(wrapper.text()).toMatch(/Show tips and onboarding/);
  });

  it('calls setPreference when Double-click to open project is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    const checkbox = getBehaviorCheckbox(wrapper, 'Double-click to open project');
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('doubleClickToOpenProject', true);
  });

  it('calls setPreference when Default project sort Select is changed', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    const selects = wrapper.findAllComponents({ name: 'Select' });
    const sortSelect = selects.find((s) => s.props('options')?.some?.((o) => o.value === 'name'));
    expect(sortSelect.exists()).toBe(true);
    await sortSelect.vm.$emit('update:modelValue', 'name');
    await sortSelect.vm.$emit('change');
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('projectSortOrder', 'name');
  });

  it('calls setPreference when Lock sidebar width is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    const checkbox = getBehaviorCheckbox(wrapper, 'Lock sidebar width');
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('sidebarWidthLocked', true);
  });

  it('calls setPreference when Open project in new tab is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    const checkbox = getBehaviorCheckbox(wrapper, 'Open project in new tab');
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('openProjectInNewTab', true);
  });

  it('calls setPreference when Confirm destructive actions is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    const checkbox = getBehaviorCheckbox(wrapper, 'Confirm destructive actions');
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('confirmDestructiveActions', false);
  });

  it('calls setPreference when Confirm before discarding changes is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    const checkbox = getBehaviorCheckbox(wrapper, 'Confirm before discarding changes');
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('confirmBeforeDiscard', false);
  });

  it('calls setPreference when Confirm before force push is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    const checkbox = getBehaviorCheckbox(wrapper, 'Confirm before force push');
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('confirmBeforeForcePush', false);
  });

  it('calls setPreference when Open links in default browser is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    const checkbox = getBehaviorCheckbox(wrapper, 'Open links in default browser');
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('openLinksInExternalBrowser', true);
  });

  it('calls setPreference when Notify on release is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    const checkbox = getBehaviorCheckbox(wrapper, 'Notify on release success');
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('notifyOnRelease', false);
  });

  it('calls setPreference when Auto-refresh interval Select is changed', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    const selects = wrapper.findAllComponents({ name: 'Select' });
    const refreshSelect = selects.find((s) => s.props('options')?.some?.((o) => o.value === 60));
    expect(refreshSelect.exists()).toBe(true);
    await refreshSelect.vm.$emit('update:modelValue', 60);
    await refreshSelect.vm.$emit('change');
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('autoRefreshIntervalSeconds', 60);
  });

  it('calls setPreference when Recent projects list length Select is changed', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    const selects = wrapper.findAllComponents({ name: 'Select' });
    const recentSelect = selects.find((s) => s.props('options')?.some?.((o) => o.value === 20));
    expect(recentSelect.exists()).toBe(true);
    await recentSelect.vm.$emit('update:modelValue', 20);
    await recentSelect.vm.$emit('change');
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('recentListLength', 20);
  });

  it('calls setPreference when Show tips and onboarding is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToBehaviorSection(wrapper);
    const checkbox = getBehaviorCheckbox(wrapper, 'Show tips and onboarding');
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('showTips', false);
  });
});
