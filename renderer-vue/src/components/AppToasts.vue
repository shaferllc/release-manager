<template>
  <div class="app-toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="app-toast"
        :class="`app-toast-${t.type}`"
        role="alert"
      >
        <div class="app-toast-content">
          <span class="app-toast-title">{{ t.title }}</span>
          <p v-if="t.message" class="app-toast-message">{{ t.message }}</p>
        </div>
        <Button
          variant="text"
          size="small"
          class="app-toast-dismiss min-w-0 p-0"
          aria-label="Dismiss"
          @click="remove(t.id)"
        >
          ×
        </Button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import { useNotifications } from '../composables/useNotifications';

const { toasts, remove } = useNotifications();
</script>

<style scoped>
.app-toasts {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: min(360px, calc(100vw - 2rem));
  pointer-events: none;
}
.app-toasts > * {
  pointer-events: auto;
}

.app-toast {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid rgb(var(--rm-border));
  background: rgb(var(--rm-surface));
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.2);
  font-size: 0.8125rem;
}

.app-toast-success {
  border-left: 4px solid rgb(var(--rm-success));
}
.app-toast-error {
  border-left: 4px solid rgb(var(--rm-warning));
}
.app-toast-info {
  border-left: 4px solid rgb(var(--rm-accent));
}

.app-toast-content {
  flex: 1;
  min-width: 0;
}
.app-toast-title {
  font-weight: 600;
  color: rgb(var(--rm-text));
}
.app-toast-message {
  margin: 0.25rem 0 0 0;
  color: rgb(var(--rm-muted));
  line-height: 1.4;
}

.app-toast-dismiss {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  background: transparent;
  color: rgb(var(--rm-muted));
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 4px;
}
.app-toast-dismiss:hover {
  color: rgb(var(--rm-text));
  background: rgb(var(--rm-surface-hover) / 0.5);
}

/* TransitionGroup */
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(1rem);
}
.toast-move {
  transition: transform 0.2s ease;
}
</style>
