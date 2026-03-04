<template>
  <div class="detail-dashboard-summary flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-rm-muted mb-6">
    <span class="inline-flex items-center gap-1.5">
      <strong class="text-rm-text font-medium">Version</strong>
      <span class="font-mono text-rm-accent">{{ info?.version || '—' }}</span>
    </span>
    <span v-if="info?.hasGit" class="inline-flex items-center gap-1.5">
      <strong class="text-rm-text font-medium">Branch</strong>
      <span class="font-mono">{{ info?.branch || '—' }}</span>
      <span v-if="info?.aheadBehind" class="text-rm-muted">({{ info.aheadBehind }})</span>
    </span>
    <span v-if="hasUncommitted" class="inline-flex items-center gap-1.5 text-rm-warning">
      <strong class="text-rm-text font-medium">Uncommitted</strong>
      {{ uncommittedCount }} file(s)
    </span>
    <span v-if="(info?.commitsSinceLatestTag ?? 0) > 0" class="text-rm-muted">
      {{ info.commitsSinceLatestTag }} unreleased commit(s)
    </span>
  </div>
</template>

<script setup>
defineProps({
  info: { type: Object, default: null },
  uncommittedCount: { type: Number, default: 0 },
  hasUncommitted: { type: Boolean, default: false },
});
</script>
