<template>
  <div class="git-card">
    <RmCardHeader tag="p" class="mb-2">Submodules</RmCardHeader>
    <div class="flex flex-wrap gap-2 mb-2">
      <RmButton
        variant="primary"
        size="compact"
        class="text-xs"
        :disabled="updating"
        title="Initialize and clone any new submodules, then update all to the commits recorded in this repo. Use after clone or when new submodules were added."
        @click="update(true)"
      >
        {{ updating ? 'Updating…' : 'Update (init)' }}
      </RmButton>
      <RmButton
        variant="secondary"
        size="compact"
        class="text-xs"
        :disabled="updating || !submodules.length"
        title="Update already-initialized submodules only. Does not clone new ones. Use when submodules are already present."
        @click="update(false)"
      >
        Update (no init)
      </RmButton>
    </div>
    <p class="text-[11px] text-rm-muted m-0 mb-3 leading-snug">
      <strong class="text-rm-muted">Update (init):</strong> clone any missing submodules, then update all to the commits recorded in the parent repo. Use after a fresh clone or when submodules were added.
      <strong class="text-rm-muted">Update (no init):</strong> update only submodules that are already initialized; does not clone new ones.
    </p>
    <ul v-if="submodules.length" class="list-none m-0 p-0 space-y-2 text-sm max-h-64 overflow-y-auto">
      <li
        v-for="s in submodules"
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
            >{{ shortSha(s.sha) }}</span>
          </div>
          <span class="flex gap-1 shrink-0">
            <button
              type="button"
              class="text-[10px] text-rm-muted hover:text-rm-text border-0 bg-transparent cursor-pointer p-0.5"
              title="Reveal in Finder"
              @click="reveal(s.path)"
            >
              Reveal
            </button>
            <button
              type="button"
              class="text-[10px] text-rm-muted hover:text-rm-text border-0 bg-transparent cursor-pointer p-0.5"
              title="Copy path"
              @click="copy(s.path)"
            >
              Copy path
            </button>
            <button
              type="button"
              class="text-[10px] text-rm-muted hover:text-rm-text border-0 bg-transparent cursor-pointer p-0.5"
              title="Copy SHA"
              @click="copy(s.sha)"
            >
              Copy SHA
            </button>
          </span>
        </div>
      </li>
    </ul>
    <p v-else class="m-0 text-xs text-rm-muted">No submodules in this repository.</p>
    <p v-if="success" class="m-0 mt-2 text-xs text-rm-success">{{ success }}</p>
    <p v-if="error" class="m-0 mt-2 text-xs text-rm-warning">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { RmButton, RmCardHeader } from '../../ui';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';

const emit = defineEmits(['refresh']);
const store = useAppStore();
const api = useApi();
const submodules = ref([]);
const error = ref('');
const success = ref('');
const updating = ref(false);
let successClearTimer = null;

function shortSha(sha) {
  if (!sha || typeof sha !== 'string') return '';
  return sha.length > 7 ? sha.slice(0, 7) : sha;
}

async function load() {
  const path = store.selectedPath;
  if (!path || !api.getSubmodules) return;
  error.value = '';
  try {
    const r = await api.getSubmodules(path);
    submodules.value = r?.ok ? (r.submodules || []) : [];
  } catch {
    submodules.value = [];
  }
}

watch(() => store.selectedPath, load, { immediate: true });

async function update(init) {
  const path = store.selectedPath;
  if (!path || !api.submoduleUpdate) return;
  error.value = '';
  success.value = '';
  if (successClearTimer) {
    clearTimeout(successClearTimer);
    successClearTimer = null;
  }
  updating.value = true;
  try {
    const result = await api.submoduleUpdate(path, init);
    if (result?.ok !== false) {
      await load();
      emit('refresh');
      success.value = init ? 'Submodules initialized and updated.' : 'Submodules updated.';
      successClearTimer = setTimeout(() => {
        success.value = '';
        successClearTimer = null;
      }, 5000);
    } else {
      error.value = result?.error || 'Update failed.';
    }
  } catch (e) {
    error.value = e?.message || 'Update failed.';
  } finally {
    updating.value = false;
  }
}

function reveal(subPath) {
  const base = store.selectedPath;
  if (!base || !subPath || !api.openPathInFinder) return;
  const full = base.replace(/\\/g, '/').replace(/\/+$/, '') + '/' + subPath.replace(/^\/+/, '');
  api.openPathInFinder(full);
}

async function copy(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {}
}

</script>
