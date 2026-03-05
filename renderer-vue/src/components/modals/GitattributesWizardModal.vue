<template>
  <Dialog
    :visible="true"
    header=".gitattributes — create or edit"
    :style="{ width: '36rem' }"
    :modal="true"
    :dismissableMask="true"
    class="max-w-2xl max-h-[90vh]"
    @update:visible="(v) => { if (!v) close(); }"
    @hide="close"
  >
    <div class="flex flex-col gap-4 overflow-y-auto min-h-0">
        <!-- Wizard: check then add -->
        <div class="rounded-rm border border-rm-border bg-rm-surface/20 p-3">
          <p class="text-[11px] font-medium text-rm-muted uppercase tracking-wider m-0 mb-2">Add rules</p>
          <p class="text-xs text-rm-muted m-0 mb-3">Check what you need, then click Add selected. Duplicates are skipped.</p>
          <div class="flex flex-col gap-1.5 mb-3">
            <label
              v-for="opt in wizardOptions"
              :key="opt.id"
              class="flex items-start gap-2 text-xs group"
              :class="isOptionFullyInContent(opt) ? 'cursor-default opacity-90' : 'cursor-pointer'"
            >
              <Checkbox
                :model-value="isWizardSelected(opt.id) || isOptionAnyInContent(opt)"
                :disabled="isOptionFullyInContent(opt)"
                binary
                class="mt-0.5 shrink-0"
                :title="isOptionFullyInContent(opt) ? 'Already in file' : undefined"
                @update:model-value="toggleWizardOption(opt.id)"
              />
              <span class="flex-1 min-w-0">
                <span class="font-medium text-rm-text group-hover:text-rm-accent">{{ opt.label }}</span>
                <span class="text-rm-muted block mt-0.5">{{ opt.description }}</span>
              </span>
            </label>
          </div>
          <Button
            severity="primary"
            size="small"
            class="text-xs"
            :disabled="wizardSelected.length === 0"
            @click="addSelected"
          >
            Add selected
          </Button>
        </div>

        <!-- Presets -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[11px] font-medium text-rm-muted uppercase tracking-wider">Presets</span>
          <Select v-model="selectedPresetId" :options="presetSelectOptions" optionLabel="label" optionValue="value" class="text-xs py-1.5 px-2 min-w-0 max-w-[14rem]" />
          <Button severity="secondary" size="small" class="text-xs" :disabled="!selectedPresetId" @click="appendPreset">Add preset</Button>
        </div>

        <!-- Inline diff: removed / added vs HEAD -->
        <div v-if="inlineDiffLines.length > 0" class="rounded-rm border border-rm-border bg-rm-bg overflow-hidden flex flex-col">
          <p class="text-[11px] font-medium text-rm-muted uppercase tracking-wider m-0 px-2 py-1.5 border-b border-rm-border">Changes vs HEAD</p>
          <div class="text-xs font-mono overflow-y-auto max-h-40 min-h-0 p-2">
            <div
              v-for="(row, i) in inlineDiffLines"
              :key="i"
              class="diff-inline-line py-0.5 px-1.5 rounded-sm whitespace-pre-wrap break-all"
              :class="row.type === 'remove' ? 'bg-rm-danger/15 text-rm-danger' : row.type === 'add' ? 'bg-rm-success/15 text-rm-success' : 'text-rm-muted'"
            >
              <span class="select-none w-6 inline-block">{{ row.type === 'remove' ? '−' : row.type === 'add' ? '+' : ' ' }}</span>{{ row.line || ' ' }}
            </div>
          </div>
        </div>

        <!-- Editable content -->
        <div class="flex flex-col gap-1.5 min-h-0 flex-1">
          <label class="text-[11px] font-medium text-rm-muted uppercase tracking-wider">Content (edit below)</label>
          <Textarea
            v-model="localContent"
            class="w-full text-sm font-mono min-h-[14rem] flex-1"
            placeholder="No .gitattributes or add rules above"
            spellcheck="false"
          />
        </div>
    </div>
    <template #footer>
      <Button severity="secondary" size="small" class="text-xs" @click="close">Cancel</Button>
      <Button severity="primary" size="small" class="text-xs" @click="save">Save</Button>
    </template>
  </Dialog>
</template>

<script setup>
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useGitattributesWizard } from '../../composables/useGitattributesWizard';

const props = defineProps({
  initialContent: { type: String, default: '' },
  baselineContent: { type: String, default: '' },
});
const emit = defineEmits(['close', 'applyAndSave']);

const {
  wizardOptions,
  presetSelectOptions,
  localContent,
  wizardSelected,
  selectedPresetId,
  inlineDiffLines,
  isOptionAnyInContent,
  isOptionFullyInContent,
  isWizardSelected,
  toggleWizardOption,
  close,
  addSelected,
  appendPreset,
  save,
} = useGitattributesWizard(
  () => props.initialContent,
  () => props.baselineContent,
  emit
);
</script>
