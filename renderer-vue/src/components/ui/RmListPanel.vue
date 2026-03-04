<template>
  <Panel :class="['rm-list-panel', $attrs.class]">
    <template #header>
      <div class="flex items-center justify-between gap-3 w-full">
        <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">
          <slot name="title">{{ title }}</slot>
        </h3>
        <span v-if="$slots.meta" class="text-xs text-rm-muted">
          <slot name="meta" />
        </span>
      </div>
    </template>
    <slot />
  </Panel>
</template>

<script setup>
import Panel from 'primevue/panel';

defineProps({
  title: { type: String, default: '' },
});
</script>
