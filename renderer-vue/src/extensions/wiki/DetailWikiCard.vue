<template>
  <ExtensionLayout tab-id="wiki" content-class="detail-wiki-card">
    <template #toolbar-start>
      <p class="text-sm text-rm-muted m-0">
        Knowledge base: URLs, passwords, notes, receipts, and billing.
      </p>
    </template>
    <template #toolbar-end>
      <div class="flex items-center gap-2">
        <Select
          v-model="filterType"
          :options="filterTypeOptions"
          option-label="label"
          option-value="value"
          placeholder="All types"
          class="wiki-filter w-36"
        />
        <Button severity="primary" size="small" @click="openAddPage">
          Add page
        </Button>
      </div>
    </template>

    <Panel class="wiki-list flex-1">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full">
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Pages</h3>
          <span v-if="filteredPages.length" class="text-xs text-rm-muted">{{ filteredPages.length }} page{{ filteredPages.length === 1 ? '' : 's' }}</span>
        </div>
      </template>

      <div v-if="filteredPages.length === 0" class="empty-state py-12 px-4">
        <div class="empty-state-icon">
          <svg class="w-10 h-10 text-rm-muted opacity-60" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/>
          </svg>
        </div>
        <h4 class="empty-state-title">No wiki pages yet</h4>
        <p class="empty-state-body text-sm text-rm-muted m-0">Add URLs, passwords, notes, receipts, and billing for this project.</p>
        <div class="empty-state-actions mt-3">
          <Button severity="primary" size="small" @click="openAddPage">Add page</Button>
        </div>
      </div>

      <ul v-else class="wiki-ul list-none m-0 p-0">
        <li
          v-for="p in sortedFilteredPages"
          :key="p.id"
          class="wiki-row flex items-center gap-3 px-4 py-3 min-w-0 border-b border-rm-border last:border-b-0 hover:bg-rm-surface-hover/50"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="wiki-title font-medium text-rm-text truncate block">{{ p.title || 'Untitled' }}</span>
              <span v-if="p.type && p.type !== 'general'" class="px-1.5 py-0.5 rounded text-xs font-medium" :class="typeBadgeClass(p.type)">{{ pageTypeLabel(p.type) }}</span>
            </div>
            <p v-if="p.url" class="wiki-url text-xs text-rm-muted truncate m-0 mt-0.5">{{ p.url }}</p>
            <p v-if="(p.type === 'receipt' || p.type === 'billing') && (p.amount != null || p.vendor)" class="wiki-meta text-xs text-rm-muted m-0 mt-0.5">
              <template v-if="p.vendor">{{ p.vendor }}</template>
              <template v-if="p.vendor && p.amount != null"> · </template>
              <template v-if="p.amount != null">{{ formatAmount(p.amount) }}{{ p.currency ? ` ${p.currency}` : '' }}</template>
              <template v-if="p.date"> · {{ p.date }}</template>
            </p>
            <p v-else-if="p.content && expandedId !== p.id" class="wiki-preview text-xs text-rm-muted truncate m-0 mt-0.5">{{ preview(p.content) }}</p>
            <div v-if="(p.tags && p.tags.length) || p.password" class="flex flex-wrap gap-1.5 mt-1.5 items-center">
              <span v-for="tag in (p.tags || [])" :key="tag" class="px-1.5 py-0.5 rounded text-xs bg-rm-accent/15 text-rm-accent">{{ tag }}</span>
              <span v-if="p.password" class="px-1.5 py-0.5 rounded text-xs bg-rm-surface-hover text-rm-muted">••••••</span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <Button
              v-if="p.url"
              variant="text"
              size="small"
              class="p-2 min-w-0"
              title="Open URL"
              aria-label="Open URL"
              @click="openUrl(p.url)"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </Button>
            <Button
              variant="text"
              size="small"
              class="p-2 min-w-0 text-rm-muted hover:text-rm-text"
              title="Edit"
              aria-label="Edit"
              @click="openEditPage(p)"
            >
              ✎
            </Button>
            <Button
              variant="text"
              severity="danger"
              size="small"
              class="p-2 min-w-0 opacity-80 hover:opacity-100"
              title="Delete"
              aria-label="Delete"
              @click="confirmDelete(p)"
            >
              ×
            </Button>
          </div>
        </li>
      </ul>
    </Panel>

    <!-- Add / Edit page modal -->
    <Dialog
      v-model:visible="pageModalVisible"
      :header="editingPage ? 'Edit page' : 'Add page'"
      :style="{ width: '32rem' }"
      :modal="true"
      :dismissableMask="true"
      class="wiki-modal max-w-[95vw]"
      @hide="editingPage = null"
    >
      <div class="space-y-3">
        <label class="block">
          <span class="text-xs font-medium text-rm-muted block mb-1">Type</span>
          <Select
            v-model="form.type"
            :options="pageTypeOptions"
            option-label="label"
            option-value="value"
            class="text-sm w-full"
            placeholder="General"
          />
        </label>
        <label class="block">
          <span class="text-xs font-medium text-rm-muted block mb-1">Title</span>
          <InputText v-model="form.title" class="text-sm w-full" placeholder="e.g. Staging login, AWS invoice" />
        </label>
        <template v-if="form.type === 'receipt' || form.type === 'billing'">
          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="text-xs font-medium text-rm-muted block mb-1">Amount</span>
              <InputText v-model="form.amount" class="text-sm w-full" placeholder="0.00" type="number" step="any" />
            </label>
            <label class="block">
              <span class="text-xs font-medium text-rm-muted block mb-1">Currency</span>
              <InputText v-model="form.currency" class="text-sm w-full" placeholder="USD" />
            </label>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="text-xs font-medium text-rm-muted block mb-1">Date</span>
              <InputText v-model="form.date" class="text-sm w-full" placeholder="YYYY-MM-DD" />
            </label>
            <label class="block">
              <span class="text-xs font-medium text-rm-muted block mb-1">Vendor / Payee</span>
              <InputText v-model="form.vendor" class="text-sm w-full" placeholder="Company or name" />
            </label>
          </div>
          <label class="block">
            <span class="text-xs font-medium text-rm-muted block mb-1">Invoice / Receipt #</span>
            <InputText v-model="form.reference" class="text-sm w-full" placeholder="Optional reference number" />
          </label>
        </template>
        <label class="block">
          <span class="text-xs font-medium text-rm-muted block mb-1">URL (optional)</span>
          <InputText v-model="form.url" class="text-sm w-full font-mono" type="url" placeholder="https://..." />
        </label>
        <label class="block">
          <span class="text-xs font-medium text-rm-muted block mb-1">Password (optional)</span>
          <div class="flex gap-2">
            <Password
              v-model="form.password"
              class="text-sm flex-1"
              placeholder="••••••"
              :feedback="false"
              toggleMask
            />
            <Button
              v-if="form.password"
              variant="text"
              size="small"
              title="Copy password"
              @click="copyToClipboard(form.password)"
            >
              Copy
            </Button>
          </div>
        </label>
        <label class="block">
          <span class="text-xs font-medium text-rm-muted block mb-1">Notes / content</span>
          <Textarea v-model="form.content" class="text-sm w-full" rows="4" placeholder="Any notes, instructions, or details..." />
        </label>
        <label class="block">
          <span class="text-xs font-medium text-rm-muted block mb-1">Tags (optional, comma-separated)</span>
          <InputText v-model="form.tagsStr" class="text-sm w-full" placeholder="staging, login, docs" />
        </label>
      </div>
      <template #footer>
        <Button variant="text" size="small" @click="pageModalVisible = false">Cancel</Button>
        <Button severity="primary" size="small" :disabled="!form.title?.trim()" @click="savePage">
          {{ editingPage ? 'Save' : 'Add' }}
        </Button>
      </template>
    </Dialog>
  </ExtensionLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import ExtensionLayout from '../../components/detail/ExtensionLayout.vue';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import Password from 'primevue/password';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useApi } from '../../composables/useApi';

const props = defineProps({ info: { type: Object, default: null } });

const api = useApi();

const PREF_PREFIX = 'ext.wiki.';

const PAGE_TYPES = [
  { label: 'General', value: 'general' },
  { label: 'Receipt', value: 'receipt' },
  { label: 'Billing', value: 'billing' },
];

const pageTypeOptions = PAGE_TYPES;
const filterTypeOptions = [{ label: 'All types', value: '' }, ...PAGE_TYPES];

const pages = ref([]);
const pageModalVisible = ref(false);
const editingPage = ref(null);
const expandedId = ref(null);
const filterType = ref('');
const form = ref({
  type: 'general',
  title: '',
  url: '',
  password: '',
  content: '',
  tagsStr: '',
  amount: '',
  currency: 'USD',
  date: '',
  vendor: '',
  reference: '',
});

const projectPath = computed(() => props.info?.path || '');

const filteredPages = computed(() => {
  const list = pages.value;
  if (!filterType.value) return list;
  return list.filter((p) => (p.type || 'general') === filterType.value);
});

const sortedFilteredPages = computed(() => {
  const list = [...filteredPages.value];
  list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  return list;
});

function pageTypeLabel(type) {
  return PAGE_TYPES.find((t) => t.value === type)?.label || type;
}

function typeBadgeClass(type) {
  if (type === 'receipt') return 'bg-rm-accent/15 text-rm-accent';
  if (type === 'billing') return 'bg-rm-surface-hover text-rm-muted';
  return 'bg-rm-surface-hover text-rm-muted';
}

function formatAmount(val) {
  if (val == null || val === '') return '';
  const n = Number(val);
  if (Number.isNaN(n)) return String(val);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getPrefKey() {
  const path = projectPath.value || 'default';
  return `${PREF_PREFIX}${encodeURIComponent(path)}`;
}

function preview(text, max = 80) {
  if (!text || typeof text !== 'string') return '';
  const one = text.replace(/\s+/g, ' ').trim();
  return one.length <= max ? one : one.slice(0, max) + '…';
}

async function load() {
  if (!api.getPreference) return;
  try {
    const key = getPrefKey();
    const raw = await api.getPreference(key);
    const data = raw && typeof raw === 'string' ? JSON.parse(raw) : raw;
    pages.value = Array.isArray(data?.pages) ? data.pages : [];
  } catch (_) {
    pages.value = [];
  }
}

async function save() {
  if (!api.setPreference) return;
  try {
    await api.setPreference(getPrefKey(), JSON.stringify({ pages: pages.value }));
  } catch (_) {}
}

function openUrl(url) {
  if (url && api.openUrl) api.openUrl(url);
}

async function copyToClipboard(text) {
  if (!text || typeof text !== 'string') return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch (_) {}
}

function openAddPage() {
  editingPage.value = null;
  form.value = {
    type: 'general',
    title: '',
    url: '',
    password: '',
    content: '',
    tagsStr: '',
    amount: '',
    currency: 'USD',
    date: '',
    vendor: '',
    reference: '',
  };
  pageModalVisible.value = true;
}

function openEditPage(p) {
  editingPage.value = p;
  form.value = {
    type: p.type || 'general',
    title: p.title || '',
    url: p.url || '',
    password: p.password || '',
    content: p.content || '',
    tagsStr: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
    amount: p.amount != null ? String(p.amount) : '',
    currency: p.currency || 'USD',
    date: p.date || '',
    vendor: p.vendor || '',
    reference: p.reference || '',
  };
  pageModalVisible.value = true;
}

function savePage() {
  const title = form.value.title?.trim();
  if (!title) return;
  const tags = form.value.tagsStr
    ? form.value.tagsStr.split(',').map((t) => t.trim()).filter(Boolean)
    : [];
  const type = form.value.type || 'general';
  const payload = {
    title,
    type: type !== 'general' ? type : undefined,
    url: form.value.url?.trim() || undefined,
    password: form.value.password?.trim() || undefined,
    content: form.value.content?.trim() || undefined,
    tags: tags.length ? tags : undefined,
  };
  if (type === 'receipt' || type === 'billing') {
    const amountVal = form.value.amount?.trim();
    if (amountVal !== '') {
      const n = Number(amountVal);
      payload.amount = Number.isNaN(n) ? amountVal : n;
    }
    if (form.value.currency?.trim()) payload.currency = form.value.currency.trim();
    if (form.value.date?.trim()) payload.date = form.value.date.trim();
    if (form.value.vendor?.trim()) payload.vendor = form.value.vendor.trim();
    if (form.value.reference?.trim()) payload.reference = form.value.reference.trim();
  }
  if (editingPage.value) {
    const idx = pages.value.findIndex((x) => x.id === editingPage.value.id);
    if (idx !== -1) {
      pages.value = pages.value.map((page, i) => (i === idx ? { ...page, ...payload } : page));
    }
  } else {
    pages.value = [
      ...pages.value,
      {
        id: `wiki-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        ...payload,
        createdAt: new Date().toISOString(),
      },
    ];
  }
  save();
  pageModalVisible.value = false;
  editingPage.value = null;
}

function confirmDelete(p) {
  if (typeof window !== 'undefined' && window.confirm && !window.confirm(`Delete "${p.title || 'Untitled'}"?`)) return;
  pages.value = pages.value.filter((x) => x.id !== p.id);
  save();
}

watch(projectPath, load, { immediate: true });
</script>

<style scoped>
.wiki-ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.wiki-title {
  font-weight: 500;
}
.empty-state-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 0.75rem;
}
.empty-state-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
  margin: 0 0 0.25rem;
}
.empty-state-body {
  margin: 0;
}
.empty-state-actions {
  margin-top: 0.75rem;
}
.wiki-list :deep(.p-panel-content-wrapper),
.wiki-list :deep(.p-panel-content) {
  border-top: none;
}
</style>
