<template>
  <div class="git-card">
    <p class="card-label mb-2">Branch & sync</p>
    <div class="flex flex-wrap gap-2 mb-3">
      <Button severity="secondary" size="small" class="text-xs" @click="sync.run('gitPull')">Pull</Button>
      <Button severity="secondary" size="small" class="text-xs" @click="sync.run('gitPullRebase')">Pull (rebase)</Button>
      <Button severity="secondary" size="small" class="text-xs" @click="sync.run('gitFetch')">Fetch</Button>
      <Button severity="secondary" size="small" class="text-xs" @click="sync.run('gitPruneRemotes')">Prune</Button>
      <Button severity="primary" size="small" class="text-xs" @click="sync.run('gitPush')">Push</Button>
      <Button severity="secondary" size="small" class="text-xs text-rm-warning" @click="sync.runForcePush">Force push</Button>
    </div>
    <div class="mb-3">
      <label class="block text-xs text-rm-muted mb-1">Checkout remote branch</label>
      <div class="flex gap-2">
        <Select v-model="sync.remoteBranch" :options="sync.remoteBranchOptions" optionLabel="label" optionValue="value" class="flex-1 min-w-0 text-sm" />
        <Button severity="primary" size="small" class="text-xs" :disabled="!sync.remoteBranch" @click="sync.checkoutRemote">Checkout</Button>
      </div>
      <button type="button" class="text-xs text-rm-accent hover:underline mt-1 p-0 border-0 bg-transparent cursor-pointer" @click="sync.loadRemoteBranches">Refresh remote branches</button>
    </div>
    <p v-if="sync.status" class="m-0 text-xs text-rm-muted">{{ sync.status }}</p>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import Select from 'primevue/select';
import { useBranchSync } from '../../../composables/useBranchSync';

const emit = defineEmits(['refresh']);
const sync = useBranchSync({ onRefresh: () => emit('refresh') });
</script>
