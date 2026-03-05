<template>
  <div class="markdown-tree-node">
    <template v-if="node.path">
      <Button
        type="button"
        variant="text"
        class="markdown-tree-file w-full justify-start text-left px-3 py-1.5 truncate rounded hover:bg-rm-surface/80 flex items-center gap-1"
        :class="{ 'markdown-file-item-selected': selectedPath === node.path }"
        :style="{ paddingLeft: (depth * 12) + 12 + 'px' }"
        @click="$emit('select', node.path)"
      >
        <i class="pi pi-file text-rm-muted shrink-0 text-xs" />
        <span class="truncate">{{ node.name }}</span>
      </Button>
    </template>
    <template v-else>
      <Button
        type="button"
        variant="text"
        class="markdown-tree-folder w-full justify-start text-left px-3 py-1.5 truncate rounded hover:bg-rm-surface/60 flex items-center gap-1"
        :style="{ paddingLeft: (depth * 12) + 12 + 'px' }"
        @click="$emit('toggle-folder', node.folderKey)"
      >
        <i
          class="pi shrink-0 text-rm-muted transition-transform"
          :class="isExpanded ? 'pi-chevron-down' : 'pi-chevron-right'"
        />
        <i class="pi pi-folder text-rm-muted shrink-0 text-xs" />
        <span class="truncate">{{ node.name }}</span>
      </Button>
      <template v-if="isExpanded">
        <MarkdownFileTreeNode
          v-for="child in node.children"
          :key="child.path || child.folderKey || child.name"
          :node="child"
          :depth="depth + 1"
          :selected-path="selectedPath"
          :expanded-folders="expandedFolders"
          @select="$emit('select', $event)"
          @toggle-folder="$emit('toggle-folder', $event)"
        />
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import Button from 'primevue/button';

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  selectedPath: { type: String, default: null },
  expandedFolders: { type: Object, default: () => ({}) },
});

defineEmits(['select', 'toggle-folder']);

const isExpanded = computed(() => props.node.folderKey && props.expandedFolders[props.node.folderKey]);
</script>

<style scoped>
.markdown-file-item-selected {
  background: rgb(var(--rm-accent) / 0.12);
  border-left: 3px solid rgb(var(--rm-accent));
  padding-left: calc(0.75rem - 3px);
}
</style>
