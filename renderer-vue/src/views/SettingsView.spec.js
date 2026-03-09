import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsView from './SettingsView.vue';

describe('SettingsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
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
    const accountBtn = wrapper.findAll('button.settings-nav-btn').find((b) => b.text().includes('Account'));
    expect(accountBtn).toBeDefined();
    await accountBtn.trigger('click');
    expect(accountBtn.classes()).toContain('settings-nav-btn-active');
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
