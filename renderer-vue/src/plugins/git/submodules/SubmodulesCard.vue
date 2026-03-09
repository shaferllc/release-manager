<template>
  <div class="git-card">
    <p class="card-label mb-2">Submodules</p>
    <div class="flex flex-wrap gap-2 mb-2">
      <Button
        severity="primary"
        size="small"
        class="text-xs"
        :disabled="sub.updating"
        title="Initialize and clone any new submodules, then update all to the commits recorded in this repo. Use after clone or when new submodules were added."
        @click="sub.update(true)"
      >
        {{ sub.updating ? 'Updating…' : 'Update (init)' }}
      </Button>
      <Button
        severity="secondary"
        size="small"
        class="text-xs"
        :disabled="sub.updating || !sub.submodules.length"
        title="Update already-initialized submodules only. Does not clone new ones. Use when submodules are already present."
        @click="sub.update(false)"
      >
        Update (no init)
      </Button>
    </div>
    <p class="text-[11px] text-rm-muted m-0 mb-3 leading-snug">
      <strong class="text-rm-muted">Update (init):</strong> clone any missing submodules, then update all to the commits recorded in the parent repo. Use after a fresh clone or when submodules were added.
      <strong class="text-rm-muted">Update (no init):</strong> update only submodules that are already initialized; does not clone new ones.
    </p>
    <Panel class="submodules-list">
      <template #header>
        <span class="text-sm font-semibold text-rm-text">{{ sub.submodules.length }} submodule{{ sub.submodules.length === 1 ? '' : 's' }}</span>
      </template>
      <ul v-if="sub.submodules.length" class="list-none m-0 p-0 space-y-2 text-sm max-h-64 overflow-y-auto">
        <li
          v-for="s in sub.submodules"
          :key="s.path"
          class="py-2 px-2 rounded-rm border border-rm-border bg-rm-surface/30 hover:bg-rm-surface/50"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <span class="font-mono text-rm-text block truncate" :title="s.path">{{ s.path }}</span>
              <span v-if="s.url" class="text-rm-muted text-xs block truncate mt-0.5" :title="s.url">{{ s.url }}</span>
              <span
                class="font-mono text-rm-muted text-xs mt-1 inline-block"
                :title="s.sha"
              >{{ sub.shortSha(s.sha) }}</span>
            </div>
            <span class="flex gap-1 shrink-0">
              <Button
                variant="text"
                size="small"
                class="text-[10px] !p-0.5 min-w-0"
                title="Reveal in Finder"
                @click="sub.reveal(s.path)"
              >
                Reveal
              </Button>
              <Button
                variant="text"
                size="small"
                class="text-[10px] !p-0.5 min-w-0"
                title="Copy path"
                @click="sub.copy(s.path)"
              >
                Copy path
              </Button>
              <Button
                variant="text"
                size="small"
                class="text-[10px] !p-0.5 min-w-0"
                title="Copy SHA"
                @click="sub.copy(s.sha)"
              >
                Copy SHA
              </Button>
            </span>
          </div>
        </li>
      </ul>
      <p v-else class="m-0 text-xs text-rm-muted">No submodules in this repository.</p>
    </Panel>
    <Message v-if="sub.success" severity="success" class="mt-2 text-xs">{{ sub.success }}</Message>
    <Message v-if="sub.error" severity="warn" class="mt-2 text-xs">{{ sub.error }}</Message>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import Message from 'primevue/message';
import Panel from 'primevue/panel';
import { useSubmodules } from './useSubmodules.js';

const emit = defineEmits(['refresh']);
const sub = useSubmodules({ onRefresh: () => emit('refresh') });
</script>
