import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useApi } from './useApi';
import { useLicense } from './useLicense';
import { useAppStore } from '../stores/app';
import * as debug from '../utils/debug';

/**
 * Composable for the login gate: sign in, register, forgot password.
 * Accepts optional api and license for dependency injection (e.g. in tests).
 * @param {Object} [options]
 * @param {Object} [options.api] - API instance (default: useApi())
 * @param {Object} [options.license] - License instance (default: useLicense())
 */
export function useLoginGate(options = {}) {
  const api = options.api ?? useApi();
  const license = options.license ?? useLicense();
  const store = options.store ?? useAppStore();

  const screen = ref('login'); // 'login' | 'register' | 'forgot'
  const name = ref('');
  const email = ref('');
  const password = ref('');
  const passwordConfirmation = ref('');
  const loading = ref(false);
  const error = ref('');
  const githubLoading = ref(false);

  const showEnvSwitcher = ref(false);
  const secretTapCount = ref(0);
  let secretTapTimer = null;
  const SECRET_TAP_THRESHOLD = 7;
  const SECRET_TAP_WINDOW_MS = 3000;

  const environments = ref([]);
  const selectedEnv = ref('');
  const currentEnvUrl = ref('');

  const resetSent = ref(false);
  const resetDebug = ref(null);
  const debugBarOpen = ref(store?.debugBarVisible === false ? false : true);
  const debugTab = ref('request');

  watch(() => store.debugBarVisible, (v) => {
    if (v === true) debugBarOpen.value = true;
    else if (v === false) debugBarOpen.value = false;
  }, { immediate: false });

  const traceFrames = computed(() => {
    const body = resetDebug.value?.body;
    if (!body || !Array.isArray(body.trace)) return [];
    return body.trace.filter((f) => f != null);
  });

  const responseMessage = computed(() => {
    const body = resetDebug.value?.body;
    if (!body || typeof body !== 'object') return '';
    return body.message || body.exception || body.error || '';
  });

  const responsePreview = computed(() => {
    const body = resetDebug.value?.body;
    if (!body || typeof body !== 'object') return '';
    const clone = { ...body };
    if (Array.isArray(clone.trace) && clone.trace.length > 0) {
      clone.trace = `[${clone.trace.length} frames — see Stack trace tab]`;
    }
    return JSON.stringify(clone, null, 2);
  });

  function onSecretTap() {
    secretTapCount.value++;
    clearTimeout(secretTapTimer);
    secretTapTimer = setTimeout(() => { secretTapCount.value = 0; }, SECRET_TAP_WINDOW_MS);

    if (secretTapCount.value >= SECRET_TAP_THRESHOLD) {
      secretTapCount.value = 0;
      showEnvSwitcher.value = !showEnvSwitcher.value;
      if (showEnvSwitcher.value) loadEnvironments();
    }
  }

  async function loadEnvironments() {
    try {
      const envs = await api.getLicenseServerEnvironments?.();
      environments.value = Array.isArray(envs) ? envs : [];
      const config = await api.getLicenseServerConfig?.();
      selectedEnv.value = config?.environment || 'dev';
      currentEnvUrl.value = config?.url || '';
    } catch (_) {}
  }

  async function switchEnv() {
    try {
      await api.setLicenseServerConfig?.({ environment: selectedEnv.value });
      const config = await api.getLicenseServerConfig?.();
      currentEnvUrl.value = config?.url || '';
      error.value = '';
    } catch (_) {}
  }

  let unsubOAuthSuccess = null;
  let unsubOAuthError = null;

  onMounted(() => {
    unsubOAuthSuccess = api.onGitHubOAuthSuccess?.(() => {
      githubLoading.value = false;
      error.value = '';
      license.loadStatus?.();
    });
    unsubOAuthError = api.onGitHubOAuthError?.((err) => {
      githubLoading.value = false;
      error.value = err || 'GitHub sign-in failed.';
    });
  });

  onUnmounted(() => {
    unsubOAuthSuccess?.();
    unsubOAuthError?.();
  });

  async function loginWithGitHub() {
    error.value = '';
    githubLoading.value = true;
    try {
      const result = await api.loginWithGitHub?.();
      if (!result?.ok) {
        error.value = result?.error || 'Could not start GitHub sign-in.';
        githubLoading.value = false;
      }
    } catch (e) {
      error.value = e?.message || 'Could not start GitHub sign-in.';
      githubLoading.value = false;
    }
  }

  function goBackToLogin() {
    screen.value = 'login';
    error.value = '';
    resetSent.value = false;
    resetDebug.value = null;
    passwordConfirmation.value = '';
  }

  function setScreen(s) {
    screen.value = s;
    if (s === 'register') error.value = '';
  }

  function toggleDebugBar() {
    debugBarOpen.value = !debugBarOpen.value;
  }

  function setDebugTab(tab) {
    debugTab.value = tab;
  }

  async function registerSubmit() {
    error.value = '';
    if (!email.value?.trim() || !password.value) return;
    if (password.value !== passwordConfirmation.value) {
      error.value = 'Password and confirmation do not match.';
      return;
    }
    loading.value = true;
    try {
      debug.log('login', 'register', { name: name.value?.trim(), email: email.value.trim() });
      const result = await api.registerToLicenseServer?.(name.value?.trim() || email.value.trim(), email.value.trim(), password.value, passwordConfirmation.value);
      if (!result?.ok) {
        error.value = result?.error || 'Could not create account.';
        debug.warn('login', 'register failed', { error: error.value });
        return;
      }
      debug.log('login', 'register ok, signing in');
      const loginResult = await api.loginToLicenseServer?.(email.value.trim(), password.value);
      if (loginResult?.ok) {
        password.value = '';
        passwordConfirmation.value = '';
        await license.loadStatus?.();
      } else {
        error.value = loginResult?.error || 'Account created. Please sign in.';
      }
    } catch (e) {
      error.value = e?.message || 'Could not create account.';
      debug.warn('login', 'register exception', e?.message ?? e);
    } finally {
      loading.value = false;
    }
  }

  async function submit() {
    error.value = '';
    if (!email.value?.trim()) return;
    loading.value = true;
    try {
      debug.log('login', 'submit', { email: email.value.trim() });
      const result = await api.loginToLicenseServer?.(email.value.trim(), password.value ?? '');
      if (result?.ok) {
        debug.log('login', 'submit ok, loading status');
        password.value = '';
        await license.loadStatus?.();
      } else {
        error.value = result?.error || 'Sign in failed';
        debug.warn('login', 'submit failed', { error: error.value, result });
      }
    } catch (e) {
      error.value = e?.message || 'Sign in failed';
      debug.warn('login', 'submit exception', {
        message: e?.message,
        name: e?.name,
        cause: e?.cause,
        stack: e?.stack,
      });
    } finally {
      loading.value = false;
    }
  }

  async function sendResetLink() {
    error.value = '';
    resetDebug.value = null;
    if (!email.value?.trim()) return;
    loading.value = true;
    resetSent.value = false;
    try {
      debug.log('login', 'requestPasswordReset', { email: email.value.trim() });
      const result = await api.requestPasswordReset?.(email.value.trim());
      if (result?.ok) {
        resetSent.value = true;
        debug.log('login', 'requestPasswordReset ok');
      } else {
        error.value = result?.error || 'Could not send reset link';
        resetDebug.value = result?.debug ?? null;
        debug.warn('login', 'requestPasswordReset failed', { error: error.value, debug: resetDebug.value });
      }
    } catch (e) {
      error.value = e?.message || 'Could not send reset link';
      resetDebug.value = { thrown: e?.message, name: e?.name };
      debug.warn('login', 'requestPasswordReset exception', e?.message ?? e);
    } finally {
      loading.value = false;
    }
  }

  return {
    api,
    license,
    screen,
    name,
    email,
    password,
    passwordConfirmation,
    loading,
    error,
    githubLoading,
    showEnvSwitcher,
    secretTapCount,
    environments,
    selectedEnv,
    currentEnvUrl,
    resetSent,
    resetDebug,
    debugBarOpen,
    debugTab,
    traceFrames,
    responseMessage,
    responsePreview,
    onSecretTap,
    loadEnvironments,
    switchEnv,
    loginWithGitHub,
    goBackToLogin,
    setScreen,
    toggleDebugBar,
    setDebugTab,
    registerSubmit,
    submit,
    sendResetLink,
  };
}
