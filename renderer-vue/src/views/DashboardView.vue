<template>
  <Card class="dashboard-view detail-tab-panel flex-1 flex flex-col min-h-0 overflow-hidden">
    <template #content>
    <Toolbar class="extension-toolbar">
      <template #start>
        <p class="text-sm text-rm-muted m-0">
          View all projects. Filter, sort, and click a row to open that project’s detail.
        </p>
      </template>
      <template #end>
        <label class="flex items-center gap-2">
          <span class="text-xs font-medium text-rm-muted">Filter</span>
          <Select v-model="filter" :options="filterOptions" optionLabel="label" optionValue="value" class="min-w-[8rem]" />
        </label>
        <label class="flex items-center gap-2">
          <span class="text-xs font-medium text-rm-muted">Sort</span>
          <Select v-model="sort" :options="sortOptions" optionLabel="label" optionValue="value" class="min-w-[8rem]" />
        </label>
        <Button severity="secondary" size="small" icon="pi pi-refresh" label="Refresh" @click="load" />
      </template>
    </Toolbar>
    <Panel class="dashboard-panel flex-1">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full">
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Projects</h3>
          <span v-if="rows.length" class="text-xs text-rm-muted">{{ rows.length }} project{{ rows.length === 1 ? '' : 's' }}</span>
        </div>
      </template>
      <DataTable
        :value="rows"
        dataKey="path"
        size="small"
        tableClass="dashboard-table"
        rowHover
        @row-click="(e) => selectProject(e.data.path)"
      >
        <Column field="name" header="Name">
          <template #body="{ data }">{{ data.name || '—' }}</template>
        </Column>
        <Column field="version" header="Version">
          <template #body="{ data }"><span class="font-mono text-sm text-rm-muted">{{ data.version || '—' }}</span></template>
        </Column>
        <Column field="latestTag" header="Latest tag">
          <template #body="{ data }"><span class="font-mono text-sm text-rm-muted">{{ data.latestTag || '—' }}</span></template>
        </Column>
        <Column header="Unreleased">
          <template #body="{ data }">{{ unreleasedLabel(data) }}</template>
        </Column>
        <Column field="branch" header="Branch">
          <template #body="{ data }">{{ data.branch || '—' }}</template>
        </Column>
        <Column header="Ahead / behind">
          <template #body="{ data }">{{ aheadBehindLabel(data) }}</template>
        </Column>
      </DataTable>
      <Message v-if="rows.length === 0" severity="secondary" class="mt-4">No projects match the filter.</Message>
    </Panel>
    </template>
  </Card>
</template>

<script setup>
import Button from 'primevue/button';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Message from 'primevue/message';
import Panel from 'primevue/panel';
import Select from 'primevue/select';
import Toolbar from 'primevue/toolbar';
import { useDashboard } from '../composables/useDashboard';

const {
  filterOptions,
  sortOptions,
  filter,
  sort,
  rows,
  unreleasedLabel,
  aheadBehindLabel,
  selectProject,
  load,
} = useDashboard();
</script>
