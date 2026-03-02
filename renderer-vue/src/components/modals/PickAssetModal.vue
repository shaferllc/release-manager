<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-card flex flex-col max-h-[85vh]">
      <div class="modal-header">
        <h3 class="modal-title">Choose asset</h3>
        <button type="button" class="modal-close" aria-label="Close" @click="close">×</button>
      </div>
      <ul class="modal-list modal-body list-none m-0 flex-1 overflow-auto">
        <li
          v-for="asset in assets"
          :key="asset.id || asset.name"
          class="cursor-pointer"
          @click="select(asset)"
        >
          {{ asset.name }} <span class="text-rm-muted text-xs">({{ formatSize(asset.size) }})</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
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
