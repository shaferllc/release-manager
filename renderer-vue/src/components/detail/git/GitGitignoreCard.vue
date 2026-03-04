<template>
  <div class="git-card">
    <p class="card-label mb-2">.gitignore</p>

    <!-- Smart suggestions: found in project, not yet ignored -->
    <div v-if="ignore.suggestions.length > 0" class="mb-3 p-3 rounded-rm border border-rm-border bg-rm-surface/20">
      <p class="text-[11px] font-medium text-rm-muted uppercase tracking-wider m-0 mb-2">Suggested for your project</p>
      <p class="text-xs text-rm-muted m-0 mb-2">We found these in your repo; they're commonly ignored. Select to add.</p>
      <div class="flex flex-col gap-1.5 mb-2 max-h-40 overflow-y-auto">
        <label
          v-for="s in ignore.suggestions"
          :key="s.pattern"
          class="flex items-center gap-2 text-xs cursor-pointer hover:text-rm-text"
        >
          <Checkbox
            :model-value="ignore.selectedSuggestions.includes(s.pattern)"
            :binary="true"
            @update:model-value="(v) => ignore.toggleSuggestion(s.pattern, v)"
          />
          <span class="font-mono text-rm-text shrink-0">{{ s.pattern }}</span>
          <span class="text-rm-muted truncate">{{ s.label }}</span>
          <span class="text-[10px] text-rm-muted shrink-0">({{ s.category }})</span>
        </label>
      </div>
      <Button severity="primary" size="small" class="text-xs" :disabled="ignore.selectedSuggestions.length === 0" @click="ignore.addSelectedSuggestions">
        Add {{ ignore.selectedSuggestions.length ? ignore.selectedSuggestions.length : '' }} selected to .gitignore
      </Button>
    </div>

    <!-- Presets: append or replace -->
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <span class="text-[11px] font-medium text-rm-muted uppercase tracking-wider">Presets</span>
      <Select
        v-model="ignore.selectedPresetId"
        :options="ignore.presetSelectOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Choose preset…"
        class="text-xs py-1.5 px-2 min-w-0 max-w-[11rem]"
      />
      <Button severity="secondary" size="small" class="text-xs" :disabled="!ignore.selectedPresetId" @click="ignore.appendPreset">Append preset</Button>
      <Button severity="secondary" size="small" class="text-xs" :disabled="!ignore.selectedPresetId" title="Replace entire file with preset" @click="ignore.replaceWithPreset">Replace with preset</Button>
    </div>

    <!-- Quick add: single patterns -->
    <div class="flex flex-wrap items-center gap-1.5 mb-3">
      <span class="text-[11px] font-medium text-rm-muted uppercase tracking-wider shrink-0">Quick add</span>
      <button
        v-for="q in ignore.quickAdd"
        :key="q.pattern"
        type="button"
        class="text-[10px] px-2 py-1 rounded-rm border border-rm-border bg-rm-surface/50 text-rm-muted hover:text-rm-text hover:border-rm-accent/50 hover:bg-rm-accent/10 border-solid cursor-pointer"
        :title="'Add ' + q.pattern"
        @click="ignore.quickAddPattern(q.pattern)"
      >
        {{ q.label }}
      </button>
    </div>

    <Textarea v-model="ignore.content" class="w-full text-sm font-mono min-h-[12rem]" placeholder="No .gitignore or load failed" />
    <div class="flex flex-wrap items-center gap-2 mt-2">
      <Button severity="primary" size="small" class="text-xs" :disabled="ignore.saving" @click="ignore.save">{{ ignore.saving ? 'Saving…' : 'Save' }}</Button>
      <Button severity="secondary" size="small" class="text-xs" :disabled="ignore.saving" @click="ignore.load">Reload</Button>
      <span v-if="ignore.successMessage" class="text-xs font-medium text-rm-accent">{{ ignore.successMessage }}</span>
    </div>
    <p v-if="ignore.error" class="m-0 mt-2 text-xs text-rm-warning">{{ ignore.error }}</p>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useGitignore } from '../../../composables/useGitignore';
import { GITIGNORE_PRESETS, GITIGNORE_QUICK_ADD } from './gitignorePresets.js';

const emit = defineEmits(['refresh']);
const ignore = useGitignore({
  onRefresh: () => emit('refresh'),
  presets: GITIGNORE_PRESETS,
  quickAdd: GITIGNORE_QUICK_ADD,
});
</script>
