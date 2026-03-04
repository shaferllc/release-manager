<template>
  <section class="card mb-6 detail-tab-panel" data-detail-tab="composer">
    <div class="card-section">
      <span class="card-label">Composer</span>
      <p class="m-0 mb-2 text-sm text-rm-muted">{{ composer.summary }}</p>
      <p v-if="composer.validateMsg" class="m-0 mb-2 text-xs" :class="composer.validateOk ? 'text-rm-muted' : 'text-rm-warning'">{{ composer.validateMsg }}</p>
      <p v-if="composer.lockWarning" class="m-0 mb-3 text-xs text-rm-warning">{{ composer.lockWarning }}</p>
      <div v-if="composer.scripts.length" class="mb-4">
        <span class="card-label text-rm-muted mb-1 block">Scripts</span>
        <ul class="m-0 pl-4 text-sm text-rm-muted list-disc">
          <li v-for="s in composer.scripts" :key="s"><code class="bg-rm-surface px-1 rounded text-xs">{{ s }}</code></li>
        </ul>
      </div>
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <Button severity="secondary" size="small" class="text-xs" @click="composer.load">Refresh outdated</Button>
        <Button v-if="composer.outdated.length" severity="primary" size="small" class="text-xs" :disabled="composer.updatingAll" @click="composer.updateAll">Update all</Button>
        <label class="checkbox-label text-sm text-rm-muted cursor-pointer flex items-center gap-2">
          <input v-model="composer.directOnly" type="checkbox" class="checkbox-input" />
          <span>Direct only</span>
        </label>
      </div>
      <div v-if="composer.outdated.length" class="overflow-x-auto mb-4">
        <table class="w-full text-sm border-collapse">
          <thead><tr class="border-b border-rm-border text-left text-xs text-rm-muted"><th class="py-2 px-3">Package</th><th class="py-2 px-3">Current</th><th class="py-2 px-3">Latest</th><th></th></tr></thead>
          <tbody>
            <tr v-for="p in composer.outdated" :key="p.name" class="border-b border-rm-border">
              <td class="py-2 px-3 font-mono text-rm-text">{{ p.name }}</td>
              <td class="py-2 px-3 font-mono text-rm-muted">{{ p.version }}</td>
              <td class="py-2 px-3 font-mono text-rm-accent">{{ p.latest }}</td>
              <td class="py-2 px-3"><button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0" @click="composer.updateOne(p.name)">Update</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="composer.outdatedError" class="m-0 text-xs text-rm-warning">{{ composer.outdatedError }}</p>
      <div v-if="composer.auditAdvisories.length" class="mt-4">
        <span class="card-label text-rm-muted mb-1 block">Audit</span>
        <table class="w-full text-sm border-collapse">
          <thead><tr class="border-b border-rm-border text-left text-xs text-rm-muted"><th class="py-2 px-3">Package</th><th class="py-2 px-3">Severity</th><th class="py-2 px-3">Advisory</th></tr></thead>
          <tbody>
            <tr v-for="a in composer.auditAdvisories" :key="a.name + (a.version||'')" class="border-b border-rm-border">
              <td class="py-2 px-3 font-mono">{{ a.name }} {{ a.version || '' }}</td>
              <td class="py-2 px-3">{{ a.severity || '—' }}</td>
              <td class="py-2 px-3"><a v-if="a.link" :href="a.link" class="text-rm-accent hover:underline" target="_blank" rel="noopener noreferrer">{{ a.advisory }}</a><span v-else>{{ a.advisory }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import Button from 'primevue/button';
import { useComposer } from '../../composables/useComposer';

const props = defineProps({ info: { type: Object, default: null } });
const hasComposerRef = computed(() => !!props.info?.hasComposer);
const composer = useComposer({ hasComposerRef });
</script>
