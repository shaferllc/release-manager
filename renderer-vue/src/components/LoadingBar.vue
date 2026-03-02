<template>
  <Teleport to="body">
    <Transition name="loading-bar">
      <div
        v-show="store.loadingBarVisible"
        class="loading-bar"
        role="progressbar"
        aria-valuetext="Loading"
        aria-label="Loading"
      >
        <div class="loading-bar-track" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useAppStore } from '../stores/app';

const store = useAppStore();
</script>

<style scoped>
.loading-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 9998;
  overflow: hidden;
  pointer-events: none;
}

.loading-bar-track {
  height: 100%;
  width: 40%;
  background: rgb(var(--rm-accent));
  animation: loading-bar-slide 1.2s ease-in-out infinite;
}

.loading-bar-enter-active,
.loading-bar-leave-active {
  transition: opacity 0.15s ease;
}
.loading-bar-enter-from,
.loading-bar-leave-to {
  opacity: 0;
}

@keyframes loading-bar-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(350%);
  }
}
</style>
