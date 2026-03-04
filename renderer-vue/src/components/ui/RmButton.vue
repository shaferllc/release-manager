<template>
  <Button
    type="button"
    :disabled="disabled"
    :severity="pvSeverity"
    :variant="pvVariant"
    :size="pvSize"
    :class="['rm-btn', variantClass, sizeClass, $attrs.class]"
    v-bind="$attrs"
    @click="$emit('click', $event)"
  >
    <slot />
  </Button>
</template>

<script setup>
import { computed } from 'vue';
import Button from 'primevue/button';

const props = defineProps({
  variant: { type: String, default: 'secondary' }, // 'primary' | 'secondary' | 'ghost' | 'danger'
  size: { type: String, default: 'default' },      // 'default' | 'compact'
  disabled: { type: Boolean, default: false },
});
defineEmits(['click']);

const pvSeverity = computed(() => {
  if (props.variant === 'primary') return 'primary';
  if (props.variant === 'danger') return 'danger';
  return 'secondary';
});
const pvVariant = computed(() => (props.variant === 'ghost' ? 'text' : undefined));
const pvSize = computed(() => (props.size === 'compact' ? 'small' : undefined));
// Apply our token-based styles per variant (global pt is secondary-like)
const variantClass = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-rm-accent text-white border-0 hover:bg-rm-accent-hover';
    case 'ghost':
      return 'bg-transparent border-0 text-rm-muted hover:text-rm-text hover:bg-rm-surface-hover';
    case 'danger':
      return 'bg-transparent text-rm-danger border-rm-border hover:bg-red-500/10 hover:border-red-500/40';
    default:
      return 'bg-transparent text-rm-text border-rm-border hover:bg-rm-surface-hover/60';
  }
});
const sizeClass = computed(() => (props.size === 'compact' ? 'py-1.5 px-2.5 text-xs' : ''));
</script>
