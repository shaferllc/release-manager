<template>
  <div class="sr-announcer">
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
    >{{ politeness === 'polite' ? message : '' }}</div>
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      class="sr-only"
    >{{ politeness === 'assertive' ? message : '' }}</div>
  </div>
</template>

<script setup>
import { useAnnouncer } from '../composables/useAnnouncer';

const { message, politeness } = useAnnouncer();
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
.sr-announcer {
  pointer-events: none;
}
</style>
