<template>
  <div
    class="rm-empty-state flex flex-col items-center justify-center py-14 px-6 text-center"
    :class="$attrs.class"
  >
    <div
      v-if="$slots.icon"
      class="rm-empty-state-icon mb-4 rounded-full bg-rm-surface border border-rm-border flex items-center justify-center text-rm-muted w-[72px] h-[72px] shrink-0"
      aria-hidden="true"
    >
      <slot name="icon" />
    </div>
    <h4 v-if="title" class="text-base font-semibold text-rm-text m-0 mb-1.5">{{ title }}</h4>
    <div v-if="$slots.default" class="text-sm text-rm-muted m-0 max-w-sm">
      <slot />
    </div>
    <div v-else-if="description" class="text-sm text-rm-muted m-0 max-w-sm">
      {{ description }}
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center justify-center gap-2 mt-6">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
});
</script>
