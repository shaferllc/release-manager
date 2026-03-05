<template>
  <div class="dashboard-view flex-1 flex flex-col min-h-0 overflow-hidden">
    <div class="dashboard-toolbar px-5 py-4 border-b border-rm-border bg-rm-surface/30 flex-shrink-0">
      <div class="dashboard-controls flex flex-wrap items-center gap-4">
        <label class="dashboard-label">
          <span class="dashboard-label-text">Filter</span>
          <Select v-model="filter" :options="filterOptions" optionLabel="label" optionValue="value" />
        </label>
        <label class="dashboard-label">
          <span class="dashboard-label-text">Sort</span>
          <Select v-model="sort" :options="sortOptions" optionLabel="label" optionValue="value" />
        </label>
        <Button severity="secondary" size="small" class="inline-flex items-center gap-x-1.5 shrink-0" @click="load">
          <svg class="w-[11px] h-[11px] shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
          Refresh
        </Button>
      </div>
    </div>
    <div class="dashboard-scroll flex-1 overflow-auto p-4">
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
    </div>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Message from 'primevue/message';
import Select from 'primevue/select';
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
