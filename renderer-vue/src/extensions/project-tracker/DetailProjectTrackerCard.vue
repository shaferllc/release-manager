<template>
  <ExtensionLayout tab-id="project-tracker" content-class="detail-project-tracker-card">
    <template #toolbar-start>
      <p class="text-sm text-rm-muted m-0">
        Track files, mark complete, group by module. Run Laravel in-app, list routes, quick login.
      </p>
    </template>

    <!-- Project path & Run app -->
    <Panel class="tracker-project-panel flex-1">
      <template #header>
        <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Project</h3>
      </template>
      <div class="space-y-3">
        <label class="block">
          <span class="text-xs font-medium text-rm-muted block mb-1">Project path</span>
          <div class="flex flex-wrap items-center gap-2">
            <InputText
              v-model="projectPathInput"
              class="flex-1 min-w-[16rem] font-mono text-sm"
              placeholder="Use current project or enter path"
              @blur="saveProjectPath"
            />
            <Button label="Browse" severity="secondary" size="small" @click="browseProjectPath" />
            <Button
              v-if="currentProjectPath"
              variant="outlined"
              size="small"
              label="Use current project"
              @click="useCurrentProject"
            />
          </div>
        </label>
        <div class="flex flex-wrap items-center gap-2">
          <Button
            severity="secondary"
            size="small"
            icon="pi pi-external-link"
            label="Open in terminal"
            :disabled="!effectivePath"
            @click="openInTerminal"
          />
          <Button
            v-if="!laravelServeRunning"
            severity="primary"
            size="small"
            icon="pi pi-play"
            label="Run app inside"
            :loading="laravelServeStarting"
            :disabled="!effectivePath || laravelServeStarting"
            @click="startLaravelServe"
          />
          <Button
            v-else
            severity="danger"
            size="small"
            icon="pi pi-stop"
            label="Stop server"
            :disabled="!effectivePath"
            @click="stopLaravelServe"
          />
        </div>
        <div v-if="serveUrl" class="tracker-embed-wrap mt-3 rounded-rm border border-rm-border overflow-hidden bg-rm-bg flex flex-col" style="min-height: 360px;">
          <div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-rm-border bg-rm-surface/50 flex-wrap">
            <span class="text-sm font-medium text-rm-text">App</span>
            <div class="flex items-center gap-2 flex-wrap">
              <InputText v-model="loginPath" class="tracker-login-input w-32 text-sm" placeholder="/login" @blur="saveLoginPath" />
              <Button label="Quick login" severity="secondary" size="small" @click="openLogin" />
              <a :href="serveUrl" target="_blank" rel="noopener noreferrer" class="text-xs text-rm-accent hover:underline">{{ serveUrl }}</a>
            </div>
          </div>
          <iframe :src="serveUrl" class="tracker-iframe flex-1 w-full min-h-[320px]" title="App" />
        </div>
      </div>
    </Panel>

    <!-- Files: list, mark done, groups -->
    <Panel class="tracker-files-panel mt-5 flex-1">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full flex-wrap">
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Files</h3>
          <div class="flex items-center gap-2 flex-wrap">
            <Select
              v-model="fileFilter"
              :options="fileFilterOptions"
              option-label="label"
              option-value="value"
              class="tracker-filter-select w-40"
            />
            <Button label="Refresh files" severity="secondary" size="small" :loading="filesLoading" :disabled="!effectivePath || filesLoading" @click="loadFiles" />
            <span v-if="filteredFiles.length" class="text-xs text-rm-muted">{{ doneCount }} / {{ filteredFiles.length }} ({{ progressPercent }}%)</span>
          </div>
        </div>
      </template>
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <template v-if="groupNames.length">
            <span class="text-xs text-rm-muted">Add group:</span>
            <InputText v-model="newGroupName" class="w-36 text-sm" placeholder="e.g. Auth" @keydown.enter="addGroup" />
            <Button label="Add" severity="secondary" size="small" :disabled="!newGroupName.trim()" @click="addGroup" />
          </template>
          <Button label="Manage tags" severity="secondary" size="small" icon="pi pi-tags" @click="tagManagerOpen = !tagManagerOpen" />
        </div>
        <div v-if="tagManagerOpen" class="tracker-tag-manager rounded-rm border border-rm-border bg-rm-surface/40 p-3 space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium text-rm-muted">Suggested tags (click to add to a file):</span>
            <InputText v-model="tagManagerNewTag" class="w-32 text-sm" placeholder="New tag" @keydown.enter.prevent="addTagFromManager" />
            <Button label="Add" severity="secondary" size="small" @click="addTagFromManager" />
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="tag in suggestedTags" :key="tag" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-rm-surface border border-rm-border text-rm-muted">
              {{ tag }}
              <button type="button" class="p-0 leading-none opacity-70 hover:opacity-100" aria-label="Remove" @click="removeSuggestedTag(tag)">×</button>
            </span>
          </div>
          <div class="text-xs font-medium text-rm-muted">Tags in use ({{ allTagsWithCounts.length }}):</div>
          <ul class="list-none m-0 p-0 space-y-1 max-h-40 overflow-y-auto">
            <li v-for="item in allTagsWithCounts" :key="item.tag" class="text-sm">
              <button type="button" class="flex items-center gap-2 w-full text-left py-1 rounded hover:bg-rm-surface-hover/50" @click="tagManagerExpandTag = tagManagerExpandTag === item.tag ? null : item.tag">
                <span class="font-medium text-rm-text">{{ item.tag }}</span>
                <span class="text-rm-muted">({{ item.count }})</span>
              </button>
              <ul v-if="tagManagerExpandTag === item.tag && (tagToFiles[item.tag] || []).length" class="list-none m-0 pl-4 py-1 space-y-0.5 text-xs text-rm-muted">
                <li v-for="f in (tagToFiles[item.tag] || [])" :key="f" class="flex items-center justify-between gap-2 truncate">
                  <span class="truncate font-mono">{{ f }}</span>
                  <Button variant="text" size="small" class="p-0 min-w-0 text-rm-danger shrink-0" icon="pi pi-times" aria-label="Remove tag from file" @click="removeFileTag(f, item.tag)" />
                </li>
              </ul>
            </li>
          </ul>
        </div>
        <div v-if="filteredFiles.length" class="mb-2">
          <ProgressBar :value="progressPercent" class="tracker-progress h-2" show-value="false" />
        </div>
        <div v-if="projectFiles.length === 0 && filesLoading" class="py-8 text-center text-sm text-rm-muted">Loading files…</div>
        <div v-else-if="projectFiles.length === 0" class="py-8 text-center text-sm text-rm-muted">
          {{ effectivePath ? 'No files listed. Click <strong>Refresh files</strong>.' : 'Set a project path first.' }}
        </div>
        <div v-else class="tracker-file-list space-y-4 max-h-[380px] overflow-y-auto">
          <template v-for="section in filesByGroupOrdered" :key="section.key">
            <div v-if="section.files.length" class="space-y-0">
              <div class="flex items-center gap-2 px-2 py-1.5 bg-rm-surface/60 border-b border-rm-border sticky top-0 text-xs font-medium text-rm-muted">
                <span>{{ section.key === '__ungrouped__' ? 'Ungrouped' : section.key }}</span>
                <span class="text-rm-muted">({{ doneInGroup(section.key) }}/{{ section.files.length }})</span>
              </div>
              <ul class="list-none m-0 p-0">
                <li
                  v-for="file in section.files"
                  :key="file"
                  class="tracker-file-row border-b border-rm-border last:border-b-0 hover:bg-rm-surface-hover/50"
                >
                  <div class="flex items-center gap-2 px-3 py-2">
                    <Checkbox :model-value="isDone(file)" binary class="shrink-0" @update:model-value="(v) => setDone(file, v)" />
                    <span class="flex-1 min-w-0 font-mono text-sm truncate" :class="isDone(file) ? 'text-rm-muted line-through' : 'text-rm-text'">{{ file }}</span>
                    <Select
                      v-if="groupNames.length"
                      :model-value="getFileGroup(file)"
                      :options="groupOptions"
                      option-label="label"
                      option-value="value"
                      placeholder="Group"
                      class="tracker-group-select w-28 text-sm"
                      @update:model-value="(v) => setFileGroup(file, v)"
                    />
                    <div class="flex items-center gap-1 shrink-0 flex-wrap">
                      <span v-for="tag in getFileTags(file)" :key="tag" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-rm-surface border border-rm-border text-rm-muted">
                        {{ tag }}
                        <button type="button" class="p-0 leading-none opacity-70 hover:opacity-100" aria-label="Remove tag" @click="removeFileTag(file, tag)">×</button>
                      </span>
                      <template v-if="tagInputFor === file">
                        <InputText
                          v-model="pendingTag"
                          class="w-20 text-xs h-7"
                          placeholder="Tag"
                          @keydown.enter.prevent="addFileTag(file, pendingTag); tagInputFor = null; pendingTag = ''"
                          @keydown.escape="tagInputFor = null; pendingTag = ''"
                          @blur="if (pendingTag.trim()) addFileTag(file, pendingTag); tagInputFor = null; pendingTag = ''"
                        />
                        <div v-if="suggestedTags.length" class="flex flex-wrap gap-1">
                          <button
                            v-for="st in suggestedTags"
                            :key="st"
                            type="button"
                            class="px-1.5 py-0.5 rounded text-[10px] bg-rm-surface border border-rm-border text-rm-muted hover:bg-rm-surface-hover"
                            @click="addFileTag(file, st); tagInputFor = null; pendingTag = ''"
                          >{{ st }}</button>
                        </div>
                      </template>
                      <Button v-else variant="text" size="small" icon="pi pi-tag" class="p-1 min-w-0" title="Add tag" @click="tagInputFor = file; pendingTag = ''" />
                    </div>
                    <span :title="getFileNote(file)" class="max-w-[6rem] truncate text-xs text-rm-muted shrink-0">{{ getFileNote(file) ? '📝' : '—' }}</span>
                    <Button variant="text" size="small" icon="pi pi-file-edit" class="p-1 min-w-0" :title="getFileNote(file) || 'Add note'" @click="openNoteModal(file)" />
                    <Button v-if="getTestFilesFor(file).length" variant="text" size="small" icon="pi pi-play" class="p-1 min-w-0" title="Open first test" @click="openTestFile(file)" />
                    <Button v-if="api.openFileInEditor" variant="text" size="small" icon="pi pi-pencil" class="p-1 min-w-0" title="Open in editor" @click="openFile(file)" />
                  </div>
                  <div class="tracker-file-tests px-3 pb-2 pt-0 pl-[calc(0.75rem+1.5rem)]">
                    <span class="text-[10px] font-medium text-rm-muted uppercase tracking-wide">Tests:</span>
                    <div v-if="getTestFilesFor(file).length" class="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                      <button
                        v-for="testPath in getTestFilesFor(file)"
                        :key="testPath"
                        type="button"
                        class="text-xs font-mono text-rm-accent hover:underline text-left truncate max-w-[20rem]"
                        :title="'Open ' + testPath"
                        @click="openFile(testPath)"
                      >{{ testPath }}</button>
                    </div>
                    <div v-else class="flex flex-wrap items-center gap-2 mt-0.5">
                      <span class="text-xs text-rm-muted italic">No tests found</span>
                      <Button
                        v-if="generatingFilePath !== file"
                        label="Generate tests"
                        severity="secondary"
                        size="small"
                        class="text-xs"
                        icon="pi pi-sparkles"
                        :disabled="!api.generateTestsForFile"
                        v-tooltip.top="'Generate unit tests for this file using AI (runs here with progress)'"
                        @click="generateTestsForFile(file)"
                      />
                      <div v-else class="flex flex-col gap-1.5 min-w-[12rem]">
                        <span class="text-xs text-rm-muted">Generating tests…</span>
                        <ProgressBar mode="indeterminate" class="h-1.5 w-full" show-value="false" />
                      </div>
                      <template v-if="generateStatus?.file === file">
                        <span v-if="generateStatus.testPath" class="text-xs text-rm-success">Created: {{ generateStatus.testPath }}</span>
                        <span v-else-if="generateStatus.error" class="text-xs text-rm-danger">{{ generateStatus.error }}</span>
                      </template>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </template>
        </div>
      </div>
    </Panel>

    <!-- Laravel routes (auto-loaded when Laravel detected) -->
    <Panel v-if="hasArtisan" class="tracker-routes-panel mt-5 flex-1">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full flex-wrap">
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Laravel routes</h3>
          <Button label="Refresh" severity="secondary" size="small" :loading="routesLoading" :disabled="!effectivePath || routesLoading" @click="loadRoutes" />
        </div>
      </template>
      <div v-if="routes.length === 0 && routesLoading" class="py-6 text-center text-sm text-rm-muted">Loading routes…</div>
      <div v-else-if="routes.length === 0" class="py-6 text-center text-sm text-rm-muted">No routes. Run <code class="tracker-code">php artisan route:list</code> in the project.</div>
      <div v-else class="tracker-routes-table-wrap overflow-auto max-h-[320px]">
        <table class="tracker-routes-table w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-rm-border sticky top-0 bg-rm-bg">
              <th class="text-left py-2 px-2 font-medium text-rm-text w-20">Method</th>
              <th class="text-left py-2 px-2 font-medium text-rm-text">URI</th>
              <th class="text-left py-2 px-2 font-medium text-rm-text">Name</th>
              <th class="text-left py-2 px-2 font-medium text-rm-text">Action</th>
              <th class="text-left py-2 px-2 w-24">Open</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in routes" :key="i" class="border-b border-rm-border hover:bg-rm-surface-hover/50">
              <td class="py-1.5 px-2 font-mono text-xs text-rm-muted">{{ r.method }}</td>
              <td class="py-1.5 px-2 font-mono text-rm-text">{{ r.uri }}</td>
              <td class="py-1.5 px-2 text-rm-muted">{{ r.name || '—' }}</td>
              <td class="py-1.5 px-2 font-mono text-xs text-rm-muted truncate max-w-[12rem]" :title="r.action">{{ r.action }}</td>
              <td class="py-1.5 px-2">
                <Button v-if="r.filePath && api.openFileInEditor" variant="text" size="small" class="p-1 text-xs" label="File" @click="openFile(r.filePath)" />
                <a v-if="serveUrl" :href="serveUrl + (r.uri.startsWith('/') ? r.uri : '/' + r.uri)" target="_blank" rel="noopener noreferrer" class="text-xs text-rm-accent hover:underline ml-1">App</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>

    <!-- Vue / front-end routes (auto-loaded when Vue router detected) -->
    <Panel v-if="hasVueRouter" class="tracker-vue-routes-panel mt-5 flex-1">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full flex-wrap">
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Vue routes</h3>
          <Button label="Refresh" severity="secondary" size="small" :loading="vueRoutesLoading" :disabled="!effectivePath || vueRoutesLoading" @click="loadVueRoutes" />
        </div>
      </template>
      <div v-if="vueRoutes.length === 0 && vueRoutesLoading" class="py-6 text-center text-sm text-rm-muted">Loading routes…</div>
      <div v-else-if="vueRoutes.length === 0" class="py-6 text-center text-sm text-rm-muted">No routes parsed from router file.</div>
      <div v-else class="tracker-routes-table-wrap overflow-auto max-h-[320px]">
        <table class="tracker-routes-table w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-rm-border sticky top-0 bg-rm-bg">
              <th class="text-left py-2 px-2 font-medium text-rm-text">Path</th>
              <th class="text-left py-2 px-2 font-medium text-rm-text">Name</th>
              <th class="text-left py-2 px-2 font-medium text-rm-text">Component</th>
              <th class="text-left py-2 px-2 w-24">Open</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in vueRoutes" :key="i" class="border-b border-rm-border hover:bg-rm-surface-hover/50">
              <td class="py-1.5 px-2 font-mono text-rm-text">{{ r.path }}</td>
              <td class="py-1.5 px-2 text-rm-muted">{{ r.name || '—' }}</td>
              <td class="py-1.5 px-2 font-mono text-xs text-rm-muted truncate max-w-[12rem]" :title="r.component">{{ r.component }}</td>
              <td class="py-1.5 px-2">
                <Button v-if="r.filePath && api.openFileInEditor" variant="text" size="small" class="p-1 text-xs" label="File" @click="openFile(r.filePath)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>

    <Dialog
      v-model:visible="noteModalVisible"
      modal
      :header="'Note — ' + (noteModalFile ? noteModalFile.split('/').pop() : '')"
      class="tracker-note-dialog w-full max-w-lg"
      :dismissable-mask="true"
      @hide="noteModalVisible = false"
    >
      <div class="space-y-2">
        <span class="text-xs text-rm-muted font-mono block truncate">{{ noteModalFile }}</span>
        <Textarea v-model="noteModalContent" class="w-full min-h-[8rem]" placeholder="Add a note for this file…" rows="4" />
      </div>
      <template #footer>
        <Button severity="secondary" size="small" label="Cancel" @click="noteModalVisible = false" />
        <Button severity="primary" size="small" label="Save" @click="saveNoteModal" />
      </template>
    </Dialog>
  </ExtensionLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import ExtensionLayout from '../../components/detail/ExtensionLayout.vue';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Panel from 'primevue/panel';
import ProgressBar from 'primevue/progressbar';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useApi } from '../../composables/useApi';
import { useAppStore } from '../../stores/app';

const PREF = 'ext.projectTracker.';
const PREF_PROJECT_PATH = PREF + 'projectPath';
const PREF_DONE_FILES = PREF + 'doneFiles';
const PREF_GROUP_NAMES = PREF + 'groupNames';
const PREF_FILE_GROUPS = PREF + 'fileGroups';
const PREF_FILE_NOTES = PREF + 'fileNotes';
const PREF_FILE_TAGS = PREF + 'fileTags';
const PREF_SUGGESTED_TAGS = PREF + 'suggestedTags';
const PREF_LOGIN_PATH = PREF + 'loginPath';
const LARAVEL_SERVE_ID = 'laravel-serve';

const props = defineProps({ info: { type: Object, default: null } });
const api = useApi();
const store = useAppStore();

const currentProjectPath = computed(() => (props.info?.path ?? store.selectedPath ?? '').trim());
const projectPathInput = ref('');
const resolvedPath = ref('');
const projectFiles = ref([]);
const filesLoading = ref(false);
const fileFilter = ref('all');
const fileFilterOptions = [
  { label: 'All files', value: 'all' },
  { label: '.php', value: '.php' },
  { label: '.blade.php', value: '.blade.php' },
  { label: '.vue', value: '.vue' },
  { label: '.js', value: '.js' },
  { label: '.ts', value: '.ts' },
];
const groupNames = ref([]);
const newGroupName = ref('');
const doneFiles = ref({});
const fileGroups = ref({});
const fileNotes = ref({});
const fileTags = ref({});
const noteInputFor = ref(null);
const tagInputFor = ref(null);
const pendingNote = ref('');
const pendingTag = ref('');
const noteModalVisible = ref(false);
const noteModalFile = ref('');
const noteModalContent = ref('');
const tagManagerOpen = ref(false);
const tagManagerNewTag = ref('');
const suggestedTags = ref([]);
const tagManagerExpandTag = ref(null);
const loginPath = ref('/login');
const routes = ref([]);
const routesLoading = ref(false);
const hasArtisan = ref(false);
const hasVueRouter = ref(false);
const vueRoutes = ref([]);
const vueRoutesLoading = ref(false);
const projectType = ref('generic');
const lastAutoLoadedPath = ref('');
const generatingFilePath = ref(null);
const generateStatus = ref(null);
const laravelServeRunning = ref(false);
const laravelServeStarting = ref(false);
const serveUrl = ref('');
let statusPollTimer = null;
let urlPollTimer = null;

const effectivePath = computed(() => {
  const p = (projectPathInput.value || '').trim();
  if (p) return resolvedPath.value || p;
  return currentProjectPath.value || '';
});

const filteredFiles = computed(() => {
  const list = projectFiles.value;
  if (fileFilter.value === 'all') return list;
  return list.filter((f) => f.endsWith(fileFilter.value));
});

const projectFilesSet = computed(() => new Set(projectFiles.value || []));

const sourceToTestMap = ref({});

const filesByGroup = computed(() => {
  const files = filteredFiles.value;
  const key = effectivePath.value;
  const groupMap = fileGroups.value[key] || {};
  const buckets = { __ungrouped__: [] };
  for (const g of groupNames.value) buckets[g] = [];
  for (const f of files) {
    const g = groupMap[f] || '__ungrouped__';
    if (!buckets[g]) buckets[g] = [];
    buckets[g].push(f);
  }
  return buckets;
});

const filesByGroupOrdered = computed(() => {
  const buckets = filesByGroup.value;
  const out = [];
  for (const g of groupNames.value) {
    if ((buckets[g] || []).length) out.push({ key: g, files: buckets[g] });
  }
  if ((buckets.__ungrouped__ || []).length) out.push({ key: '__ungrouped__', files: buckets.__ungrouped__ });
  return out;
});

const groupOptions = computed(() => [
  { label: '—', value: '' },
  ...groupNames.value.map((n) => ({ label: n, value: n })),
]);

const doneCount = computed(() => {
  const key = effectivePath.value;
  const set = doneFiles.value[key];
  return Array.isArray(set) ? set.length : 0;
});

const progressPercent = computed(() => {
  const total = filteredFiles.value.length;
  return total ? Math.round((doneCount.value / total) * 100) : 0;
});

const doneInGroup = (groupName) => {
  const key = effectivePath.value;
  const set = doneFiles.value[key];
  const files = filesByGroup.value[groupName] || [];
  return files.filter((f) => Array.isArray(set) && set.includes(f)).length;
};

const allTagsWithCounts = computed(() => {
  const key = effectivePath.value;
  const map = fileTags.value[key] || {};
  const count = {};
  for (const files of Object.values(map)) {
    if (!Array.isArray(files)) continue;
    for (const t of files) {
      count[t] = (count[t] || 0) + 1;
    }
  }
  return Object.entries(count).map(([tag, n]) => ({ tag, count: n })).sort((a, b) => b.count - a.count);
});

const tagToFiles = computed(() => {
  const key = effectivePath.value;
  const map = fileTags.value[key] || {};
  const out = {};
  for (const [file, tags] of Object.entries(map)) {
    if (!Array.isArray(tags)) continue;
    for (const t of tags) {
      if (!out[t]) out[t] = [];
      out[t].push(file);
    }
  }
  return out;
});

function getPrefKey(path) {
  return path || 'default';
}

async function loadPrefs() {
  if (!api.getPreference) return;
  try {
    const p = await api.getPreference(PREF_PROJECT_PATH);
    if (p && typeof p === 'string') projectPathInput.value = p;
    const done = await api.getPreference(PREF_DONE_FILES);
    doneFiles.value = done && typeof done === 'object' ? done : {};
    const names = await api.getPreference(PREF_GROUP_NAMES);
    groupNames.value = Array.isArray(names) ? names : [];
    const groups = await api.getPreference(PREF_FILE_GROUPS);
    fileGroups.value = groups && typeof groups === 'object' ? groups : {};
    const notes = await api.getPreference(PREF_FILE_NOTES);
    fileNotes.value = notes && typeof notes === 'object' ? notes : {};
    const tags = await api.getPreference(PREF_FILE_TAGS);
    fileTags.value = tags && typeof tags === 'object' ? tags : {};
    const suggested = await api.getPreference(PREF_SUGGESTED_TAGS);
    suggestedTags.value = Array.isArray(suggested) ? suggested : [];
    const login = await api.getPreference(PREF_LOGIN_PATH);
    if (login && typeof login === 'string') loginPath.value = login;
  } catch (_) {}
  await resolvePath();
  await detectProjectType();
  autoLoadForPath();
}

async function resolvePath() {
  const p = (projectPathInput.value || '').trim();
  if (!p || !api.expandPath) {
    resolvedPath.value = '';
    return;
  }
  try {
    resolvedPath.value = await api.expandPath(p) || '';
  } catch (_) {
    resolvedPath.value = '';
  }
}

async function saveProjectPath() {
  const p = (projectPathInput.value || '').trim();
  if (api.setPreference) await api.setPreference(PREF_PROJECT_PATH, p);
  await resolvePath();
  await detectProjectType();
  autoLoadForPath();
}

function saveLoginPath() {
  const path = (loginPath.value || '').trim();
  if (api.setPreference) api.setPreference(PREF_LOGIN_PATH, path || '/login');
}

async function browseProjectPath() {
  if (!api.showDirectoryDialog) return;
  const result = await api.showDirectoryDialog();
  const pathResult = typeof result === 'string' ? result : result?.filePaths?.[0];
  if (pathResult) {
    projectPathInput.value = pathResult;
    await saveProjectPath();
  }
}

function useCurrentProject() {
  if (currentProjectPath.value) {
    projectPathInput.value = currentProjectPath.value;
    saveProjectPath();
  }
}

function openInTerminal() {
  if (effectivePath.value && api.openInTerminal) api.openInTerminal(effectivePath.value);
}

function openLogin() {
  const base = (serveUrl.value || '').replace(/\/$/, '');
  const path = (loginPath.value || '').trim() || '/login';
  const url = base + (path.startsWith('/') ? path : '/' + path);
  if (url && api.openUrl) api.openUrl(url);
}

async function detectProjectType() {
  const dir = effectivePath.value;
  if (!dir || !api.readProjectFile) {
    hasArtisan.value = false;
    hasVueRouter.value = false;
    projectType.value = 'generic';
    return;
  }
  const artisanRes = await api.readProjectFile(dir, 'artisan');
  hasArtisan.value = artisanRes?.ok === true && artisanRes?.content != null;
  let pkg = null;
  try {
    const pkgRes = await api.readProjectFile(dir, 'package.json');
    if (pkgRes?.ok && pkgRes?.content) pkg = JSON.parse(pkgRes.content);
  } catch (_) {}
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const hasVue = 'vue' in deps;
  const hasNuxt = 'nuxt' in deps || 'nuxt3' in deps;
  const hasReact = 'react' in deps;
  const hasVueRouterPkg = 'vue-router' in deps;
  const routerPaths = ['src/router/index.js', 'src/router/index.ts', 'router/index.js', 'router/index.ts', 'src/main.js', 'src/main.ts'];
  let routerContent = null;
  for (const rp of routerPaths) {
    const res = await api.readProjectFile(dir, rp);
    if (res?.ok && res?.content) {
      routerContent = res.content;
      if (rp.includes('router')) break;
    }
  }
  const routerHasRoutes = routerContent && /routes\s*[:=]|createRouter|path\s*:\s*['"]\//.test(routerContent);
  hasVueRouter.value = (hasVue || hasNuxt) && (hasVueRouterPkg || routerHasRoutes);
  if (hasArtisan.value) projectType.value = 'laravel';
  else if (hasVue || hasNuxt) projectType.value = hasNuxt ? 'nuxt' : 'vue';
  else if (hasReact) projectType.value = 'react';
  else projectType.value = 'generic';
  setSmartFileFilter();
}

function setSmartFileFilter() {
  if (fileFilter.value !== 'all') return;
  if (projectType.value === 'laravel') fileFilter.value = '.php';
  else if (projectType.value === 'vue' || projectType.value === 'nuxt') fileFilter.value = '.vue';
  else if (projectType.value === 'react') fileFilter.value = '.js';
}

async function autoLoadForPath() {
  const dir = effectivePath.value;
  if (!dir || dir === lastAutoLoadedPath.value) return;
  lastAutoLoadedPath.value = dir;
  await loadFiles();
  if (hasArtisan.value) await loadRoutes();
  if (hasVueRouter.value) await loadVueRoutes();
}

async function loadFiles() {
  const dir = effectivePath.value;
  if (!dir || !api.getProjectFiles) return;
  filesLoading.value = true;
  try {
    const result = await api.getProjectFiles(dir);
    projectFiles.value = result?.ok && Array.isArray(result.files) ? result.files : [];
    buildTestMap();
  } catch (_) {
    projectFiles.value = [];
  } finally {
    filesLoading.value = false;
  }
}

function isTestPath(path) {
  return /Test\.php$|\.(spec|test)\.(js|ts|mjs|mts|cjs|cts)$/.test(path) || /__tests__\//.test(path);
}

function testPathToSourceCandidates(testPath) {
  const candidates = [];
  const base = testPath.replace(/\.[^.]+$/, '').replace(/Test$/, '');
  const baseName = base.split('/').pop() || base;
  const dir = testPath.includes('/') ? testPath.slice(0, testPath.lastIndexOf('/') + 1) : '';
  if (testPath.endsWith('Test.php')) {
    candidates.push(dir + baseName + '.php');
    candidates.push('app/Http/Controllers/' + baseName + '.php');
    candidates.push('app/' + baseName + '.php');
    if (testPath.startsWith('tests/Unit/')) {
      const rel = testPath.replace(/^tests\/Unit\//, '').replace(/Test\.php$/, '.php');
      candidates.push('app/' + rel);
      candidates.push('app/Models/' + baseName + '.php');
    }
    if (testPath.startsWith('tests/Feature/')) {
      candidates.push('app/Http/Controllers/' + baseName + '.php');
    }
  } else if (/\.(spec|test)\.(js|ts|mjs|mts|cjs|cts)$/.test(testPath)) {
    const name = baseName.replace(/\.(spec|test)$/, '');
    const parentDir = testPath.includes('__tests__/') ? dir.replace(/__tests__\/?$/, '') : dir;
    candidates.push(parentDir + name + '.vue');
    candidates.push(parentDir + name + '.js');
    candidates.push(parentDir + name + '.ts');
    candidates.push(parentDir + name + '.jsx');
    candidates.push(parentDir + name + '.tsx');
    if (testPath.startsWith('tests/unit/') || testPath.startsWith('tests/components/')) {
      candidates.push('src/' + testPath.replace(/^tests\/(unit|components)\//, '').replace(/\.(spec|test)\.(js|ts)$/, '.vue'));
      candidates.push('src/' + testPath.replace(/^tests\/(unit|components)\//, '').replace(/\.(spec|test)\.(js|ts)$/, '.js'));
      candidates.push('src/' + testPath.replace(/^tests\/(unit|components)\//, '').replace(/\.(spec|test)\.(js|ts)$/, '.ts'));
    }
  }
  return [...new Set(candidates)];
}

function buildTestMap() {
  const set = new Set(projectFiles.value || []);
  const map = {};
  for (const testPath of projectFiles.value || []) {
    if (!isTestPath(testPath)) continue;
    for (const src of testPathToSourceCandidates(testPath)) {
      if (set.has(src) && !map[src]) map[src] = testPath;
    }
  }
  sourceToTestMap.value = map;
}

function isDone(filePath) {
  const key = effectivePath.value;
  const set = doneFiles.value[key];
  return Array.isArray(set) && set.includes(filePath);
}

async function setDone(filePath, done) {
  const key = effectivePath.value;
  const set = new Set(doneFiles.value[key] || []);
  if (done) set.add(filePath);
  else set.delete(filePath);
  doneFiles.value = { ...doneFiles.value, [key]: Array.from(set) };
  if (api.setPreference) await api.setPreference(PREF_DONE_FILES, doneFiles.value);
}

function getFileGroup(filePath) {
  const key = effectivePath.value;
  const map = fileGroups.value[key];
  return (map && map[filePath]) || '';
}

async function setFileGroup(filePath, groupName) {
  const key = effectivePath.value;
  const map = { ...(fileGroups.value[key] || {}) };
  if (groupName) map[filePath] = groupName;
  else delete map[filePath];
  fileGroups.value = { ...fileGroups.value, [key]: map };
  if (api.setPreference) await api.setPreference(PREF_FILE_GROUPS, fileGroups.value);
}

function addGroup() {
  const name = (newGroupName.value || '').trim();
  if (!name || groupNames.value.includes(name)) return;
  groupNames.value = [...groupNames.value, name];
  newGroupName.value = '';
  if (api.setPreference) api.setPreference(PREF_GROUP_NAMES, groupNames.value);
}

function getFileNote(filePath) {
  const key = effectivePath.value;
  const map = fileNotes.value[key];
  return (map && map[filePath]) || '';
}

async function setFileNote(filePath, text) {
  const key = effectivePath.value;
  const map = { ...(fileNotes.value[key] || {}) };
  if ((text || '').trim()) map[filePath] = (text || '').trim();
  else delete map[filePath];
  fileNotes.value = { ...fileNotes.value, [key]: map };
  if (api.setPreference) await api.setPreference(PREF_FILE_NOTES, fileNotes.value);
  noteInputFor.value = null;
}

function openNoteModal(filePath) {
  noteModalFile.value = filePath;
  noteModalContent.value = getFileNote(filePath);
  noteModalVisible.value = true;
}

async function saveNoteModal() {
  await setFileNote(noteModalFile.value, noteModalContent.value);
  noteModalVisible.value = false;
}

function getFileTags(filePath) {
  const key = effectivePath.value;
  const map = fileTags.value[key];
  const arr = map && map[filePath];
  return Array.isArray(arr) ? arr : [];
}

async function setFileTags(filePath, tags) {
  const key = effectivePath.value;
  const map = { ...(fileTags.value[key] || {}) };
  if (tags && tags.length) map[filePath] = tags;
  else delete map[filePath];
  fileTags.value = { ...fileTags.value, [key]: map };
  if (api.setPreference) await api.setPreference(PREF_FILE_TAGS, fileTags.value);
}

function addFileTag(filePath, tag) {
  const t = (tag || '').trim();
  if (!t) return;
  const arr = [...getFileTags(filePath)];
  if (arr.includes(t)) return;
  arr.push(t);
  setFileTags(filePath, arr);
}

async function addSuggestedTag(tag) {
  const t = (tag || '').trim();
  if (!t || suggestedTags.value.includes(t)) return;
  suggestedTags.value = [...suggestedTags.value, t].sort();
  if (api.setPreference) await api.setPreference(PREF_SUGGESTED_TAGS, suggestedTags.value);
}

async function removeSuggestedTag(tag) {
  suggestedTags.value = suggestedTags.value.filter((x) => x !== tag);
  if (api.setPreference) await api.setPreference(PREF_SUGGESTED_TAGS, suggestedTags.value);
}

function addTagFromManager() {
  const t = (tagManagerNewTag.value || '').trim();
  if (!t) return;
  tagManagerNewTag.value = '';
  addSuggestedTag(t);
}

function removeFileTag(filePath, tag) {
  const arr = getFileTags(filePath).filter((x) => x !== tag);
  setFileTags(filePath, arr);
}

function getTestFileFor(filePath) {
  const all = getTestFilesFor(filePath);
  return all.length ? all[0] : null;
}

function getTestFilesFor(filePath) {
  const set = projectFilesSet.value;
  const seen = new Set();
  const out = [];
  const mapped = sourceToTestMap.value[filePath];
  if (mapped && set.has(mapped)) {
    seen.add(mapped);
    out.push(mapped);
  }
  for (const c of testCandidatesFor(filePath)) {
    if (set.has(c) && !seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}

function testCandidatesFor(filePath) {
  const candidates = [];
  const base = filePath.replace(/\.[^.]+$/, '');
  const baseName = base.split('/').pop() || base;
  const dir = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/') + 1) : '';
  const ext = (filePath.match(/\.[^.]+$/) || [])[0] || '';
  if (ext === '.php') {
    const name = baseName.replace(/Controller$/, '') + 'Test';
    candidates.push(dir + name + '.php');
    candidates.push('tests/Unit/' + baseName + 'Test.php');
    candidates.push('tests/Feature/' + baseName + 'Test.php');
    if (filePath.startsWith('app/')) {
      const rel = filePath.replace(/^app\//, 'tests/Unit/');
      candidates.push(rel.replace(/\.php$/, 'Test.php'));
    }
  } else if (['.vue', '.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
    candidates.push(dir + baseName + '.spec.js');
    candidates.push(dir + baseName + '.spec.ts');
    candidates.push(dir + baseName + '.test.js');
    candidates.push(dir + baseName + '.test.ts');
    candidates.push(dir + '__tests__/' + baseName + '.spec.js');
    candidates.push(dir + '__tests__/' + baseName + '.spec.ts');
    candidates.push(dir + '__tests__/' + baseName + '.test.js');
    candidates.push(dir + '__tests__/' + baseName + '.test.ts');
    candidates.push('tests/unit/' + baseName + '.spec.js');
    candidates.push('tests/unit/' + baseName + '.spec.ts');
    candidates.push('tests/unit/' + baseName + '.test.js');
    candidates.push('tests/unit/' + baseName + '.test.ts');
  }
  return candidates;
}

function openFile(relativePath) {
  const dir = effectivePath.value;
  if (dir && api.openFileInEditor) api.openFileInEditor(dir, relativePath);
}

function openTestFile(filePath) {
  const testPath = getTestFileFor(filePath);
  if (testPath) openFile(testPath);
}

async function generateTestsForFile(relativePath) {
  const dir = effectivePath.value;
  if (!dir || !api.generateTestsForFile) return;
  generatingFilePath.value = relativePath;
  generateStatus.value = null;
  try {
    const result = await api.generateTestsForFile(dir, relativePath);
    if (!result.ok) {
      generateStatus.value = { file: relativePath, error: result.error || 'Generation failed' };
      return;
    }
    const text = (result.text || '').trim();
    if (!text) {
      generateStatus.value = { file: relativePath, error: 'No content generated' };
      return;
    }
    const candidates = testCandidatesFor(relativePath);
    const testPath = candidates[0] || defaultTestPathFor(relativePath);
    if (!testPath || !api.writeProjectFile) {
      generateStatus.value = { file: relativePath, error: 'Could not determine test path' };
      return;
    }
    const writeResult = await api.writeProjectFile(dir, testPath, text);
    if (!writeResult?.ok) {
      generateStatus.value = { file: relativePath, error: writeResult?.error || 'Failed to write file' };
      return;
    }
    generateStatus.value = { file: relativePath, testPath };
    buildTestMap();
  } catch (e) {
    generateStatus.value = { file: relativePath, error: e?.message || 'Failed' };
  } finally {
    generatingFilePath.value = null;
  }
}

function defaultTestPathFor(relativePath) {
  const base = relativePath.replace(/\.[^.]+$/, '');
  const baseName = base.split('/').pop() || base;
  const ext = (relativePath.match(/\.[^.]+$/) || [])[0] || '';
  if (ext === '.php') return `tests/Unit/${baseName}Test.php`;
  if (['.vue', '.js', '.ts', '.jsx', '.tsx'].includes(ext)) return `tests/unit/${baseName}.spec.js`;
  return null;
}

async function loadRoutes() {
  const dir = effectivePath.value;
  if (!dir || !api.runShellCommand) return;
  routesLoading.value = true;
  routes.value = [];
  try {
    const result = await api.runShellCommand(dir, 'php artisan route:list --json 2>/dev/null || php artisan route:list');
    const out = (result?.stdout || '').trim();
    let list = [];
    if (out.startsWith('[') || out.startsWith('{')) {
      try {
        const json = JSON.parse(out);
        list = Array.isArray(json) ? json : (json.routes ? json.routes : []);
      } catch (_) {}
    }
    if (list.length === 0 && out) {
      const lines = out.split('\n').filter((l) => l.trim());
      const header = lines[0] || '';
      const methodIdx = header.toLowerCase().indexOf('method');
      const uriIdx = header.toLowerCase().indexOf('uri');
      const nameIdx = header.toLowerCase().indexOf('name');
      const actionIdx = header.toLowerCase().indexOf('action');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        list.push({
          method: methodIdx >= 0 ? line.substring(methodIdx, uriIdx > methodIdx ? uriIdx : line.length).trim() : '',
          uri: uriIdx >= 0 ? line.substring(uriIdx, nameIdx > uriIdx ? nameIdx : line.length).trim() : '',
          name: nameIdx >= 0 ? line.substring(nameIdx, actionIdx > nameIdx ? actionIdx : line.length).trim() : '',
          action: actionIdx >= 0 ? line.substring(actionIdx).trim() : '',
        });
      }
    }
    routes.value = list.map((r) => {
      const method = (r.method || r.Method || '').replace(/\s*\|\s*/, ', ');
      const uri = r.uri || r.URI || r.path || '';
      const name = r.name || r.Name || '';
      let action = r.action || r.Action || r.controller || '';
      let filePath = null;
      const controllerMatch = (action || '').match(/^([A-Za-z0-9_\\]+)@/);
      if (controllerMatch) {
        const ns = controllerMatch[1].replace(/\\/g, '/');
        filePath = 'app/Http/Controllers/' + ns.split('Http/Controllers/').pop() + '.php';
      }
      return { method, uri, name, action, filePath };
    });
  } catch (_) {
    routes.value = [];
  } finally {
    routesLoading.value = false;
  }
}

async function loadVueRoutes() {
  const dir = effectivePath.value;
  if (!dir || !api.readProjectFile) return;
  vueRoutesLoading.value = true;
  vueRoutes.value = [];
  const routerPaths = ['src/router/index.js', 'src/router/index.ts', 'router/index.js', 'router/index.ts'];
  let content = '';
  for (const rp of routerPaths) {
    const res = await api.readProjectFile(dir, rp);
    if (res?.ok && res?.content) {
      content = res.content;
      break;
    }
  }
  if (!content) {
    vueRoutesLoading.value = false;
    return;
  }
  const pathRe = /path\s*:\s*['"`]([^'"`]*)['"`]/g;
  const nameRe = /name\s*:\s*['"`]([^'"`]*)['"`]/g;
  const componentRe = /component\s*:\s*(?:\(\)\s*=>\s*)?import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)|component\s*:\s*['"`]([^'"`]+)['"`]/g;
  let m;
  const paths = [];
  while ((m = pathRe.exec(content)) !== null) paths.push(m[1]);
  const names = [];
  while ((m = nameRe.exec(content)) !== null) names.push(m[1]);
  const components = [];
  while ((m = componentRe.exec(content)) !== null) components.push(m[1] || m[2] || '');
  const len = Math.max(paths.length, names.length, components.length, 1);
  const list = [];
  for (let i = 0; i < len; i++) {
    list.push({
      path: paths[i] || '',
      name: names[i] || '',
      component: components[i] || '',
    });
  }
  vueRoutes.value = list.map((r) => {
    let filePath = (r.component || '').replace(/^\.\//, '').replace(/^@\//, 'src/').replace(/^~\/?/, '');
    if (filePath && !filePath.includes('.')) filePath = filePath + '.vue';
    return { path: r.path, name: r.name, component: r.component, filePath: filePath || null };
  });
  vueRoutesLoading.value = false;
}

function parseServeUrlFromOutput(lines) {
  if (!Array.isArray(lines)) return null;
  const joined = lines.join('\n');
  const match = joined.match(/https?:\/\/[^\s\]"']+/);
  return match ? match[0].replace(/[\]).,;:]+$/, '') : null;
}

async function ensureLaravelServeInConfig() {
  const dir = effectivePath.value;
  if (!dir || !api.getProcessesConfig || !api.setProcessesConfig) return;
  const config = await api.getProcessesConfig();
  const projectConfig = config[dir] || { processes: [] };
  const processes = Array.isArray(projectConfig.processes) ? projectConfig.processes : [];
  if (!processes.some((p) => (p.id || p.name) === LARAVEL_SERVE_ID)) {
    processes.push({ id: LARAVEL_SERVE_ID, name: 'Laravel serve', command: 'php artisan serve' });
    await api.setProcessesConfig({ ...config, [dir]: { ...projectConfig, processes } });
  }
}

async function startLaravelServe() {
  await resolvePath();
  const dir = effectivePath.value;
  if (!dir || !api.startProcess) return;
  laravelServeStarting.value = true;
  serveUrl.value = '';
  try {
    await ensureLaravelServeInConfig();
    const result = await api.startProcess(dir, LARAVEL_SERVE_ID, 'Laravel serve', 'php artisan serve');
    if (!result?.ok) return;
    laravelServeRunning.value = true;
    pollForServeUrl();
  } finally {
    laravelServeStarting.value = false;
  }
}

function pollForServeUrl() {
  if (urlPollTimer) return;
  const dir = effectivePath.value;
  if (!dir || !api.getProcessOutput) return;
  let attempts = 0;
  function poll() {
    attempts++;
    api.getProcessOutput(dir, LARAVEL_SERVE_ID, 50).then((out) => {
      const lines = out?.lines || [];
      const url = parseServeUrlFromOutput(lines);
      if (url) {
        serveUrl.value = url;
        if (urlPollTimer) clearTimeout(urlPollTimer);
        urlPollTimer = null;
        return;
      }
      if (attempts < 30) urlPollTimer = setTimeout(poll, 800);
    });
  }
  poll();
}

async function stopLaravelServe() {
  const dir = effectivePath.value;
  if (!dir || !api.stopProcess) return;
  try {
    await api.stopProcess(dir, LARAVEL_SERVE_ID);
    serveUrl.value = '';
    laravelServeRunning.value = false;
    if (urlPollTimer) clearTimeout(urlPollTimer);
    urlPollTimer = null;
  } catch (_) {}
}

async function pollServeStatus() {
  const dir = effectivePath.value;
  if (!dir || !api.getProcessStatus) return;
  try {
    const statuses = await api.getProcessStatus();
    const entry = statuses.find((s) => s.projectPath === dir && s.processId === LARAVEL_SERVE_ID);
    const running = entry?.status === 'running';
    if (!running && laravelServeRunning.value) {
      serveUrl.value = '';
      if (urlPollTimer) clearTimeout(urlPollTimer);
      urlPollTimer = null;
    }
    laravelServeRunning.value = running;
  } catch (_) {}
}

watch(projectPathInput, () => resolvePath());

onMounted(() => {
  loadPrefs();
  if (currentProjectPath.value && !projectPathInput.value) projectPathInput.value = currentProjectPath.value;
  statusPollTimer = setInterval(pollServeStatus, 2500);
  pollServeStatus();
});

onUnmounted(() => {
  if (statusPollTimer) clearInterval(statusPollTimer);
  if (urlPollTimer) clearTimeout(urlPollTimer);
});
</script>

<style scoped>
.tracker-code {
  @apply px-1.5 py-0.5 rounded bg-rm-surface border border-rm-border font-mono text-xs;
}
.tracker-iframe {
  border: none;
  display: block;
}
.tracker-login-input {
  max-width: 8rem;
}
</style>
