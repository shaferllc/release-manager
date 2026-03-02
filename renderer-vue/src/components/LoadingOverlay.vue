<template>
  <Teleport to="body">
    <Transition name="loading-fade">
      <div
        v-show="store.loadingOverlayVisible"
        class="loading-overlay"
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <div class="loading-overlay-backdrop" />
        <div class="loading-overlay-content">
          <div class="loading-spinner" aria-hidden="true" />
          <p class="loading-overlay-text">Working…</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useAppStore } from '../stores/app';

const store = useAppStore();
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.loading-overlay-backdrop {
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / 0.5);
  backdrop-filter: blur(2px);
}

.loading-overlay-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(var(--rm-border));
  box-shadow: 0 20px 40px rgb(0 0 0 / 0.3);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgb(var(--rm-border));
  border-top-color: rgb(var(--rm-accent));
  border-radius: 50%;
  animation: loading-spin 0.8s linear infinite;
}

.loading-overlay-text {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--rm-text));
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.2s ease;
}
.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}

@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
