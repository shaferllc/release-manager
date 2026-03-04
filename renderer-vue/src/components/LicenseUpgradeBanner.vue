<template>
  <div v-if="!license.hasLicense" class="license-upgrade-banner">
    <div class="license-upgrade-banner-inner">
      <h2 class="license-upgrade-headline">Unlock the full app</h2>
      <p class="license-upgrade-subhead">Add a license to get every feature — more tabs, AI generation, and batch release.</p>
      <div class="license-upgrade-benefits">
        <div class="license-upgrade-benefit">
          <span class="license-upgrade-benefit-title">Project tabs</span>
          <span class="license-upgrade-benefit-desc">Pull requests, Dev stack, Email, Tunnels, FTP, SSH, API</span>
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
      <Button severity="primary" class="license-upgrade-cta" @click="goToSettings">
        Add license
      </Button>
    </div>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import { useAppStore } from '../stores/app';
import { useLicense } from '../composables/useLicense';

const store = useAppStore();
const license = useLicense();

function goToSettings() {
  store.setViewMode('settings');
}
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
