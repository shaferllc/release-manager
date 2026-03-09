<template>
  <div class="dashboard-stats grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
    <!-- Version -->
    <div class="stat-card">
      <div class="stat-icon stat-icon-accent">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m4.9 4.9 2.8 2.8"/><path d="M2 12h4"/><path d="m4.9 19.1 2.8-2.8"/><path d="M12 18v4"/><path d="m19.1 19.1-2.8-2.8"/><path d="M22 12h-4"/><path d="m19.1 4.9-2.8 2.8"/><circle cx="12" cy="12" r="4"/></svg>
      </div>
      <div class="stat-body">
        <span class="stat-label">Version</span>
        <span class="stat-value font-mono">{{ info?.version || '—' }}</span>
        <span v-if="info?.latestTag && info.latestTag !== info.version" class="stat-sub">tag: {{ info.latestTag }}</span>
      </div>
    </div>

    <!-- Branch -->
    <div class="stat-card">
      <div class="stat-icon stat-icon-blue">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
      </div>
      <div class="stat-body">
        <span class="stat-label">Branch</span>
        <span v-if="info?.hasGit" class="stat-value font-mono">{{ info?.branch || '—' }}</span>
        <span v-else class="stat-value text-rm-muted">No Git</span>
        <span v-if="aheadBehindText" class="stat-sub">{{ aheadBehindText }}</span>
      </div>
    </div>

    <!-- Uncommitted -->
    <div class="stat-card">
      <div class="stat-icon" :class="hasUncommitted ? 'stat-icon-warn' : 'stat-icon-success'">
        <svg v-if="hasUncommitted" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      <div class="stat-body">
        <span class="stat-label">Changes</span>
        <span class="stat-value">
          <template v-if="hasUncommitted">
            <span class="text-rm-warning">{{ uncommittedCount }}</span> file{{ uncommittedCount === 1 ? '' : 's' }}
          </template>
          <template v-else>
            <span class="text-rm-success">Clean</span>
          </template>
        </span>
        <span v-if="info?.conflictCount > 0" class="stat-sub text-rm-danger">{{ info.conflictCount }} conflict{{ info.conflictCount === 1 ? '' : 's' }}</span>
      </div>
    </div>

    <!-- Unreleased Commits -->
    <div class="stat-card">
      <div class="stat-icon" :class="unreleasedCount > 0 ? 'stat-icon-purple' : 'stat-icon-muted'">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="1.05" y1="12" x2="7" y2="12"/><line x1="17.01" y1="12" x2="22.96" y2="12"/></svg>
      </div>
      <div class="stat-body">
        <span class="stat-label">Unreleased</span>
        <span class="stat-value">
          <template v-if="unreleasedCount > 0">
            {{ unreleasedCount }} commit{{ unreleasedCount === 1 ? '' : 's' }}
          </template>
          <template v-else>Up to date</template>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  info: { type: Object, default: null },
  uncommittedCount: { type: Number, default: 0 },
  hasUncommitted: { type: Boolean, default: false },
});

const unreleasedCount = computed(() => props.info?.commitsSinceLatestTag ?? 0);

const aheadBehindText = computed(() => {
  if (!props.info?.hasGit) return '';
  const ahead = props.info.ahead ?? 0;
  const behind = props.info.behind ?? 0;
  if (ahead && behind) return `↑${ahead} ↓${behind}`;
  if (ahead) return `↑${ahead} ahead`;
  if (behind) return `↓${behind} behind`;
  return '';
});
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: 10px;
  border: 1px solid rgb(var(--rm-border));
  background: rgb(var(--rm-surface) / 0.5);
  transition: border-color 0.15s;
}
.stat-card:hover {
  border-color: rgb(var(--rm-border-focus) / 0.3);
}
.stat-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-icon-accent {
  background: rgb(var(--rm-accent) / 0.12);
  color: rgb(var(--rm-accent));
}
.stat-icon-blue {
  background: rgba(59, 130, 246, 0.12);
  color: rgb(59, 130, 246);
}
.stat-icon-warn {
  background: rgba(245, 158, 11, 0.12);
  color: rgb(245, 158, 11);
}
.stat-icon-success {
  background: rgba(34, 197, 94, 0.12);
  color: rgb(34, 197, 94);
}
.stat-icon-purple {
  background: rgba(168, 85, 247, 0.12);
  color: rgb(168, 85, 247);
}
.stat-icon-muted {
  background: rgb(var(--rm-surface));
  color: rgb(var(--rm-muted));
}
.stat-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.stat-label {
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgb(var(--rm-muted));
  line-height: 1;
  margin-bottom: 0.25rem;
}
.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-sub {
  font-size: 0.6875rem;
  color: rgb(var(--rm-muted));
  margin-top: 0.125rem;
  line-height: 1;
}
</style>
