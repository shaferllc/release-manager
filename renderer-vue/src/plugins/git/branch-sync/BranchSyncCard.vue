<template>
  <GitPanelCard :title="panelTitle" :icon="panelIcon">
    <div class="flex flex-wrap gap-2 mb-2">
      <Button severity="secondary" size="small" class="text-xs" @click="sync.run('gitPull')">Pull</Button>
      <Button severity="secondary" size="small" class="text-xs" @click="sync.run('gitPullRebase')">Pull (rebase)</Button>
      <Button severity="secondary" size="small" class="text-xs" @click="sync.run('gitFetch')">Fetch</Button>
      <Button severity="secondary" size="small" class="text-xs" @click="sync.run('gitPruneRemotes')">Prune</Button>
      <Button severity="primary" size="small" class="text-xs" @click="sync.run('gitPush')">Push</Button>
      <Button severity="danger" size="small" class="text-xs" @click="sync.runForcePush">Force push</Button>
    </div>
    <div class="mb-3">
      <label class="block text-xs text-rm-muted mb-1">Checkout remote branch</label>
      <div class="flex gap-2">
        <Select v-model="sync.remoteBranch" :options="sync.remoteBranchOptions" optionLabel="label" optionValue="value" class="flex-1 min-w-0 text-sm" />
        <Button severity="primary" size="small" class="text-xs" :disabled="!sync.remoteBranch" @click="sync.checkoutRemote">Checkout</Button>
      </div>
      <Button variant="text" size="small" class="text-xs mt-1 p-0 min-w-0 text-rm-accent hover:underline" @click="sync.loadRemoteBranches">Refresh remote branches</Button>
    </div>
    <p v-if="sync.status" class="m-0 text-xs text-rm-muted">{{ sync.status }}</p>
  </GitPanelCard>
</template>

<script setup>
import Button from 'primevue/button';
import Select from 'primevue/select';
import GitPanelCard from '../GitPanelCard.vue';
import { useBranchSync } from './useBranchSync.js';

defineProps({ panelTitle: { type: String, default: 'Branch & sync' }, panelIcon: { type: String, default: '' } });
const emit = defineEmits(['refresh']);
const sync = useBranchSync({ onRefresh: () => emit('refresh') });
</script>
