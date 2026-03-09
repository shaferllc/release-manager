import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import LoginRequiredView from './LoginRequiredView.vue';

describe('LoginRequiredView', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        ...originalReleaseManager,
        loginWithGitHub: vi.fn(),
        loginToLicenseServer: vi.fn(),
        registerToLicenseServer: vi.fn(),
        requestPasswordReset: vi.fn(),
        getLicenseServerEnvironments: vi.fn().mockResolvedValue([]),
        getLicenseServerConfig: vi.fn().mockResolvedValue({}),
        setLicenseServerConfig: vi.fn().mockResolvedValue(undefined),
        onGitHubOAuthSuccess: vi.fn().mockReturnValue(() => {}),
        onGitHubOAuthError: vi.fn().mockReturnValue(() => {}),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('renders login required message', () => {
    const wrapper = mount(LoginRequiredView, { global: { plugins: [createPinia()] } });
    expect(wrapper.text()).toMatch(/Sign in to Shipwell/);
  });

  it('shows register screen when Create account clicked', async () => {
    const wrapper = mount(LoginRequiredView, { global: { plugins: [createPinia()] } });
    const createAccountBtn = wrapper.findAll('button.login-gate-link').find((b) => b.text().includes('Create account'));
    await createAccountBtn.trigger('click');
    expect(wrapper.text()).toMatch(/Create account/);
  });

  it('shows forgot screen when Forgot password clicked', async () => {
    const wrapper = mount(LoginRequiredView, { global: { plugins: [createPinia()] } });
    const forgotBtn = wrapper.findAll('button.login-gate-link').find((b) => b.text().includes('Forgot password'));
    await forgotBtn.trigger('click');
    expect(wrapper.text()).toMatch(/Reset password/);
  });

  it('goBackToLogin returns to login from register', async () => {
    const wrapper = mount(LoginRequiredView, { global: { plugins: [createPinia()] } });
    const createAccountBtn = wrapper.findAll('button.login-gate-link').find((b) => b.text().includes('Create account'));
    await createAccountBtn.trigger('click');
    expect(wrapper.text()).toMatch(/Create account/);
    const backBtn = wrapper.findAll('button.login-gate-link').find((b) => b.text().includes('Back to sign in'));
    await backBtn.trigger('click');
    expect(wrapper.text()).toMatch(/Sign in to Shipwell/);
  });

  it('loginWithGitHub calls api when button clicked', async () => {
    const api = globalThis.window?.releaseManager;
    api.loginWithGitHub.mockResolvedValue({ ok: true });
    const wrapper = mount(LoginRequiredView, { global: { plugins: [createPinia()] } });
    await wrapper.find('button.github-login-btn').trigger('click');
    expect(api.loginWithGitHub).toHaveBeenCalled();
  });

  it('submit calls loginToLicenseServer with email and password', async () => {
    const api = globalThis.window?.releaseManager;
    api.loginToLicenseServer.mockResolvedValue({ ok: false, error: 'Invalid' });
    const wrapper = mount(LoginRequiredView, { global: { plugins: [createPinia()] } });
    await wrapper.find('#login-email').setValue('test@example.com');
    await wrapper.find('#login-password').setValue('secret');
    await wrapper.find('form').trigger('submit.prevent');
    expect(api.loginToLicenseServer).toHaveBeenCalledWith('test@example.com', 'secret');
  });

  it('registerSubmit shows error when passwords do not match', async () => {
    const wrapper = mount(LoginRequiredView, { global: { plugins: [createPinia()] } });
    const createAccountBtn = wrapper.findAll('button.login-gate-link').find((b) => b.text().includes('Create account'));
    await createAccountBtn.trigger('click');
    await wrapper.find('#register-name').setValue('Test User');
    await wrapper.find('#register-email').setValue('test@example.com');
    await wrapper.find('#register-password').setValue('secret');
    await wrapper.find('#register-password-confirm').setValue('different');
    await wrapper.find('form').trigger('submit.prevent');
    expect(wrapper.text()).toMatch(/Password and confirmation do not match/);
  });

  it('sendResetLink calls requestPasswordReset', async () => {
    const api = globalThis.window?.releaseManager;
    api.requestPasswordReset.mockResolvedValue({ ok: true });
    const wrapper = mount(LoginRequiredView, { global: { plugins: [createPinia()] } });
    const forgotBtn = wrapper.findAll('button.login-gate-link').find((b) => b.text().includes('Forgot password'));
    await forgotBtn.trigger('click');
    await wrapper.find('#forgot-email').setValue('test@example.com');
    await wrapper.find('form').trigger('submit.prevent');
    expect(api.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
  });

  it('shows debug bar when password reset fails with debug info', async () => {
    const api = globalThis.window?.releaseManager;
    api.requestPasswordReset.mockResolvedValue({
      ok: false,
      error: 'Server error',
      debug: {
        url: 'https://api.example.com/forgot',
        status: 500,
        body: {
          message: 'Internal server error',
          trace: [
            { file: '/app/Http/Controllers/AuthController.php', line: 42, function: 'sendResetLink', class: 'AuthController' },
          ],
        },
      },
    });
    const wrapper = mount(LoginRequiredView, { global: { plugins: [createPinia()] } });
    const forgotBtn = wrapper.findAll('button.login-gate-link').find((b) => b.text().includes('Forgot password'));
    await forgotBtn.trigger('click');
    await wrapper.find('#forgot-email').setValue('test@example.com');
    await wrapper.find('form').trigger('submit.prevent');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.login-debug-bar').exists()).toBe(true);
    expect(wrapper.text()).toMatch(/Internal server error/);
    const stackTraceTab = wrapper.findAll('button.login-debug-tab').find((b) => b.text().includes('Stack trace'));
    if (stackTraceTab) {
      await stackTraceTab.trigger('click');
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toMatch(/AuthController\.php/);
      expect(wrapper.text()).toMatch(/sendResetLink/);
    }
  });
});
