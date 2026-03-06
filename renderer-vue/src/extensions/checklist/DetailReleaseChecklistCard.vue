<template>
  <ExtensionLayout tab-id="checklist" content-class="detail-release-checklist">
    <template #toolbar-start>
      <p class="text-sm text-rm-muted m-0">
        Track release steps for this project. Check off items as you go; state is saved per project.
      </p>
    </template>
    <template #toolbar-end>
      <Button severity="secondary" size="small" :disabled="items.length === 0 || !hasChecked" @click="resetAll">
        Reset all
      </Button>
      <Button severity="primary" size="small" @click="showAddInput = true">
        Add item
      </Button>
    </template>

    <div v-if="showAddInput" class="checklist-add-row flex flex-wrap items-center gap-2 mb-4 p-3 rounded-rm border border-rm-border bg-rm-surface/30">
      <InputText
        ref="addInputRef"
        v-model="newItemLabel"
        class="flex-1 min-w-[12rem]"
        placeholder="e.g. Deploy to staging"
        @keydown.enter="addItem"
        @keydown.escape="cancelAdd"
      />
      <Button severity="primary" size="small" :disabled="!newItemLabel.trim()" @click="addItem">Add</Button>
      <Button severity="secondary" size="small" @click="cancelAdd">Cancel</Button>
    </div>

    <Panel class="checklist-panel flex-1">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full">
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Checklist</h3>
          <span v-if="items.length" class="text-xs text-rm-muted">{{ checkedCount }} / {{ items.length }} done</span>
        </div>
      </template>

      <div v-if="items.length === 0" class="empty-state py-12 px-4">
        <div class="empty-state-icon">
          <svg class="w-10 h-10 text-rm-muted opacity-60" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </div>
        <h4 class="empty-state-title">No checklist items</h4>
        <p class="empty-state-body text-sm text-rm-muted m-0">Add your own steps or start with the default release checklist.</p>
        <div class="empty-state-actions mt-3">
          <Button severity="primary" size="small" @click="loadDefaults">Use default checklist</Button>
          <Button severity="secondary" size="small" class="ml-2" @click="showAddInput = true">Add item</Button>
        </div>
      </div>

      <ul v-else class="checklist-ul divide-y divide-rm-border">
        <li
          v-for="item in items"
          :key="item.id"
          class="checklist-row flex items-center gap-3 px-4 py-3 min-w-0 hover:bg-rm-surface-hover/50"
          :class="{ 'opacity-60': item.checked }"
        >
          <Checkbox v-model="item.checked" binary class="shrink-0" @update:model-value="saveItems" />
          <span class="flex-1 min-w-0 text-sm" :class="item.checked ? 'text-rm-muted line-through' : 'text-rm-text'">{{ item.label }}</span>
          <Button
            variant="text"
            severity="danger"
            size="small"
            class="p-2 min-w-0 opacity-70 hover:opacity-100 shrink-0"
            title="Remove"
            aria-label="Remove"
            @click="removeItem(item)"
          >
            ×
          </Button>
        </li>
      </ul>
    </Panel>
  </ExtensionLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import ExtensionLayout from '../../components/detail/ExtensionLayout.vue';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import { useApi } from '../../composables/useApi';
import { useAppStore } from '../../stores/app';

const props = defineProps({ info: { type: Object, default: null } });
const store = useAppStore();
const api = useApi();

const projectPath = computed(() => (props.info?.path ?? store.selectedPath ?? '').trim() || '');

const PREF_KEY = 'projectReleaseChecklist';

const DEFAULT_ITEMS = [
  { id: 'default-1', label: 'Update version (package.json / composer.json)', checked: false, isDefault: true },
  { id: 'default-2', label: 'Update CHANGELOG', checked: false, isDefault: true },
  { id: 'default-3', label: 'Run tests', checked: false, isDefault: true },
  { id: 'default-4', label: 'Build / compile assets', checked: false, isDefault: true },
  { id: 'default-5', label: 'Tag release', checked: false, isDefault: true },
  { id: 'default-6', label: 'Push tags', checked: false, isDefault: true },
];

const items = ref([]);
const showAddInput = ref(false);
const newItemLabel = ref('');
const addInputRef = ref(null);

const checkedCount = computed(() => items.value.filter((i) => i.checked).length);
const hasChecked = computed(() => checkedCount.value > 0);

function normalizePath(p) {
  if (p == null || typeof p !== 'string') return '';
  return p.trim().replace(/\\/g, '/').replace(/\/+$/, '') || '';
}

async function loadItems() {
  const path = normalizePath(projectPath.value);
  if (!path) {
    items.value = [];
    return;
  }
  try {
    const map = await api.getPreference?.(PREF_KEY);
    const obj = typeof map === 'object' && map !== null ? map : {};
    const entry = obj[path];
    const list = entry?.items;
    if (Array.isArray(list) && list.length > 0) {
      items.value = list.map((i) => ({
        id: i.id ?? `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        label: typeof i.label === 'string' ? i.label : 'Item',
        checked: !!i.checked,
        isDefault: !!i.isDefault,
      }));
    } else {
      items.value = [];
    }
  } catch {
    items.value = [];
  }
}

async function saveItems() {
  const path = normalizePath(projectPath.value);
  if (!path || !api.setPreference) return;
  try {
    const current = (await api.getPreference?.(PREF_KEY)) || {};
    const next = { ...current };
    next[path] = {
      items: items.value.map((i) => ({ id: i.id, label: i.label, checked: i.checked, isDefault: i.isDefault })),
    };
    await api.setPreference(PREF_KEY, next);
  } catch (_) {}
}

function loadDefaults() {
  items.value = DEFAULT_ITEMS.map((i) => ({ ...i }));
  saveItems();
}

function addItem() {
  const label = newItemLabel.value?.trim();
  if (!label) return;
  items.value.push({
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    label,
    checked: false,
    isDefault: false,
  });
  newItemLabel.value = '';
  showAddInput.value = false;
  saveItems();
}

function cancelAdd() {
  showAddInput.value = false;
  newItemLabel.value = '';
}

function removeItem(item) {
  items.value = items.value.filter((i) => i.id !== item.id);
  saveItems();
}

function resetAll() {
  items.value = items.value.map((i) => ({ ...i, checked: false }));
  saveItems();
}

watch(showAddInput, (visible) => {
  if (visible) nextTick(() => addInputRef.value?.$el?.focus());
});

watch(projectPath, loadItems, { immediate: true });
onMounted(loadItems);
</script>

<style scoped>
.checklist-row {
  transition: opacity 0.15s ease;
}
</style>
