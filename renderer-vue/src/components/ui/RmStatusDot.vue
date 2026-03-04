<template>
  <span
    class="rm-status-dot shrink-0 w-3 h-3 rounded-full border-2 border-rm-bg"
    :class="statusClass"
    :title="title"
    aria-hidden="true"
  />
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  /** 'running' | 'error' | 'stopped' */
  status: { type: String, default: 'stopped' },
});

const statusClass = computed(() => {
  switch (props.status) {
    case 'running':
      return 'status-dot-running';
    case 'error':
      return 'status-dot-error';
    default:
      return 'status-dot-stopped';
  }
});

const title = computed(() => {
  switch (props.status) {
    case 'running':
      return 'Running';
    case 'error':
      return 'Crashed';
    default:
      return 'Stopped';
  }
});
</script>

<style scoped>
.status-dot-running {
  background: rgb(var(--rm-accent));
  box-shadow: 0 0 0 2px rgb(var(--rm-accent) / 0.35);
}
.status-dot-error {
  background: rgb(var(--rm-danger));
}
.status-dot-stopped {
  background: rgb(var(--rm-muted) / 0.5);
}
</style>
