<template>
  <RmModal title="Choose asset" class="max-h-[85vh] flex flex-col" @close="close">
    <ul class="list-none m-0 flex-1 overflow-auto p-0">
      <li
        v-for="asset in assets"
        :key="asset.id || asset.name"
        class="cursor-pointer py-1.5 px-2 rounded-rm hover:bg-rm-accent/15 text-rm-text"
        @click="select(asset)"
      >
        {{ asset.name }} <span class="text-rm-muted text-xs">({{ formatSize(asset.size) }})</span>
      </li>
    </ul>
  </RmModal>
</template>

<script setup>
import { RmModal } from '../ui';
import { useApi } from '../../composables/useApi';

const props = defineProps({
  assets: { type: Array, default: () => [] },
});
const emit = defineEmits(['close', 'select']);

const api = useApi();

function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function close() {
  emit('close');
}

async function select(asset) {
  if (asset.browser_download_url) {
    await api.downloadAsset?.(asset.browser_download_url, asset.name);
  }
  emit('select', asset);
  emit('close');
}
</script>
