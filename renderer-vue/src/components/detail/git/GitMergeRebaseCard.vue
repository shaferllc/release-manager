<template>
  <div class="git-card">
    <p class="card-label mb-2">Merge & rebase</p>
    <template v-if="mr.state.merging || mr.state.rebasing || mr.state.cherryPicking">
      <p class="text-xs text-rm-muted mb-2">
        <span v-if="mr.state.merging">Merge in progress.</span>
        <span v-if="mr.state.rebasing">Rebase in progress.</span>
        <span v-if="mr.state.cherryPicking">Cherry-pick in progress.</span>
      </p>
      <div class="flex flex-wrap gap-2 mb-3">
        <Button v-if="mr.state.merging" severity="primary" size="small" class="text-xs" @click="mr.mergeContinue">Continue merge</Button>
        <Button v-if="mr.state.merging" severity="secondary" size="small" class="text-xs text-rm-warning" @click="mr.mergeAbort">Abort merge</Button>
        <Button v-if="mr.state.rebasing" severity="primary" size="small" class="text-xs" @click="mr.rebaseContinue">Continue rebase</Button>
        <Button v-if="mr.state.rebasing" severity="secondary" size="small" class="text-xs" @click="mr.rebaseSkip">Skip</Button>
        <Button v-if="mr.state.rebasing" severity="secondary" size="small" class="text-xs text-rm-warning" @click="mr.rebaseAbort">Abort rebase</Button>
        <Button v-if="mr.state.cherryPicking" severity="primary" size="small" class="text-xs" @click="mr.cherryPickContinue">Continue cherry-pick</Button>
        <Button v-if="mr.state.cherryPicking" severity="secondary" size="small" class="text-xs text-rm-warning" @click="mr.cherryPickAbort">Abort cherry-pick</Button>
      </div>
    </template>
    <template v-else>
      <div class="mb-3">
        <label class="block text-xs text-rm-muted mb-1">Merge branch</label>
        <div class="flex gap-2">
          <Select v-model="mr.mergeBranch" :options="mr.mergeBranchOptions" optionLabel="label" optionValue="value" class="flex-1 min-w-0 text-sm" />
          <Button severity="primary" size="small" class="text-xs" :disabled="!mr.mergeBranch" @click="mr.merge">Merge</Button>
        </div>
      </div>
      <div class="mb-3">
        <label class="block text-xs text-rm-muted mb-1">Rebase onto</label>
        <div class="flex gap-2">
          <Select v-model="mr.rebaseOnto" :options="mr.rebaseOntoOptions" optionLabel="label" optionValue="value" class="flex-1 min-w-0 text-sm" />
          <Button severity="primary" size="small" class="text-xs" :disabled="!mr.rebaseOnto" @click="mr.rebase">Rebase</Button>
        </div>
      </div>
    </template>
    <p v-if="mr.error" class="m-0 text-xs text-rm-warning">{{ mr.error }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import { useMergeRebase } from '../../../composables/useMergeRebase';

const props = defineProps({ currentBranch: { type: String, default: '' } });
const emit = defineEmits(['refresh']);
const currentBranchRef = computed(() => props.currentBranch);
const mr = useMergeRebase({ onRefresh: () => emit('refresh'), currentBranchRef });
</script>
