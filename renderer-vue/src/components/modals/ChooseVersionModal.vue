<template>
  <RmModal title="Choose release to download" @close="close">
    <p class="text-sm text-rm-muted m-0 mb-2">{{ status }}</p>
    <ul class="list-none m-0 p-0">
      <li
        v-for="r in releases"
        :key="r.tag_name"
        class="cursor-pointer py-1.5 px-2 rounded-rm hover:bg-rm-accent/15 text-rm-text"
        @click="select(r)"
      >
        {{ r.name || r.tag_name }} <span class="text-rm-muted text-xs">({{ r.published_at ? new Date(r.published_at).toLocaleDateString() : '' }})</span>
      </li>
    </ul>
  </RmModal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { RmModal } from '../ui';
import { useApi } from '../../composables/useApi';

const props = defineProps({
  gitRemote: { type: String, default: '' },
  token: { type: String, default: '' },
});
const emit = defineEmits(['close', 'select']);

const api = useApi();
const releases = ref([]);
const status = ref('Loading…');

async function load() {
  if (!props.gitRemote) {
    status.value = 'No remote configured.';
    return;
  }
  status.value = 'Loading…';
  releases.value = [];
  try {
    const list = await api.getGitHubReleases?.(props.gitRemote, props.token || undefined);
    releases.value = Array.isArray(list) ? list : [];
    status.value = releases.value.length === 0 ? 'No releases found.' : '';
  } catch (e) {
    status.value = e?.message || 'Failed to load releases.';
  }
}

watch(() => [props.gitRemote, props.token], load, { immediate: true });

function close() {
  emit('close');
}

function select(release) {
  emit('select', release);
  emit('close');
}
</script>
