<template>
  <Tag :severity="pvSeverity" :class="$attrs.class">
    <span
      v-if="dot"
      class="w-1.5 h-1.5 rounded-full shrink-0"
      :class="dotClass"
      aria-hidden="true"
    />
    <slot>{{ label }}</slot>
  </Tag>
</template>

<script setup>
import { computed } from 'vue';
import Tag from 'primevue/tag';

const props = defineProps({
  /** 'success' | 'muted' | 'accent' | 'danger' */
  variant: { type: String, default: 'muted' },
  /** Show a small colored dot before the label */
  dot: { type: Boolean, default: false },
  /** Default label when no slot content */
  label: { type: String, default: '' },
});

const pvSeverity = computed(() => {
  switch (props.variant) {
    case 'success': return 'success';
    case 'accent': return 'info';
    case 'danger': return 'danger';
    default: return 'secondary';
  }
});

const dotClass = computed(() => {
  switch (props.variant) {
    case 'success': return 'bg-rm-success';
    case 'accent': return 'bg-rm-accent';
    case 'danger': return 'bg-rm-danger';
    default: return 'bg-rm-muted';
  }
});
</script>
