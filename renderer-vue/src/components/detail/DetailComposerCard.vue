<template>
  <Card class="mb-4 detail-tab-panel" data-detail-tab="composer">
    <template #content>
      <div class="card-section">
      <span class="card-label">Composer</span>
      <p class="m-0 mb-2 text-sm text-rm-muted">{{ composer.summary }}</p>
      <Message v-if="composer.validateMsg" :severity="composer.validateOk ? 'secondary' : 'warn'" class="mb-2 text-xs">{{ composer.validateMsg }}</Message>
      <Message v-if="composer.lockWarning" severity="warn" class="mb-3 text-xs">{{ composer.lockWarning }}</Message>
      <div v-if="composer.scripts.length" class="mb-4">
        <span class="card-label text-rm-muted mb-1 block">Scripts</span>
        <ul class="m-0 pl-4 text-sm text-rm-muted list-disc">
          <li v-for="s in composer.scripts" :key="s"><code class="bg-rm-surface px-1 rounded text-xs">{{ s }}</code></li>
        </ul>
      </div>
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <Button severity="secondary" size="small" class="text-xs" @click="composer.load">Refresh outdated</Button>
        <Button v-if="composer.outdated.length" severity="primary" size="small" class="text-xs" :disabled="composer.updatingAll" @click="composer.updateAll">Update all</Button>
        <label class="checkbox-label text-sm text-rm-muted cursor-pointer flex items-center gap-2">
          <Checkbox v-model="composer.directOnly" binary />
          <span>Direct only</span>
        </label>
      </div>
      <div v-if="composer.outdated.length" class="overflow-x-auto mb-4">
        <DataTable :value="composer.outdated" dataKey="name" size="small" class="composer-datatable text-sm" tableClass="w-full">
          <Column field="name" header="Package" class="font-mono text-rm-text" />
          <Column field="version" header="Current" class="font-mono text-rm-muted" />
          <Column field="latest" header="Latest" class="font-mono text-rm-accent" />
          <Column header="">
            <template #body="{ data }">
              <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="composer.updateOne(data.name)">Update</Button>
            </template>
          </Column>
        </DataTable>
      </div>
      <Message v-if="composer.outdatedError" severity="warn" class="text-xs">{{ composer.outdatedError }}</Message>
      <div v-if="composer.auditAdvisories.length" class="mt-4">
        <span class="card-label text-rm-muted mb-1 block">Audit</span>
        <DataTable :value="composer.auditAdvisories" size="small" class="composer-datatable text-sm" :dataKey="(a) => a.name + (a.version || '')">
          <Column header="Package">
            <template #body="{ data }">
              <span class="font-mono">{{ data.name }} {{ data.version || '' }}</span>
            </template>
          </Column>
          <Column field="severity" header="Severity">
            <template #body="{ data }">{{ data.severity || '—' }}</template>
          </Column>
          <Column header="Advisory">
            <template #body="{ data }">
              <Button v-if="data.link" variant="link" :label="data.advisory" class="text-rm-accent p-0 min-w-0 h-auto" @click="openAdvisoryLink(data.link)" />
              <span v-else>{{ data.advisory }}</span>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
    </template>
  </Card>
</template>

<script setup>
import { computed } from 'vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Message from 'primevue/message';
import { useApi } from '../../composables/useApi';
import { useComposer } from '../../composables/useComposer';

const props = defineProps({ info: { type: Object, default: null } });
const api = useApi();
const hasComposerRef = computed(() => !!props.info?.hasComposer);
const composer = useComposer({ hasComposerRef });

function openAdvisoryLink(url) {
  if (url && api.openUrl) api.openUrl(url);
}
</script>
