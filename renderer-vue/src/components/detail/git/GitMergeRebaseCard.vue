<template>
  <div class="git-card">
    <p class="card-label mb-2">Merge & rebase</p>
    <template v-if="state.merging || state.rebasing || state.cherryPicking">
      <p class="text-xs text-rm-muted mb-2">
        <span v-if="state.merging">Merge in progress.</span>
        <span v-if="state.rebasing">Rebase in progress.</span>
        <span v-if="state.cherryPicking">Cherry-pick in progress.</span>
      </p>
      <div class="flex flex-wrap gap-2 mb-3">
        <button v-if="state.merging" type="button" class="btn-primary btn-compact text-xs" @click="mergeContinue">Continue merge</button>
        <button v-if="state.merging" type="button" class="btn-secondary btn-compact text-xs text-rm-warning" @click="mergeAbort">Abort merge</button>
        <button v-if="state.rebasing" type="button" class="btn-primary btn-compact text-xs" @click="rebaseContinue">Continue rebase</button>
        <button v-if="state.rebasing" type="button" class="btn-secondary btn-compact text-xs" @click="rebaseSkip">Skip</button>
        <button v-if="state.rebasing" type="button" class="btn-secondary btn-compact text-xs text-rm-warning" @click="rebaseAbort">Abort rebase</button>
        <button v-if="state.cherryPicking" type="button" class="btn-primary btn-compact text-xs" @click="cherryPickContinue">Continue cherry-pick</button>
        <button v-if="state.cherryPicking" type="button" class="btn-secondary btn-compact text-xs text-rm-warning" @click="cherryPickAbort">Abort cherry-pick</button>
      </div>
    </template>
    <template v-else>
      <div class="mb-3">
        <label class="block text-xs text-rm-muted mb-1">Merge branch</label>
        <div class="flex gap-2">
          <select v-model="mergeBranch" class="flex-1 min-w-0 text-sm rounded-rm border border-rm-border bg-rm-bg text-rm-text px-2 py-1">
            <option value="">—</option>
            <option v-for="b in mergeBranches" :key="b" :value="b">{{ b }}</option>
          </select>
          <button type="button" class="btn-primary btn-compact text-xs" :disabled="!mergeBranch" @click="merge">Merge</button>
        </div>
      </div>
      <div class="mb-3">
        <label class="block text-xs text-rm-muted mb-1">Rebase onto</label>
        <div class="flex gap-2">
          <select v-model="rebaseOnto" class="flex-1 min-w-0 text-sm rounded-rm border border-rm-border bg-rm-bg text-rm-text px-2 py-1">
            <option value="">—</option>
            <option v-for="b in mergeBranches" :key="b" :value="b">{{ b }}</option>
          </select>
          <button type="button" class="btn-primary btn-compact text-xs" :disabled="!rebaseOnto" @click="rebase">Rebase</button>
        </div>
      </div>
    </template>
    <p v-if="error" class="m-0 text-xs text-rm-warning">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
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
