<template>
  <section class="card mb-6 detail-tab-panel" data-detail-tab="pull-requests">
      <div class="card-section flex flex-wrap items-center gap-3">
        <Button v-if="pullRequestsUrl" variant="outlined" severity="secondary" label="Open on GitHub" class="inline-flex items-center gap-x-1.5 shrink-0 text-sm" @click="openPullRequestsUrl" />
        <Button severity="primary" class="inline-flex items-center gap-x-1.5 shrink-0" :disabled="!canCreatePr" @click="openCreateModal">New pull request</Button>
        <SelectButton
          v-model="prState"
          :options="prStateOptions"
          optionLabel="label"
          optionValue="value"
          class="text-sm"
        />
      </div>

      <Message v-if="error" severity="warn" class="card-section text-sm">{{ error }}</Message>
      <p v-else-if="!info?.gitRemote" class="card-section text-sm text-rm-muted">No remote configured. Add a GitHub remote to manage pull requests.</p>
      <div v-else class="card-section border-t border-rm-border">
        <Message v-if="loading" severity="secondary" class="text-sm">Loading…</Message>
        <template v-else>
          <p v-if="!pullRequests.length" class="text-sm text-rm-muted m-0">No {{ prState }} pull requests.</p>
          <ul v-else class="m-0 pl-0 list-none space-y-2 max-h-[24rem] overflow-y-auto">
            <li
              v-for="pr in pullRequests"
              :key="pr.id"
              class="flex flex-wrap items-center gap-2 py-2 px-3 rounded-rm border border-rm-border bg-rm-surface/30"
            >
              <span class="font-mono text-xs text-rm-muted shrink-0">#{{ pr.number }}</span>
              <Button
                variant="link"
                :label="pr.title || 'Untitled'"
                class="text-rm-accent font-medium truncate min-w-0 flex-1 justify-start p-0 h-auto text-left"
                @click="openPrUrl(pr.html_url)"
              />
              <span class="text-xs text-rm-muted shrink-0">{{ pr.head?.ref }} → {{ pr.base?.ref }}</span>
              <span v-if="pr.user?.login" class="text-xs text-rm-muted shrink-0">by {{ pr.user.login }}</span>
              <Button
                v-if="prState === 'open' && pr.mergeable !== false"
                severity="secondary"
                size="small"
                class="text-xs shrink-0"
                :disabled="mergingPr === pr.number"
                @click="mergePr(pr)"
              >
                {{ mergingPr === pr.number ? 'Merging…' : 'Merge' }}
              </Button>
            </li>
          </ul>
        </template>
      </div>

      <!-- Create PR modal -->
      <Dialog
        v-model:visible="showCreateModal"
        header="Create pull request"
        :style="{ width: '28rem' }"
        :modal="true"
        :dismissableMask="true"
        class="max-w-md"
      >
        <p class="text-xs text-rm-muted mb-2">Current branch: <strong class="font-mono">{{ info?.branch || '—' }}</strong></p>
        <label class="block text-xs font-medium text-rm-text mb-1">Base branch</label>
        <InputText v-model="newPrBase" type="text" class="w-full mb-3" placeholder="e.g. main" />
        <label class="block text-xs font-medium text-rm-text mb-1">Title</label>
        <InputText v-model="newPrTitle" type="text" class="w-full mb-3" placeholder="PR title" />
        <label class="block text-xs font-medium text-rm-text mb-1">Body (optional)</label>
        <Textarea v-model="newPrBody" class="w-full min-h-[4rem]" rows="3" placeholder="Description" />
        <Message v-if="createPrError" severity="warn" class="text-sm mt-2">{{ createPrError }}</Message>
        <template #footer>
          <Button severity="secondary" size="small" class="text-sm" :disabled="createPrLoading" @click="showCreateModal = false">Cancel</Button>
          <Button severity="primary" size="small" class="text-sm" :disabled="createPrLoading" @click="submitCreatePr">{{ createPrLoading ? 'Creating…' : 'Create' }}</Button>
        </template>
      </Dialog>
  </section>
</template>

<script setup>
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import SelectButton from 'primevue/selectbutton';
import Textarea from 'primevue/textarea';
import { useAppStore } from '../../stores/app';
import { usePullRequests } from '../../composables/usePullRequests';

const props = defineProps({ info: { type: Object, default: null } });
const emit = defineEmits(['refresh']);

const store = useAppStore();
const {
  pullRequestsUrl,
  pullRequests,
  loading,
  error,
  prState,
  prStateOptions,
  mergingPr,
  showCreateModal,
  newPrBase,
  newPrTitle,
  newPrBody,
  createPrLoading,
  createPrError,
  canCreatePr,
  load,
  openPullRequestsUrl,
  openPrUrl,
  openCreateModal,
  submitCreatePr,
  mergePr,
} = usePullRequests(store, () => props.info, emit);
</script>
