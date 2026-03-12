<template>
  <div class="flex items-start gap-4 p-5 mb-4 rounded-xl border border-rm-accent/25 bg-gradient-to-br from-rm-accent/12 via-rm-accent/[0.04] to-transparent">
    <div class="shrink-0 w-12 h-12 flex items-center justify-center rounded-[10px] bg-rm-accent/20 text-rm-accent" aria-hidden="true" v-html="meta.icon"></div>
    <div>
      <h3 class="text-2xl font-bold text-rm-text tracking-[-0.03em] m-0 mb-1">{{ meta.label }}</h3>
      <p class="text-[0.9375rem] text-rm-muted m-0 leading-normal">{{ meta.description }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  meta: { type: Object, required: true },
});
</script>
