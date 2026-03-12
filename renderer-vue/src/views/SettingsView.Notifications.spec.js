import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsView from './SettingsView.vue';
import { flushPromises, goToNotificationsSection } from './SettingsView.spec-helpers';

describe('SettingsView > Notifications', () => {
  function getNotificationsCheckbox(wrapper, labelText) {
    const section = wrapper.findAll('.settings-section').find((s) => s.text().includes('Enable notifications'));
    const row = section.findAll('.settings-row-clickable').find((r) => r.text().includes(labelText));
    return row?.findComponent({ name: 'Checkbox' });
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

  it('renders Notifications section with Enable notifications, Notification sound, Only when app is in background', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToNotificationsSection(wrapper);
    expect(wrapper.text()).toMatch(/Enable notifications/);
    expect(wrapper.text()).toMatch(/Notification sound/);
    expect(wrapper.text()).toMatch(/Only when app is in background/);
  });

  it('calls setPreference when Enable notifications is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToNotificationsSection(wrapper);
    const checkbox = getNotificationsCheckbox(wrapper, 'Enable notifications');
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', false);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('notificationsEnabled', false);
  });

  it('calls setPreference when Notification sound is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToNotificationsSection(wrapper);
    const checkbox = getNotificationsCheckbox(wrapper, 'Notification sound');
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('notificationSound', true);
  });

  it('calls setPreference when Only when app is in background is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToNotificationsSection(wrapper);
    const checkbox = getNotificationsCheckbox(wrapper, 'Only when app is in background');
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('notificationsOnlyWhenNotFocused', true);
  });

  it('shows Setting saved toast when a notification setting is changed', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToNotificationsSection(wrapper);
    const { useNotifications } = await import('../composables/useNotifications');
    const { toasts } = useNotifications();
    const checkbox = getNotificationsCheckbox(wrapper, 'Enable notifications');
    await checkbox.vm.$emit('update:modelValue', false);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 350));
    expect(toasts.value.some((t) => t.title === 'Setting saved')).toBe(true);
  });

  it('shows in-app and system notifications description', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToNotificationsSection(wrapper);
    expect(wrapper.text()).toMatch(/Show in-app and system notifications/);
    expect(wrapper.text()).toMatch(/Play a sound when a notification appears/);
    expect(wrapper.text()).toMatch(/Show system notifications only when the app is not focused/);
  });
});
