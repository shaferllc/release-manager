<template>
  <ul class="m-0 mt-3 pl-0 list-none text-xs text-rm-muted max-h-24 overflow-y-auto space-y-1">
    <li v-for="(entry, i) in entries" :key="i" class="flex items-center gap-2 truncate">
      <span class="font-mono shrink-0 w-12">{{ entry.percent }}%</span>
      <span class="shrink-0 min-w-[10rem]" :title="formatDate(entry.date)">{{ formatDate(entry.date) }}</span>
      <span v-if="entry.branch" class="shrink-0 text-rm-muted/80 w-20 truncate" :title="entry.branch">{{ entry.branch }}</span>
      <span v-if="entry.commitSubject" class="truncate min-w-0 text-rm-text/80" :title="entry.commitSubject">— {{ entry.commitSubject }}</span>
    </li>
  </ul>
</template>

<script setup>
import { formatDate } from '../../utils/formatDate';

defineProps({
  /** History entries: { percent, date, branch?, commitSubject? }[] */
  entries: { type: Array, default: () => [] },
});
</script>
