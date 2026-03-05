<template>
  <section class="card mb-6 detail-tab-panel detail-bookmarks-card flex flex-col min-h-0" data-detail-tab="bookmarks">
    <div class="bookmarks-toolbar rounded-rm border border-rm-border bg-rm-surface/50 px-4 py-3 mb-5 flex flex-wrap items-center gap-4">
      <p class="text-sm text-rm-muted m-0 flex-1 min-w-0 max-w-xl">
        Save and organize links for this project. Docs, dashboards, CI, and more.
      </p>
      <Button severity="primary" size="small" @click="openAddBookmark">
        Add bookmark
      </Button>
    </div>

    <Panel class="bookmarks-list flex-1">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full">
          <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Bookmarks</h3>
          <span v-if="bookmarks.length" class="text-xs text-rm-muted">{{ bookmarks.length }} bookmark{{ bookmarks.length === 1 ? '' : 's' }}</span>
        </div>
      </template>

      <div v-if="bookmarks.length === 0" class="empty-state py-12 px-4">
        <div class="empty-state-icon">
          <svg class="w-10 h-10 text-rm-muted opacity-60" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h4 class="empty-state-title">No bookmarks yet</h4>
        <p class="empty-state-body text-sm text-rm-muted m-0">Add links you use often for this project.</p>
        <div class="empty-state-actions mt-3">
          <Button severity="primary" size="small" @click="openAddBookmark">Add bookmark</Button>
        </div>
      </div>

      <ul v-else class="bookmarks-ul divide-y divide-rm-border">
        <li
          v-for="b in sortedBookmarks"
          :key="b.id"
          class="bookmark-row flex items-center gap-3 px-4 py-3 min-w-0 hover:bg-rm-surface-hover/50"
        >
          <div class="min-w-0 flex-1">
            <a
              :href="b.url"
              target="_blank"
              rel="noopener noreferrer"
              class="bookmark-title font-medium text-rm-text hover:text-rm-accent truncate block"
              @click.prevent="openUrl(b.url)"
            >
              {{ b.title || b.url }}
            </a>
            <p class="bookmark-url text-xs text-rm-muted truncate m-0 mt-0.5">{{ b.url }}</p>
            <div v-if="b.folder || (b.tags && b.tags.length)" class="flex flex-wrap gap-1.5 mt-1.5">
              <span v-if="b.folder" class="px-1.5 py-0.5 rounded text-xs bg-rm-surface-hover text-rm-muted">{{ b.folder }}</span>
              <span v-for="tag in (b.tags || [])" :key="tag" class="px-1.5 py-0.5 rounded text-xs bg-rm-accent/15 text-rm-accent">{{ tag }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <Button
              variant="text"
              size="small"
              class="p-2 min-w-0"
              title="Open in browser"
              aria-label="Open"
              @click="openUrl(b.url)"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </Button>
            <Button
              variant="text"
              size="small"
              class="p-2 min-w-0 text-rm-muted hover:text-rm-text"
              title="Edit"
              aria-label="Edit"
              @click="openEditBookmark(b)"
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
              @click="confirmDelete(b)"
            >
              ×
            </Button>
          </div>
        </li>
      </ul>
    </Panel>

    <!-- Browser extension: install from here -->
    <Panel class="bookmarks-extension-panel mt-5">
      <template #header>
        <h3 class="text-sm font-semibold text-rm-text m-0 tracking-tight">Browser extension</h3>
      </template>
      <p class="text-sm text-rm-muted m-0 mb-3">
        Add the current tab to this project's bookmarks from Chrome or Edge.
      </p>
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <Button
          v-if="bookmarksExtensionPath && api.launchBrowserWithBookmarksExtension"
          severity="primary"
          size="small"
          :disabled="extensionLaunching"
          @click="oneClickInstall"
        >
          {{ extensionLaunching ? 'Opening…' : '1-Click Install' }}
        </Button>
        <Button
          v-if="bookmarksExtensionPath && api.openBookmarksExtensionSetup"
          variant="secondary"
          size="small"
          @click="api.openBookmarksExtensionSetup(bookmarksExtensionPath)"
        >
          Set up (Load unpacked)
        </Button>
        <Button
          v-if="bookmarksExtensionPath && api.openPathInFinder"
          variant="text"
          size="small"
          @click="api.openPathInFinder(bookmarksExtensionPath)"
        >
          Open folder only
        </Button>
      </div>
      <p v-if="extensionMessage" class="text-xs m-0 mb-2" :class="extensionError ? 'text-red-500' : 'text-rm-muted'">
        {{ extensionMessage }}
      </p>
      <p class="text-xs text-rm-muted m-0 mb-1">
        <strong>1-Click Install</strong> opens a separate Chrome (or Edge) window with the extension already loaded. In that window, open the puzzle-piece menu → pin <strong>Release Manager Bookmarks</strong> → then click it on any page to add a bookmark.
      </p>
      <p class="text-xs text-rm-muted m-0">
        Extension talks to this app at <code class="bg-rm-surface-hover px-1 rounded">http://127.0.0.1:{{ bookmarksReceiverPort || '…' }}/bookmarks</code>
      </p>
    </Panel>

    <!-- Add / Edit bookmark modal -->
    <Dialog
      v-model:visible="bookmarkModalVisible"
      :header="editingBookmark ? 'Edit bookmark' : 'Add bookmark'"
      :style="{ width: '28rem' }"
      :modal="true"
      :dismissableMask="true"
      class="bookmarks-modal max-w-[95vw]"
      @hide="editingBookmark = null"
    >
      <div class="space-y-3">
        <label class="block">
          <span class="text-xs font-medium text-rm-muted block mb-1">Title</span>
          <InputText v-model="form.title" class="text-sm w-full" placeholder="e.g. API docs" />
        </label>
        <label class="block">
          <span class="text-xs font-medium text-rm-muted block mb-1">URL</span>
          <InputText v-model="form.url" class="text-sm w-full font-mono" type="url" placeholder="https://..." />
        </label>
        <label class="block">
          <span class="text-xs font-medium text-rm-muted block mb-1">Folder (optional)</span>
          <InputText v-model="form.folder" class="text-sm w-full" placeholder="e.g. Docs" />
        </label>
        <label class="block">
          <span class="text-xs font-medium text-rm-muted block mb-1">Tags (optional, comma-separated)</span>
          <InputText v-model="form.tagsStr" class="text-sm w-full" placeholder="api, reference" />
        </label>
        <label class="block">
          <span class="text-xs font-medium text-rm-muted block mb-1">Notes (optional)</span>
          <Textarea v-model="form.notes" class="text-sm w-full" rows="2" placeholder="..." />
        </label>
      </div>
      <template #footer>
        <Button variant="text" size="small" @click="bookmarkModalVisible = false">Cancel</Button>
        <Button severity="primary" size="small" :disabled="!form.url?.trim()" @click="saveBookmark">
          {{ editingBookmark ? 'Save' : 'Add' }}
        </Button>
      </template>
    </Dialog>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Panel from 'primevue/panel';
import Textarea from 'primevue/textarea';
import { useApi } from '../../composables/useApi';

const props = defineProps({ info: { type: Object, default: null } });

const api = useApi();

const PREF_PREFIX = 'ext.bookmarks.';

const bookmarks = ref([]);
const bookmarkModalVisible = ref(false);
const editingBookmark = ref(null);
const bookmarksReceiverPort = ref(null);
const bookmarksExtensionPath = ref('');
const extensionLaunching = ref(false);
const extensionMessage = ref('');
const extensionError = ref(false);
const form = ref({
  title: '',
  url: '',
  folder: '',
  tagsStr: '',
  notes: '',
});

const projectPath = computed(() => props.info?.path || '');

const sortedBookmarks = computed(() => {
  const list = [...bookmarks.value];
  list.sort((a, b) => {
    const fa = (a.folder || '').toLowerCase();
    const fb = (b.folder || '').toLowerCase();
    if (fa !== fb) return fa.localeCompare(fb);
    return (a.title || a.url).localeCompare(b.title || b.url);
  });
  return list;
});

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
    bookmarks.value = Array.isArray(data?.bookmarks) ? data.bookmarks : [];
  } catch (_) {
    bookmarks.value = [];
  }
}

async function save() {
  if (!api.setPreference) return;
  try {
    await api.setPreference(getPrefKey(), JSON.stringify({ bookmarks: bookmarks.value }));
  } catch (_) {}
}

function openUrl(url) {
  if (url && api.openUrl) api.openUrl(url);
}

function openAddBookmark() {
  editingBookmark.value = null;
  form.value = { title: '', url: '', folder: '', tagsStr: '', notes: '' };
  bookmarkModalVisible.value = true;
}

function openEditBookmark(b) {
  editingBookmark.value = b;
  form.value = {
    title: b.title || '',
    url: b.url || '',
    folder: b.folder || '',
    tagsStr: Array.isArray(b.tags) ? b.tags.join(', ') : (b.tags || ''),
    notes: b.notes || '',
  };
  bookmarkModalVisible.value = true;
}

function saveBookmark() {
  const url = form.value.url?.trim();
  if (!url) return;
  const tags = form.value.tagsStr
    ? form.value.tagsStr.split(',').map((t) => t.trim()).filter(Boolean)
    : [];
  const payload = {
    title: form.value.title?.trim() || undefined,
    url,
    folder: form.value.folder?.trim() || undefined,
    tags: tags.length ? tags : undefined,
    notes: form.value.notes?.trim() || undefined,
  };
  if (editingBookmark.value) {
    const idx = bookmarks.value.findIndex((x) => x.id === editingBookmark.value.id);
    if (idx !== -1) {
      bookmarks.value = bookmarks.value.map((b, i) => (i === idx ? { ...b, ...payload } : b));
    }
  } else {
    bookmarks.value = [
      ...bookmarks.value,
      {
        id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        ...payload,
        createdAt: new Date().toISOString(),
      },
    ];
  }
  save();
  bookmarkModalVisible.value = false;
  editingBookmark.value = null;
}

function confirmDelete(b) {
  if (typeof window !== 'undefined' && window.confirm && !window.confirm(`Remove "${b.title || b.url}"?`)) return;
  bookmarks.value = bookmarks.value.filter((x) => x.id !== b.id);
  save();
}

watch(projectPath, load, { immediate: true });

async function loadExtensionInfo() {
  try {
    const [port, path] = await Promise.all([
      api.getBookmarksReceiverPort?.(),
      api.getBookmarksExtensionPath?.(),
    ]);
    if (port != null) bookmarksReceiverPort.value = port;
    if (path != null) bookmarksExtensionPath.value = path;
  } catch (_) {}
}
loadExtensionInfo();

async function oneClickInstall() {
  const extPath = bookmarksExtensionPath.value;
  if (!extPath || !api.launchBrowserWithBookmarksExtension) return;
  extensionLaunching.value = true;
  extensionMessage.value = '';
  extensionError.value = false;
  try {
    const result = await api.launchBrowserWithBookmarksExtension(extPath);
    if (result?.ok) {
      extensionMessage.value = `A separate ${result.browser} window opened with the extension. Pin “Release Manager Bookmarks” from the puzzle-piece menu, then click it on any page to add a bookmark.`;
    } else {
      extensionError.value = true;
      extensionMessage.value = result?.error || 'Could not open Chrome or Edge.';
    }
  } catch (e) {
    extensionError.value = true;
    extensionMessage.value = e?.message || 'Something went wrong.';
  } finally {
    extensionLaunching.value = false;
  }
}
</script>

<style scoped>
.bookmarks-ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.bookmark-title {
  text-decoration: none;
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
</style>
