<template>
  <ExtensionLayout tab-id="terminal" content-class="detail-terminal-card">
    <template #toolbar-start>
      <p class="text-sm text-rm-muted m-0">Integrated terminal for this project.</p>
    </template>
    <template #toolbar-end>
      <Button variant="text" size="small" icon="pi pi-info-circle" class="text-rm-muted" v-tooltip.top="'Terminal docs'" aria-label="Docs" @click="openDocs" />
    </template>
    <template v-if="projectPath">
      <Panel class="terminal-card-panel flex-1 min-h-[320px] flex flex-col overflow-hidden">
        <template #header>
          <Toolbar class="terminal-card-toolbar w-full border-0 rounded-none bg-transparent p-0 min-h-0">
            <template #start>
              <Button severity="secondary" size="small" icon="pi pi-external-link" label="Open in system terminal" v-tooltip.top="'Open in system terminal'" @click="openInSystemTerminal" />
              <Button severity="secondary" size="small" icon="pi pi-copy" label="Copy path" v-tooltip.top="'Copy project path'" @click="copyPath" />
              <span v-if="copyFeedback" class="text-xs text-rm-accent font-medium ml-1">Copied!</span>
              <Button severity="secondary" size="small" icon="pi pi-play" label="Quick run" aria-haspopup="true" aria-controls="terminal-quick-run-menu" v-tooltip.top="'Run command in terminal'" @click="quickRunMenuRef?.toggle($event)" />
              <Menu id="terminal-quick-run-menu" ref="quickRunMenuRef" :model="quickRunMenuItems" :popup="true" class="terminal-quick-run-menu" />
            </template>
          </Toolbar>
        </template>
        <TerminalPanel ref="terminalPanelRef" :min-height="300" :initial-dir-path="projectPath" class="terminal-extension-panel-inner flex-1 min-h-0" />
      </Panel>
    </template>
    <template v-else>
      <div class="py-12 px-4 text-center text-rm-muted text-sm">
        <p class="m-0">Select a project to open a terminal in its directory.</p>
      </div>
    </template>
  </ExtensionLayout>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import ExtensionLayout from '../../components/detail/ExtensionLayout.vue';
import Panel from 'primevue/panel';
import Toolbar from 'primevue/toolbar';
import { useApi } from '../../composables/useApi';
import { useAppStore } from '../../stores/app';
import { useModals } from '../../composables/useModals';
import TerminalPanel from '../../components/detail/TerminalPanel.vue';

const props = defineProps({ info: { type: Object, default: null } });

const api = useApi();
const store = useAppStore();
const modals = useModals();

const projectPath = computed(() => props.info?.path ?? store.selectedPath ?? '');
const terminalPanelRef = ref(null);
const quickRunMenuRef = ref(null);
const copyFeedback = ref(false);
let copyFeedbackTimer = null;

const quickRunMenuItems = computed(() => [
  { label: 'git status', icon: 'pi pi-github', command: () => runQuick('git status') },
  { label: 'npm install', icon: 'pi pi-box', command: () => runQuick('npm install') },
  { label: 'composer install', icon: 'pi pi-box', command: () => runQuick('composer install') },
]);

function openInSystemTerminal() {
  if (projectPath.value) api.openInTerminal?.(projectPath.value);
}

function copyPath() {
  if (!projectPath.value) return;
  api.copyToClipboard?.(projectPath.value);
  copyFeedback.value = true;
  if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer);
  copyFeedbackTimer = setTimeout(() => { copyFeedback.value = false; }, 1500);
}

function openDocs() {
  modals.openModal('docs', { docKey: 'terminal' });
}

function runQuick(cmd) {
  terminalPanelRef.value?.runInActiveTerminal?.(cmd);
}

// When Runbooks "Run in Terminal" sets pendingTerminalCommand and switches here, run the command once the panel is ready
watch(
  () => store.pendingTerminalCommand,
  (cmd) => {
    if (!cmd) return;
    const run = () => {
      if (terminalPanelRef.value?.runInActiveTerminal) {
        terminalPanelRef.value.runInActiveTerminal(cmd);
        store.clearPendingTerminalCommand();
      }
    };
    setTimeout(run, 150);
  },
  { immediate: true }
);

onUnmounted(() => {
  if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer);
});
</script>

<style scoped>
.terminal-card-panel :deep(.p-panel-content) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
  border: 0;
}
</style>
