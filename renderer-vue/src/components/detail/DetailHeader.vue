<template>
  <header class="detail-header mb-8">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <h2 class="m-0 text-xl font-semibold text-rm-text truncate tracking-tight">{{ info?.name || info?.path || '—' }}</h2>
        <p class="m-0 mt-1.5 text-sm text-rm-muted font-mono truncate" :title="info?.path">{{ info?.path || '—' }}</p>
        <div class="mt-3 flex items-center gap-2 flex-wrap">
          <label class="text-xs font-medium text-rm-muted shrink-0">Tags</label>
          <InputText
            v-model="tagsInput"
            type="text"
            class="flex-1 min-w-0 text-sm"
            placeholder="e.g. frontend, production"
            @blur="saveTags"
          />
        </div>
        <div v-if="showPhpSelector || showCoverageHeader" class="mt-2 flex flex-wrap items-center gap-3 text-xs text-rm-muted">
          <div v-if="showPhpSelector" class="flex items-center gap-1">
            <span class="font-medium">PHP</span>
            <Select
              v-model="phpPath"
              :options="phpSelectOptions"
              optionLabel="label"
              optionValue="path"
              class="text-xs px-2 py-1 min-w-[8rem]"
              :disabled="loadingPhp"
              @change="savePhpPath"
            />
          </div>
          <div v-if="showCoverageHeader" class="flex items-center gap-1">
            <span class="font-medium">Coverage</span>
            <span>{{ coverageSummaryDisplay }}</span>
            <Button
              severity="secondary"
              size="small"
              class="text-[11px]"
              :disabled="coverageLoading"
              @click="runCoverageHeader"
            >
              {{ coverageLoading ? 'Running…' : 'Run' }}
            </Button>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <div class="detail-header-actions flex items-center gap-1.5">
          <Button variant="text" size="small" class="p-2" title="Open in Terminal" aria-label="Open in Terminal" @click="openTerminal">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
          </Button>
          <Button variant="text" size="small" class="p-2" title="Open in Cursor / VS Code" aria-label="Open in editor" @click="openEditor">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          </Button>
          <Button variant="text" size="small" class="p-2" title="Open in Finder" aria-label="Open in Finder" @click="openFinder">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </Button>
          <Button variant="text" size="small" class="p-2" title="Copy path" aria-label="Copy path" @click="copyPath">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </Button>
        </div>
        <span v-if="copyFeedback" class="copy-feedback text-xs font-medium text-rm-accent">Copied!</span>
        <Button variant="text" size="small" class="inline-flex items-center gap-x-1.5 shrink-0 text-sm" title="Remove from list" @click="removeProject">
          <svg class="w-[11px] h-[11px] shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Remove
        </Button>
      </div>
    </div>
  </header>
</template>

<script setup>
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { useAppStore } from '../../stores/app';
import { useDetailHeader } from '../../composables/useDetailHeader';

const props = defineProps({ info: { type: Object, default: null } });
const emit = defineEmits(['remove']);

const store = useAppStore();
const {
  tagsInput,
  copyFeedback,
  phpPath,
  loadingPhp,
  phpSelectOptions,
  showPhpSelector,
  showCoverageHeader,
  coverageSummaryDisplay,
  coverageLoading,
  saveTags,
  savePhpPath,
  runCoverageHeader,
  openTerminal,
  openEditor,
  openFinder,
  copyPath,
  removeProject,
} = useDetailHeader(store, () => props.info, emit);
</script>
