<template>
  <Dialog
    :visible="true"
    header="Choose release to download"
    :style="{ width: '32rem' }"
    :modal="true"
    :dismissableMask="true"
    @update:visible="(v) => { if (!v) close(); }"
    @hide="close"
  >
    <p class="text-sm text-rm-muted m-0 mb-2">{{ status }}</p>
    <div class="flex flex-col gap-0.5">
      <Button
        v-for="r in releases"
        :key="r.tag_name"
        variant="text"
        class="w-full justify-start py-1.5 px-2 rounded-rm hover:bg-rm-accent/15 text-rm-text text-left font-normal"
        @click="select(r)"
      >
        {{ r.name || r.tag_name }} <span class="text-rm-muted text-xs">({{ r.published_at ? new Date(r.published_at).toLocaleDateString() : '' }})</span>
      </Button>
    </div>
  </Dialog>
</template>

<script setup>
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { useChooseVersion } from '../../composables/useChooseVersion';

const props = defineProps({
  gitRemote: { type: String, default: '' },
  token: { type: String, default: '' },
});
const emit = defineEmits(['close', 'select']);

const { releases, status, close, select } = useChooseVersion(
  () => props.gitRemote,
  () => props.token,
  emit
);
</script>
