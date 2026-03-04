<template>
  <div class="git-card">
    <RmCardHeader tag="p" class="mb-2">Merge & rebase</RmCardHeader>
    <template v-if="state.merging || state.rebasing || state.cherryPicking">
      <p class="text-xs text-rm-muted mb-2">
        <span v-if="state.merging">Merge in progress.</span>
        <span v-if="state.rebasing">Rebase in progress.</span>
        <span v-if="state.cherryPicking">Cherry-pick in progress.</span>
      </p>
      <div class="flex flex-wrap gap-2 mb-3">
        <RmButton v-if="state.merging" variant="primary" size="compact" class="text-xs" @click="mergeContinue">Continue merge</RmButton>
        <RmButton v-if="state.merging" variant="secondary" size="compact" class="text-xs text-rm-warning" @click="mergeAbort">Abort merge</RmButton>
        <RmButton v-if="state.rebasing" variant="primary" size="compact" class="text-xs" @click="rebaseContinue">Continue rebase</RmButton>
        <RmButton v-if="state.rebasing" variant="secondary" size="compact" class="text-xs" @click="rebaseSkip">Skip</RmButton>
        <RmButton v-if="state.rebasing" variant="secondary" size="compact" class="text-xs text-rm-warning" @click="rebaseAbort">Abort rebase</RmButton>
        <RmButton v-if="state.cherryPicking" variant="primary" size="compact" class="text-xs" @click="cherryPickContinue">Continue cherry-pick</RmButton>
        <RmButton v-if="state.cherryPicking" variant="secondary" size="compact" class="text-xs text-rm-warning" @click="cherryPickAbort">Abort cherry-pick</RmButton>
      </div>
    </template>
    <template v-else>
      <div class="mb-3">
        <label class="block text-xs text-rm-muted mb-1">Merge branch</label>
        <div class="flex gap-2">
          <RmSelect v-model="mergeBranch" :options="mergeBranchOptions" option-label="label" option-value="value" class="flex-1 min-w-0 text-sm" />
          <RmButton variant="primary" size="compact" class="text-xs" :disabled="!mergeBranch" @click="merge">Merge</RmButton>
        </div>
      </div>
      <div class="mb-3">
        <label class="block text-xs text-rm-muted mb-1">Rebase onto</label>
        <div class="flex gap-2">
          <RmSelect v-model="rebaseOnto" :options="rebaseOntoOptions" option-label="label" option-value="value" class="flex-1 min-w-0 text-sm" />
          <RmButton variant="primary" size="compact" class="text-xs" :disabled="!rebaseOnto" @click="rebase">Rebase</RmButton>
        </div>
      </div>
    </template>
    <p v-if="error" class="m-0 text-xs text-rm-warning">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { RmButton, RmCardHeader, RmSelect } from '../../ui';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';

const props = defineProps({ currentBranch: { type: String, default: '' } });
const emit = defineEmits(['refresh']);
const store = useAppStore();
const api = useApi();
const state = ref({ merging: false, rebasing: false, cherryPicking: false });
const mergeBranches = ref([]);
const mergeBranch = ref('');
const rebaseOnto = ref('');
const error = ref('');

const mergeBranchOptions = computed(() => [
  { value: '', label: '—' },
  ...mergeBranches.value.map((b) => ({ value: b, label: b })),
]);
const rebaseOntoOptions = computed(() => [
  { value: '', label: '—' },
  ...mergeBranches.value.map((b) => ({ value: b, label: b })),
]);

async function loadState() {
  const path = store.selectedPath;
  if (!path || !api.getGitState) return;
  try {
    const r = await api.getGitState(path);
    state.value = { merging: !!r?.merging, rebasing: !!r?.rebasing, cherryPicking: !!r?.cherryPicking };
  } catch {
    state.value = { merging: false, rebasing: false, cherryPicking: false };
  }
}

async function loadBranches() {
  const path = store.selectedPath;
  if (!path || !api.getBranches) return;
  try {
    const r = await api.getBranches(path);
    const list = Array.isArray(r) ? r : (r?.branches || []);
    mergeBranches.value = list.filter((b) => b !== props.currentBranch);
  } catch {
    mergeBranches.value = [];
  }
}

watch(() => [store.selectedPath, props.currentBranch], () => { loadState(); loadBranches(); }, { immediate: true });

async function runAction(fn) {
  const path = store.selectedPath;
  if (!path) return;
  error.value = '';
  try {
    await fn();
    emit('refresh');
    loadState();
  } catch (e) {
    error.value = e?.message || 'Failed.';
  }
}

function merge() {
  if (!mergeBranch.value) return;
  if (!window.confirm(`Merge ${mergeBranch.value} into current branch?`)) return;
  runAction(() => api.gitMerge?.(store.selectedPath, mergeBranch.value, {}));
}

function mergeContinue() {
  runAction(() => api.gitMergeContinue?.(store.selectedPath));
}

function mergeAbort() {
  if (!window.confirm('Abort merge?')) return;
  runAction(() => api.gitMergeAbort?.(store.selectedPath));
}

function rebase() {
  if (!rebaseOnto.value) return;
  if (!window.confirm(`Rebase onto ${rebaseOnto.value}?`)) return;
  runAction(() => api.gitRebase?.(store.selectedPath, rebaseOnto.value));
}

function rebaseContinue() {
  runAction(() => api.gitRebaseContinue?.(store.selectedPath));
}

function rebaseSkip() {
  runAction(() => api.gitRebaseSkip?.(store.selectedPath));
}

function rebaseAbort() {
  if (!window.confirm('Abort rebase?')) return;
  runAction(() => api.gitRebaseAbort?.(store.selectedPath));
}

function cherryPickContinue() {
  runAction(() => api.gitCherryPickContinue?.(store.selectedPath));
}

function cherryPickAbort() {
  if (!window.confirm('Abort cherry-pick?')) return;
  runAction(() => api.gitCherryPickAbort?.(store.selectedPath));
}
</script>
