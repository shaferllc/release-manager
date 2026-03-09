<template>
  <Dialog
    :visible="true"
    header="Setup wizard"
    :style="{ width: '32rem' }"
    :modal="true"
    :dismissableMask="true"
    :closable="true"
    class="setup-wizard-modal"
    @update:visible="(v) => { if (!v) close(); }"
    @hide="close"
  >
    <div class="setup-wizard flex flex-col gap-5 min-h-0">
      <!-- Step indicator -->
      <div class="setup-wizard-steps flex items-center gap-2 shrink-0" role="tablist" aria-label="Setup steps">
        <template v-for="(step, i) in steps" :key="step.id">
          <button
            v-if="i > 0"
            type="button"
            class="setup-wizard-step-sep w-4 h-0.5 rounded shrink-0 bg-rm-border"
            :class="{ 'bg-rm-accent': currentIndex >= i }"
            aria-hidden="true"
          />
          <button
            type="button"
            class="setup-wizard-step-btn rounded-full w-8 h-8 flex items-center justify-center text-xs font-semibold shrink-0 transition-colors"
            :class="currentIndex === i ? 'bg-rm-accent text-white' : currentIndex > i ? 'bg-rm-accent/20 text-rm-accent' : 'bg-rm-surface border border-rm-border text-rm-muted'"
            :aria-current="currentIndex === i ? 'step' : undefined"
            :aria-label="`Step ${i + 1}: ${step.title}`"
            @click="goTo(i)"
          >
            {{ i + 1 }}
          </button>
        </template>
      </div>

      <!-- Step content -->
      <div class="setup-wizard-content flex-1 min-h-0 overflow-y-auto">
        <section
          v-for="(step, i) in steps"
          :key="step.id"
          v-show="currentIndex === i"
          class="setup-wizard-panel"
          :aria-labelledby="`wizard-title-${step.id}`"
          :aria-hidden="currentIndex !== i"
        >
          <h3 :id="`wizard-title-${step.id}`" class="text-base font-semibold text-rm-text mb-2">{{ step.title }}</h3>
          <p class="text-sm text-rm-muted m-0 mb-4">{{ step.description }}</p>
          <div v-if="step.actionLabel" class="setup-wizard-action">
            <Button
              v-if="step.action"
              :label="step.actionLabel"
              size="small"
              severity="secondary"
              @click="step.action()"
            />
          </div>
        </section>
      </div>

      <!-- Footer -->
      <div class="setup-wizard-footer flex items-center justify-between gap-2 shrink-0 pt-2 border-t border-rm-border">
        <Button
          v-if="currentIndex > 0"
          label="Back"
          severity="secondary"
          size="small"
          @click="currentIndex--"
        />
        <span v-else />
        <div class="flex gap-2">
          <Button
            v-if="currentIndex < steps.length - 1"
            label="Next"
            severity="primary"
            size="small"
            @click="currentIndex++"
          />
          <Button
            v-else
            label="Done"
            severity="primary"
            size="small"
            @click="close"
          />
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { ref, computed, inject } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useAppStore } from '../../stores/app';
import { useModals } from '../../composables/useModals';

const emit = defineEmits(['close']);

const store = useAppStore();
const modals = useModals();
const onAddProject = inject('onAddProject', null);

const currentIndex = ref(0);

const steps = computed(() => [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'This wizard walks you through setting up projects, Git, tests, and extensions. You can run it anytime from Settings or the command palette (⌘⇧P).',
  },
  {
    id: 'add-project',
    title: 'Add a project',
    description: 'Add a project folder from the sidebar (click the + button) or from the Dashboard. Your repo will appear in the sidebar and you can open it to see Git, Version, Tests, and more.',
    actionLabel: 'Add project',
    action: () => {
      modals.closeModal();
      store.setViewMode('detail');
      if (typeof onAddProject === 'function') onAddProject();
    },
  },
  {
    id: 'git',
    title: 'Git',
    description: 'Use the Git tab on a project to manage branches, commit, push, pull, stash, and tags. If the folder is not a repo yet, you can initialize one from the Git tab.',
  },
  {
    id: 'tests',
    title: 'Tests',
    description: 'On the Tests tab you can run test scripts from package.json or composer.json. Use "Open terminal for Cursor" to chat with Cursor in the terminal and easily create or fix tests.',
    actionLabel: 'Go to Extensions',
    action: () => {
      modals.closeModal();
      store.setViewMode('extensions');
    },
  },
  {
    id: 'extensions',
    title: 'Extensions',
    description: 'Enable the Terminal extension to run commands in the project directory and talk to Cursor from the Tests tab. Other extensions add Runbooks, SSH, Tunnels, and more.',
    actionLabel: 'Open Extensions',
    action: () => {
      modals.closeModal();
      store.setViewMode('extensions');
    },
  },
  {
    id: 'done',
    title: "You're set",
    description: 'Use the command palette (⌘⇧P or Ctrl+Shift+P) to jump to any view or run actions. You can re-run this wizard from Settings → Application → Run setup wizard.',
  },
]);

function goTo(index) {
  if (index >= 0 && index < steps.value.length) currentIndex.value = index;
}

function close() {
  emit('close');
}
</script>

<style scoped>
.setup-wizard-modal :deep(.p-dialog-content) {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.setup-wizard-panel {
  animation: setup-fade 0.15s ease-out;
}
@keyframes setup-fade {
  from { opacity: 0.6; }
  to { opacity: 1; }
}
</style>
