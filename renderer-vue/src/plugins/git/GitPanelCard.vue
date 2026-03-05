<template>
  <div class="git-panel-card detail-git-sidebar-group border border-rm-border bg-rm-surface/40 overflow-hidden">
    <Button
      variant="text"
      size="small"
      class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left min-w-0"
      :aria-expanded="!collapsible || isOpen"
      @click="collapsible && (isOpen = !isOpen)"
    >
      <span class="flex items-center gap-1.5 shrink-0 min-w-0">
        <span v-if="showDragHandle" class="widget-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text p-0.5 -ml-0.5" aria-hidden="true">
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </span>
        <span v-if="icon" class="w-3.5 h-3.5 shrink-0 text-rm-muted inline-block [&_svg]:w-full [&_svg]:h-full" v-html="icon" aria-hidden="true"></span>
        <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide truncate">{{ title }}</span>
      </span>
      <span class="flex items-center gap-1 shrink-0">
        <slot name="header-right"></slot>
        <svg v-if="collapsible" class="w-3.5 h-3.5 text-rm-muted transition-transform shrink-0" :class="{ 'rotate-180': isOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
      </span>
    </Button>
    <div v-show="!collapsible || isOpen" class="border-t border-rm-border px-2.5 pb-2 pt-2">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Button from 'primevue/button';

const props = defineProps({
  /** Card title (shown uppercase in header). */
  title: { type: String, default: '' },
  /** Optional SVG string for header icon (v-html). */
  icon: { type: String, default: '' },
  /** Whether content can be collapsed. */
  collapsible: { type: Boolean, default: true },
  /** Initial open state when collapsible. */
  defaultOpen: { type: Boolean, default: true },
  /** Show hamburger drag handle in header. */
  showDragHandle: { type: Boolean, default: false },
});

const isOpen = ref(props.defaultOpen);

onMounted(() => {
  isOpen.value = props.defaultOpen;
});
</script>
