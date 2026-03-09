import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLoginGate } from './useLoginGate';

describe('useLoginGate', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    const mockApi = {
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
    const mockLicense = { loadStatus: vi.fn(), offlineGraceExpired: { value: false } };
    if (globalThis.window) {
      globalThis.window.releaseManager = mockApi;
    }
    return { mockApi, mockLicense };
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  function createGate(overrides = {}) {
    const api = overrides.api ?? globalThis.window?.releaseManager;
    const license = overrides.license ?? { loadStatus: vi.fn(), offlineGraceExpired: { value: false } };
    return useLoginGate({ api, license });
  }

  it('returns screen, email, password, loading, error, and handlers', () => {
    const gate = createGate();
    expect(gate.screen).toBeDefined();
    expect(gate.email).toBeDefined();
    expect(gate.password).toBeDefined();
    expect(gate.loading).toBeDefined();
    expect(gate.error).toBeDefined();
    expect(gate.submit).toBeDefined();
    expect(gate.registerSubmit).toBeDefined();
    expect(gate.sendResetLink).toBeDefined();
    expect(gate.loginWithGitHub).toBeDefined();
    expect(gate.goBackToLogin).toBeDefined();
    expect(gate.setScreen).toBeDefined();
  });

  it('setScreen switches to register and clears error', () => {
    const gate = createGate();
    gate.error.value = 'some error';
    gate.setScreen('register');
    expect(gate.screen.value).toBe('register');
    expect(gate.error.value).toBe('');
  });

  it('goBackToLogin resets state', () => {
    const gate = createGate();
    gate.setScreen('forgot');
    gate.error.value = 'err';
    gate.resetSent.value = true;
    gate.passwordConfirmation.value = 'x';
    gate.goBackToLogin();
    expect(gate.screen.value).toBe('login');
    expect(gate.error.value).toBe('');
    expect(gate.resetSent.value).toBe(false);
    expect(gate.passwordConfirmation.value).toBe('');
  });

  it('loginWithGitHub calls api', async () => {
    const api = globalThis.window?.releaseManager;
    api.loginWithGitHub.mockResolvedValue({ ok: true });
    const gate = createGate();
    await gate.loginWithGitHub();
    expect(api.loginWithGitHub).toHaveBeenCalled();
  });

  it('loginWithGitHub sets error on failure', async () => {
    const api = globalThis.window?.releaseManager;
    api.loginWithGitHub.mockResolvedValue({ ok: false, error: 'Failed' });
    const gate = createGate();
    await gate.loginWithGitHub();
    expect(gate.error.value).toBe('Failed');
  });

  it('submit calls loginToLicenseServer', async () => {
    const api = globalThis.window?.releaseManager;
    api.loginToLicenseServer.mockResolvedValue({ ok: false, error: 'Invalid' });
    const gate = createGate();
    gate.email.value = 'test@example.com';
    gate.password.value = 'secret';
    await gate.submit();
    expect(api.loginToLicenseServer).toHaveBeenCalledWith('test@example.com', 'secret');
  });

  it('submit does nothing when email empty', async () => {
    const api = globalThis.window?.releaseManager;
    const gate = createGate();
    gate.email.value = '';
    await gate.submit();
    expect(api.loginToLicenseServer).not.toHaveBeenCalled();
  });

  it('registerSubmit shows error when passwords do not match', async () => {
    const gate = createGate();
    gate.email.value = 'test@example.com';
    gate.password.value = 'secret';
    gate.passwordConfirmation.value = 'different';
    await gate.registerSubmit();
    expect(gate.error.value).toBe('Password and confirmation do not match.');
  });

  it('registerSubmit calls registerToLicenseServer when valid', async () => {
    const api = globalThis.window?.releaseManager;
    api.registerToLicenseServer.mockResolvedValue({ ok: true });
    api.loginToLicenseServer.mockResolvedValue({ ok: true });
    const license = { loadStatus: vi.fn() };
    const gate = createGate({ license });
    gate.name.value = 'Test User';
    gate.email.value = 'test@example.com';
    gate.password.value = 'secret';
    gate.passwordConfirmation.value = 'secret';
    await gate.registerSubmit();
    expect(api.registerToLicenseServer).toHaveBeenCalledWith('Test User', 'test@example.com', 'secret', 'secret');
  });

  it('sendResetLink calls requestPasswordReset', async () => {
    const api = globalThis.window?.releaseManager;
    api.requestPasswordReset.mockResolvedValue({ ok: true });
    const gate = createGate();
    gate.email.value = 'test@example.com';
    await gate.sendResetLink();
    expect(api.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
    expect(gate.resetSent.value).toBe(true);
  });

  it('sendResetLink does nothing when email empty', async () => {
    const api = globalThis.window?.releaseManager;
    const gate = createGate();
    gate.email.value = '';
    await gate.sendResetLink();
    expect(api.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('traceFrames returns empty when no trace in resetDebug', () => {
    const gate = createGate();
    gate.resetDebug.value = null;
    expect(gate.traceFrames.value).toEqual([]);
  });

  it('traceFrames returns trace array when present', () => {
    const gate = createGate();
    gate.resetDebug.value = { body: { trace: [{ file: 'a.php', line: 10 }] } };
    expect(gate.traceFrames.value).toHaveLength(1);
    expect(gate.traceFrames.value[0].file).toBe('a.php');
  });

  it('onSecretTap reveals env switcher after 7 taps', () => {
    vi.useFakeTimers();
    const api = globalThis.window?.releaseManager;
    api.getLicenseServerEnvironments.mockResolvedValue([{ id: 'dev', label: 'Dev' }]);
    api.getLicenseServerConfig.mockResolvedValue({ environment: 'dev', url: 'https://dev.example.com' });
    const gate = createGate();
    expect(gate.showEnvSwitcher.value).toBe(false);
    for (let i = 0; i < 7; i++) {
      gate.onSecretTap();
    }
    expect(gate.showEnvSwitcher.value).toBe(true);
    expect(api.getLicenseServerEnvironments).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('loadEnvironments populates environments and selectedEnv', async () => {
    const api = globalThis.window?.releaseManager;
    api.getLicenseServerEnvironments.mockResolvedValue([{ id: 'prod', label: 'Production' }]);
    api.getLicenseServerConfig.mockResolvedValue({ environment: 'prod', url: 'https://api.example.com' });
    const gate = createGate();
    gate.showEnvSwitcher.value = true;
    await gate.loadEnvironments();
    expect(gate.environments.value).toEqual([{ id: 'prod', label: 'Production' }]);
    expect(gate.selectedEnv.value).toBe('prod');
    expect(gate.currentEnvUrl.value).toBe('https://api.example.com');
  });

  it('switchEnv updates config and currentEnvUrl', async () => {
    const api = globalThis.window?.releaseManager;
    api.setLicenseServerConfig.mockResolvedValue(undefined);
    api.getLicenseServerConfig.mockResolvedValue({ environment: 'staging', url: 'https://staging.example.com' });
    const gate = createGate();
    gate.selectedEnv.value = 'staging';
    await gate.switchEnv();
    expect(api.setLicenseServerConfig).toHaveBeenCalledWith({ environment: 'staging' });
    expect(gate.currentEnvUrl.value).toBe('https://staging.example.com');
  });

  it('toggleDebugBar toggles debugBarOpen', () => {
    const gate = createGate();
    expect(gate.debugBarOpen.value).toBe(true);
    gate.toggleDebugBar();
    expect(gate.debugBarOpen.value).toBe(false);
    gate.toggleDebugBar();
    expect(gate.debugBarOpen.value).toBe(true);
  });

  it('setDebugTab updates debugTab', () => {
    const gate = createGate();
    expect(gate.debugTab.value).toBe('request');
    gate.setDebugTab('response');
    expect(gate.debugTab.value).toBe('response');
    gate.setDebugTab('trace');
    expect(gate.debugTab.value).toBe('trace');
  });
});
