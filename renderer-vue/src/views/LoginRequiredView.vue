<template>
  <div class="login-gate flex-1 flex flex-col min-h-0 items-center justify-center p-8">
    <div class="login-gate-inner max-w-sm w-full">
      <!-- Sign in screen -->
      <template v-if="screen === 'login'">
        <h1 class="login-gate-headline">Sign in to Shipwell</h1>
        <p class="login-gate-subhead">
          Use the same account as the web app to unlock projects, dashboard, and all features.
        </p>

        <div class="login-gate-form flex flex-col gap-4 mt-6">
          <button
            type="button"
            class="github-login-btn"
            :disabled="loading || githubLoading"
            @click="loginWithGitHub"
          >
            <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            <span>{{ githubLoading ? 'Waiting for GitHub...' : 'Sign in with GitHub' }}</span>
          </button>

          <div class="login-divider">
            <span class="login-divider-text">or sign in with email</span>
          </div>

          <form class="flex flex-col gap-4" @submit.prevent="submit">
            <div class="flex flex-col gap-1">
              <label for="login-email" class="text-sm font-medium text-rm-text">Email</label>
              <InputText
                id="login-email"
                v-model="email"
                type="email"
                placeholder="you@example.com"
                class="w-full"
                autocomplete="email"
                :disabled="loading"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="login-password" class="text-sm font-medium text-rm-text">Password</label>
              <InputText
                id="login-password"
                v-model="password"
                type="password"
                placeholder="Password"
                class="w-full"
                autocomplete="current-password"
                :disabled="loading"
                @keydown.enter="submit"
              />
            </div>
            <div class="flex justify-end">
              <button
                type="button"
                class="login-gate-link text-xs font-medium text-rm-muted hover:text-rm-accent transition-colors"
                :disabled="loading"
                @click="screen = 'forgot'"
              >
                Forgot password?
              </button>
            </div>
            <Message v-if="error" severity="error" class="text-sm">{{ error }}</Message>
            <Button
              type="submit"
              severity="primary"
              size="large"
              class="login-gate-submit"
              :loading="loading"
              :disabled="!email.trim() || !password || loading"
            >
              Sign in
            </Button>
            <p class="login-gate-switch text-sm text-rm-muted mt-4">
              Don't have an account?
              <button
                type="button"
                class="login-gate-link font-medium text-rm-accent"
                :disabled="loading"
                @click="screen = 'register'; error = ''"
              >
                Create account
              </button>
            </p>
          </form>
        </div>
      </template>

      <!-- Register screen -->
      <template v-else-if="screen === 'register'">
        <h1 class="login-gate-headline">Create account</h1>
        <p class="login-gate-subhead">
          Sign up with the same account you use for the Shipwell web app.
        </p>

        <form class="login-gate-form flex flex-col gap-4 mt-6" @submit.prevent="registerSubmit">
          <div class="flex flex-col gap-1">
            <label for="register-name" class="text-sm font-medium text-rm-text">Name</label>
            <InputText
              id="register-name"
              v-model="name"
              type="text"
              placeholder="Your name"
              class="w-full"
              autocomplete="name"
              :disabled="loading"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="register-email" class="text-sm font-medium text-rm-text">Email</label>
            <InputText
              id="register-email"
              v-model="email"
              type="email"
              placeholder="you@example.com"
              class="w-full"
              autocomplete="email"
              :disabled="loading"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="register-password" class="text-sm font-medium text-rm-text">Password</label>
            <InputText
              id="register-password"
              v-model="password"
              type="password"
              placeholder="Password"
              class="w-full"
              autocomplete="new-password"
              :disabled="loading"
              @keydown.enter="registerSubmit"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="register-password-confirm" class="text-sm font-medium text-rm-text">Confirm password</label>
            <InputText
              id="register-password-confirm"
              v-model="passwordConfirmation"
              type="password"
              placeholder="Confirm password"
              class="w-full"
              autocomplete="new-password"
              :disabled="loading"
            />
          </div>
          <Message v-if="error" severity="error" class="text-sm">{{ error }}</Message>
          <Button
            type="submit"
            severity="primary"
            size="large"
            class="login-gate-submit"
            :loading="loading"
            :disabled="!email.trim() || !password || password !== passwordConfirmation || loading"
          >
            Create account
          </Button>
          <button
            type="button"
            class="login-gate-link text-sm font-medium text-rm-muted hover:text-rm-accent transition-colors mt-2"
            :disabled="loading"
            @click="goBackToLogin"
          >
            ← Back to sign in
          </button>
        </form>
      </template>

      <!-- Forgot password screen -->
      <template v-else>
        <h1 class="login-gate-headline">Reset password</h1>
        <p class="login-gate-subhead">
          Enter your email and we'll send you a link to reset your password.
        </p>

        <form class="login-gate-form flex flex-col gap-4 mt-6" @submit.prevent="sendResetLink">
          <div class="flex flex-col gap-1">
            <label for="forgot-email" class="text-sm font-medium text-rm-text">Email</label>
            <InputText
              id="forgot-email"
              v-model="email"
              type="email"
              placeholder="you@example.com"
              class="w-full"
              autocomplete="email"
              :disabled="loading || resetSent"
            />
          </div>
          <Message v-if="error" severity="error" class="text-sm">
            <span class="block">{{ error }}</span>
          </Message>
          <!-- Debug bar (Laravel Debugbar-style) when reset failed -->
          <div v-if="resetDebug" class="login-debug-bar">
            <button
              type="button"
              class="login-debug-bar-header"
              :aria-expanded="debugBarOpen"
              @click="debugBarOpen = !debugBarOpen"
            >
              <span class="login-debug-bar-title">Debug</span>
              <span class="login-debug-bar-badge">{{ resetDebug.status ?? '—' }}</span>
              <span class="login-debug-bar-toggle" aria-hidden="true">{{ debugBarOpen ? '▼' : '▶' }}</span>
            </button>
            <div v-show="debugBarOpen" class="login-debug-bar-body">
              <div class="login-debug-tabs">
                <button
                  type="button"
                  class="login-debug-tab"
                  :class="{ 'login-debug-tab-active': debugTab === 'request' }"
                  @click="debugTab = 'request'"
                >
                  Request
                </button>
                <button
                  type="button"
                  class="login-debug-tab"
                  :class="{ 'login-debug-tab-active': debugTab === 'response' }"
                  @click="debugTab = 'response'"
                >
                  Response
                </button>
                <button
                  v-if="traceFrames.length"
                  type="button"
                  class="login-debug-tab"
                  :class="{ 'login-debug-tab-active': debugTab === 'trace' }"
                  @click="debugTab = 'trace'"
                >
                  Stack trace ({{ traceFrames.length }})
                </button>
              </div>
              <div class="login-debug-panel">
                <div v-show="debugTab === 'request'" class="login-debug-content">
                  <dl class="login-debug-dl">
                    <dt>URL</dt>
                    <dd class="login-debug-mono">{{ resetDebug.url }}</dd>
                    <dt>Status</dt>
                    <dd class="login-debug-mono">{{ resetDebug.status ?? '—' }}</dd>
                  </dl>
                </div>
                <div v-show="debugTab === 'response'" class="login-debug-content">
                  <template v-if="responseMessage">
                    <p class="login-debug-message">{{ responseMessage }}</p>
                  </template>
                  <pre v-if="responsePreview" class="login-debug-pre">{{ responsePreview }}</pre>
                </div>
                <div v-show="debugTab === 'trace'" class="login-debug-content login-debug-trace-wrap">
                  <ol class="login-debug-trace">
                    <li
                      v-for="(frame, idx) in traceFrames"
                      :key="idx"
                      class="login-debug-trace-frame"
                    >
                      <span class="login-debug-trace-file">{{ frame.file || '—' }}</span>
                      <span v-if="frame.line != null" class="login-debug-trace-line">:{{ frame.line }}</span>
                      <span v-if="frame.function" class="login-debug-trace-fn">{{ frame.function }}{{ frame.class ? ` (${frame.class})` : '' }}</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
          <Message v-if="resetSent" severity="success" class="text-sm">
            If an account exists for that email, we've sent a password reset link.
          </Message>
          <Button
            type="submit"
            severity="primary"
            size="large"
            class="login-gate-submit"
            :loading="loading"
            :disabled="!email.trim() || loading || resetSent"
          >
            {{ resetSent ? 'Check your email' : 'Send reset link' }}
          </Button>
          <button
            type="button"
            class="login-gate-link text-sm font-medium text-rm-muted hover:text-rm-accent transition-colors mt-2"
            :disabled="loading"
            @click="goBackToLogin"
          >
            ← Back to sign in
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import { useApi } from '../composables/useApi';
import { useLicense } from '../composables/useLicense';
import * as debug from '../utils/debug';

const api = useApi();
const license = useLicense();

const screen = ref('login'); // 'login' | 'register' | 'forgot'
const name = ref('');
const email = ref('');
const password = ref('');
const passwordConfirmation = ref('');
const loading = ref(false);
const error = ref('');
const githubLoading = ref(false);

let unsubOAuthSuccess = null;
let unsubOAuthError = null;

onMounted(() => {
  unsubOAuthSuccess = api.onGitHubOAuthSuccess?.(() => {
    githubLoading.value = false;
    error.value = '';
    license.loadStatus();
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
const resetSent = ref(false);
/** When set, show extra debug details for password reset failure (URL, status, response). */
const resetDebug = ref(null);
const debugBarOpen = ref(true);
const debugTab = ref('request');

/** Laravel-style trace array from response body. */
const traceFrames = computed(() => {
  const body = resetDebug.value?.body;
  if (!body || !Array.isArray(body.trace)) return [];
  return body.trace;
});

/** Main error message from Laravel response (message or exception). */
const responseMessage = computed(() => {
  const body = resetDebug.value?.body;
  if (!body || typeof body !== 'object') return '';
  return body.message || body.exception || body.error || '';
});

/** Response body as formatted JSON for Response tab (excluding huge trace if we have Stack trace tab). */
const responsePreview = computed(() => {
  const body = resetDebug.value?.body;
  if (!body || typeof body !== 'object') return '';
  const clone = { ...body };
  if (Array.isArray(clone.trace) && clone.trace.length > 0) {
    clone.trace = `[${clone.trace.length} frames — see Stack trace tab]`;
  }
  return JSON.stringify(clone, null, 2);
});

function goBackToLogin() {
  screen.value = 'login';
  error.value = '';
  resetSent.value = false;
  resetDebug.value = null;
  passwordConfirmation.value = '';
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
      await license.loadStatus();
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
      await license.loadStatus();
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
</script>

<style scoped>
.login-gate {
  background: linear-gradient(135deg, rgb(var(--rm-accent) / 0.08) 0%, rgb(var(--rm-accent) / 0.02) 100%);
}
.login-gate-headline {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: rgb(var(--rm-text));
  margin: 0;
  line-height: 1.2;
}
.login-gate-subhead {
  font-size: 0.9375rem;
  color: rgb(var(--rm-muted));
  margin: 0.5rem 0 0 0;
  line-height: 1.5;
}
.login-gate-submit {
  font-size: 1rem;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
}
.github-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: 1px solid rgb(var(--rm-border));
  background: rgb(var(--rm-surface));
  color: rgb(var(--rm-text));
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.github-login-btn:hover:not(:disabled) {
  background: rgb(var(--rm-accent) / 0.06);
  border-color: rgb(var(--rm-accent) / 0.4);
}
.github-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.github-icon {
  flex-shrink: 0;
}
.login-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.25rem 0;
}
.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgb(var(--rm-border));
}
.login-divider-text {
  font-size: 0.75rem;
  color: rgb(var(--rm-muted));
  white-space: nowrap;
}
.login-gate-link {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.login-gate-switch {
  margin-bottom: 0;
}
.login-gate-switch .login-gate-link {
  margin-left: 0.25rem;
}
/* Laravel Debugbar-style panel */
.login-debug-bar {
  margin-top: 0.75rem;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(251, 191, 36, 0.35);
  background: #1e293b;
  color: #e2e8f0;
  font-size: 0.8125rem;
  text-align: left;
}
.login-debug-bar-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: #334155;
  border: none;
  color: #fbbf24;
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
}
.login-debug-bar-header:hover {
  background: #475569;
}
.login-debug-bar-title {
  flex: 1;
}
.login-debug-bar-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
  font-variant-numeric: tabular-nums;
}
.login-debug-bar-toggle {
  color: #94a3b8;
  font-size: 0.7rem;
}
.login-debug-bar-body {
  border-top: 1px solid rgba(251, 191, 36, 0.2);
}
.login-debug-tabs {
  display: flex;
  gap: 0;
  padding: 0 0.25rem;
  background: #0f172a;
  border-bottom: 1px solid #334155;
}
.login-debug-tab {
  padding: 0.4rem 0.75rem;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 0.75rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.login-debug-tab:hover {
  color: #e2e8f0;
}
.login-debug-tab-active {
  color: #fbbf24;
  border-bottom-color: #fbbf24;
}
.login-debug-panel {
  max-height: 18rem;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}
.login-debug-content {
  padding: 0.75rem;
}
.login-debug-dl {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 1rem;
}
.login-debug-dl dt {
  color: #94a3b8;
  font-weight: 500;
}
.login-debug-dl dd {
  margin: 0;
  word-break: break-all;
}
.login-debug-mono {
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
}
.login-debug-message {
  margin: 0 0 0.5rem 0;
  color: #fca5a5;
  font-size: 0.8125rem;
}
.login-debug-pre {
  margin: 0;
  padding: 0.5rem;
  background: #0f172a;
  border-radius: 4px;
  font-size: 0.6875rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-x: auto;
  max-height: 14rem;
  overflow-y: auto;
}
.login-debug-trace-wrap {
  padding: 0.5rem 0;
}
.login-debug-trace {
  margin: 0;
  padding-left: 1.25rem;
  list-style: decimal;
  font-size: 0.75rem;
  line-height: 1.6;
}
.login-debug-trace-frame {
  margin-bottom: 0.35rem;
  font-family: ui-monospace, monospace;
}
.login-debug-trace-file {
  color: #93c5fd;
}
.login-debug-trace-line {
  color: #fbbf24;
}
.login-debug-trace-fn {
  color: #a5b4fc;
  display: block;
  margin-left: -1.25rem;
  padding-left: 1.25rem;
}
</style>
