<template>
  <section class="card mb-6 detail-tab-panel flex flex-col min-h-0" data-detail-tab="git">
    <div class="flex flex-col flex-1 min-h-0">
    <!-- Empty repo: show init CTA -->
    <div v-if="info && !info.hasGit" class="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
      <p class="text-sm text-rm-muted m-0">This folder is not a Git repository.</p>
      <p class="text-xs text-rm-muted m-0 max-w-md">Initialize a repository here to use branches, commits, tags, and the rest of the Git tools.</p>
      <Button
        severity="primary"
        size="small"
        :disabled="!info?.path || initLoading"
        @click="initializeRepo"
      >
        {{ initLoading ? 'Initializing…' : 'Initialize repository' }}
      </Button>
      <Message v-if="initError" severity="warn" class="mt-2 text-xs">{{ initError }}</Message>
    </div>
    <!-- Full Git UI when repo exists -->
    <div v-else-if="info?.hasGit" class="flex flex-col flex-1 min-h-0">
    <div class="detail-git-toolbar flex flex-wrap items-center gap-1.5 py-1.5 px-2 border-b border-rm-border bg-rm-surface/40 shrink-0">
      <div class="detail-git-toolbar-meta flex items-center gap-2 shrink-0 flex-wrap">
        <span class="text-xs text-rm-muted">repository:</span>
        <span class="text-sm text-rm-text truncate max-w-[8rem]" :title="repoName">{{ repoName }}</span>
        <span class="text-rm-border/70 mx-0.5">|</span>
        <span class="text-xs text-rm-muted">branch:</span>
        <Select
          ref="branchSelectRef"
          v-model="selectedBranch"
          :options="branchSelectOptions"
          option-label="label"
          option-value="value"
          class="detail-git-toolbar-select text-sm min-w-[10rem]"
          aria-label="Current branch"
          @update:model-value="onBranchChangeSelect"
        />
        <span v-if="aheadBehind" class="text-xs text-rm-muted">{{ aheadBehind }}</span>
        <template v-if="gitUser.name || gitUser.email">
          <span class="text-rm-border/70 mx-0.5">|</span>
          <span class="text-xs text-rm-muted">committer:</span>
          <span class="text-xs text-rm-text truncate max-w-[12rem]" :title="gitUser.email ? `${gitUser.name || ''} <${gitUser.email}>` : gitUser.name">{{ gitUser.name || gitUser.email || '—' }}</span>
          <Button variant="text" size="small" class="p-0 min-w-0 shrink-0 text-[10px] text-rm-muted hover:text-rm-accent" title="Refresh git user from config" aria-label="Refresh committer info" @click="loadGitUser">↻</Button>
        </template>
      </div>
      <div class="detail-git-toolbar-actions flex flex-wrap items-end gap-1 sm:gap-2">
        <Button variant="text" size="small" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 min-w-0" title="Discard all uncommitted changes" @click="undoDiscard">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          <span class="text-[10px] font-medium">Discard</span>
        </Button>
        <div class="detail-git-toolbar-pull flex items-stretch gap-0">
          <Button variant="text" size="small" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 min-w-[2rem]" title="Pull (run default)" @click="runDefaultPull">
            <span class="flex items-center gap-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </span>
            <span class="text-[10px] font-medium">Pull</span>
          </Button>
          <Select
            v-model="defaultPullMode"
            :options="pullOptions"
            option-label="label"
            option-value="mode"
            class="detail-git-toolbar-pull-select text-xs min-w-0 max-w-[11rem]"
            title="Pull mode: change to run this operation"
            @update:model-value="onPullModeChange"
          />
        </div>
        <Button variant="text" size="small" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 min-w-0" title="Push" @click="push">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
          <span class="text-[10px] font-medium">Push</span>
        </Button>
        <Button variant="text" size="small" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 min-w-0" title="Branch" @click="focusBranchSelect">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 15a3 3 0 0 0 6 0"/></svg>
          <span class="text-[10px] font-medium">Branch</span>
        </Button>
        <Button variant="text" size="small" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 min-w-0" title="Stash changes" @click="stashPush">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h14v8h-4l-4 4-4-4H5z"/></svg>
          <span class="text-[10px] font-medium">Stash</span>
        </Button>
        <Button variant="text" size="small" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 min-w-0" title="Pop stash" @click="stashPop">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="12" width="14" height="8" rx="1"/><path d="M12 12V6M9 9l3-3 3 3"/></svg>
          <span class="text-[10px] font-medium">Pop</span>
        </Button>
      </div>
    </div>
    <div class="detail-git-three-panels flex-1 min-h-[380px] min-w-0 border-t border-rm-border overflow-hidden flex flex-col">
      <div class="detail-git-three-panels-row flex flex-1 min-h-0 min-w-0 overflow-x-auto">
      <!-- Left zone: panels with position "left" -->
      <div v-if="leftPanelOptions.length > 0" class="detail-git-left-panel shrink-0 w-56 min-h-0 flex flex-col border-r border-rm-border bg-rm-bg-elevated/30 overflow-hidden">
        <div class="p-1.5 border-b border-rm-border shrink-0">
          <Select
            v-model="gitLeftPanelSection"
            :options="leftPanelOptions"
            option-label="label"
            option-value="value"
            class="detail-git-section-select w-full text-xs"
            placeholder="Panel"
          >
            <template #value>
              <div v-if="currentLeftSectionOption" class="flex items-center gap-1.5 min-w-0">
                <span v-if="currentLeftSectionOption.icon" class="detail-git-jump-icon shrink-0" v-html="currentLeftSectionOption.icon" aria-hidden="true" />
                <span class="truncate">{{ currentLeftSectionOption.label }}</span>
              </div>
              <span v-else>Panel</span>
            </template>
            <template #option="slotProps">
              <div class="flex items-center gap-2">
                <span v-if="slotProps.option.icon" class="detail-git-jump-icon shrink-0" v-html="slotProps.option.icon" aria-hidden="true" />
                <span class="truncate">{{ slotProps.option.label }}</span>
              </div>
            </template>
          </Select>
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto p-2">
          <component
            :is="currentLeftPanelComponent?.component"
            v-if="currentLeftPanelComponent?.component"
            v-bind="currentLeftPanelComponent?.props || {}"
            @refresh="$emit('refresh')"
          />
        </div>
      </div>
      <aside class="detail-git-sidebar-panel shrink-0 min-h-0 bg-rm-bg-elevated/50 flex flex-col overflow-hidden" :style="gitSidebarStyle">
        <div class="p-1.5 border-b border-rm-border shrink-0">
          <InputText v-model="gitFilter" class="detail-git-filter-input w-full text-xs px-1.5 py-1" placeholder="Filter (⌘⌥F)" />
        </div>
        <div class="detail-git-sidebar-scroll flex-1 overflow-y-auto py-1 min-h-0 flex flex-col gap-1">
          <template v-for="widgetId in visibleOrderedWidgetIds" :key="widgetId">
          <div
            v-if="widgetId === 'local-branches'"
            class="detail-git-sidebar-group border border-rm-border bg-rm-surface/40 overflow-hidden"
            :class="{ 'widget-drag-over-before': isWidgetDropBefore(widgetId), 'widget-drag-over-after': isWidgetDropAfter(widgetId) }"
            :data-widget-id="widgetId"
            @dragover.prevent="onWidgetDragOver($event, widgetId)"
            @drop="onWidgetDrop($event, widgetId)"
            @dragleave="onWidgetDragLeave($event, widgetId)"
          >
            <Button variant="text" size="small" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left min-w-0" :aria-expanded="sidebarLocalOpen" @click="sidebarLocalOpen = !sidebarLocalOpen">
              <span class="flex items-center gap-1.5 shrink-0 min-w-0">
                <span v-if="hasMultipleVisibleWidgets" class="widget-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text p-0.5 -ml-0.5" draggable="true" title="Drag to reorder" @click.stop @dragstart="onWidgetDragStart($event, widgetId)" @dragend="onWidgetDragEnd"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
                <span class="w-3.5 h-3.5 shrink-0 text-rm-muted inline-block" v-html="sidebarWidgetIcon(widgetId)" aria-hidden="true"></span>
                <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide truncate">Local branches</span>
              </span>
              <svg class="w-3.5 h-3.5 shrink-0 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarLocalOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </Button>
            <div v-show="sidebarLocalOpen" class="px-2.5 pb-2 pt-0 border-t border-rm-border">
              <ul class="py-1 px-0 list-none m-0 text-xs text-rm-text space-y-0.5">
                <li class="py-0.5">
                  <Button
                    variant="text"
                    size="small"
                    class="w-full justify-start p-0 text-xs text-rm-accent font-medium min-w-0"
                    @click.stop="createBranch"
                  >
                    <span class="shrink-0" aria-hidden="true">+</span>
                    New branch
                  </Button>
                </li>
                <li
                  v-for="b in filteredBranches"
                  :key="b"
                  class="cursor-pointer hover:text-rm-accent truncate py-0.5 rounded px-0.5 -mx-0.5"
                  :class="[
                    { 'font-medium text-rm-accent': b === currentBranch },
                    { 'ring-1 ring-rm-accent rounded bg-rm-accent/10': branchDropTarget === b }
                  ]"
                  draggable="true"
                  title="Drag to another branch to merge"
                  @click="checkoutBranch(b)"
                  @contextmenu.prevent="openBranchContextMenu($event, b, false)"
                  @dragstart="onBranchDragStart($event, b, false)"
                  @dragend="onBranchDragEnd"
                  @dragover.prevent="onBranchDragOver($event, b)"
                  @dragleave="onBranchDragLeave($event, b)"
                  @drop="onBranchDrop($event, b)"
                >
                  {{ b }}
                </li>
              </ul>
            </div>
          </div>
          <div
            v-else-if="widgetId === 'remote'"
            class="detail-git-sidebar-group border border-rm-border bg-rm-surface/40 overflow-hidden"
            :class="{ 'widget-drag-over-before': isWidgetDropBefore(widgetId), 'widget-drag-over-after': isWidgetDropAfter(widgetId) }"
            :data-widget-id="widgetId"
            @dragover.prevent="onWidgetDragOver($event, widgetId)"
            @drop="onWidgetDrop($event, widgetId)"
            @dragleave="onWidgetDragLeave($event, widgetId)"
          >
            <Button variant="text" size="small" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left min-w-0" :aria-expanded="sidebarRemoteOpen" @click="sidebarRemoteOpen = !sidebarRemoteOpen" @contextmenu.prevent="openRemoteContextMenu($event)">
              <span class="flex items-center gap-1.5 shrink-0 min-w-0">
                <span v-if="hasMultipleVisibleWidgets" class="widget-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text p-0.5 -ml-0.5" draggable="true" title="Drag to reorder" @click.stop @dragstart="onWidgetDragStart($event, widgetId)" @dragend="onWidgetDragEnd"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
                <span class="w-3.5 h-3.5 shrink-0 text-rm-muted inline-block" v-html="sidebarWidgetIcon(widgetId)" aria-hidden="true"></span>
                <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide truncate">Remote</span>
              </span>
              <span class="flex items-center gap-1 shrink-0">
                <Button variant="text" size="small" class="text-xs p-0 min-w-0" :disabled="remoteBranchesLoading" @click.stop="loadRemoteBranches">{{ remoteBranchesLoading ? '…' : (remoteBranchesLoaded ? 'Refresh' : 'Load') }}</Button>
                <svg class="w-3.5 h-3.5 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarRemoteOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </Button>
            <div v-show="sidebarRemoteOpen" class="px-2.5 pb-2 pt-0 border-t border-rm-border">
              <ul class="max-h-28 overflow-y-auto py-1 px-0 list-none m-0 text-xs text-rm-text space-y-0.5">
                <li
                v-for="r in filteredRemoteBranches"
                :key="r"
                class="cursor-pointer hover:text-rm-accent truncate py-0.5 rounded px-0.5 -mx-0.5"
                draggable="true"
                title="Drag onto a local branch to merge"
                @click="checkoutRemoteBranch(r)"
                @contextmenu.prevent="openBranchContextMenu($event, r, true)"
                @dragstart="onBranchDragStart($event, r, true)"
                @dragend="onBranchDragEnd"
              >
                {{ r }}
              </li>
                <li v-if="!remoteBranchesLoading && remoteBranches.length === 0 && remoteBranchesLoaded" class="text-xs text-rm-muted py-0.5">None</li>
              </ul>
            </div>
          </div>
          <div
            v-else-if="widgetId === 'worktrees'"
            class="detail-git-sidebar-group border border-rm-border bg-rm-surface/40 overflow-hidden"
            :class="{ 'widget-drag-over-before': isWidgetDropBefore(widgetId), 'widget-drag-over-after': isWidgetDropAfter(widgetId) }"
            :data-widget-id="widgetId"
            @dragover.prevent="onWidgetDragOver($event, widgetId)"
            @drop="onWidgetDrop($event, widgetId)"
            @dragleave="onWidgetDragLeave($event, widgetId)"
          >
            <Button variant="text" size="small" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left min-w-0" :aria-expanded="sidebarWorktreesOpen" @click="sidebarWorktreesOpen = !sidebarWorktreesOpen">
              <span class="flex items-center gap-1.5 shrink-0 min-w-0">
                <span v-if="hasMultipleVisibleWidgets" class="widget-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text p-0.5 -ml-0.5" draggable="true" title="Drag to reorder" @click.stop @dragstart="onWidgetDragStart($event, widgetId)" @dragend="onWidgetDragEnd"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
                <span class="w-3.5 h-3.5 shrink-0 text-rm-muted inline-block" v-html="sidebarWidgetIcon(widgetId)" aria-hidden="true"></span>
                <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide truncate">Worktrees</span>
              </span>
              <svg class="w-3.5 h-3.5 shrink-0 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarWorktreesOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </Button>
            <div v-show="sidebarWorktreesOpen" class="px-2.5 pb-2 pt-0 border-t border-rm-border">
              <Button variant="text" size="small" class="text-xs p-0 mb-1.5 font-medium min-w-0 text-rm-accent hover:underline" @click="addWorktreeFromSidebar">+ Add worktree</Button>
              <ul class="max-h-32 overflow-y-auto py-1 px-0 list-none m-0 text-xs text-rm-muted space-y-0.5">
                <li
                  v-for="w in worktrees"
                  :key="w.path"
                  class="truncate py-0.5 flex items-center justify-between gap-1 group"
                  :class="{ 'text-rm-accent font-medium': isCurrentWorktree(w.path) }"
                  :title="w.path"
                  @contextmenu.prevent="openWorktreeContextMenu($event, w)"
                >
                  <span class="truncate min-w-0">{{ worktreeLabel(w) }}</span>
                  <span v-if="!isCurrentWorktree(w.path)" class="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
                    <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-muted hover:text-rm-text" title="Reveal in Finder" @click.stop="revealWorktree(w.path)">Reveal</Button>
                    <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-warning hover:underline" title="Remove worktree" @click.stop="removeWorktreeFromSidebar(w.path)">Remove</Button>
                  </span>
                </li>
              </ul>
              <p v-if="worktrees.length === 0" class="m-0 text-xs text-rm-muted py-0.5">No worktrees</p>
            </div>
          </div>
          <div
            v-else-if="widgetId === 'tags'"
            class="detail-git-sidebar-group border border-rm-border bg-rm-surface/40 overflow-hidden"
            :class="{ 'widget-drag-over-before': isWidgetDropBefore(widgetId), 'widget-drag-over-after': isWidgetDropAfter(widgetId) }"
            :data-widget-id="widgetId"
            @dragover.prevent="onWidgetDragOver($event, widgetId)"
            @drop="onWidgetDrop($event, widgetId)"
            @dragleave="onWidgetDragLeave($event, widgetId)"
          >
            <Button variant="text" size="small" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left min-w-0" :aria-expanded="sidebarTagsOpen" @click="sidebarTagsOpen = !sidebarTagsOpen">
              <span class="flex items-center gap-1.5 shrink-0 min-w-0">
                <span v-if="hasMultipleVisibleWidgets" class="widget-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text p-0.5 -ml-0.5" draggable="true" title="Drag to reorder" @click.stop @dragstart="onWidgetDragStart($event, widgetId)" @dragend="onWidgetDragEnd"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
                <span class="w-3.5 h-3.5 shrink-0 text-rm-muted inline-block" v-html="sidebarWidgetIcon(widgetId)" aria-hidden="true"></span>
                <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide truncate">Tags</span>
              </span>
              <svg class="w-3.5 h-3.5 shrink-0 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarTagsOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </Button>
            <div v-show="sidebarTagsOpen" class="px-2.5 pb-2 pt-0 border-t border-rm-border">
              <Button variant="text" size="small" class="text-xs p-0 mb-1.5 font-medium min-w-0 text-rm-accent hover:underline" @click="createTagFromSidebar">+ New tag</Button>
              <ul class="max-h-32 overflow-y-auto py-1 px-0 list-none m-0 text-xs text-rm-muted space-y-0.5">
                <li v-for="t in filteredTags" :key="t" class="cursor-pointer hover:text-rm-accent truncate py-0.5 flex items-center justify-between gap-1 group" @click="checkoutTag(t)" @contextmenu.prevent="openTagContextMenu($event, t)">
                  <span class="truncate min-w-0">{{ t }}</span>
                  <span class="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
                    <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" title="Push to origin" @click.stop="pushTagFromSidebar(t)">Push</Button>
                    <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-warning hover:underline" title="Delete tag" @click.stop="deleteTagFromSidebar(t)">Del</Button>
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <div
            v-else-if="widgetId === 'stash'"
            class="detail-git-sidebar-group border border-rm-border bg-rm-surface/40 overflow-hidden"
            :class="{ 'widget-drag-over-before': isWidgetDropBefore(widgetId), 'widget-drag-over-after': isWidgetDropAfter(widgetId) }"
            :data-widget-id="widgetId"
            @dragover.prevent="onWidgetDragOver($event, widgetId)"
            @drop="onWidgetDrop($event, widgetId)"
            @dragleave="onWidgetDragLeave($event, widgetId)"
          >
            <Button variant="text" size="small" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left min-w-0" :aria-expanded="sidebarStashOpen" @click="sidebarStashOpen = !sidebarStashOpen">
              <span class="flex items-center gap-1.5 shrink-0 min-w-0">
                <span v-if="hasMultipleVisibleWidgets" class="widget-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text p-0.5 -ml-0.5" draggable="true" title="Drag to reorder" @click.stop @dragstart="onWidgetDragStart($event, widgetId)" @dragend="onWidgetDragEnd"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
                <span class="w-3.5 h-3.5 shrink-0 text-rm-muted inline-block" v-html="sidebarWidgetIcon(widgetId)" aria-hidden="true"></span>
                <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide truncate">Stash</span>
              </span>
              <span class="flex items-center gap-1 shrink-0">
                <span class="text-xs text-rm-muted tabular-nums">{{ stashListEntries.length }}</span>
                <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click.stop="loadStashList(); gitRightSection = 'stash'">Open</Button>
                <svg class="w-3.5 h-3.5 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarStashOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </Button>
            <div v-show="sidebarStashOpen" class="px-2.5 pb-2 pt-0 border-t border-rm-border">
              <ul class="max-h-32 overflow-y-auto py-1 px-0 list-none m-0 text-xs text-rm-muted space-y-0.5">
                <li
                  v-for="e in stashListEntries"
                  :key="e.index"
                  class="truncate py-0.5 flex items-center justify-between gap-1 group cursor-pointer"
                  :class="{ 'text-rm-accent font-medium': gitRightSection === 'stash' }"
                  :title="e.message"
                  @click="gitRightSection = 'stash'"
                >
                  <span class="truncate min-w-0">{{ e.index }} {{ e.message }}</span>
                </li>
              </ul>
              <p v-if="stashListEntries.length === 0" class="m-0 text-xs text-rm-muted py-1 px-2">No stashes. Use Stash in the toolbar or open panel to create one.</p>
            </div>
          </div>
          <div
            v-else-if="widgetId === 'submodules'"
            class="detail-git-sidebar-group border border-rm-border bg-rm-surface/40 overflow-hidden"
            :class="{ 'widget-drag-over-before': isWidgetDropBefore(widgetId), 'widget-drag-over-after': isWidgetDropAfter(widgetId) }"
            :data-widget-id="widgetId"
            @dragover.prevent="onWidgetDragOver($event, widgetId)"
            @drop="onWidgetDrop($event, widgetId)"
            @dragleave="onWidgetDragLeave($event, widgetId)"
          >
            <Button variant="text" size="small" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left min-w-0" :aria-expanded="sidebarSubmodulesOpen" @click="sidebarSubmodulesOpen = !sidebarSubmodulesOpen">
              <span class="flex items-center gap-1.5 shrink-0 min-w-0">
                <span v-if="hasMultipleVisibleWidgets" class="widget-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text p-0.5 -ml-0.5" draggable="true" title="Drag to reorder" @click.stop @dragstart="onWidgetDragStart($event, widgetId)" @dragend="onWidgetDragEnd"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
                <span class="w-3.5 h-3.5 shrink-0 text-rm-muted inline-block" v-html="sidebarWidgetIcon(widgetId)" aria-hidden="true"></span>
                <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide truncate">Submodules</span>
              </span>
              <span class="flex items-center gap-1 shrink-0">
                <span class="text-xs text-rm-muted tabular-nums">{{ submodules.length }}</span>
                <Button v-if="submodules.length > 0" variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" title="Update all submodules" @click.stop="updateSubmodulesFromSidebar">Update</Button>
                <svg class="w-3.5 h-3.5 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarSubmodulesOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </Button>
            <div v-show="sidebarSubmodulesOpen" class="border-t border-rm-border">
              <div class="px-2 py-1.5 border-b border-rm-border">
                <InputText
                  v-model="submoduleSearch"
                  type="text"
                  class="w-full text-xs px-2 py-1"
                  placeholder="Search submodules"
                />
              </div>
              <ul class="max-h-32 overflow-y-auto py-1 px-2 list-none m-0 text-xs text-rm-muted space-y-0.5">
                <li
                  v-for="s in filteredSubmodulesBySearch"
                  :key="s.path"
                  class="truncate py-0.5 flex items-center justify-between gap-1 group cursor-pointer"
                  :class="{ 'text-rm-accent font-medium': gitRightSection === 'submodules' }"
                  :title="s.url || s.path"
                  @click="gitRightSection = 'submodules'"
                  @contextmenu.prevent="openSubmoduleContextMenu($event, s)"
                >
                  <span class="truncate min-w-0">{{ s.path }}</span>
                  <span class="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
                    <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-muted hover:text-rm-text" title="Reveal in Finder" @click.stop="revealSubmodule(s.path)">Reveal</Button>
                  </span>
                </li>
              </ul>
              <p v-if="submodules.length === 0" class="m-0 text-xs text-rm-muted py-1 px-2">No submodules</p>
              <p v-else-if="filteredSubmodulesBySearch.length === 0" class="m-0 text-xs text-rm-muted py-1 px-2">No matches</p>
            </div>
          </div>
          <div
            v-else-if="widgetId === 'reflog'"
            class="detail-git-sidebar-group border border-rm-border bg-rm-surface/40 overflow-hidden"
            :class="{ 'widget-drag-over-before': isWidgetDropBefore(widgetId), 'widget-drag-over-after': isWidgetDropAfter(widgetId) }"
            :data-widget-id="widgetId"
            @dragover.prevent="onWidgetDragOver($event, widgetId)"
            @drop="onWidgetDrop($event, widgetId)"
            @dragleave="onWidgetDragLeave($event, widgetId)"
          >
            <Button variant="text" size="small" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left min-w-0" :aria-expanded="sidebarReflogOpen" @click="sidebarReflogOpen = !sidebarReflogOpen">
              <span class="flex items-center gap-1.5 shrink-0 min-w-0">
                <span v-if="hasMultipleVisibleWidgets" class="widget-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text p-0.5 -ml-0.5" draggable="true" title="Drag to reorder" @click.stop @dragstart="onWidgetDragStart($event, widgetId)" @dragend="onWidgetDragEnd"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
                <span class="w-3.5 h-3.5 shrink-0 text-rm-muted inline-block" v-html="sidebarWidgetIcon(widgetId)" aria-hidden="true"></span>
                <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide truncate">Reflog</span>
              </span>
              <span class="flex items-center gap-1 shrink-0">
                <span v-if="reflogLoaded" class="text-xs text-rm-muted tabular-nums">{{ reflogEntries.length }}</span>
                <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" :disabled="reflogLoading" @click.stop="loadReflogFromSidebar">{{ reflogLoading ? '…' : (reflogLoaded ? 'Refresh' : 'Load') }}</Button>
                <svg class="w-3.5 h-3.5 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarReflogOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </Button>
            <div v-show="sidebarReflogOpen" class="border-t border-rm-border">
              <div class="px-2 py-1.5 border-b border-rm-border">
                <InputText
                  v-model="reflogSearch"
                  type="text"
                  class="w-full text-xs px-2 py-1"
                  placeholder="Search reflog"
                  :disabled="!reflogLoaded"
                />
              </div>
              <div class="py-1 max-h-48 overflow-y-auto">
                <template v-if="!reflogLoaded && !reflogLoading">
                  <p class="m-0 text-xs text-rm-muted py-1 px-2">Click Load to fetch reflog</p>
                </template>
                <template v-else-if="reflogEntries.length === 0">
                  <p class="m-0 text-xs text-rm-muted py-1 px-2">No reflog entries</p>
                </template>
                <template v-else>
                  <div v-for="cat in reflogByCategory" :key="cat.key" class="mb-0.5">
                    <Button
                      variant="text"
                      size="small"
                      class="w-full flex items-center justify-between gap-1 px-2 py-1 text-left min-w-0"
                      :aria-expanded="reflogCategoryOpen[cat.key]"
                      @click="toggleReflogCategory(cat.key)"
                    >
                      <span class="flex items-center gap-1 min-w-0">
                        <svg class="w-3 h-3 text-rm-muted shrink-0 transition-transform" :class="{ 'rotate-180': reflogCategoryOpen[cat.key] }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                        <span class="text-xs font-medium text-rm-muted truncate">{{ cat.label }}</span>
                      </span>
                      <span class="text-xs text-rm-muted tabular-nums shrink-0">{{ cat.entries.length }}</span>
                    </Button>
                    <ul v-show="reflogCategoryOpen[cat.key]" class="list-none m-0 pl-4 pr-1 py-0.5 text-xs text-rm-muted space-y-0.5">
                      <li
                        v-for="(e, i) in cat.entries"
                        :key="i"
                        class="truncate py-0.5 flex items-center justify-between gap-1 group cursor-pointer"
                        :class="{ 'text-rm-accent font-medium': gitRightSection === 'reflog' }"
                        :title="e.ref ? `${e.sha} ${e.ref} – ${e.message}` : e.message"
                        @click="gitRightSection = 'reflog'"
                        @contextmenu.prevent="openReflogContextMenu($event, e)"
                      >
                        <span class="truncate min-w-0 font-mono text-xs">{{ e.sha }}</span>
                        <span class="truncate min-w-0 flex-1 ml-1">{{ reflogEntryLabel(e) }}</span>
                        <span class="flex shrink-0 opacity-0 group-hover:opacity-100">
                          <Button variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" title="Checkout" @click.stop="checkoutReflogEntry(e)">Checkout</Button>
                        </span>
                      </li>
                    </ul>
                  </div>
                  <p v-if="reflogByCategory.length === 0" class="m-0 text-xs text-rm-muted py-1 px-2">No matches</p>
                </template>
              </div>
            </div>
          </div>
          </template>
        </div>
        <div class="border-t border-rm-border p-1.5 shrink-0 bg-rm-bg-elevated/50">
          <div class="relative detail-git-widget-dropdown-wrap">
            <Button
              variant="outlined"
              size="small"
              class="w-full justify-between text-xs min-w-0"
              :aria-expanded="widgetDropdownOpen"
              @click="widgetDropdownOpen = !widgetDropdownOpen"
            >
              <span>Widgets</span>
              <svg class="w-3.5 h-3.5 shrink-0" :class="{ 'rotate-180': widgetDropdownOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </Button>
            <div
              v-if="widgetDropdownOpen"
              class="absolute bottom-full left-0 right-0 mb-1 py-1 border border-rm-border bg-rm-surface shadow-lg z-20 max-h-64 overflow-y-auto"
              role="menu"
            >
              <p class="px-2 py-1 text-xs font-semibold text-rm-muted uppercase tracking-wide border-b border-rm-border mb-1">Show / hide &amp; order</p>
              <div
                v-for="id in sidebarWidgetOrder"
                :key="id"
                class="flex items-center gap-2 px-2 py-1.5 hover:bg-rm-surface-hover/50 text-xs"
              >
                <Checkbox
                  :model-value="effectiveWidgetVisible(id)"
                  binary
                  :input-id="'widget-visible-' + id"
                  @update:model-value="(v) => setWidgetVisible(id, v)"
                />
                <label :for="'widget-visible-' + id" class="flex-1 truncate cursor-pointer text-rm-text">{{ GIT_SIDEBAR_WIDGET_LABELS[id] || id }}</label>
                <span class="flex gap-0.5 shrink-0">
                  <Button variant="text" size="small" class="p-0.5 min-w-0 rounded text-rm-muted hover:text-rm-text" title="Move up" :disabled="sidebarWidgetOrder.indexOf(id) === 0" @click="moveWidgetUp(id)">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
                  </Button>
                  <Button variant="text" size="small" class="p-0.5 min-w-0 rounded text-rm-muted hover:text-rm-text" title="Move down" :disabled="sidebarWidgetOrder.indexOf(id) === sidebarWidgetOrder.length - 1" @click="moveWidgetDown(id)">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </Button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <Button variant="text" size="small" class="detail-sidebar-resizer shrink-0 min-w-0 p-0 rounded-none border-0 bg-transparent hover:bg-rm-accent/20 active:bg-rm-accent/30 transition-colors self-stretch" aria-label="Resize sidebar" @pointerdown="onGitSidebarResize" />
      <div class="detail-git-center-panel flex-1 min-w-0 overflow-auto border-r border-rm-border">
        <div class="detail-git-commit-table-wrap overflow-auto h-full min-w-0">
          <DataTable
            :value="commitLog"
            dataKey="sha"
            size="small"
            :loading="commitLogLoading"
            tableClass="detail-git-commit-table w-full text-sm border-collapse"
            rowHover
            @row-click="(e) => openCommitDetail(e.data.sha, commitLog.length > 0 && commitLog[0].sha === e.data.sha)"
          >
            <template #empty>
              <p v-if="!commitLogLoading" class="m-0 p-2 text-xs text-rm-muted">No commits.</p>
            </template>
            <Column header="Graph" headerClass="py-2 px-2 w-14" bodyClass="py-1.5 px-2 w-14">
              <template #body="{ data }">
                <span
                  class="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-semibold text-rm-bg bg-rm-accent/80 shrink-0"
                  :title="data.author + (data.authorEmail ? ` <${data.authorEmail}>` : '')"
                >{{ commitAuthorInitials(data.author) }}</span>
              </template>
            </Column>
            <Column header="Commit message" headerClass="py-2 px-2 min-w-[12rem] text-left text-xs font-semibold text-rm-muted uppercase tracking-wide" bodyClass="py-1.5 px-2 truncate max-w-[12rem]">
              <template #body="{ data }">
                <span :title="data.subject">{{ data.subject }}</span>
              </template>
            </Column>
            <Column header="Author" headerClass="py-2 px-2 w-32" bodyClass="py-1.5 px-2 truncate max-w-[8rem] text-rm-muted">
              <template #body="{ data }">
                <span :title="data.authorEmail || data.author">{{ data.author }}</span>
              </template>
            </Column>
            <Column header="Date" headerClass="py-2 px-2 w-24" bodyClass="py-1.5 px-2 text-rm-muted">
              <template #body="{ data }">{{ data.date }}</template>
            </Column>
          </DataTable>
        </div>
      </div>
      <Button variant="text" size="small" class="detail-sidebar-resizer shrink-0 min-w-0 p-0 rounded-none border-0 bg-transparent hover:bg-rm-accent/20 active:bg-rm-accent/30 transition-colors self-stretch" aria-label="Resize right panel" @pointerdown="onGitRightPanelResize" />
      <div class="detail-git-right-panel shrink-0 flex flex-col min-h-0 px-2 py-2" :style="gitRightPanelStyle">
        <div class="detail-git-section-dropdown-row mb-2 flex items-center gap-1.5 relative shrink-0">
          <Select
            v-model="gitRightSection"
            :options="gitSectionOptions"
            option-label="label"
            option-value="value"
            class="detail-git-section-select flex-1 min-w-0 text-xs"
            placeholder="Section"
          >
            <template #value>
              <div v-if="currentSectionOption" class="flex items-center gap-1.5 min-w-0">
                <span v-if="currentSectionOption.icon" class="detail-git-jump-icon shrink-0" v-html="currentSectionOption.icon" aria-hidden="true" />
                <span class="truncate">{{ currentSectionOption.label }}</span>
              </div>
              <span v-else>Section</span>
            </template>
            <template #option="slotProps">
              <div class="flex items-center gap-2">
                <span v-if="slotProps.option.icon" class="detail-git-jump-icon shrink-0" v-html="slotProps.option.icon" aria-hidden="true" />
                <span class="truncate">{{ slotProps.option.label }}</span>
              </div>
            </template>
          </Select>
          <Button v-if="gitSectionDocKey" variant="text" size="small" class="doc-trigger p-1 min-w-0 text-rm-muted hover:text-rm-accent hover:bg-rm-surface-hover text-xs font-normal shrink-0" title="Documentation" aria-label="Documentation" @click="openGitSectionDocs">(i)</Button>
          <Button variant="text" size="small" class="p-1 min-w-0 text-rm-muted hover:text-rm-accent hover:bg-rm-surface-hover shrink-0" title="Configure panel positions (Left / Center / Right)" aria-label="Configure panels" @click="gitPanelConfigOpen = true">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          </Button>
        </div>
        <template v-if="gitRightSection === 'working-tree'">
        <!-- Working tree & commit: header + file sections + commit area -->
        <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
          <!-- Toolbar: Discard | status | actions -->
          <div class="detail-git-toolbar-bar">
            <Button variant="text" size="small" class="p-1.5 min-w-0 text-rm-muted hover:text-rm-warning hover:bg-rm-warning/10" title="Discard all uncommitted changes" :disabled="!hasChanges" @click="discardAll">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </Button>
            <span class="text-xs truncate min-w-0" :class="hasChanges ? 'text-rm-text' : 'text-rm-muted'">
              <template v-if="hasChanges">{{ fileChangesCount }} file {{ fileChangesCount === 1 ? 'change' : 'changes' }} on <code class="px-1.5 py-0.5 bg-rm-accent/15 text-rm-accent text-[11px] font-medium">{{ currentBranch || '…' }}</code></template>
              <template v-else>Working tree clean</template>
            </span>
            <div class="flex items-center gap-1.5 shrink-0">
              <Button variant="outlined" size="small" class="shrink-0 text-[11px]" title="Create a test file to try staging, diff, discard, etc." :disabled="createTestFileLoading" @click="createTestFileAndRefresh">
                {{ createTestFileLoading ? '…' : '+ Test file' }}
              </Button>
              <Button v-if="aiGenerateAvailable" variant="text" size="small" class="p-1.5 min-w-0 text-rm-muted hover:text-rm-accent hover:bg-rm-accent/10 shrink-0" title="Generate commit message (AI)" @click="generateCommitMessage">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9z"/></svg>
              </Button>
            </div>
          </div>
          <!-- View: Path | Tree | options -->
          <div class="detail-git-view-bar">
            <Button variant="text" size="small" class="detail-git-view-toggle text-xs font-medium px-2 py-1 min-w-0" :class="workingTreeView === 'path' ? 'text-rm-accent border-rm-accent/50 bg-rm-accent/10' : 'text-rm-muted hover:text-rm-text'" @click="workingTreeView = 'path'">Path</Button>
            <Button variant="text" size="small" class="detail-git-view-toggle text-xs font-medium px-2 py-1 min-w-0" :class="workingTreeView === 'tree' ? 'text-rm-accent border-rm-accent/50 bg-rm-accent/10' : 'text-rm-muted hover:text-rm-text'" @click="workingTreeView = 'tree'">Tree</Button>
            <template v-if="workingTreeView === 'tree'">
              <label class="flex items-center gap-1.5 text-xs text-rm-text cursor-pointer ml-1">
                <Checkbox v-model="viewAllFiles" binary />
                <span>View all files</span>
              </label>
              <Button v-if="viewAllFiles && workingTreeNested.children?.length" variant="text" size="small" class="text-[11px] p-0 ml-1 min-w-0 text-rm-muted hover:text-rm-accent hover:underline" @click="collapseAllTree">Collapse All</Button>
            </template>
          </div>
          <!-- Tree mode + View all files: single expandable tree -->
          <div v-if="workingTreeView === 'tree' && viewAllFiles" class="detail-git-files-panel flex-1 min-h-0 overflow-y-auto mx-2 mt-2 overflow-hidden flex flex-col">
            <div class="px-2 py-1.5 shrink-0 border-b border-rm-border">
              <span class="detail-git-sidebar-group-header-modern">{{ trackedFilesLoading ? 'Loading…' : (fileCountInTree > 0 ? `${fileCountInTree} file${fileCountInTree === 1 ? '' : 's'}` : 'No files') }}</span>
            </div>
            <div class="px-2 py-1 overflow-y-auto min-h-0 flex-1 text-xs">
              <Message v-if="trackedFilesLoading" severity="secondary" class="py-2 text-xs">{{ viewAllFiles ? 'Loading project files…' : 'Loading…' }}</Message>
              <p v-else-if="!workingTreeFlatRows.length" class="m-0 py-2 text-rm-muted">{{ viewAllFiles ? 'No files in project.' : 'No files to show. Check "View all files" to see every file in the project.' }}</p>
              <ul v-else class="m-0 pl-0 list-none space-y-0">
                <template v-for="row in workingTreeFlatRows" :key="row.key">
                  <li v-if="row.type === 'dir'" class="flex items-center gap-1 py-0.5 cursor-pointer hover:bg-rm-surface-hover/50" :style="{ paddingLeft: row.depth * 12 + 4 + 'px' }" @click="toggleTreeExpand(row.key)">
                    <svg class="w-3 h-3 shrink-0 text-rm-muted transition-transform" :class="{ 'rotate-90': treeExpandedKeys.has(row.key) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                    <span class="truncate text-rm-text font-medium">{{ row.name }}</span>
                  </li>
                  <li v-else class="flex items-center gap-2 py-0.5 group" :style="{ paddingLeft: row.depth * 12 + 4 + 'px' }" @contextmenu.prevent="openFilePathContextMenu($event, row.path)">
                    <Tag v-if="modifiedPathSet.has(row.path)" :value="workingTreeBadge(row.path, porcelainByPath.get(row.path)?.isStaged).label" :severity="workingTreeBadge(row.path, porcelainByPath.get(row.path)?.isStaged).severity" :title="workingTreeBadge(row.path, porcelainByPath.get(row.path)?.isStaged).title" class="detail-git-badge shrink-0" />
                    <span v-else class="shrink-0 w-4 text-center text-rm-muted">·</span>
                    <Button v-if="!workingTreeBadge(row.path, porcelainByPath.get(row.path)?.isStaged ?? false).isDeleted" variant="text" size="small" class="text-left truncate flex-1 min-w-0 p-0 text-rm-text hover:text-rm-accent hover:underline" :title="row.path" @click="openSideBySideDiff(row.path, porcelainByPath.get(row.path)?.isStaged ?? false)">{{ row.name }}</Button>
                    <span v-else class="truncate flex-1 min-w-0 text-rm-muted" :title="row.path">{{ row.name }}</span>
                    <span class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
                      <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 text-rm-accent hover:underline" title="Diff" @click="openSideBySideDiff(row.path, porcelainByPath.get(row.path)?.isStaged ?? false)">Diff</Button>
                      <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 text-rm-accent hover:underline" title="Open in selected editor" @click="openFile(row.path)">Editor</Button>
                      <Button v-if="isGitattributesFile(row.path)" variant="text" size="small" class="text-[10px] p-0 min-w-0 text-rm-accent hover:underline" title="Open in .gitattributes editor" @click="openGitattributesEditor">Edit</Button>
                      <template v-if="modifiedPathSet.has(row.path)">
                        <Button v-if="porcelainByPath.get(row.path)?.isStaged" variant="text" size="small" class="text-[10px] p-0 min-w-0 text-rm-accent hover:underline" @click="unstageFile(row.path)">Unstage</Button>
                        <Button v-else variant="text" size="small" class="text-[10px] p-0 min-w-0 text-rm-accent hover:underline" @click="stageFile(row.path)">Stage</Button>
                        <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 text-rm-warning hover:underline" title="Discard file" @click="discardFile(row.path)">Discard</Button>
                      </template>
                    </span>
                  </li>
                </template>
              </ul>
            </div>
          </div>
          <!-- File staging: Unstaged + Staged (Path mode, or Tree mode with only modified) -->
          <div v-else class="detail-git-files-panel flex-1 min-h-0 overflow-y-auto overflow-hidden flex flex-col">
            <div class="detail-git-file-group detail-git-file-group-unstaged">
              <Button variant="text" size="small" class="detail-git-file-group-header w-full flex items-center justify-between gap-1 text-left min-w-0" :aria-expanded="workingTreeUnstagedOpen" @click="workingTreeUnstagedOpen = !workingTreeUnstagedOpen">
                <span class="detail-git-file-group-label">
                  <span class="detail-git-file-group-title">Unstaged</span>
                  <span class="detail-git-file-group-count">({{ unstaged.length }})</span>
                </span>
                <span class="flex items-center gap-1 shrink-0">
                  <Button v-if="unstaged.length > 0" variant="outlined" size="small" class="text-[10px] px-1.5 py-0.5 min-w-0 border-rm-accent/50 text-rm-accent" @click.stop="stageAll">Stage all</Button>
                  <svg class="w-3.5 h-3.5 shrink-0 text-rm-muted transition-transform" :class="{ 'rotate-180': workingTreeUnstagedOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </Button>
              <div v-show="workingTreeUnstagedOpen" class="detail-git-file-group-content">
                <template v-if="workingTreeView === 'path'">
                  <ul v-if="unstaged.length" class="m-0 mt-1 pl-0 list-none text-xs space-y-1">
                    <li v-for="f in unstaged" :key="'u-' + f" class="flex items-center gap-2 py-0.5" @contextmenu.prevent="openFilePathContextMenu($event, f)">
                      <Tag :value="workingTreeBadge(f, false).label" :severity="workingTreeBadge(f, false).severity" :title="workingTreeBadge(f, false).title" class="detail-git-badge shrink-0" />
                      <Button v-if="!workingTreeBadge(f, false).isDeleted" variant="text" size="small" class="text-left truncate flex-1 min-w-0 p-0 text-rm-text hover:text-rm-accent hover:underline" :title="f" @click="openSideBySideDiff(f, false)">{{ f }}</Button>
                      <span v-else class="truncate flex-1 min-w-0 text-rm-muted" :title="f">{{ f }}</span>
                      <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" title="Diff" @click="openSideBySideDiff(f, false)">Diff</Button>
                      <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" title="Open in selected editor" @click="openFile(f)">Editor</Button>
                      <Button v-if="isGitattributesFile(f)" variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" title="Open in .gitattributes editor" @click="openGitattributesEditor">Edit</Button>
                      <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" @click="stageFile(f)">Stage</Button>
                      <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-warning hover:underline" title="Discard file" @click="discardFile(f)">Discard</Button>
                    </li>
                  </ul>
                  <template v-else>
                    <p class="m-0 py-1.5 text-xs text-rm-muted">No unstaged files.</p>
                    <Button v-if="staged.length > 0" variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="unstageAll">Unstage all and show here</Button>
                  </template>
                </template>
                <template v-else>
                  <ul v-if="workingTreeByDirUnstaged.length" class="m-0 mt-1 pl-0 list-none text-xs space-y-0.5">
                    <template v-for="group in workingTreeByDirUnstaged" :key="'u-' + group.dir">
                      <li class="font-medium text-rm-muted/90 py-0.5">{{ group.dir || '.' }}</li>
                      <li v-for="item in group.items" :key="'u-' + item.path" class="flex items-center gap-2 pl-3 py-0.5" @contextmenu.prevent="openFilePathContextMenu($event, item.path)">
                        <Tag :value="workingTreeBadge(item.path, false).label" :severity="workingTreeBadge(item.path, false).severity" :title="workingTreeBadge(item.path, false).title" class="detail-git-badge shrink-0" />
                        <Button v-if="!workingTreeBadge(item.path, false).isDeleted" variant="text" size="small" class="text-left truncate flex-1 min-w-0 p-0 text-rm-text hover:text-rm-accent hover:underline" :title="item.path" @click="openSideBySideDiff(item.path, false)">{{ item.name }}</Button>
                        <span v-else class="truncate flex-1 min-w-0 text-rm-muted" :title="item.path">{{ item.name }}</span>
                        <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" title="Open in selected editor" @click="openFile(item.path)">Editor</Button>
                        <Button v-if="isGitattributesFile(item.path)" variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" title="Open in .gitattributes editor" @click="openGitattributesEditor">Edit</Button>
                        <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" title="Diff (unstaged)" @click="openSideBySideDiff(item.path, false)">Diff</Button>
                        <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" @click="stageFile(item.path)">Stage</Button>
                        <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-warning hover:underline" @click="discardFile(item.path)">Discard</Button>
                      </li>
                    </template>
                  </ul>
                  <template v-else>
                    <p class="m-0 py-1.5 text-xs text-rm-muted">No unstaged files.</p>
                    <Button v-if="staged.length > 0" variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="unstageAll">Unstage all and show here</Button>
                  </template>
                </template>
              </div>
            </div>
            <div class="detail-git-file-group detail-git-file-group-staged">
              <Button variant="text" size="small" class="detail-git-file-group-header w-full flex items-center justify-between gap-1 text-left min-w-0" :aria-expanded="workingTreeStagedOpen" @click="workingTreeStagedOpen = !workingTreeStagedOpen">
                <span class="detail-git-file-group-label">
                  <span class="detail-git-file-group-title">Staged</span>
                  <span class="detail-git-file-group-count">({{ staged.length }})</span>
                </span>
                <span class="flex items-center gap-1 shrink-0">
                  <Button v-if="staged.length > 0" variant="outlined" size="small" class="text-[10px] px-1.5 py-0.5 min-w-0 border-rm-warning/50 text-rm-warning" @click.stop="unstageAll">Unstage all</Button>
                  <svg class="w-3.5 h-3.5 text-rm-muted transition-transform" :class="{ 'rotate-180': workingTreeStagedOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </Button>
              <div v-show="workingTreeStagedOpen" class="detail-git-file-group-content">
                <template v-if="workingTreeView === 'path'">
                  <ul v-if="staged.length" class="m-0 mt-1 pl-0 list-none text-xs space-y-1">
                    <li v-for="f in staged" :key="'s-' + f" class="flex items-center gap-2 py-0.5" @contextmenu.prevent="openFilePathContextMenu($event, f)">
                      <Tag :value="workingTreeBadge(f, true).label" :severity="workingTreeBadge(f, true).severity" :title="workingTreeBadge(f, true).title" class="detail-git-badge shrink-0" />
                      <span class="truncate flex-1 min-w-0 text-rm-text" :title="f">{{ f }}</span>
                      <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" title="Diff (staged)" @click="openSideBySideDiff(f, true)">Diff</Button>
                      <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" title="Open in selected editor" @click="openFile(f)">Editor</Button>
                      <Button v-if="isGitattributesFile(f)" variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" title="Open in .gitattributes editor" @click="openGitattributesEditor">Edit</Button>
                      <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" @click="unstageFile(f)">Unstage</Button>
                      <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-warning hover:underline" title="Discard file" @click="discardFile(f)">Discard</Button>
                    </li>
                  </ul>
                  <template v-else>
                    <p class="m-0 py-1.5 text-xs text-rm-muted">No staged files.</p>
                    <Button v-if="unstaged.length > 0" variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="stageAll">Stage all changes</Button>
                  </template>
                </template>
                <template v-else>
                  <ul v-if="workingTreeByDirStaged.length" class="m-0 mt-1 pl-0 list-none text-xs space-y-0.5">
                    <template v-for="group in workingTreeByDirStaged" :key="'s-' + group.dir">
                      <li class="font-medium text-rm-muted/90 py-0.5">{{ group.dir || '.' }}</li>
                      <li v-for="item in group.items" :key="'s-' + item.path" class="flex items-center gap-2 pl-3 py-0.5" @contextmenu.prevent="openFilePathContextMenu($event, item.path)">
                        <Tag :value="workingTreeBadge(item.path, true).label" :severity="workingTreeBadge(item.path, true).severity" :title="workingTreeBadge(item.path, true).title" class="detail-git-badge shrink-0" />
                        <span class="truncate flex-1 min-w-0 text-rm-text" :title="item.path">{{ item.name }}</span>
                        <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" title="Diff (staged)" @click="openSideBySideDiff(item.path, true)">Diff</Button>
                        <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" title="Open in selected editor" @click="openFile(item.path)">Editor</Button>
                        <Button v-if="isGitattributesFile(item.path)" variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" title="Open in .gitattributes editor" @click="openGitattributesEditor">Edit</Button>
                        <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-accent hover:underline" @click="unstageFile(item.path)">Unstage</Button>
                        <Button variant="text" size="small" class="text-[10px] p-0 min-w-0 shrink-0 text-rm-warning hover:underline" @click="discardFile(item.path)">Discard</Button>
                      </li>
                    </template>
                  </ul>
                  <template v-else>
                    <p class="m-0 py-1.5 text-xs text-rm-muted">No staged files.</p>
                    <Button v-if="unstaged.length > 0" variant="text" size="small" class="text-xs p-0 min-w-0 text-rm-accent hover:underline" @click="stageAll">Stage all changes</Button>
                  </template>
                </template>
              </div>
            </div>
          </div>
          <!-- Commit section: card layout with clear structure -->
          <div class="detail-git-commit-card mt-2 shrink-0">
            <div class="detail-git-commit-card-head">Commit</div>
            <div class="detail-git-commit-card-body">
              <div class="detail-git-commit-row detail-git-commit-summary-row">
                <label class="detail-git-commit-label">
                  <span>Summary</span>
                  <span class="detail-git-commit-count">{{ commitSummary.length }}/72</span>
                </label>
                <div class="detail-git-commit-summary-wrap">
                  <Textarea
                    v-model="commitSummary"
                    class="detail-git-commit-summary-input"
                    rows="2"
                    placeholder="e.g. feat: add X"
                    maxlength="72"
                  />
                  <Button v-if="aiGenerateAvailable" variant="text" size="small" class="detail-git-commit-ai-btn min-w-0" title="Generate commit message (AI)" @click="generateCommitMessage">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9z"/></svg>
                  </Button>
                </div>
              </div>
              <div class="detail-git-commit-row">
                <label class="detail-git-commit-label">Description <span class="text-rm-muted font-normal">(optional)</span></label>
                <Textarea
                  v-model="commitDescription"
                  class="detail-git-commit-desc-input"
                  rows="3"
                  placeholder="Add more context…"
                />
              </div>
              <div class="detail-git-commit-options">
                <label class="detail-git-commit-option">
                  <Checkbox v-model="amendCommit" binary />
                  <span>Amend</span>
                </label>
                <label class="detail-git-commit-option">
                  <Checkbox v-model="signCommit" binary />
                  <span>Sign</span>
                </label>
              </div>
              <div class="detail-git-commit-actions">
                <Button
                  severity="primary"
                  size="small"
                  class="detail-git-commit-submit"
                  :disabled="!canCommit"
                  @click="commit"
                >
                  {{ staged.length > 0 ? `Commit ${staged.length} file${staged.length === 1 ? '' : 's'}` : 'Commit' }}
                </Button>
                <Button severity="secondary" size="small" class="shrink-0 py-2 px-2.5 text-xs" title="Push" @click="pushFromFooter">Push</Button>
              </div>
              <p v-if="gitActionStatus" class="detail-git-commit-status">{{ gitActionStatus }}</p>
            </div>
          </div>
        </div>
        </template>
        <div v-else class="overflow-y-auto flex-1 min-h-0 border border-rm-border bg-rm-surface/20 p-2">
          <component
            :is="currentGitPanelComponent?.component"
            v-if="currentGitPanelComponent?.component"
            v-bind="currentGitPanelComponent?.props || {}"
            @refresh="gitRightSection === 'stash' ? onStashCardRefresh() : $emit('refresh')"
          />
        </div>
      </div>
      <!-- Right zone: panels with position "right" -->
      <div v-if="rightPanelOptions.length > 0" class="detail-git-right-zone-panel shrink-0 w-56 min-h-0 flex flex-col border-l border-rm-border bg-rm-bg-elevated/30 overflow-hidden">
        <div class="p-1.5 border-b border-rm-border shrink-0">
          <Select
            v-model="gitRightPanelSection"
            :options="rightPanelOptions"
            option-label="label"
            option-value="value"
            class="detail-git-section-select w-full text-xs"
            placeholder="Panel"
          >
            <template #value>
              <div v-if="currentRightSectionOption" class="flex items-center gap-1.5 min-w-0">
                <span v-if="currentRightSectionOption.icon" class="detail-git-jump-icon shrink-0" v-html="currentRightSectionOption.icon" aria-hidden="true" />
                <span class="truncate">{{ currentRightSectionOption.label }}</span>
              </div>
              <span v-else>Panel</span>
            </template>
            <template #option="slotProps">
              <div class="flex items-center gap-2">
                <span v-if="slotProps.option.icon" class="detail-git-jump-icon shrink-0" v-html="slotProps.option.icon" aria-hidden="true" />
                <span class="truncate">{{ slotProps.option.label }}</span>
              </div>
            </template>
          </Select>
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto p-2">
          <component
            :is="currentRightPanelComponent?.component"
            v-if="currentRightPanelComponent?.component"
            v-bind="currentRightPanelComponent?.props || {}"
            @refresh="$emit('refresh')"
          />
        </div>
      </div>
      </div>
    </div>
    </div>
    </div>
    <Teleport to="body">
      <div
        v-if="branchContextMenu"
        class="git-branch-context-menu fixed z-[10000] min-w-[11rem] py-1 border border-rm-border bg-rm-surface shadow-lg text-sm"
        :style="{ left: branchContextMenu.x + 'px', top: branchContextMenu.y + 'px' }"
        role="menu"
      >
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="!branchContextMenu.isRemote"
          @click="contextMenuCheckout"
        >
          Checkout
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="branchContextMenu.isRemote"
          @click="contextMenuCheckoutRemote"
        >
          Checkout (track remote)
        </Button>
        <template v-if="branchContextMenuBranchIsCurrent">
          <div class="border-t border-rm-border my-1" role="separator"></div>
          <Button
            variant="text"
            size="small"
            class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
            role="menuitem"
            @click="contextMenuBranchPull"
          >
            Pull (fast-forward if possible)
          </Button>
          <Button
            variant="text"
            size="small"
            class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
            role="menuitem"
            @click="contextMenuBranchPush"
          >
            Push
          </Button>
          <Button
            variant="text"
            size="small"
            class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
            role="menuitem"
            v-if="!branchContextMenu.isRemote && api.setBranchUpstream"
            @click="contextMenuSetUpstream"
          >
            Set Upstream
          </Button>
        </template>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuCreateBranchFrom"
        >
          Create branch from this…
        </Button>
        <template v-if="!branchContextMenu.isRemote && branchContextMenu.branch !== currentBranch && api.gitReset">
          <Button
            variant="text"
            size="small"
            class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
            role="menuitem"
            @click="contextMenuResetToHere('soft')"
          >
            Reset current branch to here (soft)
          </Button>
          <Button
            variant="text"
            size="small"
            class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
            role="menuitem"
            @click="contextMenuResetToHere('mixed')"
          >
            Reset current branch to here (mixed)
          </Button>
          <Button
            variant="text"
            size="small"
            class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-warning hover:bg-rm-surface-hover"
            role="menuitem"
            @click="contextMenuResetToHere('hard')"
          >
            Reset current branch to here (hard)
          </Button>
        </template>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="!branchContextMenu.isRemote && branchContextMenuBranchIsCurrent && api.gitAmend"
          @click="contextMenuAmendCommit"
        >
          Amend last commit…
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="!branchContextMenu.isRemote && api.createTag"
          @click="contextMenuCreateTagHere(false)"
        >
          Create tag here
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="!branchContextMenu.isRemote && api.createTag"
          @click="contextMenuCreateTagHere(true)"
        >
          Create annotated tag here
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="!branchContextMenu.isRemote && branchContextMenu.branch !== currentBranch && api.renameBranch"
          @click="contextMenuRenameBranch"
        >
          Rename {{ branchContextMenu.branch }}
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="!branchContextMenu.isRemote && branchContextMenu.branch !== currentBranch"
          @click="contextMenuDeleteBranch"
        >
          Delete {{ branchContextMenu.branch }}
        </Button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuCopyBranchName"
        >
          Copy branch name
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.getBranchRevision"
          @click="contextMenuCopyCommitSha"
        >
          Copy commit SHA
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuCopyBranchLink"
        >
          Copy link to branch
        </Button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.gitStashPush"
          @click="contextMenuStashPush"
        >
          Stash
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.gitStashPop"
          @click="contextMenuStashPop"
        >
          Pop stash
        </Button>
      </div>
      <div
        v-if="remoteContextMenu"
        class="git-branch-context-menu fixed z-[10000] min-w-[11rem] py-1 border border-rm-border bg-rm-surface shadow-lg text-sm"
        :style="{ left: remoteContextMenu.x + 'px', top: remoteContextMenu.y + 'px' }"
        role="menu"
      >
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuRemoteFetch"
        >
          Fetch
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.gitPruneRemotes"
          @click="contextMenuRemotePrune"
        >
          Prune remotes
        </Button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuRemoteRefresh"
        >
          Refresh list
        </Button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.gitStashPush"
          @click="contextMenuStashPush"
        >
          Stash
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.gitStashPop"
          @click="contextMenuStashPop"
        >
          Pop stash
        </Button>
      </div>
      <div
        v-if="tagContextMenu"
        class="git-branch-context-menu fixed z-[10000] min-w-[11rem] py-1 border border-rm-border bg-rm-surface shadow-lg text-sm"
        :style="{ left: tagContextMenu.x + 'px', top: tagContextMenu.y + 'px' }"
        role="menu"
      >
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuCheckoutTag"
        >
          Checkout
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuPushTag"
        >
          Push to origin
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-warning hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuDeleteTag"
        >
          Delete tag
        </Button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.gitStashPush"
          @click="contextMenuStashPush"
        >
          Stash
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.gitStashPop"
          @click="contextMenuStashPop"
        >
          Pop stash
        </Button>
      </div>
      <div
        v-if="worktreeContextMenu"
        class="git-branch-context-menu fixed z-[10000] min-w-[11rem] py-1 border border-rm-border bg-rm-surface shadow-lg text-sm"
        :style="{ left: worktreeContextMenu.x + 'px', top: worktreeContextMenu.y + 'px' }"
        role="menu"
      >
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuRevealWorktree"
        >
          Reveal in Finder
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="!isCurrentWorktree(worktreeContextMenu.worktree?.path)"
          @click="contextMenuRemoveWorktree"
        >
          Remove worktree
        </Button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.gitStashPush"
          @click="contextMenuStashPush"
        >
          Stash
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.gitStashPop"
          @click="contextMenuStashPop"
        >
          Pop stash
        </Button>
      </div>
      <div
        v-if="submoduleContextMenu"
        class="git-branch-context-menu fixed z-[10000] min-w-[11rem] py-1 border border-rm-border bg-rm-surface shadow-lg text-sm"
        :style="{ left: submoduleContextMenu.x + 'px', top: submoduleContextMenu.y + 'px' }"
        role="menu"
      >
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuOpenSubmodulesSection"
        >
          Open Submodules section
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuRevealSubmodule"
        >
          Reveal in Finder
        </Button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.gitStashPush"
          @click="contextMenuStashPush"
        >
          Stash
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.gitStashPop"
          @click="contextMenuStashPop"
        >
          Pop stash
        </Button>
      </div>
      <div
        v-if="reflogContextMenu"
        class="git-branch-context-menu fixed z-[10000] min-w-[11rem] py-1 border border-rm-border bg-rm-surface shadow-lg text-sm"
        :style="{ left: reflogContextMenu.x + 'px', top: reflogContextMenu.y + 'px' }"
        role="menu"
      >
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuOpenReflogSection"
        >
          Open Reflog section
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuCheckoutReflog"
        >
          Checkout (detached HEAD)
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuCopyReflogSha"
        >
          Copy SHA
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuCopyReflogRef"
        >
          Copy ref (e.g. HEAD@&#123;1&#125;)
        </Button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.gitStashPush"
          @click="contextMenuStashPush"
        >
          Stash
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.gitStashPop"
          @click="contextMenuStashPop"
        >
          Pop stash
        </Button>
      </div>
      <div
        v-if="filePathContextMenu"
        class="git-branch-context-menu fixed z-[10000] min-w-[12rem] py-1 border border-rm-border bg-rm-surface shadow-lg text-sm"
        :style="{ left: filePathContextMenu.x + 'px', top: filePathContextMenu.y + 'px' }"
        role="menu"
      >
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuCopyFilePath"
        >
          Copy path
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          @click="contextMenuCopyFullPath"
        >
          Copy full path
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.openPathInFinder"
          @click="contextMenuRevealFilePath"
        >
          Reveal in Finder
        </Button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.gitStashPush"
          @click="contextMenuStashPush"
        >
          Stash
        </Button>
        <Button
          variant="text"
          size="small"
          class="git-context-menu-item w-full justify-start px-3 py-1.5 min-w-0 text-rm-text hover:bg-rm-surface-hover"
          role="menuitem"
          v-if="api.gitStashPop"
          @click="contextMenuStashPop"
        >
          Pop stash
        </Button>
      </div>
    </Teleport>
    <Dialog
      v-model:visible="gitPanelConfigOpen"
      header="Git panels"
      :style="{ width: '32rem' }"
      :modal="true"
      :dismissableMask="true"
      class="git-panel-config-dialog"
    >
      <p class="text-sm text-rm-muted mb-3">Enable or disable each panel, set position (Left / Center / Right), and optionally set a custom name.</p>
      <div class="flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
        <div
          v-for="plugin in gitPanelPositions.allPluginsWithConfig"
          :key="plugin.id"
          class="flex flex-wrap items-center gap-2 py-2 border-b border-rm-border last:border-b-0"
        >
          <Checkbox
            :modelValue="plugin.enabled"
            binary
            :inputId="'panel-enabled-' + plugin.id"
            class="shrink-0"
            @update:modelValue="(v) => gitPanelPositions.setEnabled(plugin.id, v)"
          />
          <span v-if="plugin.icon" class="shrink-0 w-5 h-5 text-rm-muted [&_svg]:w-full [&_svg]:h-full" v-html="plugin.icon" aria-hidden="true" />
          <InputText
            :modelValue="plugin.displayLabel"
            class="flex-1 min-w-[8rem] text-sm py-1"
            placeholder="Name"
            :disabled="!plugin.enabled"
            @update:modelValue="(v) => gitPanelPositions.setLabel(plugin.id, v)"
          />
          <Select
            :modelValue="plugin.position"
            :options="POSITION_OPTIONS"
            optionLabel="label"
            optionValue="value"
            class="w-24 shrink-0 text-xs"
            :disabled="!plugin.enabled"
            @update:modelValue="(v) => gitPanelPositions.setPosition(plugin.id, v)"
          />
          <Button
            variant="text"
            size="small"
            class="text-xs p-1 min-w-0 text-rm-muted hover:text-rm-accent shrink-0"
            title="Reset to default (enabled, center, default name)"
            @click="gitPanelPositions.resetPanel(plugin.id)"
          >
            Reset
          </Button>
        </div>
      </div>
    </Dialog>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { useAppStore } from '../../stores/app';
import { useApi } from '../../composables/useApi';
import { useModals } from '../../composables/useModals';
import { useResizableSidebar } from '../../composables/useResizableSidebar';
import { useAiGenerateAvailable } from '../../composables/useAiGenerateAvailable';
import { useGitSidebar } from '../../composables/useGitSidebar';
import { useGitPanelPositions } from '../../composables/useGitPanelPositions';
import { getGitPanelPlugin, POSITION_OPTIONS } from '../../plugins/gitPanels/registry';
import { getGitPanelIcon } from '../../plugins/gitPanels/icons';
import { formatAheadBehind } from '../../utils';
import { GIT_ACTION_CONFIRMS, GIT_ACTION_SUCCESS } from '../../constants';
const props = defineProps({ info: { type: Object, default: null } });
const emit = defineEmits(['refresh']);

const store = useAppStore();
const api = useApi();
const modals = useModals();
const gitPanelPositions = useGitPanelPositions(api);
const { sidebarStyle: gitSidebarStyle, onResizerPointerDown: onGitSidebarResize } = useResizableSidebar({
  preferenceKey: 'detailSidebarWidthGit',
  defaultWidth: 208,
  minWidth: 180,
  maxWidth: 360,
});
const { sidebarStyle: gitRightPanelStyle, onResizerPointerDown: onGitRightPanelResize } = useResizableSidebar({
  preferenceKey: 'detailRightPanelWidthGit',
  defaultWidth: 320,
  minWidth: 240,
  maxWidth: 560,
  rightSide: true,
});
const { aiGenerateAvailable } = useAiGenerateAvailable();
const sidebar = useGitSidebar(store, () => props.info);
const {
  branches,
  tags,
  remoteBranches,
  remoteBranchesLoaded,
  remoteBranchesLoading,
  worktrees,
  selectedBranch,
  gitFilter,
  stashListEntries,
  submodules,
  reflogEntries,
  reflogLoaded,
  reflogLoading,
  reflogCategoryOpen,
  reflogSearch,
  submoduleSearch,
  sidebarLocalOpen,
  sidebarRemoteOpen,
  sidebarWorktreesOpen,
  sidebarTagsOpen,
  sidebarSubmodulesOpen,
  sidebarReflogOpen,
  sidebarStashOpen,
  sidebarWidgetOrder,
  sidebarWidgetVisible,
  widgetDropdownOpen,
  draggedWidgetId,
  widgetDropTarget,
  branchDragPayload,
  branchDropTarget,
  branchSelectOptions,
  filteredBranches,
  filteredTags,
  filteredRemoteBranches,
  filteredSubmodules,
  filteredSubmodulesBySearch,
  filteredReflogBySearch,
  reflogByCategory,
  worktreesSummary,
  visibleOrderedWidgetIds,
  hasMultipleVisibleWidgets,
  widgetHasContent,
  effectiveWidgetVisible,
  isCurrentWorktree,
  worktreeLabel,
  reflogEntryLabel,
  toggleReflogCategory,
  loadStashList,
  loadRemoteBranches,
  loadReflogOnly,
  loadTagsOnly,
  loadWorktreesOnly,
  loadSubmodulesOnly,
  refetchBranches,
  loadGitSidebarWidgetPrefs,
  moveWidgetUp,
  moveWidgetDown,
  setWidgetVisible,
  onWidgetDragStart,
  onWidgetDragOver,
  onWidgetDragLeave,
  onWidgetDrop,
  onWidgetDragEnd,
  onBranchDragStart,
  onBranchDragOver,
  onBranchDragLeave,
  onBranchDragEnd,
  isWidgetDropBefore,
  isWidgetDropAfter,
  BRANCH_DRAG_TYPE,
  GIT_SIDEBAR_WIDGET_IDS,
  GIT_SIDEBAR_WIDGET_LABELS,
} = sidebar;
const DEFAULT_PULL_MODE_KEY = 'defaultPullMode';
const defaultPullMode = ref('merge');
const pullOptions = [
  { mode: 'fetch', label: 'Fetch All' },
  { mode: 'merge', label: 'Pull (fast-forward if possible)' },
  { mode: 'ff-only', label: 'Pull (fast-forward only)' },
  { mode: 'rebase', label: 'Pull (rebase)' },
];
const branchSelectRef = ref(null);
const commitSummary = ref('');
const commitDescription = ref('');
const gitActionStatus = ref('');
const commitLog = ref([]);
const commitLogLoading = ref(false);
const gitUser = ref({ name: '', email: '' });
const amendCommit = ref(false);
const signCommit = ref(false);
const gitRightSection = ref('working-tree');
const gitPanelConfigOpen = ref(false);
const branchContextMenu = ref(null);
const filePathContextMenu = ref(null);
const remoteContextMenu = ref(null);
const tagContextMenu = ref(null);
const worktreeContextMenu = ref(null);
const submoduleContextMenu = ref(null);
const reflogContextMenu = ref(null);
const workingTreeView = ref('path');
const viewAllFiles = ref(false);
const trackedFilesList = ref([]);
const trackedFilesLoading = ref(false);
const treeExpandedKeys = ref(new Set());
const createTestFileLoading = ref(false);
const workingTreeUnstagedOpen = ref(true);
const workingTreeStagedOpen = ref(true);
const initLoading = ref(false);
const initError = ref('');
const currentSectionOption = computed(() => (gitSectionOptions.value || []).find((o) => o.value === gitRightSection.value) || null);

function gitSectionIcon(name) {
  return getGitPanelIcon(name);
}
function sidebarWidgetIcon(widgetId) {
  const key = widgetId === 'local-branches' ? 'branch-sync' : widgetId === 'remote' ? 'remotes' : widgetId;
  return getGitPanelIcon(key);
}
function onStashCardRefresh() {
  loadStashList();
  emit('refresh');
}
const gitSectionOptions = computed(() => {
  const result = gitPanelPositions.sectionOptionsForZone?.('center');
  return Array.isArray(result) ? result : [];
});
const leftPanelOptions = computed(() => {
  const result = gitPanelPositions.sectionOptionsForZone?.('left');
  return Array.isArray(result) ? result : [];
});
const rightPanelOptions = computed(() => {
  const result = gitPanelPositions.sectionOptionsForZone?.('right');
  return Array.isArray(result) ? result : [];
});

const gitLeftPanelSection = ref(null);
const gitRightPanelSection = ref(null);

watch(
  leftPanelOptions,
  (opts) => {
    if (!Array.isArray(opts) || opts.length === 0) {
      gitLeftPanelSection.value = null;
      return;
    }
    const ids = opts.map((o) => o.value);
    if (!gitLeftPanelSection.value || !ids.includes(gitLeftPanelSection.value)) gitLeftPanelSection.value = ids[0];
  },
  { immediate: true }
);
watch(
  rightPanelOptions,
  (opts) => {
    if (!Array.isArray(opts) || opts.length === 0) {
      gitRightPanelSection.value = null;
      return;
    }
    const ids = opts.map((o) => o.value);
    if (!gitRightPanelSection.value || !ids.includes(gitRightPanelSection.value)) gitRightPanelSection.value = ids[0];
  },
  { immediate: true }
);

const currentLeftSectionOption = computed(() => {
  const id = gitLeftPanelSection.value;
  if (!id) return null;
  const opts = leftPanelOptions.value;
  return Array.isArray(opts) ? opts.find((o) => o.value === id) : null;
});
const currentRightSectionOption = computed(() => {
  const id = gitRightPanelSection.value;
  if (!id) return null;
  const opts = rightPanelOptions.value;
  return Array.isArray(opts) ? opts.find((o) => o.value === id) : null;
});

function getGitPanelProps(sectionId) {
  const plugin = getGitPanelPlugin(sectionId);
  const base = {
    panelTitle: plugin?.label ?? sectionId,
    panelIcon: getGitPanelIcon(sectionId),
  };
  if (sectionId === 'merge-rebase' || sectionId === 'delete-branch') return { ...base, currentBranch: currentBranch.value };
  if (sectionId === 'bisect') return { ...base, info: props.info };
  return base;
}
const currentGitPanelComponent = computed(() => {
  const id = gitRightSection.value;
  const plugin = getGitPanelPlugin(id);
  if (!plugin || !plugin.component) return null;
  return { component: plugin.component, props: getGitPanelProps(id) };
});

const currentLeftPanelComponent = computed(() => {
  const id = gitLeftPanelSection.value;
  if (!id) return null;
  const plugin = getGitPanelPlugin(id);
  if (!plugin || !plugin.component) return null;
  return { component: plugin.component, props: getGitPanelProps(id) };
});
const currentRightPanelComponent = computed(() => {
  const id = gitRightPanelSection.value;
  if (!id) return null;
  const plugin = getGitPanelPlugin(id);
  if (!plugin || !plugin.component) return null;
  return { component: plugin.component, props: getGitPanelProps(id) };
});

watch(
  gitSectionOptions,
  (opts) => {
    if (!Array.isArray(opts) || opts.length === 0) return;
    const ids = opts.map((o) => o.value);
    if (!ids.includes(gitRightSection.value)) gitRightSection.value = ids[0];
  },
  { immediate: true }
);

const GIT_SECTION_DOC_KEYS = new Set(['working-tree', 'branch-sync', 'merge-rebase', 'stash', 'tags', 'reflog', 'delete-branch', 'remotes', 'compare-reset', 'gitignore', 'gitattributes', 'submodules', 'worktrees', 'bisect']);
const gitSectionDocKey = computed(() => (GIT_SECTION_DOC_KEYS.has(gitRightSection.value) ? gitRightSection.value : null));

function openGitSectionDocs() {
  if (gitSectionDocKey.value) modals.openModal('docs', { docKey: gitSectionDocKey.value });
}

const currentBranch = computed(() => props.info?.branch || '');
const branchContextMenuBranchIsCurrent = computed(() => {
  const m = branchContextMenu.value;
  if (!m?.branch) return false;
  if (!m.isRemote) return m.branch === currentBranch.value;
  const localName = m.branch.replace(/^[^/]+\//, '');
  return localName === currentBranch.value;
});
const aheadBehind = computed(() => formatAheadBehind(props.info?.ahead, props.info?.behind));
const lines = computed(() => props.info?.uncommittedLines || []);
const isParsed = computed(() => lines.value.length > 0 && typeof lines.value[0] === 'object' && lines.value[0] !== null && 'filePath' in lines.value[0]);
const unstaged = computed(() => (isParsed.value ? lines.value.filter((l) => l.hasUnstaged) : []).map((l) => l.filePath));
const staged = computed(() => (isParsed.value ? lines.value.filter((l) => l.isStaged) : []).map((l) => l.filePath));
const hasChanges = computed(() => unstaged.value.length > 0 || staged.value.length > 0);
const canCommit = computed(() => (commitSummary.value.trim().length > 0 && staged.value.length > 0) || (commitSummary.value.trim().length > 0 && unstaged.value.length > 0));
const porcelainByPath = computed(() => {
  const map = new Map();
  if (!isParsed.value) return map;
  for (const l of lines.value) {
    if (l && typeof l.filePath === 'string') map.set(l.filePath, l);
  }
  return map;
});

function getPorcelainCodeForPath(filePath, isStaged) {
  const line = porcelainByPath.value.get(filePath);
  if (!line || typeof line.status !== 'string') return isStaged ? 'M' : '+';
  if (line.isUntracked) return '?';
  const status = (line.status || '').padEnd(2, ' ');
  return isStaged ? status[0] : status[1];
}

function workingTreeBadge(filePath, isStaged) {
  const code = getPorcelainCodeForPath(filePath, isStaged);
  const byCode = {
    D: { label: 'D', severity: 'danger', title: 'Deleted', isDeleted: true },
    M: { label: 'M', severity: 'warn', title: 'Modified', isDeleted: false },
    A: { label: '+', severity: 'success', title: 'Added', isDeleted: false },
    '?': { label: '?', severity: 'info', title: 'Untracked', isDeleted: false },
    R: { label: 'R', severity: 'success', title: 'Renamed', isDeleted: false },
    C: { label: 'C', severity: 'success', title: 'Copied', isDeleted: false },
    U: { label: 'U', severity: 'danger', title: 'Unmerged (conflict)', isDeleted: false },
    T: { label: 'T', severity: 'warn', title: 'Type changed', isDeleted: false },
    '!': { label: '!', severity: 'secondary', title: 'Ignored', isDeleted: false },
  };
  const fallback = { label: isStaged ? 'M' : '+', severity: isStaged ? 'warn' : 'success', title: 'Changed', isDeleted: false };
  return byCode[code] ?? fallback;
}
const uncommittedLabel = computed(() => {
  const u = unstaged.value.length;
  const s = staged.value.length;
  if (u === 0 && s === 0) return 'Working tree clean.';
  return `${u} unstaged, ${s} staged.`;
});

const fileChangesCount = computed(() => unstaged.value.length + staged.value.length);

const repoName = computed(() => {
  const name = props.info?.name;
  const path = store.selectedPath;
  if (name) return String(name).slice(0, 24);
  if (path) return path.replace(/\\/g, '/').split('/').filter(Boolean).pop()?.slice(0, 24) || '—';
  return '—';
});

async function onBranchDrop(e, targetBranch) {
  const raw = e.dataTransfer.getData(BRANCH_DRAG_TYPE);
  e.preventDefault();
  e.stopPropagation();
  branchDropTarget.value = null;
  branchDragPayload.value = null;
  if (!raw) return;
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }
  const { ref: mergeRef, isRemote } = payload;
  if (!mergeRef || !targetBranch) return;
  const path = store.selectedPath;
  if (!path || !api.gitMerge) return;
  const isSame = isRemote ? (targetBranch === mergeRef.replace(/^[^/]+\//, '')) : (targetBranch === mergeRef);
  if (isSame) return;
  const confirmMessage =
    currentBranch.value === targetBranch
      ? `Merge ${mergeRef} into ${targetBranch}?`
      : `Check out ${targetBranch} and merge ${mergeRef} into it?`;
  if (!window.confirm(confirmMessage)) return;
  if (currentBranch.value !== targetBranch) {
    if (hasUncommitted.value) {
      runCheckoutWithStashOption(
        async () => {
          await api.checkoutBranch?.(path, targetBranch);
          const result = await api.gitMerge(path, mergeRef);
          if (result?.ok) {
            gitActionStatus.value = `Merged ${mergeRef} into ${targetBranch}.`;
            await refetchBranches();
            emit('refresh');
          } else {
            gitActionStatus.value = result?.error || 'Merge failed.';
          }
        },
        () => {}
      );
      return;
    }
    try {
      await api.checkoutBranch?.(path, targetBranch);
    } catch (err) {
      gitActionStatus.value = err?.message || 'Checkout failed.';
      return;
    }
  }
  try {
    const result = await api.gitMerge(path, mergeRef);
    if (result?.ok) {
      gitActionStatus.value = `Merged ${mergeRef} into ${targetBranch}.`;
      await refetchBranches();
      emit('refresh');
    } else {
      gitActionStatus.value = result?.error || 'Merge failed.';
    }
  } catch (err) {
    gitActionStatus.value = err?.message || 'Merge failed.';
  }
}

/** Group working tree files by directory for Tree view. Returns [ { dir, items } ] sorted by dir. */
const workingTreeByDir = computed(() => {
  const map = {};
  const add = (path, staged) => {
    const i = path.lastIndexOf('/');
    const dir = i >= 0 ? path.slice(0, i) : '';
    const name = i >= 0 ? path.slice(i + 1) : path;
    if (!map[dir]) map[dir] = [];
    map[dir].push({ path, name, staged });
  };
  unstaged.value.forEach((f) => add(f, false));
  staged.value.forEach((f) => add(f, true));
  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
    .map(([dir, items]) => ({ dir, items }));
});

const workingTreeByDirUnstaged = computed(() =>
  workingTreeByDir.value.map((g) => ({ dir: g.dir, items: g.items.filter((i) => !i.staged) })).filter((g) => g.items.length > 0)
);
const workingTreeByDirStaged = computed(() =>
  workingTreeByDir.value.map((g) => ({ dir: g.dir, items: g.items.filter((i) => i.staged) })).filter((g) => g.items.length > 0)
);

const modifiedPathSet = computed(() => {
  const set = new Set();
  unstaged.value.forEach((p) => set.add(p));
  staged.value.forEach((p) => set.add(p));
  return set;
});

/** Paths to show in tree: all tracked when viewAllFiles, else only modified. */
const workingTreePathsForTree = computed(() => {
  if (viewAllFiles.value && trackedFilesList.value.length > 0) {
    return trackedFilesList.value;
  }
  return [...new Set([...unstaged.value, ...staged.value])];
});

/** Build nested tree { children: [ { name, key, path?, children? } ] } from path list. */
function buildNestedTree(paths) {
  const root = { key: '', children: [] };
  const dirNodes = new Map();
  dirNodes.set('', root);
  const sortKey = (n) => (n.path != null ? `1${n.name}` : `0${n.name}`);
  for (const filePath of paths) {
    const parts = filePath.split('/');
    let dirKey = '';
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const parentKey = dirKey;
      dirKey = dirKey ? `${dirKey}/${part}` : part;
      if (!dirNodes.has(dirKey)) {
        const node = { name: part, key: dirKey, children: [] };
        dirNodes.set(dirKey, node);
        const parent = dirNodes.get(parentKey);
        if (parent) parent.children.push(node);
      }
    }
    const fileName = parts[parts.length - 1];
    const parent = dirNodes.get(dirKey);
    if (parent && !parent.children.some((c) => c.path === filePath)) {
      parent.children.push({ name: fileName, key: filePath, path: filePath });
    }
  }
  function sortNode(n) {
    if (n.children) {
      n.children.sort((a, b) => sortKey(a).localeCompare(sortKey(b), undefined, { sensitivity: 'base' }));
      n.children.forEach(sortNode);
    }
  }
  sortNode(root);
  return root;
}

const workingTreeNested = computed(() => buildNestedTree(workingTreePathsForTree.value));

/** Flatten tree into rows for rendering; only include children of expanded dirs. */
const workingTreeFlatRows = computed(() => {
  const rows = [];
  const expanded = treeExpandedKeys.value;
  function walk(nodes, depth) {
    if (!nodes) return;
    for (const node of nodes) {
      if (node.path != null) {
        rows.push({ type: 'file', key: node.key, name: node.name, path: node.path, depth });
      } else {
        rows.push({ type: 'dir', key: node.key, name: node.name, depth });
        if (expanded.has(node.key)) walk(node.children, depth + 1);
      }
    }
  }
  walk(workingTreeNested.value.children, 0);
  return rows;
});

const fileCountInTree = computed(() => workingTreePathsForTree.value.length);

function toggleTreeExpand(key) {
  const s = new Set(treeExpandedKeys.value);
  if (s.has(key)) s.delete(key);
  else s.add(key);
  treeExpandedKeys.value = s;
}

function collapseAllTree() {
  treeExpandedKeys.value = new Set();
}

watch([viewAllFiles, workingTreeView], () => {
  if (viewAllFiles.value && workingTreeView.value === 'tree' && store.selectedPath) {
    loadTrackedFiles();
  } else if (!viewAllFiles.value) {
    trackedFilesList.value = [];
  }
}, { immediate: true });

watch(() => store.selectedPath, (path) => {
  if (!path || !viewAllFiles.value) {
    trackedFilesList.value = [];
    return;
  }
  if (workingTreeView.value === 'tree') loadTrackedFiles();
});

async function loadTrackedFiles() {
  const path = store.selectedPath;
  const useProjectFiles = viewAllFiles.value && api.getProjectFiles;
  if (!path || (!api.getTrackedFiles && !useProjectFiles)) return;
  trackedFilesLoading.value = true;
  try {
    const res = useProjectFiles
      ? await api.getProjectFiles(path)
      : await api.getTrackedFiles(path);
    if (store.selectedPath !== path) return;
    const list = res?.ok && Array.isArray(res.files) ? res.files : [];
    trackedFilesList.value = list;
    if (list.length > 0) {
      nextTick(() => {
        if (store.selectedPath !== path) return;
        const root = workingTreeNested.value;
        const firstLevelDirKeys = (root?.children || []).filter((n) => n.path == null).map((n) => n.key);
        if (firstLevelDirKeys.length) treeExpandedKeys.value = new Set(firstLevelDirKeys);
      });
    }
  } catch {
    if (store.selectedPath !== path) return;
    trackedFilesList.value = [];
  } finally {
    if (store.selectedPath === path) trackedFilesLoading.value = false;
  }
}

function onPullModeChange(mode) {
  setDefaultPullAndRun(mode);
}

watch(() => store.selectedPath, () => {
  commitLog.value = [];
  gitUser.value = { name: '', email: '' };
  trackedFilesList.value = [];
  treeExpandedKeys.value = new Set();
  gitActionStatus.value = '';
}, { immediate: false });

watch(() => props.info?.path, () => { loadCommitLog(); loadGitUser(); }, { immediate: true });

async function loadCommitLog() {
  const path = store.selectedPath;
  if (!path || !api.getCommitLog) return;
  commitLogLoading.value = true;
  try {
    const result = await api.getCommitLog(path, 50);
    if (store.selectedPath !== path) return;
    commitLog.value = result?.ok && Array.isArray(result.commits) ? result.commits : [];
  } catch {
    if (store.selectedPath !== path) return;
    commitLog.value = [];
  } finally {
    if (store.selectedPath === path) commitLogLoading.value = false;
  }
}

async function loadGitUser() {
  const path = store.selectedPath;
  if (!path || !api.getGitUser) return;
  try {
    const result = await api.getGitUser(path);
    if (store.selectedPath !== path) return;
    gitUser.value = result?.ok ? { name: result.name || '', email: result.email || '' } : { name: '', email: '' };
  } catch {
    if (store.selectedPath !== path) return;
    gitUser.value = { name: '', email: '' };
  }
}

/** Initials from author string for avatar (e.g. "Jane Doe" -> "JD", "x" -> "X"). */
function commitAuthorInitials(author) {
  if (!author || typeof author !== 'string') return '?';
  const parts = author.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = (parts[0][0] || '').toUpperCase();
    const b = (parts[parts.length - 1][0] || '').toUpperCase();
    return (a + b) || '?';
  }
  const one = (parts[0] || '').slice(0, 2).toUpperCase();
  return one || '?';
}

async function loadSignPreference() {
  try {
    const v = await api.getPreference?.('signCommits');
    signCommit.value = !!v;
  } catch {
    signCommit.value = false;
  }
}

watch(() => store.selectedPath, loadSignPreference, { immediate: true });

function closeWidgetDropdownOnClickOutside(e) {
  if (widgetDropdownOpen.value && !e.target?.closest?.('.detail-git-widget-dropdown-wrap')) {
    widgetDropdownOpen.value = false;
  }
}
onMounted(async () => {
  document.addEventListener('click', closeWidgetDropdownOnClickOutside);
  await gitPanelPositions.load();
  try {
    const saved = await api.getPreference?.(DEFAULT_PULL_MODE_KEY);
    if (saved && ['fetch', 'merge', 'ff-only', 'rebase'].includes(saved)) defaultPullMode.value = saved;
  } catch {}
});
onUnmounted(() => {
  document.removeEventListener('click', closeWidgetDropdownOnClickOutside);
});

function openCommitDetail(sha, isHead) {
  const path = store.selectedPath;
  if (!path || !sha) return;
  modals.openModal('commitDetail', { dirPath: path, sha, isHead, onRefresh: () => { loadCommitLog(); } });
}

const hasUncommitted = computed(() => (props.info?.uncommittedLines?.length ?? 0) > 0);

function runCheckoutWithStashOption(doCheckout, onCancel) {
  const path = store.selectedPath;
  if (!path) return;
  modals.openModal('switchWithChanges', { dirPath: path, doCheckout, onCancel });
}

function onBranchChangeSelect() {
  if (selectedBranch.value === '__new__') {
    selectedBranch.value = currentBranch.value;
    createBranch();
    return;
  }
  onBranchChange();
}

async function onBranchChange() {
  const path = store.selectedPath;
  const target = selectedBranch.value;
  if (!path || !target || target === '__new__' || target === currentBranch.value) return;
  if (hasUncommitted.value) {
    runCheckoutWithStashOption(
      () => api.checkoutBranch?.(path, target).then(() => { store.setCurrentInfo({ ...props.info, branch: target }); emit('refresh'); }),
      () => { selectedBranch.value = currentBranch.value; }
    );
    return;
  }
  if (!window.confirm(GIT_ACTION_CONFIRMS.checkout)) { selectedBranch.value = currentBranch.value; return; }
  try {
    await api.checkoutBranch?.(path, target);
    gitActionStatus.value = GIT_ACTION_SUCCESS.checkout;
    store.setCurrentInfo({ ...props.info, branch: target });
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Checkout failed.';
    selectedBranch.value = currentBranch.value;
  }
}

async function checkoutBranch(b) {
  if (b === currentBranch.value) return;
  const path = store.selectedPath;
  if (!path) return;
  if (hasUncommitted.value) {
    runCheckoutWithStashOption(
      () => api.checkoutBranch?.(path, b).then(() => { emit('refresh'); }),
      () => {}
    );
    return;
  }
  if (!window.confirm(GIT_ACTION_CONFIRMS.checkout)) return;
  try {
    await api.checkoutBranch?.(path, b);
    selectedBranch.value = b;
    gitActionStatus.value = GIT_ACTION_SUCCESS.checkout;
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Checkout failed.';
  }
}

async function checkoutTag(t) {
  const path = store.selectedPath;
  if (!path) return;
  if (hasUncommitted.value) {
    runCheckoutWithStashOption(() => api.checkoutTag?.(path, t), () => {});
    return;
  }
  if (!window.confirm(`Checkout tag ${t}? This will put you in detached HEAD state.`)) return;
  try {
    await api.checkoutTag?.(path, t);
    gitActionStatus.value = 'Tag checked out.';
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Checkout failed.';
  }
}

async function checkoutRemoteBranch(ref) {
  const path = store.selectedPath;
  if (!path || !ref || !api.checkoutRemoteBranch) return;
  if (hasUncommitted.value) {
    runCheckoutWithStashOption(
      () => api.checkoutRemoteBranch(path, ref),
      () => {}
    );
    return;
  }
  if (!window.confirm(GIT_ACTION_CONFIRMS.checkout)) return;
  try {
    await api.checkoutRemoteBranch(path, ref);
    gitActionStatus.value = GIT_ACTION_SUCCESS.checkout;
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Checkout failed.';
  }
}

async function pull(mode = 'merge') {
  const path = store.selectedPath;
  if (!path) return;
  if (mode !== 'fetch' && !window.confirm(GIT_ACTION_CONFIRMS.pull)) return;
  if (mode === 'fetch' && !window.confirm('Fetch downloads new commits from the remote without merging. Continue?')) return;
  try {
    if (mode === 'fetch' && api.gitFetch) {
      await api.gitFetch(path);
      gitActionStatus.value = GIT_ACTION_SUCCESS.fetch;
    } else if (mode === 'rebase' && api.gitPullRebase) {
      await api.gitPullRebase(path);
      gitActionStatus.value = 'Pulled (rebase).';
    } else if (mode === 'ff-only' && api.gitPullFFOnly) {
      await api.gitPullFFOnly(path);
      gitActionStatus.value = 'Pulled (fast-forward).';
    } else {
      await api.gitPull?.(path);
      gitActionStatus.value = GIT_ACTION_SUCCESS.pull;
    }
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Pull failed.';
  }
}

function runDefaultPull() {
  pull(defaultPullMode.value);
}

async function setDefaultPullAndRun(mode) {
  defaultPullMode.value = mode;
  if (api.setPreference) api.setPreference(DEFAULT_PULL_MODE_KEY, mode);
  await pull(mode);
}

function focusBranchSelect() {
  const el = branchSelectRef.value?.$el ?? branchSelectRef.value;
  if (el && typeof el.focus === 'function') el.focus();
}

function undoDiscard() {
  discardAll();
}

async function initializeRepo() {
  const path = props.info?.path;
  if (!path || !api.gitInit) return;
  initError.value = '';
  initLoading.value = true;
  try {
    const result = await api.gitInit(path);
    if (result?.ok) {
      emit('refresh');
    } else {
      initError.value = result?.error || 'Failed to initialize repository';
    }
  } catch (e) {
    initError.value = e?.message || 'Failed to initialize repository';
  } finally {
    initLoading.value = false;
  }
}

async function stashPop() {
  const path = store.selectedPath;
  if (!path || !api.gitStashPop) return;
  if (!window.confirm('Pop the most recent stash? It will be applied and removed from the stash list.')) return;
  try {
    await api.gitStashPop(path);
    gitActionStatus.value = 'Stash popped.';
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Pop failed.';
  }
}

async function push() {
  if (!window.confirm(GIT_ACTION_CONFIRMS.push)) return;
  const path = store.selectedPath;
  try {
    await api.gitPush?.(path);
    gitActionStatus.value = GIT_ACTION_SUCCESS.push;
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Push failed.';
  }
}

function pushFromFooter() {
  push();
}

async function createBranch() {
  const path = store.selectedPath;
  if (!path) {
    gitActionStatus.value = 'Select a project first.';
    return;
  }
  if (!api.createBranch) {
    gitActionStatus.value = 'Create branch not available.';
    return;
  }
  const name = window.prompt('New branch name');
  if (!name?.trim()) return;
  try {
    await api.createBranch(path, name.trim(), true);
    gitActionStatus.value = 'Branch created and checked out.';
    await refetchBranches();
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Failed.';
  }
}

function openBranchContextMenu(e, branch, isRemote) {
  branchContextMenu.value = { x: e.clientX, y: e.clientY, branch, isRemote };
  nextTick(() => {
    const close = () => {
      branchContextMenu.value = null;
      document.removeEventListener('click', close);
    };
    document.addEventListener('click', close);
  });
}

function openFilePathContextMenu(e, filePath) {
  if (!filePath) return;
  filePathContextMenu.value = { x: e.clientX, y: e.clientY, path: filePath };
  nextTick(() => {
    const close = () => {
      filePathContextMenu.value = null;
      document.removeEventListener('click', close);
    };
    document.addEventListener('click', close);
  });
}

function closeFilePathContextMenu() {
  filePathContextMenu.value = null;
}

function contextMenuCopyFilePath() {
  const menu = filePathContextMenu.value;
  closeFilePathContextMenu();
  if (!menu?.path) return;
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(menu.path);
  else api.copyToClipboard?.(menu.path);
  gitActionStatus.value = 'Path copied.';
}

function fullPathForFile(relativePath) {
  if (!store.selectedPath || !relativePath) return '';
  const base = store.selectedPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const rel = relativePath.replace(/^\/+/, '');
  return base + '/' + rel;
}

function contextMenuCopyFullPath() {
  const menu = filePathContextMenu.value;
  closeFilePathContextMenu();
  if (!menu?.path || !store.selectedPath) return;
  const full = fullPathForFile(menu.path);
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(full);
  else api.copyToClipboard?.(full);
  gitActionStatus.value = 'Full path copied.';
}

function contextMenuRevealFilePath() {
  const menu = filePathContextMenu.value;
  closeFilePathContextMenu();
  if (!menu?.path || !store.selectedPath || !api.openPathInFinder) return;
  api.openPathInFinder(fullPathForFile(menu.path));
}

function closeBranchContextMenu() {
  branchContextMenu.value = null;
}

function contextMenuCheckout() {
  if (branchContextMenu.value?.branch) checkoutBranch(branchContextMenu.value.branch);
  closeBranchContextMenu();
}

function contextMenuCheckoutRemote() {
  if (branchContextMenu.value?.branch) checkoutRemoteBranch(branchContextMenu.value.branch);
  closeBranchContextMenu();
}

async function contextMenuCreateBranchFrom() {
  const menu = branchContextMenu.value;
  closeBranchContextMenu();
  if (!menu?.branch || !api.createBranchFrom) return;
  const path = store.selectedPath;
  if (!path) return;
  const name = window.prompt('New branch name (from ' + menu.branch + ')');
  if (!name?.trim()) return;
  if (menu.isRemote && hasUncommitted.value) {
    runCheckoutWithStashOption(
      () => api.createBranchFrom(path, name.trim(), menu.branch),
      () => {}
    );
    return;
  }
  if (!menu.isRemote && hasUncommitted.value) {
    runCheckoutWithStashOption(
      () => api.createBranchFrom(path, name.trim(), menu.branch),
      () => {}
    );
    return;
  }
  try {
    await api.createBranchFrom(path, name.trim(), menu.branch);
    gitActionStatus.value = GIT_ACTION_SUCCESS.createBranch;
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Failed.';
  }
}

async function contextMenuDeleteBranch() {
  const branch = branchContextMenu.value?.branch;
  closeBranchContextMenu();
  if (!branch || branch === currentBranch.value || !api.deleteBranch) return;
  const path = store.selectedPath;
  if (!path) return;
  if (!window.confirm(`Delete branch "${branch}"? This cannot be undone.`)) return;
  try {
    await api.deleteBranch(path, branch, false);
    gitActionStatus.value = 'Branch deleted.';
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Delete failed.';
  }
}

function contextMenuBranchPull() {
  closeBranchContextMenu();
  pull('merge');
}

function contextMenuBranchPush() {
  closeBranchContextMenu();
  push();
}

async function contextMenuSetUpstream() {
  const menu = branchContextMenu.value;
  closeBranchContextMenu();
  if (!menu?.branch || menu.isRemote || !api.setBranchUpstream) return;
  const path = store.selectedPath;
  if (!path) return;
  try {
    const res = await api.setBranchUpstream(path, menu.branch);
    if (res?.ok) {
      gitActionStatus.value = 'Upstream set.';
      emit('refresh');
    } else {
      gitActionStatus.value = res?.error || 'Set upstream failed.';
    }
  } catch (e) {
    gitActionStatus.value = e?.message || 'Set upstream failed.';
  }
}

async function contextMenuResetToHere(mode) {
  const menu = branchContextMenu.value;
  closeBranchContextMenu();
  if (!menu?.branch || menu.isRemote || menu.branch === currentBranch.value || !api.gitReset) return;
  const path = store.selectedPath;
  if (!path) return;
  const label = mode === 'hard' ? 'Hard reset will discard all changes. ' : '';
  if (!window.confirm(`${label}Reset current branch (${currentBranch.value}) to the commit at "${menu.branch}"?`)) return;
  try {
    await api.gitReset(path, menu.branch, mode);
    gitActionStatus.value = 'Branch reset.';
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Reset failed.';
  }
}

async function contextMenuAmendCommit() {
  const menu = branchContextMenu.value;
  closeBranchContextMenu();
  if (!menu?.branch || menu.isRemote || menu.branch !== currentBranch.value || !api.gitAmend) return;
  const path = store.selectedPath;
  if (!path) return;
  let message = '';
  try {
    const rev = await api.getBranchRevision(path, 'HEAD');
    if (rev?.ok && rev.sha && api.getCommitDetail) {
      const detail = await api.getCommitDetail(path, rev.sha);
      if (detail?.subject) message = detail.body ? `${detail.subject}\n\n${detail.body}` : detail.subject;
    }
  } catch (_) {}
  const newMessage = window.prompt('Amend commit message:', message || '');
  if (newMessage == null) return;
  try {
    await api.gitAmend(path, newMessage.trim());
    gitActionStatus.value = 'Commit amended.';
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Amend failed.';
  }
}

function contextMenuCreateTagHere(annotated) {
  const menu = branchContextMenu.value;
  closeBranchContextMenu();
  if (!menu?.branch || menu.isRemote) return;
  const path = store.selectedPath;
  if (!path || !api.createTag) return;
  modals.openModal('createTag', {
    dirPath: path,
    initialRef: menu.branch,
    onCreated: () => {
      gitActionStatus.value = annotated ? 'Annotated tag created.' : 'Tag created.';
      loadTagsOnly();
    },
  });
}

async function contextMenuCopyCommitSha() {
  const menu = branchContextMenu.value;
  if (!menu?.branch || !api.getBranchRevision) return;
  const path = store.selectedPath;
  if (!path) return;
  closeBranchContextMenu();
  try {
    const res = await api.getBranchRevision(path, menu.branch);
    if (res?.ok && res.sha && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(res.sha);
      gitActionStatus.value = 'Commit SHA copied.';
    } else {
      gitActionStatus.value = res?.error || 'Could not get SHA.';
    }
  } catch (e) {
    gitActionStatus.value = e?.message || 'Failed.';
  }
}

async function contextMenuRenameBranch() {
  const menu = branchContextMenu.value;
  const branch = menu?.branch;
  closeBranchContextMenu();
  if (!branch || branch === currentBranch.value || !api.renameBranch) return;
  const path = store.selectedPath;
  if (!path) return;
  const newName = window.prompt('Rename branch to:', branch);
  if (!newName?.trim() || newName.trim() === branch) return;
  try {
    await api.renameBranch(path, branch, newName.trim());
    gitActionStatus.value = 'Branch renamed.';
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Rename failed.';
  }
}

function contextMenuCopyBranchName() {
  const menu = branchContextMenu.value;
  if (!menu?.branch) return;
  const name = menu.isRemote ? menu.branch.replace(/^[^/]+\//, '') : menu.branch;
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(name);
  gitActionStatus.value = 'Branch name copied.';
  closeBranchContextMenu();
}

function contextMenuCopyBranchLink() {
  const menu = branchContextMenu.value;
  if (!menu?.branch) return;
  const ref = menu.isRemote ? menu.branch : `origin/${menu.branch}`;
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(ref);
  gitActionStatus.value = 'Branch ref copied.';
  closeBranchContextMenu();
}

function openRemoteContextMenu(e) {
  remoteContextMenu.value = { x: e.clientX, y: e.clientY };
  nextTick(() => {
    const close = () => {
      remoteContextMenu.value = null;
      document.removeEventListener('click', close);
    };
    document.addEventListener('click', close);
  });
}

function closeRemoteContextMenu() {
  remoteContextMenu.value = null;
}

async function contextMenuRemoteFetch() {
  closeRemoteContextMenu();
  const path = store.selectedPath;
  if (!path || !api.gitFetch) return;
  try {
    await api.gitFetch(path);
    gitActionStatus.value = 'Fetched.';
    await loadRemoteBranches();
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Fetch failed.';
  }
}

async function contextMenuRemotePrune() {
  closeRemoteContextMenu();
  const path = store.selectedPath;
  if (!path || !api.gitPruneRemotes) return;
  try {
    await api.gitPruneRemotes(path);
    gitActionStatus.value = 'Pruned.';
    await loadRemoteBranches();
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Prune failed.';
  }
}

function contextMenuRemoteRefresh() {
  closeRemoteContextMenu();
  loadRemoteBranches();
}

function openTagContextMenu(e, tagName) {
  tagContextMenu.value = { x: e.clientX, y: e.clientY, tagName };
  nextTick(() => {
    const close = () => {
      tagContextMenu.value = null;
      document.removeEventListener('click', close);
    };
    document.addEventListener('click', close);
  });
}

function closeTagContextMenu() {
  tagContextMenu.value = null;
}

function contextMenuCheckoutTag() {
  if (tagContextMenu.value?.tagName) checkoutTag(tagContextMenu.value.tagName);
  closeTagContextMenu();
}

async function contextMenuPushTag() {
  const tagName = tagContextMenu.value?.tagName;
  closeTagContextMenu();
  if (!tagName || !api.pushTag) return;
  const path = store.selectedPath;
  if (!path) return;
  try {
    await api.pushTag(path, tagName, 'origin');
    gitActionStatus.value = 'Tag pushed.';
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Push failed.';
  }
}

async function contextMenuDeleteTag() {
  const tagName = tagContextMenu.value?.tagName;
  closeTagContextMenu();
  if (!tagName || !api.deleteTag) return;
  const path = store.selectedPath;
  if (!path) return;
  if (!window.confirm(`Delete tag "${tagName}"?`)) return;
  try {
    await api.deleteTag(path, tagName);
    gitActionStatus.value = 'Tag deleted.';
    await loadTagsOnly();
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Delete failed.';
  }
}

function createTagFromSidebar() {
  const path = store.selectedPath;
  if (!path || !api.createTag) return;
  modals.openModal('createTag', {
    dirPath: path,
    onCreated: () => {
      gitActionStatus.value = 'Tag created.';
      loadTagsOnly();
    },
  });
}

async function pushTagFromSidebar(tagName) {
  const path = store.selectedPath;
  if (!path || !api.pushTag) return;
  try {
    await api.pushTag(path, tagName, 'origin');
    gitActionStatus.value = 'Tag pushed.';
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Push failed.';
  }
}

async function deleteTagFromSidebar(tagName) {
  const path = store.selectedPath;
  if (!path || !api.deleteTag) return;
  if (!window.confirm(`Delete tag "${tagName}"?`)) return;
  try {
    await api.deleteTag(path, tagName);
    gitActionStatus.value = 'Tag deleted.';
    await loadTagsOnly();
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Delete failed.';
  }
}

function openWorktreeContextMenu(e, w) {
  worktreeContextMenu.value = { x: e.clientX, y: e.clientY, worktree: w };
  nextTick(() => {
    const close = () => {
      worktreeContextMenu.value = null;
      document.removeEventListener('click', close);
    };
    document.addEventListener('click', close);
  });
}

function closeWorktreeContextMenu() {
  worktreeContextMenu.value = null;
}

function closeAllContextMenus() {
  branchContextMenu.value = null;
  remoteContextMenu.value = null;
  tagContextMenu.value = null;
  worktreeContextMenu.value = null;
  submoduleContextMenu.value = null;
  reflogContextMenu.value = null;
  filePathContextMenu.value = null;
}

function contextMenuStashPush() {
  closeAllContextMenus();
  stashPush();
}

function contextMenuStashPop() {
  closeAllContextMenus();
  stashPop();
}

function contextMenuRevealWorktree() {
  const w = worktreeContextMenu.value?.worktree;
  closeWorktreeContextMenu();
  if (w?.path && api.openPathInFinder) api.openPathInFinder(w.path);
}

async function contextMenuRemoveWorktree() {
  const w = worktreeContextMenu.value?.worktree;
  closeWorktreeContextMenu();
  if (!w?.path || !api.worktreeRemove) return;
  await removeWorktreeFromSidebar(w.path);
}

function addWorktreeFromSidebar() {
  const path = store.selectedPath;
  if (!path || !api.worktreeAdd) return;
  modals.openModal('addWorktree', {
    dirPath: path,
    onAdded: () => {
      gitActionStatus.value = 'Worktree added.';
      loadWorktreesOnly();
    },
  });
}

async function removeWorktreeFromSidebar(wtPath) {
  const path = store.selectedPath;
  if (!path || !api.worktreeRemove) return;
  if (!window.confirm(`Remove worktree?\n${wtPath}`)) return;
  try {
    await api.worktreeRemove(path, wtPath);
    gitActionStatus.value = 'Worktree removed.';
    await loadWorktreesOnly();
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Remove failed.';
  }
}

function revealWorktree(wtPath) {
  if (wtPath && api.openPathInFinder) api.openPathInFinder(wtPath);
}

function revealSubmodule(subPath) {
  const base = store.selectedPath;
  if (!base || !subPath || !api.openPathInFinder) return;
  const full = base.replace(/\\/g, '/').replace(/\/+$/, '') + '/' + subPath.replace(/^\/+/, '');
  api.openPathInFinder(full);
}

function openSubmoduleContextMenu(e, s) {
  submoduleContextMenu.value = { x: e.clientX, y: e.clientY, submodule: s };
  nextTick(() => {
    const close = () => {
      submoduleContextMenu.value = null;
      document.removeEventListener('click', close);
    };
    document.addEventListener('click', close);
  });
}

function contextMenuOpenSubmodulesSection() {
  submoduleContextMenu.value = null;
  gitRightSection.value = 'submodules';
}

function contextMenuRevealSubmodule() {
  const s = submoduleContextMenu.value?.submodule;
  submoduleContextMenu.value = null;
  if (s?.path) revealSubmodule(s.path);
}

async function updateSubmodulesFromSidebar() {
  const path = store.selectedPath;
  if (!path || !api.submoduleUpdate) return;
  try {
    await api.submoduleUpdate(path, true);
    await loadSubmodulesOnly();
    gitActionStatus.value = 'Submodules updated.';
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Submodule update failed.';
  }
}

async function loadReflogFromSidebar() {
  await loadReflogOnly();
  gitRightSection.value = 'reflog';
}

function openReflogContextMenu(e, entry) {
  reflogContextMenu.value = { x: e.clientX, y: e.clientY, entry };
  nextTick(() => {
    const close = () => {
      reflogContextMenu.value = null;
      document.removeEventListener('click', close);
    };
    document.addEventListener('click', close);
  });
}

function contextMenuOpenReflogSection() {
  reflogContextMenu.value = null;
  gitRightSection.value = 'reflog';
}

async function contextMenuCheckoutReflog() {
  const entry = reflogContextMenu.value?.entry;
  reflogContextMenu.value = null;
  if (entry) await checkoutReflogEntry(entry);
}

function contextMenuCopyReflogSha() {
  const entry = reflogContextMenu.value?.entry;
  reflogContextMenu.value = null;
  if (entry?.sha && navigator.clipboard?.writeText) navigator.clipboard.writeText(entry.sha);
}

function contextMenuCopyReflogRef() {
  const entry = reflogContextMenu.value?.entry;
  reflogContextMenu.value = null;
  const ref = entry?.ref || entry?.sha;
  if (ref && navigator.clipboard?.writeText) navigator.clipboard.writeText(ref);
}

async function checkoutReflogEntry(entry) {
  const path = store.selectedPath;
  const refVal = entry?.ref || entry?.sha;
  if (!path || !refVal || !api.checkoutRef) return;
  if (!window.confirm(`Checkout ${refVal}? You will be in detached HEAD.`)) return;
  try {
    const result = await api.checkoutRef(path, refVal);
    if (result?.ok !== false) {
      gitActionStatus.value = 'Checked out.';
      emit('refresh');
    } else {
      gitActionStatus.value = result?.error || 'Checkout failed.';
    }
  } catch (e) {
    gitActionStatus.value = e?.message || 'Checkout failed.';
  }
}

async function stashPush() {
  const path = store.selectedPath;
  if (!path || !api.gitStashPush) return;
  if (!window.confirm('Stash your current changes (staged and unstaged)? You can restore them later with Pop or Apply.')) return;
  const messageRaw = window.prompt('Stash message (optional)');
  if (messageRaw === null) return; // user cancelled prompt
  const message = messageRaw || '';
  try {
    const result = await api.gitStashPush(path, message, { includeUntracked: true });
    if (result?.ok) {
      gitActionStatus.value = 'Stashed.';
      await loadStashList();
      emit('refresh');
      // Refetch project info so sidebar and working tree update immediately
      const fresh = await api.getProjectInfo?.(path);
      if (fresh?.ok) store.setCurrentInfo(fresh);
    } else {
      gitActionStatus.value = result?.error || 'Stash failed.';
    }
  } catch (e) {
    gitActionStatus.value = e?.message || 'Stash failed.';
  }
}

async function stageAll() {
  const path = store.selectedPath;
  if (!path || !api.stageFile) return;
  for (const f of unstaged.value) {
    await api.stageFile(path, f);
  }
  emit('refresh');
}

async function unstageAll() {
  const path = store.selectedPath;
  if (!path || !api.unstageFile) return;
  for (const f of staged.value) {
    await api.unstageFile(path, f);
  }
  emit('refresh');
}

async function generateCommitMessage() {
  const path = store.selectedPath;
  if (!path || !api.ollamaGenerateCommitMessage) return;
  try {
    const result = await api.ollamaGenerateCommitMessage(path);
    if (result?.ok && result?.text) commitSummary.value = result.text.trim().slice(0, 72);
    else gitActionStatus.value = result?.error || 'Could not generate.';
  } catch (e) {
    gitActionStatus.value = e?.message || 'Generate failed.';
  }
}

async function stageFile(filePath) {
  const path = store.selectedPath;
  if (!path || !api.stageFile) return;
  await api.stageFile(path, filePath);
  emit('refresh');
}

async function unstageFile(filePath) {
  const path = store.selectedPath;
  if (!path || !api.unstageFile) return;
  await api.unstageFile(path, filePath);
  emit('refresh');
}

async function discardFile(filePath) {
  const path = store.selectedPath;
  if (!path || !api.discardFile) return;
  if (!window.confirm(`Discard all changes in "${filePath}"? This cannot be undone.`)) return;
  try {
    await api.discardFile(path, filePath);
    gitActionStatus.value = 'File discarded.';
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Discard failed.';
  }
}

function openFile(filePath) {
  const path = store.selectedPath;
  if (path) api.openFileInEditor?.(path, filePath);
}

function openSideBySideDiff(filePath, staged) {
  const path = store.selectedPath;
  if (path && filePath) modals.openModal('diffSideBySide', { dirPath: path, filePath, staged });
}

function isGitattributesFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  const n = filePath.replace(/\\/g, '/');
  return n === '.gitattributes' || n.endsWith('/.gitattributes');
}

async function openGitattributesEditor() {
  const path = store.selectedPath;
  if (!path || !api.getGitattributes) return;
  try {
    const [r, baselineRes] = await Promise.all([
      api.getGitattributes(path),
      api.getFileAtRef?.(path, '.gitattributes', 'HEAD').catch(() => ({ ok: false })),
    ]);
    const initialContent = (r?.ok && r.content != null) ? r.content : '';
    const baselineContent = (baselineRes?.ok && baselineRes.content != null) ? baselineRes.content : '';
    modals.openModal('gitattributesWizard', {
      initialContent,
      baselineContent,
      onApplyAndSave(c) {
        api.writeGitattributes?.(path, c).then(() => emit('refresh'));
      },
    });
  } catch (_) {}
}

async function commit() {
  const path = store.selectedPath;
  const msg = commitSummary.value.trim();
  if (!path || !msg) return;
  const body = commitDescription.value.trim();
  const fullMessage = body ? `${msg}\n\n${body}` : msg;
  try {
    if (amendCommit.value && api.gitAmend) {
      await api.gitAmend(path, fullMessage);
      gitActionStatus.value = 'Amended.';
    } else if (api.commitChanges) {
      await api.commitChanges(path, fullMessage, { sign: signCommit.value });
      gitActionStatus.value = 'Committed.';
    }
    commitSummary.value = '';
    commitDescription.value = '';
    amendCommit.value = false;
    emit('refresh');
    await refetchBranches();
    loadCommitLog();
  } catch (e) {
    gitActionStatus.value = e?.message || 'Commit failed.';
  }
}

async function createTestFileAndRefresh() {
  const path = store.selectedPath;
  if (!path || !api.createTestFile) return;
  createTestFileLoading.value = true;
  try {
    const res = await api.createTestFile(path);
    if (res?.ok) {
      gitActionStatus.value = `Created ${res.relativePath || 'test-file.txt'}. Refresh to see it.`;
      emit('refresh');
    } else {
      gitActionStatus.value = res?.error || 'Failed to create test file.';
    }
  } catch (e) {
    gitActionStatus.value = e?.message || 'Failed to create test file.';
  } finally {
    createTestFileLoading.value = false;
  }
}

async function discardAll() {
  if (!window.confirm(GIT_ACTION_CONFIRMS.discard)) return;
  const path = store.selectedPath;
  try {
    await api.gitDiscardChanges?.(path);
    gitActionStatus.value = GIT_ACTION_SUCCESS.discard;
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Discard failed.';
  }
}
</script>

<style scoped>
.detail-git-sidebar-group.widget-drag-over-before {
  border-top: 2px solid rgb(var(--rm-accent));
  margin-top: -2px;
  padding-top: 2px;
}
.detail-git-sidebar-group.widget-drag-over-after {
  border-bottom: 2px solid rgb(var(--rm-accent));
  margin-bottom: -2px;
  padding-bottom: 2px;
}

/* Compact Tag for working tree status (M, D, +, etc.) */
.detail-git-badge {
  min-width: 1.25rem;
  padding: 0 0.25rem;
  font-size: 0.75rem;
  line-height: 1.25;
  display: inline-flex;
  justify-content: center;
}

/* Commit card radius follows Settings > Appearance > Border radius (see input.css) */
</style>
