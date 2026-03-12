import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsView from './SettingsView.vue';
import { flushPromises, goToGitSection } from './SettingsView.spec-helpers';

describe('SettingsView > Git', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    window.releaseManager = {
      ...window.releaseManager,
      getLicenseStatus: vi.fn().mockResolvedValue({ hasLicense: false }),
      getGitGlobalConfig: vi.fn().mockResolvedValue({
        ok: true,
        userName: '',
        userEmail: '',
        gpgKeyId: '',
        gpgFormat: 'openpgp',
        pullRebase: '',
        autoStash: false,
        commitTemplate: '',
        sshKeyPath: '',
        diffTool: '',
      }),
      setGitGlobalConfig: vi.fn().mockResolvedValue(),
      listGpgKeys: vi.fn().mockResolvedValue({ ok: true, keys: [] }),
      generateGpgKey: vi.fn().mockResolvedValue({ ok: true }),
      getPreference: vi.fn().mockImplementation((key) => {
        const prefs = {
          signCommits: false,
          gitDefaultBranch: 'main',
          gitAutoFetchIntervalMinutes: 0,
        };
        return Promise.resolve(prefs[key]);
      }),
      setPreference: vi.fn().mockResolvedValue(),
    };
  });

  it('renders Git section with Identity and Commit Signing', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToGitSection(wrapper);
    expect(wrapper.text()).toMatch(/Git/);
    expect(wrapper.text()).toMatch(/Commit, identity, signing, and repository options/);
    expect(wrapper.text()).toMatch(/Identity/);
    expect(wrapper.text()).toMatch(/Commit Signing/);
  });

  it('shows User name and Email address fields', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToGitSection(wrapper);
    expect(wrapper.text()).toMatch(/User name/);
    expect(wrapper.text()).toMatch(/Your name for git commits/);
    expect(wrapper.text()).toMatch(/Email address/);
    expect(wrapper.text()).toMatch(/Your email for git commits/);
  });

  it('shows Sign commits checkbox and Signing format', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToGitSection(wrapper);
    expect(wrapper.text()).toMatch(/Sign commits/);
    expect(wrapper.text()).toMatch(/Use git commit -S when committing/);
    expect(wrapper.text()).toMatch(/Signing format/);
    expect(wrapper.text()).toMatch(/GPG \(OpenPGP\)|SSH key signing/);
  });

  it('shows Signing key ID field and Detect keys button', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToGitSection(wrapper);
    expect(wrapper.text()).toMatch(/Signing key ID/);
    expect(wrapper.text()).toMatch(/GPG key ID or SSH key path/);
    const detectBtn = wrapper.findAll('button').find((b) => b.text().includes('Detect keys'));
    expect(detectBtn.exists()).toBe(true);
  });

  it('shows Generate new GPG key section', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToGitSection(wrapper);
    expect(wrapper.text()).toMatch(/Generate new GPG key/);
    expect(wrapper.text()).toMatch(/Creates an Ed25519 key/);
    expect(wrapper.text()).toMatch(/Generate GPG key/);
  });

  it('calls setGitGlobalConfig when User name is blurred', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToGitSection(wrapper);
    await flushPromises();
    const inputs = wrapper.findAll('input[type="text"]');
    const nameInput = inputs.find((i) => i.attributes('placeholder') === 'Your Name');
    expect(nameInput.exists()).toBe(true);
    await nameInput.setValue('Jane Doe');
    await nameInput.trigger('blur');
    await flushPromises();
    expect(window.releaseManager.setGitGlobalConfig).toHaveBeenCalledWith('user.name', 'Jane Doe');
  });

  it('calls setGitGlobalConfig when Email address is blurred', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToGitSection(wrapper);
    await flushPromises();
    const emailInput = wrapper.find('input[type="email"]');
    expect(emailInput.exists()).toBe(true);
    await emailInput.setValue('jane@example.com');
    await emailInput.trigger('blur');
    await flushPromises();
    expect(window.releaseManager.setGitGlobalConfig).toHaveBeenCalledWith('user.email', 'jane@example.com');
  });

  it('calls setPreference when Sign commits is toggled', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToGitSection(wrapper);
    const section = wrapper.findAll('.settings-section').find((s) => s.text().includes('Sign commits'));
    const checkbox = section.findComponent({ name: 'Checkbox' });
    expect(checkbox.exists()).toBe(true);
    await checkbox.vm.$emit('update:modelValue', true);
    await flushPromises();
    expect(window.releaseManager.setPreference).toHaveBeenCalledWith('signCommits', true);
  });

  it('calls setGitGlobalConfig when Signing format is changed', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToGitSection(wrapper);
    const selects = wrapper.findAllComponents({ name: 'Select' });
    const formatSelect = selects.find((s) => s.props('options')?.some?.((o) => o.value === 'ssh'));
    expect(formatSelect.exists()).toBe(true);
    await formatSelect.vm.$emit('update:modelValue', 'ssh');
    await formatSelect.vm.$emit('change');
    await flushPromises();
    expect(window.releaseManager.setGitGlobalConfig).toHaveBeenCalledWith('gpg.format', 'ssh');
  });

  it('calls listGpgKeys when Detect keys is clicked', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToGitSection(wrapper);
    const detectBtn = wrapper.findAll('button').find((b) => b.text().includes('Detect keys'));
    expect(detectBtn.exists()).toBe(true);
    await detectBtn.trigger('click');
    await flushPromises();
    expect(window.releaseManager.listGpgKeys).toHaveBeenCalled();
  });

  it('calls generateGpgKey when Generate GPG key is clicked (with name and email)', async () => {
    window.releaseManager.getGitGlobalConfig = vi.fn().mockResolvedValue({
      ok: true,
      userName: 'Jane Doe',
      userEmail: 'jane@example.com',
      gpgKeyId: '',
      gpgFormat: 'openpgp',
      pullRebase: '',
      autoStash: false,
      commitTemplate: '',
      sshKeyPath: '',
      diffTool: '',
    });
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToGitSection(wrapper);
    await flushPromises();
    const genBtn = wrapper.findAll('button').find((b) => b.text().includes('Generate GPG key'));
    expect(genBtn.exists()).toBe(true);
    expect(genBtn.attributes('disabled')).toBeFalsy();
    await genBtn.trigger('click');
    await flushPromises();
    expect(window.releaseManager.generateGpgKey).toHaveBeenCalledWith('Jane Doe', 'jane@example.com');
  });

  it('shows Repository Defaults section', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToGitSection(wrapper);
    expect(wrapper.text()).toMatch(/Repository Defaults/);
    expect(wrapper.text()).toMatch(/Default branch name/);
    expect(wrapper.text()).toMatch(/Pull strategy/);
  });

  it('shows Tools & Paths section', async () => {
    const wrapper = mount(SettingsView, { global: { plugins: [createPinia()] } });
    await goToGitSection(wrapper);
    expect(wrapper.text()).toMatch(/Tools & Paths/);
    expect(wrapper.text()).toMatch(/SSH key path/);
  });
});
