<template>
  <div class="fixed inset-0 flex items-center justify-center z-20 p-4 bg-black/45 backdrop-blur-md" @click.self="$emit('close')">
    <div
      class="rm-modal-card bg-rm-surface border border-rm-border shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden rounded-rm-dynamic"
      :class="[wide ? 'max-w-2xl' : '', $attrs.class]"
      role="dialog"
      :aria-labelledby="titleId"
    >
      <div class="px-4 py-3 border-b border-rm-border flex items-center justify-between flex-shrink-0">
        <h2 :id="titleId" class="m-0 text-sm font-semibold text-rm-text">
          <slot name="title">{{ title }}</slot>
        </h2>
        <button
          type="button"
          class="p-1 border-0 bg-transparent text-rm-muted hover:text-rm-text cursor-pointer text-lg leading-none rounded-rm-dynamic"
          aria-label="Close"
          @click="$emit('close')"
        >
          ×
        </button>
      </div>
      <div class="p-4 overflow-auto flex-1 min-h-0">
        <slot />
      </div>
      <div v-if="$slots.footer" class="flex-shrink-0 flex flex-wrap items-center gap-2 px-4 py-3 border-t border-rm-border">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  wide: { type: Boolean, default: false },
});

defineEmits(['close']);

const titleId = computed(() => `rm-modal-title-${Math.random().toString(36).slice(2, 9)}`);
</script>
