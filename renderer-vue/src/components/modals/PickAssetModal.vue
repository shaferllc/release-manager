<template>
  <Dialog
    :visible="true"
    header="Choose asset"
    :style="{ width: '32rem' }"
    :modal="true"
    :dismissableMask="true"
    class="max-h-[85vh] flex flex-col"
    @update:visible="(v) => { if (!v) close(); }"
    @hide="close"
  >
    <div class="flex flex-col gap-0.5 flex-1 overflow-auto">
      <Button
        v-for="asset in assets"
        :key="asset.id || asset.name"
        variant="text"
        class="w-full justify-start py-1.5 px-2 rounded-rm hover:bg-rm-accent/15 text-rm-text text-left font-normal"
        @click="select(asset)"
      >
        {{ asset.name }} <span class="text-rm-muted text-xs">({{ formatSize(asset.size) }})</span>
      </Button>
    </div>
  </Dialog>
</template>

<script setup>
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { useApi } from '../../composables/useApi';
import { formatSize } from '../../utils/formatSize';

const props = defineProps({
  assets: { type: Array, default: () => [] },
});
const emit = defineEmits(['close', 'select']);

const api = useApi();

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
