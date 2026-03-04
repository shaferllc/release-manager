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
          <button type="button" class="icon-btn p-2 rounded-rm border border-transparent hover:border-rm-border" title="Open in Terminal" aria-label="Open in Terminal" @click="openTerminal">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
          </button>
          <button type="button" class="icon-btn p-2 rounded-rm border border-transparent hover:border-rm-border" title="Open in Cursor / VS Code" aria-label="Open in editor" @click="openEditor">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          </button>
          <button type="button" class="icon-btn p-2 rounded-rm border border-transparent hover:border-rm-border" title="Open in Finder" aria-label="Open in Finder" @click="openFinder">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button type="button" class="icon-btn p-2 rounded-rm border border-transparent hover:border-rm-border" title="Copy path" aria-label="Copy path" @click="copyPath">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
        <span v-if="copyFeedback" class="copy-feedback text-xs font-medium text-rm-accent">Copied!</span>
        <button type="button" class="btn-ghost inline-flex items-center gap-x-1.5 shrink-0 text-rm-muted hover:text-rm-text text-sm" title="Remove from list" @click="removeProject">
          <svg class="w-[11px] h-[11px] shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Remove
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { useAppStore } from '../../stores/app';
import { useApi } from '../../composables/useApi';
import * as debug from '../../utils/debug';
import { toPlainProjects } from '../../utils/plainProjects';

const props = defineProps({ info: { type: Object, default: null } });
const emit = defineEmits(['remove']);

const store = useAppStore();
const api = useApi();
const tagsInput = ref('');
const copyFeedback = ref(false);

const phpOptions = ref([]);
const phpSelectOptions = computed(() => [
  { path: '', label: 'Use default' },
  ...phpOptions.value.map((o) => ({ path: o.path, label: `PHP ${o.version}` })),
]);
const phpPath = ref('');
const loadingPhp = ref(false);
const coverageSummary = ref('—');
const coverageLoading = ref(false);

const projectType = computed(() => (props.info?.projectType || '').toLowerCase());
const showPhpSelector = computed(() => props.info?.hasComposer || projectType.value === 'php');
const showCoverageHeader = computed(() => projectType.value === 'npm' || projectType.value === 'php');
const coverageSummaryDisplay = computed(() => coverageSummary.value || '—');

watch(() => props.info?.path, (path) => {
  const proj = path ? store.projects.find((p) => p.path === path) : null;
  tagsInput.value = (proj?.tags || []).join(', ');
}, { immediate: true });

watch(() => props.info?.path, () => {
  loadPhpSelector();
}, { immediate: true });

async function updateProjectsPhpPath(newPath) {
  const path = props.info?.path;
  if (!path || !api.setProjects) return;
  const list = store.projects.map((p) => (p.path === path ? { ...p, phpPath: newPath } : p));
  try {
    await api.setProjects(toPlainProjects(list));
    store.setProjects(list);
  } catch (_) {}
}

async function loadPhpSelector() {
  const path = props.info?.path;
  if (!path || !showPhpSelector.value || !api.getAvailablePhpVersions) {
    phpOptions.value = [];
    phpPath.value = '';
    return;
  }
  loadingPhp.value = true;
  try {
    const [available, composerInfo] = await Promise.all([
      api.getAvailablePhpVersions?.(),
      api.getComposerInfo?.(path),
    ]);
    const list = Array.isArray(available) ? available : [];
    phpOptions.value = list;
    const project = store.projects.find((p) => p.path === path) || null;
    const savedPath = (project?.phpPath && typeof project.phpPath === 'string' ? project.phpPath.trim() : '') || '';
    if (savedPath) {
      phpPath.value = savedPath;
      return;
    }
    if (composerInfo?.ok && composerInfo.phpRequire && api.getPhpVersionFromRequire && list.length > 0) {
      const preferred = await api.getPhpVersionFromRequire(composerInfo.phpRequire);
      if (preferred) {
        const match =
          list.find((a) => {
            const [am, an] = String(a.version || '').split('.').map(Number);
            const [pm, pn] = String(preferred).split('.').map(Number);
            if (Number.isNaN(am) || Number.isNaN(pm)) return false;
            return am > pm || (am === pm && (an || 0) >= (pn || 0));
          }) || list.find((a) => a.version === preferred);
        if (match && match.path) {
          phpPath.value = match.path;
          await updateProjectsPhpPath(match.path);
          return;
        }
      }
    }
    phpPath.value = '';
  } catch (_) {
    phpOptions.value = [];
  } finally {
    loadingPhp.value = false;
  }
}

function saveTags() {
  const path = store.selectedPath;
  if (!path || !api.setProjects) return;
  const tags = tagsInput.value.split(',').map((t) => t.trim()).filter(Boolean);
  const list = store.projects.map((p) => (p.path === path ? { ...p, tags } : p));
  api.setProjects(toPlainProjects(list));
}

async function savePhpPath() {
  const value = phpPath.value?.trim() || undefined;
  await updateProjectsPhpPath(value);
}

async function runCoverageHeader() {
  const path = props.info?.path;
  const type = projectType.value;
  debug.log('project', 'coverage.header run clicked', { path, type, hasApi: !!api.runProjectCoverage });
  if (!path || !api.runProjectCoverage || (type !== 'npm' && type !== 'php')) {
    debug.warn('project', 'coverage.header guard failed', { pathOk: !!path, type, hasApi: !!api.runProjectCoverage });
    return;
  }
  coverageLoading.value = true;
  try {
    debug.log('project', 'coverage.header call api.runProjectCoverage', { path, type });
    const result = await api.runProjectCoverage(path, type);
    const summary = result?.summary || null;
    debug.log('project', 'coverage.header result', {
      ok: result?.ok,
      exitCode: result?.exitCode,
      error: result?.error || null,
      summary,
    });
    if (!result?.ok && result?.error) {
      coverageSummary.value = result.error;
    } else {
      coverageSummary.value = summary || '—';
    }
  } catch (e) {
    coverageSummary.value = e?.message || 'Failed';
  } finally {
    coverageLoading.value = false;
  }
}

function openTerminal() {
  if (store.selectedPath) api.openInTerminal?.(store.selectedPath);
}
function openEditor() {
  if (store.selectedPath) api.openInEditor?.(store.selectedPath);
}
function openFinder() {
  if (store.selectedPath) api.openPathInFinder?.(store.selectedPath);
}
function copyPath() {
  if (!store.selectedPath) return;
  api.copyToClipboard?.(store.selectedPath);
  copyFeedback.value = true;
  setTimeout(() => { copyFeedback.value = false; }, 1500);
}
function removeProject() {
  const path = store.selectedPath;
  if (!path || !api.setProjects) return;
  const list = store.projects.filter((p) => p.path !== path);
  api.setProjects(toPlainProjects(list)).then(() => emit('remove'));
}
</script>
