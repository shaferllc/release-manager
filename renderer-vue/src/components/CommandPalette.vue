<template>
  <Dialog
    :visible="palette.isOpen"
    modal
    :dismissable-mask="true"
    :closable="true"
    :close-on-escape="true"
    :style="{ width: '36rem' }"
    content-class="p-0 overflow-hidden flex flex-col"
    class="command-palette-dialog"
    @update:visible="onVisibleChange"
    @show="focusSearchInput"
  >
    <template #header>
      <div class="command-palette-search">
        <i class="pi pi-search command-palette-search-icon" aria-hidden="true" />
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          class="command-palette-input"
          placeholder="Search commands..."
          autocomplete="off"
          aria-label="Search commands"
          @keydown="handleKeydown"
        />
        <button
          v-if="query.length > 0"
          type="button"
          class="command-palette-clear"
          aria-label="Clear search"
          @click="clearSearch"
        >
          <i class="pi pi-times" aria-hidden="true" />
        </button>
      </div>
    </template>

    <div ref="listRef" class="command-palette-list" role="listbox">
      <template v-if="flatItems.length">
        <template v-for="(item, index) in flatItems" :key="item.key">
          <div v-if="item.type === 'category'" class="command-palette-category">
            {{ item.label }}
          </div>
          <button
            v-else
            :id="selectedIndex === index ? 'cmd-palette-selected' : undefined"
            type="button"
            class="command-palette-item"
            :class="{ 'command-palette-item-selected': selectedIndex === index }"
            role="option"
            :aria-selected="selectedIndex === index"
            @click="selectCommand(item.cmd)"
            @mouseenter="selectedIndex = index"
          >
            <i v-if="item.cmd.icon" :class="item.cmd.icon" class="command-palette-item-icon" aria-hidden="true" />
            <span class="command-palette-item-text">
              <span class="command-palette-item-label">
                <template v-for="(seg, i) in getHighlightSegments(item.cmd.label, query)" :key="i">
                  <span v-if="seg.highlight" class="command-palette-highlight">{{ seg.text }}</span>
                  <template v-else>{{ seg.text }}</template>
                </template>
              </span>
              <span v-if="item.cmd.description" class="command-palette-item-desc">{{ item.cmd.description }}</span>
            </span>
            <span v-if="item.cmd.shortcut" class="command-palette-item-shortcut">{{ item.cmd.shortcut }}</span>
          </button>
        </template>
      </template>
      <div v-else class="command-palette-empty">No matching commands</div>
    </div>

    <template #footer>
      <div class="command-palette-footer">
        <span v-if="filteredCommands.length" class="command-palette-footer-count">
          {{ filteredCommands.length }}{{ query.trim() ? ` of ${commands.length}` : '' }} commands
        </span>
        <span class="command-palette-footer-hint"><kbd>↑</kbd><kbd>↓</kbd> <kbd>j</kbd><kbd>k</kbd> Navigate</span>
        <span class="command-palette-footer-hint"><kbd>↵</kbd> Run</span>
        <span class="command-palette-footer-hint"><kbd>Esc</kbd> Clear / Close</span>
        <span class="command-palette-footer-open">Or <kbd>⌘⇧P</kbd> in nav</span>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import Dialog from 'primevue/dialog';
import { useCommandPalette } from '../commandPalette/useCommandPalette';
import { useCommands } from '../commandPalette/registry';

const palette = useCommandPalette();
const commands = useCommands();
const query = ref('');
const selectedIndex = ref(0);
const inputRef = ref(null);
const listRef = ref(null);

function onVisibleChange(v) {
  if (!v) palette.close();
}

function clearSearch() {
  query.value = '';
  nextTick(() => inputRef.value?.focus());
}

function focusSearchInput() {
  nextTick(() => {
    const el = inputRef.value;
    if (el && typeof el.focus === 'function') {
      el.focus();
    } else {
      setTimeout(() => inputRef.value?.focus(), 50);
    }
  });
}

function moveSelection(direction) {
  selectedIndex.value = getNextSelectableIndex(direction);
  scrollSelectedIntoView();
}

function onDialogKeydown(e) {
  if (!palette.isOpen.value) return;
  const flat = flatItems.value;
  const isNavKey = e.key === 'ArrowDown' || e.key === 'ArrowUp' || (e.key === 'j' && !e.ctrlKey && !e.metaKey && !e.altKey) || (e.key === 'k' && !e.ctrlKey && !e.metaKey && !e.altKey);
  if (isNavKey) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (e.key === 'ArrowDown' || e.key === 'j') moveSelection(1);
    else if (e.key === 'ArrowUp' || e.key === 'k') moveSelection(-1);
    return;
  }
  if (e.key === 'Escape') {
    if (query.value.trim()) {
      query.value = '';
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const item = flat[selectedIndex.value];
    if (item?.type === 'command') palette.runCommand(item.cmd.id);
  }
}

const filteredCommands = computed(() => {
  const q = (query.value || '').trim().toLowerCase();
  const list = commands.value || [];
  if (!q) return list;
  return list.filter((cmd) => {
    const label = (cmd.label || '').toLowerCase();
    const category = (cmd.category || '').toLowerCase();
    const id = (cmd.id || '').toLowerCase();
    const description = (cmd.description || '').toLowerCase();
    return label.includes(q) || category.includes(q) || id.includes(q) || description.includes(q);
  });
});

const flatItems = computed(() => {
  const list = filteredCommands.value;
  if (!list.length) return [];
  const recent = (palette.recentIds?.value ?? []).filter((id) => list.some((c) => c.id === id));
  const recentCmds = recent.map((id) => list.find((c) => c.id === id)).filter(Boolean);
  const rest = list.filter((c) => !recent.includes(c.id));
  const groups = new Map();
  for (const cmd of rest) {
    const cat = cmd.category || 'Commands';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(cmd);
  }
  const flat = [];
  if (recentCmds.length) {
    flat.push({ type: 'category', label: 'Recent', key: 'cat-recent' });
    for (const cmd of recentCmds) {
      flat.push({ type: 'command', cmd, key: `recent-${cmd.id}` });
    }
  }
  for (const [category, cmds] of groups) {
    flat.push({ type: 'category', label: category, key: `cat-${category}` });
    for (const cmd of cmds) {
      flat.push({ type: 'command', cmd, key: cmd.id });
    }
  }
  return flat;
});

const selectableIndexes = computed(() => {
  return flatItems.value
    .map((item, index) => (item.type === 'command' ? index : -1))
    .filter((i) => i >= 0);
});

function getNextSelectableIndex(direction) {
  const selectable = selectableIndexes.value;
  if (!selectable.length) return 0;
  const current = selectable.indexOf(selectedIndex.value);
  if (current < 0) return selectable[0];
  let next = current + direction;
  if (next < 0) next = selectable.length - 1;
  if (next >= selectable.length) next = 0;
  return selectable[next];
}

function getHighlightSegments(label, q) {
  if (!label || typeof label !== 'string') return [{ text: String(label ?? ''), highlight: false }];
  const query = (q || '').trim();
  if (!query) return [{ text: label, highlight: false }];
  const segments = [];
  let remaining = label;
  const qLower = query.toLowerCase();
  while (remaining.length) {
    const i = remaining.toLowerCase().indexOf(qLower);
    if (i === -1) {
      segments.push({ text: remaining, highlight: false });
      break;
    }
    if (i > 0) segments.push({ text: remaining.slice(0, i), highlight: false });
    segments.push({ text: remaining.slice(i, i + query.length), highlight: true });
    remaining = remaining.slice(i + query.length);
  }
  return segments;
}

function selectCommand(cmd) {
  palette.runCommand(cmd.id);
}

function handleKeydown(e) {
  const flat = flatItems.value;
  if (e.key === 'ArrowDown' || e.key === 'j') {
    e.preventDefault();
    moveSelection(1);
    return;
  }
  if (e.key === 'ArrowUp' || e.key === 'k') {
    e.preventDefault();
    moveSelection(-1);
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    const item = flat[selectedIndex.value];
    if (item?.type === 'command') palette.runCommand(item.cmd.id);
    return;
  }
}

function scrollSelectedIntoView() {
  nextTick(() => {
    const selectedEl = listRef.value?.querySelector('#cmd-palette-selected');
    if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

watch(flatItems, (flat) => {
  const firstCmd = flat.findIndex((i) => i.type === 'command');
  selectedIndex.value = firstCmd >= 0 ? firstCmd : 0;
});

watch(palette.isOpen, (open) => {
  if (open) {
    query.value = '';
    selectedIndex.value = flatItems.value.findIndex((i) => i.type === 'command');
    if (selectedIndex.value < 0) selectedIndex.value = 0;
    document.addEventListener('keydown', onDialogKeydown, true);
    palette.loadRecents();
    focusSearchInput();
  } else {
    document.removeEventListener('keydown', onDialogKeydown, true);
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', onDialogKeydown, true);
});
</script>

<style scoped>
.command-palette-dialog :deep(.p-dialog-header) {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid rgb(var(--rm-border));
}
.command-palette-dialog :deep(.p-dialog-content) {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: min(70vh, 28rem);
}
.command-palette-dialog :deep(.p-dialog-footer) {
  padding: 0.5rem 1rem;
  border-top: 1px solid rgb(var(--rm-border));
}

.command-palette-search {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}
.command-palette-search-icon {
  color: rgb(var(--rm-muted));
  font-size: 1rem;
  flex-shrink: 0;
}
.command-palette-input {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 0.9375rem;
  color: rgb(var(--rm-text));
  outline: none;
}
.command-palette-input::placeholder {
  color: rgb(var(--rm-muted));
}
.command-palette-clear {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: none;
  background: transparent;
  color: rgb(var(--rm-muted));
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.command-palette-clear:hover {
  color: rgb(var(--rm-text));
  background: rgb(var(--rm-surface-hover));
}
.command-palette-clear .pi {
  font-size: 0.875rem;
}
.command-palette-highlight {
  background: rgb(var(--rm-accent) / 0.25);
  border-radius: 2px;
  padding: 0 1px;
  font-weight: 600;
}

.command-palette-list {
  flex: 1;
  min-height: 0;
  max-height: min(50vh, 22rem);
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 0.375rem 0;
  -webkit-overflow-scrolling: touch;
}
.command-palette-category {
  padding: 0.375rem 1rem 0.125rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgb(var(--rm-muted));
}
.command-palette-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  font-size: 0.875rem;
  text-align: left;
  color: rgb(var(--rm-text));
  cursor: pointer;
  transition: background 0.1s ease;
}
.command-palette-item:hover {
  background: rgb(var(--rm-surface-hover));
}
.command-palette-item-selected,
.command-palette-item.command-palette-item-selected:hover {
  background: rgb(var(--rm-accent) / 0.18);
  color: rgb(var(--rm-accent));
}
.command-palette-item-icon {
  flex-shrink: 0;
  font-size: 1rem;
  color: rgb(var(--rm-muted));
  width: 1.25rem;
  text-align: center;
}
.command-palette-item-selected .command-palette-item-icon {
  color: rgb(var(--rm-accent));
}
.command-palette-item-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}
.command-palette-item-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.command-palette-item-desc {
  font-size: 0.75rem;
  color: rgb(var(--rm-muted));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.command-palette-item-selected .command-palette-item-desc {
  color: rgb(var(--rm-accent) / 0.85);
}
.command-palette-item-shortcut {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  color: rgb(var(--rm-muted));
}
.command-palette-item-selected .command-palette-item-shortcut {
  color: rgb(var(--rm-accent) / 0.9);
}
.command-palette-empty {
  padding: 2rem 1rem;
  font-size: 0.875rem;
  color: rgb(var(--rm-muted));
  text-align: center;
}
.command-palette-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  font-size: 0.6875rem;
  color: rgb(var(--rm-muted));
}
.command-palette-footer-count {
  margin-right: 0.5rem;
}
.command-palette-footer-hint,
.command-palette-footer-open {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.command-palette-footer-open {
  margin-left: auto;
}
.command-palette-footer kbd {
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  font-family: ui-monospace, monospace;
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(var(--rm-border));
  border-radius: 4px;
}
</style>
