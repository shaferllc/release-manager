<template>
  <ExtensionLayout tab-id="changelog-draft" content-class="detail-changelog-draft-card">
    <template #toolbar-start>
      <p class="text-sm text-rm-muted m-0">
        Draft the next CHANGELOG section or release notes. Saved per project. Generate with AI or insert into CHANGELOG.md.
      </p>
    </template>
    <template #toolbar-end>
      <Button
        variant="outlined"
        size="small"
        icon="pi pi-sparkles"
        label="Generate with AI"
        :loading="generating"
        :disabled="!projectPath || generating"
        v-tooltip.top="sinceTag ? `Generate from commits since ${sinceTag}` : 'Generate from recent commits'"
        @click="generateWithAi"
      />
    </template>

    <div v-if="!projectPath" class="py-12 px-4 text-center text-rm-muted text-sm">
      <p class="m-0">Select a project to draft changelog or release notes.</p>
    </div>
    <template v-else>
      <Panel class="changelog-draft-panel flex-1 flex flex-col min-h-0">
        <template #header>
          <div class="flex items-center justify-between gap-3 w-full">
            <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Draft</h3>
            <span v-if="sinceTag" class="text-xs text-rm-muted font-mono">since {{ sinceTag }}</span>
          </div>
        </template>
        <div class="changelog-draft-body flex flex-col gap-3">
          <Textarea
            v-model="draft"
            class="changelog-draft-textarea w-full font-mono text-sm min-h-[200px]"
            placeholder="Add your release notes or CHANGELOG section here. Use “Generate with AI” to draft from commits."
            rows="12"
            @blur="saveDraft"
          />
          <div class="flex flex-wrap items-center gap-2">
            <Button
              label="Insert into CHANGELOG.md"
              size="small"
              icon="pi pi-file-edit"
              :loading="inserting"
              :disabled="!draft.trim() || inserting"
              v-tooltip.top="'Prepend a “## [Unreleased]” section with this draft to CHANGELOG.md'"
              @click="insertIntoChangelog"
            />
            <Button
              variant="outlined"
              size="small"
              icon="pi pi-copy"
              label="Copy draft"
              :disabled="!draft.trim()"
              @click="copyDraft"
            />
            <span v-if="insertStatus" class="text-xs" :class="insertStatusOk ? 'text-rm-accent' : 'text-red-500'">{{ insertStatus }}</span>
          </div>
        </div>
      </Panel>
    </template>
  </ExtensionLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import ExtensionLayout from '../../components/detail/ExtensionLayout.vue';
import Panel from 'primevue/panel';
import Textarea from 'primevue/textarea';
import { useApi } from '../../composables/useApi';
import { useAppStore } from '../../stores/app';

const props = defineProps({ info: { type: Object, default: null } });

const api = useApi();
const store = useAppStore();

const PREF_PREFIX = 'ext.changelogDraft.';
const CHANGELOG_FILE = 'CHANGELOG.md';

const draft = ref('');
const generating = ref(false);
const inserting = ref(false);
const insertStatus = ref('');
const insertStatusOk = ref(false);
let insertStatusTimer = null;

const projectPath = computed(() => props.info?.path ?? store.selectedPath ?? '');
const sinceTag = computed(() => props.info?.latestTag ?? null);

function getPrefKey() {
  const path = projectPath.value || 'default';
  return `${PREF_PREFIX}${encodeURIComponent(path)}`;
}

async function load() {
  if (!api.getPreference) return;
  try {
    const key = getPrefKey();
    const raw = await api.getPreference(key);
    const data = raw && typeof raw === 'string' ? JSON.parse(raw) : raw;
    draft.value = (data?.draft && typeof data.draft === 'string') ? data.draft : '';
  } catch (_) {
    draft.value = '';
  }
}

let saveDraftTimer = null;
async function saveDraft() {
  if (!api.setPreference) return;
  try {
    await api.setPreference(getPrefKey(), JSON.stringify({ draft: draft.value }));
  } catch (_) {}
}

watch(draft, () => {
  if (saveDraftTimer) clearTimeout(saveDraftTimer);
  saveDraftTimer = setTimeout(saveDraft, 500);
});

async function generateWithAi() {
  const path = projectPath.value;
  const since = sinceTag.value || null;
  if (!path || !api.ollamaGenerateReleaseNotes) return;
  generating.value = true;
  try {
    const result = await api.ollamaGenerateReleaseNotes(path, since);
    if (result?.ok && result?.text != null) {
      draft.value = result.text;
    } else {
      draft.value = (draft.value ? draft.value + '\n\n' : '') + (result?.error || 'Could not generate. Check AI settings.');
    }
  } catch (_) {
    draft.value = (draft.value ? draft.value + '\n\n' : '') + 'Could not generate. Check AI settings.';
  } finally {
    generating.value = false;
  }
}

function copyDraft() {
  if (draft.value && api.copyToClipboard) api.copyToClipboard(draft.value);
}

function setInsertStatus(message, ok) {
  insertStatus.value = message;
  insertStatusOk.value = ok;
  if (insertStatusTimer) clearTimeout(insertStatusTimer);
  insertStatusTimer = setTimeout(() => { insertStatus.value = ''; }, 4000);
}

async function insertIntoChangelog() {
  const path = projectPath.value;
  const text = draft.value?.trim();
  if (!path || !text || !api.readProjectFile || !api.writeProjectFile) return;
  inserting.value = true;
  setInsertStatus('', true);
  try {
    const read = await api.readProjectFile(path, CHANGELOG_FILE);
    let newContent;
    if (read?.ok && read?.content != null) {
      const existing = String(read.content);
      const section = `## [Unreleased]\n\n${text}\n\n`;
      newContent = existing.trimStart().startsWith('#') ? section + existing : section + existing;
    } else {
      newContent = `# Changelog\n\n## [Unreleased]\n\n${text}\n\n`;
    }
    const write = await api.writeProjectFile(path, CHANGELOG_FILE, newContent);
    if (write?.ok) {
      setInsertStatus('Inserted at top of CHANGELOG.md.', true);
    } else {
      setInsertStatus(write?.error || 'Could not write file.', false);
    }
  } catch (e) {
    setInsertStatus(e?.message || 'Failed to insert.', false);
  } finally {
    inserting.value = false;
  }
}

watch(projectPath, load, { immediate: true });
</script>

<style scoped>
.changelog-draft-panel :deep(.p-panel-content) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.changelog-draft-body {
  flex: 1;
  min-height: 0;
}
.changelog-draft-textarea {
  resize: vertical;
  min-height: 200px;
}
</style>
