<template>
  <section class="card mb-6 detail-tab-panel detail-markdown-card flex flex-col min-h-0" data-detail-tab="markdown">
    <div class="markdown-toolbar rounded-rm border border-rm-border bg-rm-surface/50 px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
      <p class="text-sm text-rm-muted m-0 flex-1 min-w-0">
        Browse and edit Markdown documentation in this project. Select a file to view or edit.
      </p>
      <div class="markdown-actions flex items-center gap-2 flex-wrap relative">
        <Button
          v-if="selectedPath && contentDirty"
          severity="primary"
          size="small"
          :loading="saving"
          :disabled="saving"
          aria-label="Save file"
          @click="saveContent"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </Button>
        <Button
          v-if="selectedPath"
          severity="secondary"
          size="small"
          icon="pi pi-external-link"
          v-tooltip.top="'Open in external editor'"
          aria-label="Open in editor"
          @click="openInEditor"
        />
        <Button
          v-if="selectedPath"
          severity="secondary"
          size="small"
          icon="pi pi-download"
          v-tooltip.top="'Export document'"
          aria-haspopup="true"
          aria-controls="markdown-export-menu"
          aria-label="Export"
          @click="exportMenuRef?.toggle($event)"
        />
        <Menu
          id="markdown-export-menu"
          ref="exportMenuRef"
          :model="exportMenuItems"
          :popup="true"
          class="markdown-export-menu"
        />
      </div>
    </div>

    <div v-if="saveError" class="markdown-save-error rounded-rm border border-red-500/50 bg-red-500/10 px-4 py-2 mb-4 text-sm text-red-400">
      {{ saveError }}
    </div>

    <div class="markdown-body flex flex-1 min-h-0 gap-4">
      <div class="markdown-sidebar border border-rm-border rounded-rm bg-rm-surface/30 flex flex-col w-56 shrink-0 min-h-0">
        <div class="markdown-sidebar-header px-3 py-2 border-b border-rm-border text-sm font-medium text-rm-text">
          Markdown files
        </div>
        <Message v-if="loading" severity="secondary" class="mx-3 my-4 flex items-center gap-2 text-sm">
          <ProgressSpinner aria-hidden="true" class="!w-5 !h-5" />
          Loading…
        </Message>
        <Message v-else-if="error" severity="warn" class="mx-3 my-4 text-sm">{{ error }}</Message>
        <template v-else>
          <div class="markdown-file-tree overflow-y-auto flex-1 py-1 text-sm">
            <template v-if="fileTree.length">
              <MarkdownFileTreeNode
                v-for="node in fileTree"
                :key="node.path || node.name"
                :node="node"
                :selected-path="selectedPath"
                :expanded-folders="expandedFolders"
                @select="selectedPath = $event"
                @toggle-folder="toggleFolder"
              />
            </template>
            <Message v-else severity="secondary" class="mx-3 my-4 text-sm">No .md files found</Message>
          </div>
          <div v-if="selectedPath && docTags.length > 0" class="markdown-tags-section border-t border-rm-border px-3 py-2 shrink-0">
            <div class="text-xs font-medium text-rm-muted mb-1.5">Tags</div>
            <div class="flex flex-wrap gap-1">
              <Button
                v-for="tag in docTags"
                :key="tag"
                variant="text"
                size="small"
                class="markdown-tag px-2 py-0.5 min-w-0 rounded text-xs bg-rm-surface text-rm-muted hover:text-rm-text"
                :class="{ 'ring-1 ring-rm-accent': tagFilter === tag }"
                @click="toggleTagFilter(tag)"
              >
                {{ tag }}
              </Button>
            </div>
          </div>
        </template>
      </div>

      <div class="markdown-main flex-1 flex flex-col min-w-0 min-h-0 border border-rm-border rounded-rm bg-rm-surface/20 overflow-hidden">
        <template v-if="selectedPath">
          <div class="markdown-view-tabs flex gap-1 px-3 py-2 border-b border-rm-border bg-rm-surface/30 shrink-0">
            <SelectButton v-model="viewMode" :options="viewModeOptions" option-label="label" option-value="value" class="markdown-view-select" />
          </div>
          <div v-if="contentError" class="px-4 py-2 text-sm text-red-400">{{ contentError }}</div>
          <div class="markdown-content-area flex-1 flex min-h-0 overflow-hidden">
            <Splitter
              v-if="viewMode === 'split'"
              class="markdown-split flex-1 min-h-0 border-0 bg-transparent"
              :gutter-size="6"
              state-key="markdown-split-preview"
              state-storage="local"
            >
              <SplitterPanel :size="50" :min-size="15" class="flex flex-col min-w-0 overflow-hidden">
                <div class="markdown-editor-wrap flex-1 min-w-0 flex flex-col overflow-hidden">
                  <div
                    class="markdown-editor-toolbar flex items-center gap-0.5 px-2 py-1.5 border-b border-rm-border bg-rm-surface/50 shrink-0 flex-wrap"
                    @mousedown.prevent
                  >
                    <Button variant="text" size="small" class="markdown-tb-btn px-1.5 py-1 min-w-0 rounded hover:bg-rm-surface text-sm font-bold text-rm-muted hover:text-rm-text" title="Bold" aria-label="Bold" @click="toolbar.bold()">B</Button>
                    <Button variant="text" size="small" class="markdown-tb-btn px-1.5 py-1 min-w-0 rounded hover:bg-rm-surface text-sm italic text-rm-muted hover:text-rm-text" title="Italic" aria-label="Italic" @click="toolbar.italic()">I</Button>
                    <Button variant="text" size="small" class="markdown-tb-btn px-1.5 py-1 min-w-0 rounded hover:bg-rm-surface text-sm text-rm-muted hover:text-rm-text line-through" title="Strikethrough" aria-label="Strikethrough" @click="toolbar.strikethrough()">S</Button>
                    <span class="w-px h-5 bg-rm-border mx-0.5 shrink-0" aria-hidden="true" />
                    <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Link" aria-label="Link" @click="toolbar.link()"><i class="pi pi-link text-sm text-rm-muted hover:text-rm-text" /></Button>
                    <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Image" aria-label="Image" @click="toolbar.image()"><i class="pi pi-image text-sm text-rm-muted hover:text-rm-text" /></Button>
                    <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Inline code" aria-label="Inline code" @click="toolbar.code()"><i class="pi pi-code text-sm text-rm-muted hover:text-rm-text" /></Button>
                    <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Code block" aria-label="Code block" @click="toolbar.codeBlock()"><i class="pi pi-align-left text-sm text-rm-muted hover:text-rm-text" /></Button>
                    <span class="w-px h-5 bg-rm-border mx-0.5 shrink-0" aria-hidden="true" />
                    <Button variant="text" size="small" class="markdown-tb-btn px-1.5 py-1 min-w-0 rounded hover:bg-rm-surface text-xs font-semibold text-rm-muted hover:text-rm-text" title="Heading 1" aria-label="Heading 1" @click="toolbar.heading(1)">H1</Button>
                    <Button variant="text" size="small" class="markdown-tb-btn px-1.5 py-1 min-w-0 rounded hover:bg-rm-surface text-xs font-semibold text-rm-muted hover:text-rm-text" title="Heading 2" aria-label="Heading 2" @click="toolbar.heading(2)">H2</Button>
                    <Button variant="text" size="small" class="markdown-tb-btn px-1.5 py-1 min-w-0 rounded hover:bg-rm-surface text-xs font-semibold text-rm-muted hover:text-rm-text" title="Heading 3" aria-label="Heading 3" @click="toolbar.heading(3)">H3</Button>
                    <span class="w-px h-5 bg-rm-border mx-0.5 shrink-0" aria-hidden="true" />
                    <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Bullet list" aria-label="Bullet list" @click="toolbar.bulletList()"><i class="pi pi-list text-sm text-rm-muted hover:text-rm-text" /></Button>
                    <Button variant="text" size="small" class="markdown-tb-btn px-1.5 py-1 min-w-0 rounded hover:bg-rm-surface text-xs text-rm-muted hover:text-rm-text" title="Numbered list" aria-label="Numbered list" @click="toolbar.numberedList()">1.</Button>
                    <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Task list" aria-label="Task list" @click="toolbar.taskList()"><i class="pi pi-check-square text-sm text-rm-muted hover:text-rm-text" /></Button>
                    <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Table" aria-label="Insert table" @click="toolbar.insertTable()"><i class="pi pi-table text-sm text-rm-muted hover:text-rm-text" /></Button>
                    <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Footnote" aria-label="Footnote" @click="toolbar.footnote()"><i class="pi pi-bookmark text-sm text-rm-muted hover:text-rm-text" /></Button>
                    <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Blockquote" aria-label="Blockquote" @click="toolbar.blockquote()"><i class="pi pi-comment text-sm text-rm-muted hover:text-rm-text" /></Button>
                    <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Horizontal rule" aria-label="Horizontal rule" @click="toolbar.horizontalRule()"><i class="pi pi-minus text-sm text-rm-muted hover:text-rm-text" /></Button>
                  </div>
                  <Textarea
                    ref="editorTextareaRef"
                    v-model="content"
                    class="markdown-editor flex-1 w-full min-h-[200px] p-4 text-sm font-mono resize-none"
                    spellcheck="false"
                    :auto-resize="false"
                    @input="contentDirty = true"
                  />
                </div>
              </SplitterPanel>
              <SplitterPanel :size="50" :min-size="15" class="flex flex-col min-w-0 overflow-hidden">
                <div
                  ref="previewContainerRef"
                  class="markdown-preview flex-1 min-w-0 overflow-auto p-4 text-sm text-rm-text prose prose-invert max-w-none"
                  v-html="previewHtml"
                  @click="onPreviewClick"
                  @mouseover="onPreviewMouseOver"
                  @mouseout="onPreviewMouseOut"
                />
              </SplitterPanel>
            </Splitter>
            <template v-else>
              <div
                v-show="viewMode === 'edit'"
                class="markdown-editor-wrap flex-1 min-w-0 flex flex-col border-r-0"
              >
                <div
                  class="markdown-editor-toolbar flex items-center gap-0.5 px-2 py-1.5 border-b border-rm-border bg-rm-surface/50 shrink-0 flex-wrap"
                  @mousedown.prevent
                >
                  <Button variant="text" size="small" class="markdown-tb-btn px-1.5 py-1 min-w-0 rounded hover:bg-rm-surface text-sm font-bold text-rm-muted hover:text-rm-text" title="Bold" aria-label="Bold" @click="toolbar.bold()">B</Button>
                  <Button variant="text" size="small" class="markdown-tb-btn px-1.5 py-1 min-w-0 rounded hover:bg-rm-surface text-sm italic text-rm-muted hover:text-rm-text" title="Italic" aria-label="Italic" @click="toolbar.italic()">I</Button>
                  <Button variant="text" size="small" class="markdown-tb-btn px-1.5 py-1 min-w-0 rounded hover:bg-rm-surface text-sm text-rm-muted hover:text-rm-text line-through" title="Strikethrough" aria-label="Strikethrough" @click="toolbar.strikethrough()">S</Button>
                  <span class="w-px h-5 bg-rm-border mx-0.5 shrink-0" aria-hidden="true" />
                  <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Link" aria-label="Link" @click="toolbar.link()"><i class="pi pi-link text-sm text-rm-muted hover:text-rm-text" /></Button>
                  <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Image" aria-label="Image" @click="toolbar.image()"><i class="pi pi-image text-sm text-rm-muted hover:text-rm-text" /></Button>
                  <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Inline code" aria-label="Inline code" @click="toolbar.code()"><i class="pi pi-code text-sm text-rm-muted hover:text-rm-text" /></Button>
                  <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Code block" aria-label="Code block" @click="toolbar.codeBlock()"><i class="pi pi-align-left text-sm text-rm-muted hover:text-rm-text" /></Button>
                  <span class="w-px h-5 bg-rm-border mx-0.5 shrink-0" aria-hidden="true" />
                  <Button variant="text" size="small" class="markdown-tb-btn px-1.5 py-1 min-w-0 rounded hover:bg-rm-surface text-xs font-semibold text-rm-muted hover:text-rm-text" title="Heading 1" aria-label="Heading 1" @click="toolbar.heading(1)">H1</Button>
                  <Button variant="text" size="small" class="markdown-tb-btn px-1.5 py-1 min-w-0 rounded hover:bg-rm-surface text-xs font-semibold text-rm-muted hover:text-rm-text" title="Heading 2" aria-label="Heading 2" @click="toolbar.heading(2)">H2</Button>
                  <Button variant="text" size="small" class="markdown-tb-btn px-1.5 py-1 min-w-0 rounded hover:bg-rm-surface text-xs font-semibold text-rm-muted hover:text-rm-text" title="Heading 3" aria-label="Heading 3" @click="toolbar.heading(3)">H3</Button>
                  <span class="w-px h-5 bg-rm-border mx-0.5 shrink-0" aria-hidden="true" />
                  <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Bullet list" aria-label="Bullet list" @click="toolbar.bulletList()"><i class="pi pi-list text-sm text-rm-muted hover:text-rm-text" /></Button>
                  <Button variant="text" size="small" class="markdown-tb-btn px-1.5 py-1 min-w-0 rounded hover:bg-rm-surface text-xs text-rm-muted hover:text-rm-text" title="Numbered list" aria-label="Numbered list" @click="toolbar.numberedList()">1.</Button>
                  <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Task list" aria-label="Task list" @click="toolbar.taskList()"><i class="pi pi-check-square text-sm text-rm-muted hover:text-rm-text" /></Button>
                  <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Table" aria-label="Insert table" @click="toolbar.insertTable()"><i class="pi pi-table text-sm text-rm-muted hover:text-rm-text" /></Button>
                  <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Footnote" aria-label="Footnote" @click="toolbar.footnote()"><i class="pi pi-bookmark text-sm text-rm-muted hover:text-rm-text" /></Button>
                  <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Blockquote" aria-label="Blockquote" @click="toolbar.blockquote()"><i class="pi pi-comment text-sm text-rm-muted hover:text-rm-text" /></Button>
                  <Button variant="text" size="small" class="markdown-tb-btn p-1.5 min-w-0 rounded hover:bg-rm-surface" title="Horizontal rule" aria-label="Horizontal rule" @click="toolbar.horizontalRule()"><i class="pi pi-minus text-sm text-rm-muted hover:text-rm-text" /></Button>
                </div>
                <Textarea
                  ref="editorTextareaRef"
                  v-model="content"
                  class="markdown-editor flex-1 w-full min-h-[200px] p-4 text-sm font-mono resize-none"
                  spellcheck="false"
                  :auto-resize="false"
                  @input="contentDirty = true"
                />
              </div>
              <div
                ref="previewContainerRef"
                v-show="viewMode === 'preview'"
                class="markdown-preview flex-1 min-w-0 overflow-auto p-4 text-sm text-rm-text prose prose-invert max-w-none"
                v-html="previewHtml"
                @click="onPreviewClick"
                @mouseover="onPreviewMouseOver"
                @mouseout="onPreviewMouseOut"
              />
            </template>
          </div>
        </template>
        <div v-else class="markdown-empty flex flex-1 items-center justify-center py-12 text-rm-muted text-sm">
          Select a file from the list
        </div>
      </div>

      <!-- Outline sidebar -->
      <div
        v-if="selectedPath && outlineHeadings.length > 0"
        class="markdown-outline-sidebar border border-rm-border rounded-rm bg-rm-surface/30 flex flex-col w-48 shrink-0 min-h-0"
      >
        <div class="markdown-sidebar-header px-3 py-2 border-b border-rm-border text-sm font-medium text-rm-text">
          Outline
        </div>
        <nav class="markdown-outline-list overflow-y-auto flex-1 py-2 px-2 text-sm" aria-label="Document outline">
          <Button
            v-for="h in outlineHeadings"
            :key="h.id"
            variant="text"
            size="small"
            class="markdown-outline-item block w-full justify-start truncate py-0.5 rounded min-w-0 text-rm-muted hover:text-rm-text hover:bg-rm-surface/80"
            :class="'markdown-outline-h' + h.level"
            :style="{ paddingLeft: (h.level - 1) * 8 + 4 + 'px' }"
            @click="scrollToHeading(h.id)"
          >
            {{ h.text }}
          </Button>
        </nav>
      </div>
    </div>

    <!-- Link preview popover -->
    <Teleport to="body">
      <div
        v-if="linkPreview"
        class="markdown-link-preview fixed z-[100] max-w-sm rounded-rm border border-rm-border bg-rm-surface shadow-xl p-3 text-sm"
        :style="{ left: linkPreview.x + 'px', top: linkPreview.y + 'px' }"
        @mouseenter="cancelLinkPreviewHide"
        @mouseleave="linkPreviewLeave"
      >
        <Message v-if="linkPreview.loading" severity="secondary" class="text-sm">Loading…</Message>
        <template v-else-if="linkPreview.title || linkPreview.description">
          <div v-if="linkPreview.title" class="font-medium text-rm-text mb-1">{{ linkPreview.title }}</div>
          <div v-if="linkPreview.description" class="text-rm-muted text-xs line-clamp-3">{{ linkPreview.description }}</div>
        </template>
        <div v-else class="text-rm-muted">{{ linkPreview.url }}</div>
      </div>
    </Teleport>

    <!-- Image lightbox -->
    <Teleport to="body">
      <div
        v-if="lightboxSrc"
        class="markdown-lightbox fixed inset-0 z-[101] flex items-center justify-center bg-black/80 p-4"
        role="button"
        tabindex="0"
        aria-label="Close"
        @click.self="lightboxSrc = null"
        @keydown.escape="lightboxSrc = null"
      >
        <img :src="lightboxSrc" class="max-w-full max-h-full object-contain" alt="Enlarged" @click.stop />
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import mermaid from 'mermaid';
import { renderGfmToHtml, parseHeadings } from '../../utils/renderGfm';
import { parseTagsFromMarkdown } from './markdownTags';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import SelectButton from 'primevue/selectbutton';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Textarea from 'primevue/textarea';
import { useApi } from '../../composables/useApi';
import { buildFileTree } from './fileTree';
import MarkdownFileTreeNode from './MarkdownFileTreeNode.vue';
import { useMarkdown } from './useMarkdown';
import { useMarkdownToolbar } from './useMarkdownToolbar';

const props = defineProps({
  info: { type: Object, default: () => ({}) },
});

const getInfo = computed(() => props.info);
const api = useApi();

const {
  markdownFiles,
  loading,
  error,
  selectedPath,
  content,
  contentError,
  contentDirty,
  saving,
  saveError,
  dirPath,
  loadContent,
  saveContent,
  openInEditor,
} = useMarkdown(getInfo);

const viewMode = ref('split');
const viewModeOptions = [
  { label: 'Preview', value: 'preview' },
  { label: 'Edit', value: 'edit' },
  { label: 'Split', value: 'split' },
];

const editorTextareaRef = ref(null);
const previewContainerRef = ref(null);
const toolbar = useMarkdownToolbar(content, editorTextareaRef, () => { contentDirty.value = true; });

// Outline
const outlineHeadings = computed(() => parseHeadings(content.value || ''));

function scrollToHeading(id) {
  nextTick(() => {
    const container = previewContainerRef.value;
    if (!container) return;
    const el = container.querySelector('#' + CSS.escape(id));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// Tags: from current doc; optional filter by tag (files that contain tag)
const docTags = computed(() => parseTagsFromMarkdown(content.value || ''));
const tagFilter = ref(null);
const tagFilterFiles = ref([]);
const filteredMarkdownFiles = computed(() =>
  tagFilter.value ? tagFilterFiles.value : markdownFiles.value
);

// File tree (folders + files) and expanded state
const fileTree = computed(() => buildFileTree(filteredMarkdownFiles.value || []));

function collectFolderKeys(nodes, out = new Set()) {
  for (const n of nodes) {
    if (n.folderKey) {
      out.add(n.folderKey);
      if (n.children?.length) collectFolderKeys(n.children, out);
    }
  }
  return out;
}

const expandedFolders = ref({});

watch(
  fileTree,
  (tree) => {
    const keys = collectFolderKeys(tree);
    expandedFolders.value = { ...expandedFolders.value };
    keys.forEach((k) => {
      if (expandedFolders.value[k] === undefined) expandedFolders.value[k] = true;
    });
  },
  { immediate: true }
);

function toggleFolder(key) {
  expandedFolders.value = { ...expandedFolders.value, [key]: !expandedFolders.value[key] };
}

function toggleTagFilter(tag) {
  if (tagFilter.value === tag) {
    tagFilter.value = null;
    tagFilterFiles.value = [];
    return;
  }
  tagFilter.value = tag;
  loadFilesWithTag(tag);
}

async function loadFilesWithTag(tag) {
  const path = dirPath.value;
  const files = markdownFiles.value;
  if (!path || !files.length || !api.readProjectFile) {
    tagFilterFiles.value = [];
    return;
  }
  const results = await Promise.all(
    files.map(async (file) => {
      const r = await api.readProjectFile(path, file);
      if (!r?.ok || !r.content) return null;
      const tags = parseTagsFromMarkdown(r.content);
      return tags.includes(tag) ? file : null;
    })
  );
  tagFilterFiles.value = results.filter(Boolean);
}

// Export (PrimeVue Menu popup)
const exportMenuRef = ref(null);
const exportMenuItems = [
  { label: 'Export as HTML', icon: 'pi pi-file', command: () => exportDoc('html') },
  { label: 'Export as PDF', icon: 'pi pi-file-pdf', command: () => exportDoc('pdf') },
];

async function exportDoc(format) {
  const name = selectedPath.value ? selectedPath.value.replace(/\.(md|markdown)$/i, '') : 'document';
  const defaultFileName = name + (format === 'pdf' ? '.pdf' : '.html');
  if (api.exportMarkdown) {
    const result = await api.exportMarkdown({
      format,
      html: previewHtml.value,
      defaultFileName,
    });
    if (result?.error) console.error('Export failed:', result.error);
  }
}

// Link preview (on hover)
const linkPreview = ref(null);
let linkPreviewTimer = null;
let linkPreviewHideTimer = null;

function onPreviewMouseOver(e) {
  const link = e.target.closest('a[href^="http"]');
  if (!link) return;
  clearTimeout(linkPreviewHideTimer);
  const url = link.href;
  const rect = link.getBoundingClientRect();
  linkPreview.value = { url, x: rect.left, y: rect.bottom + 4, loading: true };
  clearTimeout(linkPreviewTimer);
  linkPreviewTimer = setTimeout(() => fetchLinkPreview(url), 400);
}

function onPreviewMouseOut(e) {
  const link = e.target.closest('a[href^="http"]');
  const popover = e.relatedTarget?.closest?.('.markdown-link-preview');
  if (link && !popover) {
    linkPreviewHideTimer = setTimeout(() => { linkPreview.value = null; }, 200);
  }
}

function onPreviewClick(e) {
  const img = e.target.tagName === 'IMG' && e.target.closest('.markdown-preview') ? e.target : null;
  if (img) {
    const src = img.getAttribute('src');
    if (src) {
      e.preventDefault();
      lightboxSrc.value = src.startsWith('http') || src.startsWith('file') ? src : resolvePreviewImageSrc(src);
    }
  }
}

function resolvePreviewImageSrc(src) {
  if (!src || !getInfo.value?.path) return src;
  if (src.startsWith('/')) return src;
  const base = getInfo.value.path + '/';
  const dir = selectedPath.value ? selectedPath.value.replace(/\/[^/]+$/, '') || '' : '';
  const resolved = dir ? base + dir + '/' + src : base + src;
  return 'file://' + resolved;
}

async function fetchLinkPreview(url) {
  if (!api.fetchLinkPreview) {
    if (linkPreview.value) linkPreview.value.loading = false;
    return;
  }
  try {
    const result = await api.fetchLinkPreview(url);
    if (linkPreview.value && linkPreview.value.url === url) {
      linkPreview.value = { ...linkPreview.value, loading: false, title: result?.title, description: result?.description, image: result?.image };
    }
  } catch {
    if (linkPreview.value && linkPreview.value.url === url) linkPreview.value.loading = false;
  }
}

function cancelLinkPreviewHide() {
  clearTimeout(linkPreviewHideTimer);
}
function linkPreviewLeave() {
  linkPreviewHideTimer = setTimeout(() => { linkPreview.value = null; }, 150);
}

// Image lightbox
const lightboxSrc = ref(null);

let mermaidInitialized = false;
function initMermaid() {
  if (mermaidInitialized) return;
  mermaidInitialized = true;
  mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
}

async function renderMermaidBlocks(container) {
  if (!container) return;
  const codeBlocks = container.querySelectorAll('pre code.language-mermaid');
  if (codeBlocks.length === 0) return;
  initMermaid();
  for (const code of codeBlocks) {
    const pre = code.closest('pre');
    if (!pre) continue;
    const text = code.textContent?.trim() || '';
    if (!text) continue;
    const id = 'mermaid-' + Math.random().toString(36).slice(2, 11);
    const div = document.createElement('div');
    div.className = 'mermaid';
    div.id = id;
    div.textContent = text;
    pre.parentNode?.replaceChild(div, pre);
  }
  try {
    await mermaid.run({ nodes: container.querySelectorAll('.mermaid'), suppressErrors: true });
  } catch (_) {}
}

// GitHub Flavored Markdown renderer (remark-gfm): tables, strikethrough, task lists, autolinks
const previewHtml = ref('');

async function updatePreview(raw) {
  if (!raw) {
    previewHtml.value = '<p class="text-rm-muted">Empty file</p>';
    return;
  }
  try {
    const html = await renderGfmToHtml(raw);
    previewHtml.value = html || '<p class="text-rm-muted">Empty file</p>';
  } catch {
    previewHtml.value = '<p class="text-red-400">Invalid Markdown</p>';
  }
}

watch(content, (raw) => { updatePreview(raw); }, { immediate: true });

watch(previewHtml, () => {
  nextTick(() => renderMermaidBlocks(previewContainerRef.value));
}, { flush: 'post' });

watch(
  () => props.info?.path,
  () => {
    viewMode.value = 'split';
  }
);
</script>

<style scoped>
/* PrimeVue Textarea: fill editor area and match theme */
.markdown-editor {
  display: flex;
  flex-direction: column;
}
.markdown-editor :deep(textarea) {
  flex: 1;
  min-height: 200px;
  font-family: ui-monospace, monospace;
  color: rgb(var(--rm-text));
  background: rgb(var(--rm-bg));
  border: none;
  outline: none;
  box-shadow: none;
}
.markdown-tb-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 1;
}
.markdown-file-item:hover {
  background: rgb(var(--rm-surface) / 0.6);
}
.markdown-file-item-selected {
  background: rgb(var(--rm-accent) / 0.12);
  border-left: 3px solid rgb(var(--rm-accent));
  padding-left: calc(0.75rem - 3px);
}
.markdown-view-select :deep(button) {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: transparent;
  border: none;
  color: rgb(var(--rm-muted));
  transition: color 0.15s, background 0.15s;
}
.markdown-view-select :deep(button:hover) {
  color: rgb(var(--rm-text));
  background: rgb(var(--rm-surface));
}
.markdown-view-select :deep(button[data-p-active="true"]) {
  color: rgb(var(--rm-accent));
  background: rgb(var(--rm-accent) / 0.1);
}
/* Rendered markdown: headings, links, code, tables (v-html content) */
.markdown-preview :deep(h1) {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  color: rgb(var(--rm-text));
  line-height: 1.3;
}
.markdown-preview :deep(h1:first-child) {
  margin-top: 0;
}
.markdown-preview :deep(h2) {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  color: rgb(var(--rm-text));
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgb(var(--rm-border));
}
.markdown-preview :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0.75rem 0 0.4rem;
  color: rgb(var(--rm-text));
}
.markdown-preview :deep(h4),
.markdown-preview :deep(h5),
.markdown-preview :deep(h6) {
  font-size: 1rem;
  font-weight: 600;
  margin: 0.5rem 0 0.25rem;
  color: rgb(var(--rm-text));
}
.markdown-preview :deep(p) {
  margin: 0.5rem 0;
  line-height: 1.5;
}
.markdown-preview :deep(a) {
  color: rgb(var(--rm-accent));
  text-decoration: none;
}
.markdown-preview :deep(a:hover) {
  text-decoration: underline;
}
.markdown-preview :deep(img) {
  max-width: 100%;
  height: auto;
  cursor: pointer;
}
.markdown-preview :deep(pre) {
  background: rgb(var(--rm-surface));
  padding: 0.75rem 1rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.5rem 0;
}
.markdown-preview :deep(code) {
  font-size: 0.9em;
  font-family: ui-monospace, monospace;
  background: rgb(var(--rm-surface) / 0.8);
  padding: 0.15em 0.35em;
  border-radius: 4px;
}
.markdown-preview :deep(pre code) {
  padding: 0;
  background: transparent;
}
.markdown-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.75rem 0;
}
.markdown-preview :deep(th),
.markdown-preview :deep(td) {
  border: 1px solid rgb(var(--rm-border));
  padding: 0.5rem 0.75rem;
  text-align: left;
}
.markdown-preview :deep(th) {
  background: rgb(var(--rm-surface) / 0.5);
  font-weight: 600;
}
.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}
</style>
