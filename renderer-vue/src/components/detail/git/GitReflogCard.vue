<template>
  <div class="git-card">
    <p class="card-label mb-2">Reflog</p>
    <button type="button" class="btn-secondary btn-compact text-xs mb-3" @click="load">Refresh</button>
    <ul v-if="entries.length" class="list-none m-0 p-0 space-y-1 text-sm max-h-64 overflow-y-auto">
      <li
        v-for="(e, i) in entries"
        :key="i"
        class="py-1 border-b border-rm-border cursor-pointer hover:text-rm-accent truncate"
        :title="e.message"
        @click="checkout(e)"
      >
        <span class="font-mono text-rm-muted">{{ e.sha }}</span> {{ e.message }}
      </li>
    </ul>
    <p v-else class="m-0 text-xs text-rm-muted">No reflog entries.</p>
    <p v-if="error" class="m-0 mt-2 text-xs text-rm-warning">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useAppStore } from '../../../stores/app';
import { useApi } from '../../../composables/useApi';

const emit = defineEmits(['refresh']);
const store = useAppStore();
const api = useApi();
const entries = ref([]);
const error = ref('');

async function load() {
  const path = store.selectedPath;
  if (!path || !api.getReflog) return;
  error.value = '';
  try {
    const r = await api.getReflog(path, 50);
    entries.value = r?.ok ? (r.entries || []) : [];
  } catch {
    entries.value = [];
  }
}

watch(() => store.selectedPath, load, { immediate: true });

async function checkout(e) {
  const path = store.selectedPath;
  const refVal = e.ref || e.sha;
  if (!path || !refVal || !api.checkoutRef) return;
  if (!window.confirm(`Checkout ${refVal}?`)) return;
  error.value = '';
  try {
    await api.checkoutRef(path, refVal);
    emit('refresh');
  } catch (e) {
    error.value = e?.message || 'Checkout failed.';
  }
}
</script>
