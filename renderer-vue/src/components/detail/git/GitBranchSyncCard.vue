<template>
  <div class="git-card">
    <RmCardHeader tag="p" class="mb-2">Branch & sync</RmCardHeader>
    <div class="flex flex-wrap gap-2 mb-3">
      <RmButton variant="secondary" size="compact" class="text-xs" @click="run('gitPull')">Pull</RmButton>
      <RmButton variant="secondary" size="compact" class="text-xs" @click="run('gitPullRebase')">Pull (rebase)</RmButton>
      <RmButton variant="secondary" size="compact" class="text-xs" @click="run('gitFetch')">Fetch</RmButton>
      <RmButton variant="secondary" size="compact" class="text-xs" @click="run('gitPruneRemotes')">Prune</RmButton>
      <RmButton variant="primary" size="compact" class="text-xs" @click="run('gitPush')">Push</RmButton>
      <RmButton variant="secondary" size="compact" class="text-xs text-rm-warning" @click="runForcePush">Force push</RmButton>
    </div>
    <div class="mb-3">
      <label class="block text-xs text-rm-muted mb-1">Checkout remote branch</label>
      <div class="flex gap-2">
        <RmSelect v-model="remoteBranch" :options="remoteBranchOptions" option-label="label" option-value="value" class="flex-1 min-w-0 text-sm" />
        <RmButton variant="primary" size="compact" class="text-xs" :disabled="!remoteBranch" @click="checkoutRemote">Checkout</RmButton>
      </div>
      <button type="button" class="text-xs text-rm-accent hover:underline mt-1 p-0 border-0 bg-transparent cursor-pointer" @click="loadRemoteBranches">Refresh remote branches</button>
    </div>
    <p v-if="status" class="m-0 text-xs text-rm-muted">{{ status }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { RmButton, RmCardHeader, RmSelect } from '../../ui';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';

const emit = defineEmits(['refresh']);
const store = useAppStore();
const api = useApi();
const status = ref('');
const remoteBranches = ref([]);
const remoteBranch = ref('');

const remoteBranchOptions = computed(() => [
  { value: '', label: '—' },
  ...remoteBranches.value.map((r) => ({ value: r, label: r })),
]);

watch(() => store.selectedPath, () => { remoteBranches.value = []; remoteBranch.value = ''; }, { immediate: true });

async function loadRemoteBranches() {
  const path = store.selectedPath;
  if (!path || !api.getRemoteBranches) return;
  try {
    const r = await api.getRemoteBranches(path);
    remoteBranches.value = r?.ok ? (r.branches || []) : [];
  } catch {
    remoteBranches.value = [];
  }
}

async function run(method) {
  const path = store.selectedPath;
  if (!path || !api[method]) return;
  status.value = '';
  try {
    await api[method](path);
    status.value = 'Done.';
    emit('refresh');
  } catch (e) {
    status.value = e?.message || 'Failed.';
  }
}

async function runForcePush() {
  if (!window.confirm('Force push? This can overwrite remote history.')) return;
  const path = store.selectedPath;
  if (!path || !api.gitPushForce) return;
  status.value = '';
  try {
    await api.gitPushForce(path, true);
    status.value = 'Done.';
    emit('refresh');
  } catch (e) {
    status.value = e?.message || 'Failed.';
  }
}

async function checkoutRemote() {
  const path = store.selectedPath;
  const ref = remoteBranch.value;
  if (!path || !ref || !api.checkoutRemoteBranch) return;
  if (!window.confirm(`Checkout ${ref}?`)) return;
  status.value = '';
  try {
    const r = await api.checkoutRemoteBranch(path, ref);
    if (r?.ok) { status.value = 'Checked out.'; emit('refresh'); }
    else status.value = r?.error || 'Failed.';
  } catch (e) {
    status.value = e?.message || 'Failed.';
  }
}
</script>
