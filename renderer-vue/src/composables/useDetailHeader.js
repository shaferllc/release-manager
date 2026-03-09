import { ref, watch, computed } from 'vue';
import { useApi } from './useApi';
import * as debug from '../utils/debug';
import { toPlainProjects } from '../utils/plainProjects';

/**
 * Composable for the project detail header: tags, PHP selector, coverage run,
 * and actions (terminal, editor, finder, copy path, remove).
 * Call with (store, getInfo, emit) where getInfo() returns props.info.
 * @returns Refs, computeds, and methods for DetailHeader.
 */
export function useDetailHeader(store, getInfo, emit) {
  const api = useApi();

  const tagsInput = ref('');
  const copyFeedback = ref(false);
  const phpOptions = ref([]);
  const phpPath = ref('');
  const loadingPhp = ref(false);
  const coverageSummary = ref('—');
  const coverageLoading = ref(false);

  const phpSelectOptions = computed(() => [
    { path: '', label: 'Use default' },
    ...phpOptions.value.map((o) => ({ path: o.path, label: `PHP ${o.version}` })),
  ]);

  const projectType = computed(() => (getInfo?.()?.projectType || '').toLowerCase());
  const showPhpSelector = computed(() => getInfo?.()?.hasComposer || projectType.value === 'php');
  const showCoverageHeader = computed(() => projectType.value === 'npm' || projectType.value === 'php');
  const coverageSummaryDisplay = computed(() => coverageSummary.value || '—');

  watch(() => getInfo?.()?.path, (path) => {
    const proj = path ? store.projects.find((p) => p.path === path) : null;
    tagsInput.value = (proj?.tags || []).join(', ');
  }, { immediate: true });

  watch(() => getInfo?.()?.path, () => {
    loadPhpSelector();
  }, { immediate: true });

  async function updateProjectsPhpPath(newPath) {
    const path = getInfo?.()?.path;
    if (!path || !api.setProjects) return;
    const list = store.projects.map((p) => (p.path === path ? { ...p, phpPath: newPath } : p));
    try {
      await api.setProjects(toPlainProjects(list));
      store.setProjects(list);
    } catch (_) {}
  }

  async function loadPhpSelector() {
    const path = getInfo?.()?.path;
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
    const path = getInfo?.()?.path;
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
    api.setProjects(toPlainProjects(list)).then(() => emit?.('remove'));
  }

  return {
    tagsInput,
    copyFeedback,
    phpOptions,
    phpSelectOptions,
    phpPath,
    loadingPhp,
    coverageSummary,
    coverageLoading,
    projectType,
    showPhpSelector,
    showCoverageHeader,
    coverageSummaryDisplay,
    saveTags,
    savePhpPath,
    runCoverageHeader,
    openTerminal,
    openEditor,
    openFinder,
    copyPath,
    removeProject,
  };
}
