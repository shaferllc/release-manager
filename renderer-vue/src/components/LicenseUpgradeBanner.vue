<template>
  <div v-if="license.isLoggedIn?.value && !license.isPro?.value" class="license-upgrade-banner">
    <div class="license-upgrade-banner-inner">
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
    </div>
  </div>
</template>

<script setup>
import { useLicense } from '../composables/useLicense';

const license = useLicense();
</script>

<style scoped>
.license-upgrade-banner {
  flex-shrink: 0;
  background: linear-gradient(135deg, rgb(var(--rm-accent) / 0.12) 0%, rgb(var(--rm-accent) / 0.04) 100%);
  border-bottom: 1px solid rgb(var(--rm-border));
  padding: 2rem 2.5rem;
}
.license-upgrade-banner-inner {
  max-width: 56rem;
  margin: 0 auto;
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
