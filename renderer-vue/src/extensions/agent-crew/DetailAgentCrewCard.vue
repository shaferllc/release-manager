<template>
  <ExtensionLayout tab-id="agent-crew" content-class="detail-agent-crew-card">
    <template #toolbar-end>
      <Button variant="text" size="small" icon="pi pi-refresh" class="p-1" title="Refresh" @click="load" />
    </template>

    <div class="card-section">
      <span class="card-label">Instructions</span>
      <label class="card-label text-rm-muted text-xs block mb-1 mt-2">Plan</label>
      <Textarea
        v-model="planText"
        class="w-full text-sm"
        placeholder="Steps, constraints, order of work…"
        rows="2"
        @blur="savePlan"
      />
      <label class="card-label text-rm-muted text-xs block mb-1 mt-3">Goal</label>
      <div class="flex gap-2 flex-wrap">
        <Textarea v-model="autopilotGoal" class="flex-1 min-w-0 text-sm" placeholder="What should get done?" rows="2" @blur="saveAutopilotPrefs" />
        <Button severity="secondary" size="small" label="Break into tasks" :disabled="!autopilotGoal.trim()" @click="breakIntoStories" />
      </div>
      <div v-if="autopilotTasks.length" class="mt-3 border border-rm-border rounded-rm overflow-hidden">
        <ul class="list-none m-0 p-0">
          <li
            v-for="(task, index) in autopilotTasksOrdered"
            :key="task.id"
            draggable="true"
            class="flex items-center gap-2 px-3 py-2 border-b border-rm-border last:border-b-0 text-sm hover:bg-rm-surface-hover/50"
            :class="{ 'opacity-60': draggedTaskId === task.id }"
            @dragstart="onTaskDragStart($event, task.id)"
            @dragover.prevent="onTaskDragOver($event, index)"
            @drop="onTaskDrop(index)"
            @dragend="draggedTaskId = null"
          >
            <span class="cursor-grab text-rm-muted shrink-0" aria-label="Drag">⋮⋮</span>
            <span class="flex-1 min-w-0 truncate text-rm-text">{{ task.title }}</span>
            <Tag :severity="taskStatusSeverity(task.status)" class="text-xs shrink-0">{{ task.status }}</Tag>
            <Button v-if="task.status === 'failed'" variant="text" size="small" label="Retry" class="shrink-0 p-1" @click.stop="retryTask(task.id)" />
            <Button v-else-if="task.status === 'pending'" variant="text" size="small" icon="pi pi-play" class="shrink-0 p-1" title="Run" @click.stop="runTask(task.id)" />
          </li>
        </ul>
      </div>
    </div>

    <div class="card-section border-t border-rm-border">
      <span class="card-label">Conversation</span>
      <div v-if="currentThread.messages.length" class="mt-2 border border-rm-border rounded-rm overflow-hidden max-h-48 overflow-y-auto">
        <div
          v-for="(msg, idx) in currentThread.messages"
          :key="idx"
          class="px-3 py-2 border-b border-rm-border last:border-b-0 text-sm"
          :class="msg.role === 'human' ? 'bg-rm-accent/10' : 'bg-rm-surface/40'"
        >
          <span class="text-rm-muted text-xs">{{ msg.role === 'human' ? 'You' : msg.agentId || 'Agent' }}:</span>
          <span class="ml-2 text-rm-text">{{ msg.content }}</span>
        </div>
      </div>
      <p v-else class="text-sm text-rm-muted mt-2 mb-0">No messages yet.</p>
      <div class="flex gap-2 mt-2">
        <InputText v-model="conversationInput" class="flex-1 text-sm" placeholder="Message…" @keydown.enter.prevent="sendToCrew" />
        <Button severity="secondary" size="small" label="Send" @click="sendToCrew" />
      </div>
    </div>

    <div class="card-section border-t border-rm-border grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <span class="card-label text-rm-muted text-xs block mb-2">Changed files</span>
        <div class="text-xs text-rm-muted border border-rm-border rounded-rm bg-rm-surface/30 p-3 min-h-[3.5rem]">
          <template v-if="!currentProjectPath">Open a project.</template>
          <template v-else-if="changedFiles.length === 0">Clean.</template>
          <ul v-else class="list-none m-0 p-0 space-y-1 max-h-24 overflow-y-auto font-mono text-rm-text">
            <li v-for="(line, idx) in changedFiles" :key="idx" class="truncate" :title="line.filePath"><span class="text-rm-muted w-5 inline-block">{{ line.status || '?' }}</span> {{ line.filePath }}</li>
          </ul>
        </div>
      </div>
      <div>
        <span class="card-label text-rm-muted text-xs block mb-2">Rules</span>
        <div class="border border-rm-border rounded-rm bg-rm-surface/30 p-3 space-y-2 min-h-[3.5rem]">
          <div v-if="rules.length" class="space-y-1">
            <div v-for="r in rules" :key="r.id" class="flex items-center gap-2 text-xs">
              <span class="flex-1 min-w-0 truncate font-mono text-rm-text">{{ r.rule }}</span>
              <Button variant="text" size="small" icon="pi pi-times" class="p-0.5 shrink-0" @click="removeRule(r.id)" />
            </div>
          </div>
          <div class="flex gap-2">
            <InputText v-model="newRule" class="flex-1 text-sm" placeholder="Add rule…" @keydown.enter.prevent="addRule" />
            <Button variant="text" size="small" @click="addRule">Add</Button>
          </div>
        </div>
      </div>
    </div>

    <div class="card-section border-t border-rm-border">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span class="card-label">Workspaces</span>
        <div class="flex gap-2 flex-wrap">
          <Select v-model="filter" :options="filterOptions" option-label="label" option-value="value" class="w-32 text-sm" />
          <Select v-model="sort" :options="sortOptions" option-label="label" option-value="value" class="w-36 text-sm" />
          <InputText v-model="searchQuery" class="w-32 text-sm" placeholder="Search" />
        </div>
      </div>
      <DataTable
        :value="displayedRows"
        dataKey="path"
        size="small"
        class="agent-crew-table w-full text-sm"
        rowHover
        @row-click="(e) => selectProject(e.data.path)"
      >
        <Column field="name" header="Name">
          <template #body="{ data }">{{ data.name || data.path?.split('/').pop() || '—' }}</template>
        </Column>
        <Column header="Status">
          <template #body="{ data }">
            <Tag :severity="data.needsRelease ? 'warn' : 'success'" class="text-xs">{{ data.needsRelease ? 'Needs release' : 'Up to date' }}</Tag>
          </template>
        </Column>
        <Column field="latestTag" header="Latest tag">
          <template #body="{ data }"><span class="font-mono text-xs text-rm-muted">{{ data.latestTag || '—' }}</span></template>
        </Column>
      </DataTable>
      <Message v-if="displayedRows.length === 0" severity="secondary" class="mt-2 text-sm">
        {{ rows.length === 0 ? 'No projects. Add projects from the sidebar.' : 'No projects match the search.' }}
      </Message>
    </div>

    <div class="card-section border-t border-rm-border">
      <span class="card-label text-rm-muted block mb-2">Opinions</span>
      <div class="flex gap-2 flex-wrap">
        <Textarea v-model="opinionsPrompt" class="flex-1 min-w-[14rem] text-sm" placeholder="Ask multiple models…" rows="2" />
        <Button severity="secondary" size="small" label="Ask" :disabled="!opinionsPrompt.trim()" @click="askOpinions" />
      </div>
      <div v-if="opinionsResponse !== null" class="mt-2 p-3 rounded-rm border border-rm-border bg-rm-surface/40 text-sm text-rm-muted">
        {{ opinionsResponse }}
      </div>
    </div>
  </ExtensionLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import ExtensionLayout from '../../components/detail/ExtensionLayout.vue';
import { useDashboard } from '../../composables/useDashboard';
import { useApi } from '../../composables/useApi';
import { useAgentCrewSlots } from '../../composables/useAgentCrewSlots';
import { useAppStore } from '../../stores/app';

const props = defineProps({
  info: { type: Object, default: null },
});

const PREF = 'ext.agentCrew.';

const api = useApi();
const store = useAppStore();
const { agentSlots, setSlots } = useAgentCrewSlots();
const {
  filterOptions,
  sortOptions,
  filter,
  sort,
  rows,
  unreleasedLabel,
  selectProject,
  load,
} = useDashboard();

const searchQuery = ref('');

const displayedRows = computed(() => {
  const q = (searchQuery.value || '').trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter(
    (r) => (r.name || '').toLowerCase().includes(q) || (r.path || '').toLowerCase().includes(q)
  );
});

// Plan
const planText = ref('');

function savePlan() {
  if (!api.setPreference) return;
  try {
    api.setPreference(PREF + 'plan', planText.value);
  } catch (_) {}
}

// Changed files (from current project info)
const currentProjectPath = computed(() => (props.info?.path ?? store.selectedPath ?? '').trim());
const changedFiles = computed(() => props.info?.uncommittedLines ?? []);

// Autopilot
const autopilotGoal = ref('');
const autopilotTasks = ref([]);
const draggedTaskId = ref(null);

const autopilotTasksOrdered = computed(() => [...autopilotTasks.value].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));

function taskStatusSeverity(status) {
  if (status === 'done') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'running') return 'info';
  return 'secondary';
}

function breakIntoStories() {
  const goal = (autopilotGoal.value || '').trim();
  if (!goal) return;
  const sentences = goal.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const titles = sentences.length >= 2 ? sentences.slice(0, 4) : [goal, 'Follow-up task 1', 'Follow-up task 2'];
  const nextOrder = Math.max(0, ...autopilotTasks.value.map((t) => t.order ?? 0)) + 1;
  const newTasks = titles.map((title, i) => ({
    id: `task-${Date.now()}-${i}`,
    title,
    status: 'pending',
    order: nextOrder + i,
  }));
  autopilotTasks.value = [...autopilotTasks.value, ...newTasks];
  saveAutopilotPrefs();
}

function runTask(taskId) {
  const t = autopilotTasks.value.find((x) => x.id === taskId);
  if (t) t.status = 'running';
  saveAutopilotPrefs();
}

function retryTask(taskId) {
  const t = autopilotTasks.value.find((x) => x.id === taskId);
  if (t) t.status = 'pending';
  saveAutopilotPrefs();
}

function onTaskDragStart(e, taskId) {
  draggedTaskId.value = taskId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', taskId);
}

function onTaskDragOver(e, index) {
  e.preventDefault();
}

function onTaskDrop(toIndex) {
  const id = draggedTaskId.value;
  if (!id) return;
  const list = [...autopilotTasksOrdered.value];
  const fromIndex = list.findIndex((t) => t.id === id);
  if (fromIndex === -1) return;
  const [removed] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, removed);
  list.forEach((t, i) => { t.order = i; });
  autopilotTasks.value = list;
  saveAutopilotPrefs();
  draggedTaskId.value = null;
}

async function saveAutopilotPrefs() {
  if (!api.setPreference) return;
  try {
    await api.setPreference(PREF + 'autopilotGoal', autopilotGoal.value);
    await api.setPreference(PREF + 'autopilotTasks', JSON.stringify(autopilotTasks.value));
  } catch (_) {}
}

// Slots still loaded for sidebar (running agents per project); we manage instructions here, not agent slots.
const AGENT_SLOT_IDS = ['agent-1', 'agent-2', 'agent-3'];
const defaultAgentSlots = AGENT_SLOT_IDS.map((id, i) => ({
  id,
  workspacePath: '',
  currentTaskId: '',
  status: 'idle',
  order: i,
}));

// Conversation (thread + history)
const currentThread = ref({ id: 'current', messages: [] });
const conversationInput = ref('');

function sendToCrew() {
  const text = (conversationInput.value || '').trim();
  if (!text) return;
  currentThread.value.messages.push({ role: 'human', content: text, ts: Date.now() });
  conversationInput.value = '';
  saveThread();
}

function saveThread() {
  if (!api.setPreference) return;
  try {
    api.setPreference(PREF + 'currentThread', JSON.stringify(currentThread.value));
  } catch (_) {}
}

// Rules
const rules = ref([]);
const newRule = ref('');

function addRule() {
  const rule = (newRule.value || '').trim();
  if (!rule) return;
  rules.value.push({ id: `rule-${Date.now()}`, scope: 'global', rule });
  newRule.value = '';
  saveRules();
}

function removeRule(id) {
  rules.value = rules.value.filter((r) => r.id !== id);
  saveRules();
}

async function saveRules() {
  if (!api.setPreference) return;
  try {
    await api.setPreference(PREF + 'rules', JSON.stringify(rules.value));
  } catch (_) {}
}

// Opinions
const opinionsPrompt = ref('');
const opinionsResponse = ref(null);

function askOpinions() {
  if (!(opinionsPrompt.value || '').trim()) return;
  opinionsResponse.value = 'Multiple models would discuss this and return the best solution. (Connect an API to enable.)';
}

// Persist filter/sort; load all prefs on mount
onMounted(async () => {
  if (!api.getPreference) return;
  try {
    const savedFilter = await api.getPreference(PREF + 'filter');
    if (savedFilter === 'all' || savedFilter === 'needs-release') filter.value = savedFilter;
    const savedSort = await api.getPreference(PREF + 'sort');
    if (savedSort === 'name' || savedSort === 'needs-release') sort.value = savedSort;
    const goal = await api.getPreference(PREF + 'autopilotGoal');
    if (goal != null) autopilotGoal.value = goal;
    const tasksRaw = await api.getPreference(PREF + 'autopilotTasks');
    if (tasksRaw != null) {
      const parsed = typeof tasksRaw === 'string' ? (() => { try { return JSON.parse(tasksRaw); } catch { return null; } })() : tasksRaw;
      if (Array.isArray(parsed)) autopilotTasks.value = parsed;
    }
    const slotsRaw = await api.getPreference(PREF + 'agentSlots');
    if (slotsRaw != null) {
      const parsed = typeof slotsRaw === 'string' ? (() => { try { return JSON.parse(slotsRaw); } catch { return null; } })() : slotsRaw;
      setSlots(Array.isArray(parsed) && parsed.length ? parsed : defaultAgentSlots);
    } else {
      setSlots(defaultAgentSlots);
    }
    const plan = await api.getPreference(PREF + 'plan');
    if (plan != null) planText.value = plan;
    const threadRaw = await api.getPreference(PREF + 'currentThread');
    if (threadRaw != null) {
      const parsed = typeof threadRaw === 'string' ? (() => { try { return JSON.parse(threadRaw); } catch { return null; } })() : threadRaw;
      if (parsed?.messages) currentThread.value = parsed;
    }
    const rulesRaw = await api.getPreference(PREF + 'rules');
    if (rulesRaw != null) {
      const parsed = typeof rulesRaw === 'string' ? (() => { try { return JSON.parse(rulesRaw); } catch { return null; } })() : rulesRaw;
      if (Array.isArray(parsed)) rules.value = parsed;
    }
  } catch (_) {}
});

watch([filter, sort], async () => {
  if (!api.setPreference) return;
  try {
    await api.setPreference(PREF + 'filter', filter.value);
    await api.setPreference(PREF + 'sort', sort.value);
  } catch (_) {}
});
</script>
