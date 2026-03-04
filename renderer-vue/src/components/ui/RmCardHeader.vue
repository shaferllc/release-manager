<template>
  <component
    :is="tag"
    :class="[
      'rm-card-header block text-xs font-semibold text-rm-text uppercase tracking-wider mb-3',
      muted ? 'text-rm-muted' : '',
      $attrs.class
    ]"
  >
    <slot />
    <span v-if="$slots.meta || meta" class="rm-card-header-meta font-normal normal-case ml-1.5">
      <slot name="meta">{{ meta }}</slot>
    </span>
  </component>
</template>

<script setup>
defineProps({
  /** HTML tag for the header (e.g. 'span', 'p', 'label'). */
  tag: { type: String, default: 'span' },
  /** Muted text color. */
  muted: { type: Boolean, default: false },
  /** Optional meta text (e.g. count) shown after the title. */
  meta: { type: String, default: '' },
});
</script>
