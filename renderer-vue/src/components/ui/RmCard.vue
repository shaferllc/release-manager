<template>
  <div
    class="rm-card overflow-hidden border-0 shadow-none bg-rm-surface/40 rounded-rm-dynamic"
    :class="$attrs.class"
  >
    <slot />
  </div>
</template>

<script setup>
// Reusable card container. Light theme uses same opacity; for stronger contrast
// add html[data-theme="light"] .rm-card in base styles if needed.
</script>
