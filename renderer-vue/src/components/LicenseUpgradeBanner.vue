<template>
  <div v-if="visible" class="license-upgrade-banner">
    <div class="license-upgrade-banner-inner">
      <button class="license-upgrade-dismiss" aria-label="Dismiss" @click="dismiss">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <h2 class="license-upgrade-headline">Upgrade to Pro</h2>
      <p class="license-upgrade-subhead">
        <span v-if="license.isPlus?.value">You're on Plus. Upgrade to Pro for every feature.</span>
        <span v-else>You're on the free plan. Upgrade to unlock more tabs and features.</span>
      </p>
      <div class="license-upgrade-benefits">
        <div class="license-upgrade-benefit">
          <span class="license-upgrade-benefit-title">All tabs</span>
          <span class="license-upgrade-benefit-desc">Pull requests, Dev stack, Terminal, Email, Tunnels, FTP, SSH, API, and more</span>
        </div>
        <div class="license-upgrade-benefit">
          <span class="license-upgrade-benefit-title">AI generation</span>
          <span class="license-upgrade-benefit-desc">Commit messages, release notes, test-fix suggestions</span>
        </div>
        <div class="license-upgrade-benefit">
          <span class="license-upgrade-benefit-title">Batch release</span>
          <span class="license-upgrade-benefit-desc">Bump and release multiple projects at once</span>
        </div>
      </div>
      <Button severity="primary" class="license-upgrade-cta" label="View plans" @click="openPricing" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import { useLicense } from '../composables/useLicense';
import { useApi } from '../composables/useApi';

const license = useLicense();
const api = useApi();
const dismissed = ref(false);

const visible = computed(() => license.isLoggedIn?.value && !license.isPro?.value && !dismissed.value);

onMounted(async () => {
  const saved = await api.getPreference?.('upgradeBannerDismissed').catch(() => false);
  if (saved) dismissed.value = true;
});

function dismiss() {
  dismissed.value = true;
  api.setPreference?.('upgradeBannerDismissed', true);
}

async function openPricing() {
  const config = await api.getLicenseServerConfig?.().catch(() => ({}));
  const base = (config?.url || '').replace(/\/+$/, '');
  if (base) api.openUrl?.(`${base}/pricing`);
}
</script>

<style scoped>
.license-upgrade-banner {
  flex-shrink: 0;
  background: linear-gradient(135deg, rgb(var(--rm-accent) / 0.12) 0%, rgb(var(--rm-accent) / 0.04) 100%);
  border-bottom: 1px solid rgb(var(--rm-border));
  padding: 2rem 2.5rem;
  position: relative;
}
.license-upgrade-banner-inner {
  max-width: 56rem;
  margin: 0 auto;
}
.license-upgrade-dismiss {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: none;
  color: rgb(var(--rm-muted));
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}
.license-upgrade-dismiss:hover {
  color: rgb(var(--rm-text));
  background: rgb(var(--rm-surface-hover) / 0.6);
}
.license-upgrade-headline {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: rgb(var(--rm-text));
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
}
.license-upgrade-subhead {
  font-size: 1.0625rem;
  color: rgb(var(--rm-muted));
  margin: 0 0 1.75rem 0;
  line-height: 1.45;
}
.license-upgrade-benefits {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 1.5rem 2rem;
  margin-bottom: 1.75rem;
}
.license-upgrade-benefit {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.license-upgrade-benefit-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--rm-accent));
}
.license-upgrade-benefit-desc {
  font-size: 0.875rem;
  color: rgb(var(--rm-muted));
  line-height: 1.4;
}
.license-upgrade-cta {
  font-size: 1rem;
  padding: 0.625rem 1.5rem;
  font-weight: 600;
}
</style>
