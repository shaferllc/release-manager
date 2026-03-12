<template>
  <div class="login-gate flex-1 flex flex-col min-h-0 items-center justify-center p-8">
    <div class="login-gate-inner max-w-sm w-full">
      <!-- Sign in screen -->
      <template v-if="screenVal === 'login'">
        <img src="/icon-128.png" alt="Shipwell" class="login-gate-logo" width="72" height="72" />
        <h1 class="login-gate-headline" @click="gate.onSecretTap">Sign in to Shipwell</h1>

        <!-- Hidden environment switcher (tap title 7 times to reveal) -->
        <div v-if="gate.showEnvSwitcher" class="env-switcher">
          <select v-model="gate.selectedEnv" class="env-switcher-select" aria-label="License server environment" @change="gate.switchEnv">
            <option v-for="env in gate.environments" :key="env.id" :value="env.id">{{ env.label }}</option>
          </select>
          <span class="env-switcher-hint">{{ gate.currentEnvUrl }}</span>
        </div>
        <p v-if="gate.license.offlineGraceExpired?.value" class="login-gate-reauth-notice">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <span>Your offline grace period has expired. Please sign in to continue using the app.</span>
        </p>
        <p v-else class="login-gate-subhead">
          Use the same account as the web app to unlock projects, dashboard, and all features.
        </p>

        <div class="login-gate-form flex flex-col gap-4 mt-6">
          <button
            type="button"
            class="github-login-btn"
            :disabled="loadingVal || githubLoadingVal"
            @click="gate.loginWithGitHub"
          >
            <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            <span>{{ githubLoadingVal ? 'Waiting for GitHub...' : 'Sign in with GitHub' }}</span>
          </button>

          <div class="login-divider">
            <span class="login-divider-text">or sign in with email</span>
          </div>

          <form class="flex flex-col gap-4" @submit.prevent="gate.submit">
            <div class="flex flex-col gap-1">
              <label for="login-email" class="text-sm font-medium text-rm-text">Email</label>
              <InputText
                id="login-email"
                v-model="gate.email"
                type="email"
                placeholder="you@example.com"
                class="w-full"
                autocomplete="email"
                :disabled="loadingVal"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="login-password" class="text-sm font-medium text-rm-text">Password</label>
              <InputText
                id="login-password"
                v-model="gate.password"
                type="password"
                placeholder="Password"
                class="w-full"
                autocomplete="current-password"
                :disabled="loadingVal"
                @keydown.enter="gate.submit"
              />
            </div>
            <div class="flex justify-end">
              <button
                type="button"
                class="login-gate-link text-xs font-medium text-rm-muted hover:text-rm-accent transition-colors"
                :disabled="loadingVal"
                @click="gate.setScreen('forgot')"
              >
                Forgot password?
              </button>
            </div>
            <Message v-if="gate.error" severity="error" class="text-sm">{{ gate.error }}</Message>
            <Button
              type="submit"
              severity="primary"
              size="large"
              class="login-gate-submit"
              :loading="loadingVal"
              :disabled="!emailTrimmed || !passwordVal || loadingVal"
            >
              Sign in
            </Button>
            <p class="login-gate-switch text-sm text-rm-muted mt-4">
              Don't have an account?
              <button
                type="button"
                class="login-gate-link font-medium text-rm-accent"
                :disabled="loadingVal"
                @click="gate.setScreen('register')"
              >
                Create account
              </button>
            </p>
          </form>
        </div>
      </template>

      <!-- Register screen -->
      <template v-else-if="screenVal === 'register'">
        <img src="/icon-128.png" alt="Shipwell" class="login-gate-logo" width="72" height="72" />
        <h1 class="login-gate-headline">Create account</h1>
        <p class="login-gate-subhead">
          Sign up with the same account you use for the Shipwell web app.
        </p>

        <form class="login-gate-form flex flex-col gap-4 mt-6" @submit.prevent="gate.registerSubmit">
          <div class="flex flex-col gap-1">
            <label for="register-name" class="text-sm font-medium text-rm-text">Name</label>
            <InputText
              id="register-name"
              v-model="gate.name"
              type="text"
              placeholder="Your name"
              class="w-full"
              autocomplete="name"
              :disabled="loadingVal"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="register-email" class="text-sm font-medium text-rm-text">Email</label>
            <InputText
              id="register-email"
              v-model="gate.email"
              type="email"
              placeholder="you@example.com"
              class="w-full"
              autocomplete="email"
              :disabled="loadingVal"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="register-password" class="text-sm font-medium text-rm-text">Password</label>
            <InputText
              id="register-password"
              v-model="gate.password"
              type="password"
              placeholder="Password"
              class="w-full"
              autocomplete="new-password"
              :disabled="loadingVal"
              @keydown.enter="gate.registerSubmit"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="register-password-confirm" class="text-sm font-medium text-rm-text">Confirm password</label>
            <InputText
              id="register-password-confirm"
              v-model="gate.passwordConfirmation"
              type="password"
              placeholder="Confirm password"
              class="w-full"
              autocomplete="new-password"
              :disabled="loadingVal"
            />
          </div>
          <Message v-if="gate.error" severity="error" class="text-sm">{{ gate.error }}</Message>
          <Button
            type="submit"
            severity="primary"
            size="large"
            class="login-gate-submit"
            :loading="loadingVal"
            :disabled="!emailTrimmed || !passwordVal || passwordVal !== passwordConfirmationVal || loadingVal"
          >
            Create account
          </Button>
          <button
            type="button"
            class="login-gate-link text-sm font-medium text-rm-muted hover:text-rm-accent transition-colors mt-2"
            :disabled="loadingVal"
            @click="gate.goBackToLogin"
          >
            ← Back to sign in
          </button>
        </form>
      </template>

      <!-- Forgot password screen -->
      <template v-else>
        <img src="/icon-128.png" alt="Shipwell" class="login-gate-logo" width="72" height="72" />
        <h1 class="login-gate-headline">Reset password</h1>
        <p class="login-gate-subhead">
          Enter your email and we'll send you a link to reset your password.
        </p>

        <form class="login-gate-form flex flex-col gap-4 mt-6" @submit.prevent="gate.sendResetLink">
          <div class="flex flex-col gap-1">
            <label for="forgot-email" class="text-sm font-medium text-rm-text">Email</label>
            <InputText
              id="forgot-email"
              v-model="gate.email"
              type="email"
              placeholder="you@example.com"
              class="w-full"
              autocomplete="email"
              :disabled="loadingVal || resetSentVal"
            />
          </div>
          <Message v-if="gate.error" severity="error" class="text-sm">
            <span class="block">{{ gate.error }}</span>
          </Message>
          <!-- Debug bar (Laravel Debugbar-style) when reset failed -->
          <div v-if="gate.resetDebug" class="login-debug-bar">
            <button
              type="button"
              class="login-debug-bar-header"
              :aria-expanded="gate.debugBarOpen"
              @click="gate.toggleDebugBar"
            >
              <span class="login-debug-bar-title">Debug</span>
              <span class="login-debug-bar-badge">{{ gate.resetDebug.status ?? '—' }}</span>
              <span class="login-debug-bar-toggle" aria-hidden="true">{{ gate.debugBarOpen ? '▼' : '▶' }}</span>
            </button>
            <div v-show="gate.debugBarOpen" class="login-debug-bar-body">
              <div class="login-debug-tabs">
                <button
                  type="button"
                  class="login-debug-tab"
                  :class="{ 'login-debug-tab-active': gate.debugTab === 'request' }"
                  @click="gate.setDebugTab('request')"
                >
                  Request
                </button>
                <button
                  type="button"
                  class="login-debug-tab"
                  :class="{ 'login-debug-tab-active': gate.debugTab === 'response' }"
                  @click="gate.setDebugTab('response')"
                >
                  Response
                </button>
                <button
                  v-if="safeTraceFrames.length"
                  type="button"
                  class="login-debug-tab"
                  :class="{ 'login-debug-tab-active': gate.debugTab === 'trace' }"
                  @click="gate.setDebugTab('trace')"
                >
                  Stack trace ({{ safeTraceFrames.length }})
                </button>
              </div>
              <div class="login-debug-panel">
                <div v-show="gate.debugTab === 'request'" class="login-debug-content">
                  <dl class="login-debug-dl">
                    <dt>URL</dt>
                    <dd class="login-debug-mono">{{ gate.resetDebug.url }}</dd>
                    <dt>Status</dt>
                    <dd class="login-debug-mono">{{ gate.resetDebug.status ?? '—' }}</dd>
                  </dl>
                </div>
                <div v-show="gate.debugTab === 'response'" class="login-debug-content">
                  <template v-if="gate.responseMessage">
                    <p class="login-debug-message">{{ gate.responseMessage }}</p>
                  </template>
                  <pre v-if="gate.responsePreview" class="login-debug-pre">{{ gate.responsePreview }}</pre>
                </div>
                <div v-show="gate.debugTab === 'trace'" class="login-debug-content login-debug-trace-wrap">
                  <ol class="login-debug-trace">
                    <li
                      v-for="(frame, idx) in safeTraceFrames"
                      :key="idx"
                      class="login-debug-trace-frame"
                    >
                      <span class="login-debug-trace-file">{{ (frame && frame.file) || '—' }}</span>
                      <span v-if="frame && frame.line != null" class="login-debug-trace-line">:{{ frame.line }}</span>
                      <span v-if="frame && frame.function" class="login-debug-trace-fn">{{ frame.function }}{{ frame.class ? ` (${frame.class})` : '' }}</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
          <Message v-if="gate.resetSent" severity="success" class="text-sm">
            If an account exists for that email, we've sent a password reset link.
          </Message>
          <Button
            type="submit"
            severity="primary"
            size="large"
            class="login-gate-submit"
            :loading="loadingVal"
            :disabled="!emailTrimmed || loadingVal || resetSentVal"
          >
            {{ resetSentVal ? 'Check your email' : 'Send reset link' }}
          </Button>
          <button
            type="button"
            class="login-gate-link text-sm font-medium text-rm-muted hover:text-rm-accent transition-colors mt-2"
            :disabled="loadingVal"
            @click="gate.goBackToLogin"
          >
            ← Back to sign in
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import { useLoginGate } from '../composables/useLoginGate';

const gate = useLoginGate();

/** Safe string access for template (handles refs that may not unwrap in tests) */
function str(val) {
  const s = typeof val === 'string' ? val : val?.value ?? '';
  return String(s);
}
const emailTrimmed = computed(() => str(gate.email).trim());
const passwordVal = computed(() => str(gate.password));
const passwordConfirmationVal = computed(() => str(gate.passwordConfirmation));
const safeTraceFrames = computed(() => (Array.isArray(gate.traceFrames) ? gate.traceFrames : []).filter(Boolean));
/** Unwrap refs for props (tests may not auto-unwrap) */
const loadingVal = computed(() => !!(gate.loading?.value ?? gate.loading));
const githubLoadingVal = computed(() => !!(gate.githubLoading?.value ?? gate.githubLoading));
const resetSentVal = computed(() => !!(gate.resetSent?.value ?? gate.resetSent));
const screenVal = computed(() => gate.screen?.value ?? gate.screen ?? 'login');
</script>

<style scoped>
.login-gate {
  background: linear-gradient(135deg, rgb(var(--rm-accent) / 0.08) 0%, rgb(var(--rm-accent) / 0.02) 100%);
}
.login-gate-logo {
  display: block;
  margin-bottom: 1.25rem;
  border-radius: 16px;
  filter: drop-shadow(0 4px 12px rgb(0 0 0 / 0.15));
}
.login-gate-headline {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: rgb(var(--rm-text));
  margin: 0;
  line-height: 1.2;
}
.login-gate-reauth-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 0.75rem 0 0 0;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  line-height: 1.4;
  color: rgb(var(--rm-warning));
  background: rgb(var(--rm-warning) / 0.1);
  border: 1px solid rgb(var(--rm-warning) / 0.3);
  border-radius: 6px;
}
.login-gate-subhead {
  font-size: 0.9375rem;
  color: rgb(var(--rm-muted));
  margin: 0.5rem 0 0 0;
  line-height: 1.5;
}
.env-switcher {
  margin-top: 0.75rem;
  padding: 0.75rem;
  border-radius: 6px;
  background: rgb(var(--rm-surface));
  border: 1px dashed rgb(var(--rm-border));
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.env-switcher-select {
  width: 100%;
  padding: 0.5rem 0.625rem;
  border-radius: 6px;
  border: 1px solid rgb(var(--rm-border));
  background: rgb(var(--rm-bg));
  color: rgb(var(--rm-text));
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
}
.env-switcher-select:focus {
  outline: none;
  border-color: rgb(var(--rm-accent));
  box-shadow: 0 0 0 2px rgb(var(--rm-accent) / 0.2);
}
.env-switcher-hint {
  font-size: 0.6875rem;
  color: rgb(var(--rm-muted));
  font-family: ui-monospace, monospace;
  word-break: break-all;
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
