<template>
  <section class="card mb-6 collapsible-card detail-tab-panel" data-detail-tab="composer" :class="{ 'is-collapsed': collapsed }">
    <div class="collapsible-card-header-row">
      <button type="button" class="collapsible-card-header" :aria-expanded="!collapsed" @click="toggle">
        <span class="collapsible-card-title">Composer</span>
        <svg class="collapsible-card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
    <div class="collapsible-card-body">
    <div class="card-section">
      <span class="card-label">Composer</span>
      <p class="m-0 mb-2 text-sm text-rm-muted">{{ summary }}</p>
      <p v-if="validateMsg" class="m-0 mb-2 text-xs" :class="validateOk ? 'text-rm-muted' : 'text-rm-warning'">{{ validateMsg }}</p>
      <p v-if="lockWarning" class="m-0 mb-3 text-xs text-rm-warning">{{ lockWarning }}</p>
      <div v-if="scripts.length" class="mb-4">
        <span class="card-label text-rm-muted mb-1 block">Scripts</span>
        <ul class="m-0 pl-4 text-sm text-rm-muted list-disc">
          <li v-for="s in scripts" :key="s"><code class="bg-rm-surface px-1 rounded text-xs">{{ s }}</code></li>
        </ul>
      </div>
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <button type="button" class="btn-secondary btn-compact text-xs" @click="load">Refresh outdated</button>
        <button v-if="outdated.length" type="button" class="btn-primary btn-compact text-xs" :disabled="updatingAll" @click="updateAll">Update all</button>
        <label class="checkbox-label text-sm text-rm-muted cursor-pointer flex items-center gap-2">
          <input v-model="directOnly" type="checkbox" class="checkbox-input" />
          <span>Direct only</span>
        </label>
      </div>
      <div v-if="outdated.length" class="overflow-x-auto mb-4">
        <table class="w-full text-sm border-collapse">
          <thead><tr class="border-b border-rm-border text-left text-xs text-rm-muted"><th class="py-2 px-3">Package</th><th class="py-2 px-3">Current</th><th class="py-2 px-3">Latest</th><th></th></tr></thead>
          <tbody>
            <tr v-for="p in outdated" :key="p.name" class="border-b border-rm-border">
              <td class="py-2 px-3 font-mono text-rm-text">{{ p.name }}</td>
              <td class="py-2 px-3 font-mono text-rm-muted">{{ p.version }}</td>
              <td class="py-2 px-3 font-mono text-rm-accent">{{ p.latest }}</td>
              <td class="py-2 px-3"><button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent cursor-pointer p-0" @click="updateOne(p.name)">Update</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="outdatedError" class="m-0 text-xs text-rm-warning">{{ outdatedError }}</p>
      <div v-if="auditAdvisories.length" class="mt-4">
        <span class="card-label text-rm-muted mb-1 block">Audit</span>
        <table class="w-full text-sm border-collapse">
          <thead><tr class="border-b border-rm-border text-left text-xs text-rm-muted"><th class="py-2 px-3">Package</th><th class="py-2 px-3">Severity</th><th class="py-2 px-3">Advisory</th></tr></thead>
          <tbody>
            <tr v-for="a in auditAdvisories" :key="a.name + (a.version||'')" class="border-b border-rm-border">
              <td class="py-2 px-3 font-mono">{{ a.name }} {{ a.version || '' }}</td>
              <td class="py-2 px-3">{{ a.severity || '—' }}</td>
              <td class="py-2 px-3"><a v-if="a.link" :href="a.link" class="text-rm-accent hover:underline" target="_blank" rel="noopener noreferrer">{{ a.advisory }}</a><span v-else>{{ a.advisory }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useCollapsible } from '../../composables/useCollapsible';
import { useAppStore } from '../../stores/app';
import { useApi } from '../../composables/useApi';

const props = defineProps({ info: { type: Object, default: null } });

const store = useAppStore();
const api = useApi();
const { collapsed, toggle } = useCollapsible('composer');
const summary = ref('—');
const validateMsg = ref('');
const validateOk = ref(true);
const lockWarning = ref('');
const scripts = ref([]);
const outdated = ref([]);
const outdatedError = ref('');
const directOnly = ref(false);
const auditAdvisories = ref([]);
const updatingAll = ref(false);

async function load() {
  const path = store.selectedPath;
  if (!path || !props.info?.hasComposer) return;
  try {
    const manifest = await api.getComposerInfo?.(path);
    if (manifest?.ok) {
      const req = manifest.requireCount ?? 0;
      const dev = manifest.requireDevCount ?? 0;
      const lock = manifest.hasLock ? 'composer.lock present' : 'No composer.lock';
      summary.value = `${req} require, ${dev} require-dev · ${lock}`;
      scripts.value = manifest.scripts || [];
    } else {
      summary.value = manifest?.error || 'Could not read composer.json';
    }
  } catch (_) {
    summary.value = 'Could not read composer info';
  }
  try {
    const v = await api.getComposerValidate?.(path);
    validateOk.value = !!v?.valid;
    validateMsg.value = v?.valid ? 'composer.json is valid.' : `Invalid: ${(v?.message || '').split('\n')[0]}`;
    if (v?.lockOutOfDate) lockWarning.value = 'composer.lock is out of date. Run composer update.';
  } catch (_) {
    validateMsg.value = 'Could not run composer validate.';
  }
  outdatedError.value = '';
  try {
    const out = await api.getComposerOutdated?.(path, directOnly.value);
    if (out?.ok) outdated.value = out.packages || [];
    else { outdated.value = []; outdatedError.value = out?.error || 'Failed'; }
  } catch (_) {
    outdated.value = [];
    outdatedError.value = 'Failed to check outdated.';
  }
  try {
    const audit = await api.getComposerAudit?.(path);
    auditAdvisories.value = audit?.ok ? (audit.advisories || []) : [];
  } catch (_) {
    auditAdvisories.value = [];
  }
}

watch(() => [store.selectedPath, props.info?.hasComposer], load, { immediate: true });
watch(() => directOnly.value, load);

async function updateOne(name) {
  const path = store.selectedPath;
  if (!path || !api.composerUpdate) return;
  await api.composerUpdate(path, [name]);
  load();
}

async function updateAll() {
  const path = store.selectedPath;
  if (!path || !api.composerUpdate || !outdated.value.length) return;
  updatingAll.value = true;
  try {
    await api.composerUpdate(path, []);
    await load();
  } finally {
    updatingAll.value = false;
  }
}
</script>
