import { ref, watch } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';

/**
 * Composable for Composer: manifest summary, validate, outdated packages, audit, update one/all.
 * @param {Object} options
 * @param {import('vue').Ref<boolean>} [options.hasComposerRef] - e.g. computed(() => info?.hasComposer); when false, load no-ops
 * @returns {Object} summary, validateMsg, validateOk, lockWarning, scripts, outdated, outdatedError, directOnly, auditAdvisories, updatingAll, load, updateOne, updateAll
 */
export function useComposer({ hasComposerRef = ref(false) } = {}) {
  const store = useAppStore();
  const api = useApi();

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
    if (!path || !hasComposerRef?.value) return;
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
      lockWarning.value = v?.lockOutOfDate ? 'composer.lock is out of date. Run composer update.' : '';
    } catch (_) {
      validateMsg.value = 'Could not run composer validate.';
    }
    outdatedError.value = '';
    try {
      const out = await api.getComposerOutdated?.(path, directOnly.value);
      if (out?.ok) outdated.value = out.packages || [];
      else {
        outdated.value = [];
        outdatedError.value = out?.error || 'Failed';
      }
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

  watch(
    () => [store.selectedPath, hasComposerRef?.value],
    load,
    { immediate: true }
  );
  watch(() => directOnly.value, load);

  async function updateOne(name) {
    const path = store.selectedPath;
    if (!path || !api.composerUpdate) return;
    await api.composerUpdate(path, [name]);
    await load();
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

  return {
    summary,
    validateMsg,
    validateOk,
    lockWarning,
    scripts,
    outdated,
    outdatedError,
    directOnly,
    auditAdvisories,
    updatingAll,
    load,
    updateOne,
    updateAll,
  };
}
