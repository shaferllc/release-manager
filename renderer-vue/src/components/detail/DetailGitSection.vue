<template>
  <section class="card mb-6 collapsible-card detail-tab-panel flex flex-col min-h-0" data-detail-tab="git" :class="{ 'is-collapsed': collapsed }">
    <div class="collapsible-card-header-row">
      <button type="button" class="collapsible-card-header" :aria-expanded="!collapsed" @click="toggle">
        <span class="collapsible-card-title">Git</span>
        <svg class="collapsible-card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
    <div class="collapsible-card-body flex flex-col flex-1 min-h-0">
    <!-- Empty repo: show init CTA -->
    <div v-if="info && !info.hasGit" class="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
      <p class="text-sm text-rm-muted m-0">This folder is not a Git repository.</p>
      <p class="text-xs text-rm-muted m-0 max-w-md">Initialize a repository here to use branches, commits, tags, and the rest of the Git tools.</p>
      <button
        type="button"
        class="btn-primary btn-compact"
        :disabled="!info?.path || initLoading"
        @click="initializeRepo"
      >
        {{ initLoading ? 'Initializing…' : 'Initialize repository' }}
      </button>
      <p v-if="initError" class="text-xs text-rm-warning m-0">{{ initError }}</p>
    </div>
    <!-- Full Git UI when repo exists -->
    <div v-else-if="info?.hasGit" class="flex flex-col flex-1 min-h-0">
    <div class="detail-git-toolbar flex flex-wrap items-center gap-1.5 py-1.5 px-2 border-b border-rm-border bg-rm-surface/40 shrink-0">
      <div class="detail-git-toolbar-meta flex items-center gap-2 shrink-0 flex-wrap">
        <span class="text-xs text-rm-muted">repository:</span>
        <span class="text-sm text-rm-text truncate max-w-[8rem]" :title="repoName">{{ repoName }}</span>
        <span class="text-rm-border/70 mx-0.5">|</span>
        <span class="text-xs text-rm-muted">branch:</span>
        <select ref="branchSelectRef" v-model="selectedBranch" class="detail-git-toolbar-select text-sm border border-rm-border bg-rm-bg text-rm-text px-2 py-1 min-w-[10rem]" @change="onBranchChangeSelect">
          <option value="">—</option>
          <option value="__new__">+ New branch…</option>
          <option v-for="b in filteredBranches" :key="b" :value="b">{{ b }}</option>
        </select>
        <span v-if="aheadBehind" class="text-xs text-rm-muted">{{ aheadBehind }}</span>
        <template v-if="gitUser.name || gitUser.email">
          <span class="text-rm-border/70 mx-0.5">|</span>
          <span class="text-xs text-rm-muted">committer:</span>
          <span class="text-xs text-rm-text truncate max-w-[12rem]" :title="gitUser.email ? `${gitUser.name || ''} <${gitUser.email}>` : gitUser.name">{{ gitUser.name || gitUser.email || '—' }}</span>
          <button type="button" class="text-[10px] text-rm-muted hover:text-rm-accent border-0 bg-transparent p-0 cursor-pointer shrink-0" title="Refresh git user from config" aria-label="Refresh committer info" @click="loadGitUser">↻</button>
        </template>
      </div>
      <div class="detail-git-toolbar-actions flex flex-wrap items-end gap-1 sm:gap-2">
        <button type="button" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 border-0 bg-transparent cursor-pointer text-rm-text hover:bg-rm-surface-hover" title="Discard all uncommitted changes" @click="undoDiscard">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          <span class="text-[10px] font-medium">Discard</span>
        </button>
        <div class="detail-git-toolbar-dropdown relative flex flex-col items-center gap-0.5">
          <div class="flex items-stretch border-0 overflow-hidden">
            <button type="button" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 rounded-r-none border-0 bg-transparent cursor-pointer text-rm-text hover:bg-rm-surface-hover min-w-[2rem]" title="Pull (run default)" @click="runDefaultPull">
              <span class="flex items-center gap-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
              <span class="text-[10px] font-medium">Pull</span>
            </button>
            <button type="button" class="detail-git-toolbar-btn flex flex-col items-center justify-center p-1 rounded-l-none border-0 border-l border-rm-border bg-transparent cursor-pointer text-rm-text hover:bg-rm-surface-hover" title="Pull options" aria-haspopup="true" :aria-expanded="pullDropdownOpen" @click="pullDropdownOpen = !pullDropdownOpen">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          <div v-if="pullDropdownOpen" class="detail-git-toolbar-dropdown-menu absolute left-0 top-full mt-0.5 z-30 py-2 px-0 border border-rm-border bg-rm-bg shadow-lg min-w-[16rem] max-w-[20rem]">
            <p class="text-[11px] text-rm-muted px-3 py-1.5 mb-1 border-b border-rm-border">Select a default pull/fetch operation to execute when clicking the Pull button.</p>
            <button
              v-for="opt in pullOptions"
              :key="opt.mode"
              type="button"
              class="w-full text-left text-xs px-3 py-2 flex items-center gap-2 hover:bg-rm-surface-hover"
              :class="{ 'bg-rm-accent/10 text-rm-accent': defaultPullMode === opt.mode }"
              @click="setDefaultPullAndRun(opt.mode)"
            >
              <span class="shrink-0 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center" :class="defaultPullMode === opt.mode ? 'border-rm-accent bg-rm-accent/20' : 'border-rm-border'">
                <span v-if="defaultPullMode === opt.mode" class="w-1.5 h-1.5 rounded-full bg-rm-accent"></span>
              </span>
              <span>{{ opt.label }}</span>
            </button>
          </div>
        </div>
        <button type="button" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 border-0 bg-transparent cursor-pointer text-rm-text hover:bg-rm-surface-hover" title="Push" @click="push">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
          <span class="text-[10px] font-medium">Push</span>
        </button>
        <button type="button" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 border-0 bg-transparent cursor-pointer text-rm-text hover:bg-rm-surface-hover" title="Branch" @click="focusBranchSelect">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 15a3 3 0 0 0 6 0"/></svg>
          <span class="text-[10px] font-medium">Branch</span>
        </button>
        <button type="button" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 border-0 bg-transparent cursor-pointer text-rm-text hover:bg-rm-surface-hover" title="Stash changes" @click="stashPush">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h14v8h-4l-4 4-4-4H5z"/></svg>
          <span class="text-[10px] font-medium">Stash</span>
        </button>
        <button type="button" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 border-0 bg-transparent cursor-pointer text-rm-text hover:bg-rm-surface-hover" title="Pop stash" @click="stashPop">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="12" width="14" height="8" rx="1"/><path d="M12 12V6M9 9l3-3 3 3"/></svg>
          <span class="text-[10px] font-medium">Pop</span>
        </button>
        <button type="button" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 border-0 bg-transparent cursor-pointer text-rm-text hover:bg-rm-surface-hover" :class="{ 'bg-rm-accent/15 text-rm-accent': inlineTerminalOpen }" :title="inlineTerminalOpen ? 'Close inline terminal' : 'Open inline terminal'" @click="toggleInlineTerminal">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
          <span class="text-[10px] font-medium">Terminal</span>
        </button>
      </div>
    </div>
    <div v-if="inlineTerminalOpen && store.selectedPath" class="detail-git-inline-terminal shrink-0 border-t border-rm-border p-2">
      <TerminalPanel :min-height="280" :initial-dir-path="store.selectedPath" @close="inlineTerminalOpen = false" />
    </div>
    <div class="detail-git-three-panels flex-1 min-h-[380px] min-w-0 border-t border-rm-border overflow-hidden flex flex-col">
      <div class="detail-git-three-panels-row flex flex-1 min-h-0 min-w-0 overflow-x-auto">
      <aside class="detail-git-sidebar-panel shrink-0 min-h-0 bg-rm-bg-elevated/50 flex flex-col overflow-hidden" :style="gitSidebarStyle">
        <div class="p-1.5 border-b border-rm-border shrink-0">
          <input v-model="gitFilter" type="text" class="detail-git-filter-input w-full text-xs border border-rm-border bg-rm-bg text-rm-text px-1.5 py-1" placeholder="Filter (⌘⌥F)" />
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
            <button type="button" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left border-0 bg-transparent cursor-pointer hover:bg-rm-surface-hover/50 text-rm-text" :aria-expanded="sidebarLocalOpen" @click="sidebarLocalOpen = !sidebarLocalOpen">
              <span class="flex items-center gap-1.5 shrink-0 min-w-0">
                <span v-if="hasMultipleVisibleWidgets" class="widget-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text p-0.5 -ml-0.5" draggable="true" title="Drag to reorder" @click.stop @dragstart="onWidgetDragStart($event, widgetId)" @dragend="onWidgetDragEnd"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
                <span class="w-3.5 h-3.5 shrink-0 text-rm-muted inline-block" v-html="sidebarWidgetIcon(widgetId)" aria-hidden="true"></span>
                <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide truncate">Local branches</span>
              </span>
              <svg class="w-3.5 h-3.5 shrink-0 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarLocalOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div v-show="sidebarLocalOpen" class="px-2.5 pb-2 pt-0 border-t border-rm-border">
              <ul class="py-1 px-0 list-none m-0 text-xs text-rm-text space-y-0.5">
                <li class="py-0.5">
                  <button
                    type="button"
                    class="w-full text-left cursor-pointer hover:text-rm-accent truncate flex items-center gap-1 text-rm-accent font-medium border-0 bg-transparent p-0 text-inherit text-xs"
                    @click.stop="createBranch"
                  >
                    <span class="shrink-0" aria-hidden="true">+</span>
                    New branch
                  </button>
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
            <button type="button" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left border-0 bg-transparent cursor-pointer hover:bg-rm-surface-hover/50 text-rm-text" :aria-expanded="sidebarRemoteOpen" @click="sidebarRemoteOpen = !sidebarRemoteOpen" @contextmenu.prevent="openRemoteContextMenu($event)">
              <span class="flex items-center gap-1.5 shrink-0 min-w-0">
                <span v-if="hasMultipleVisibleWidgets" class="widget-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text p-0.5 -ml-0.5" draggable="true" title="Drag to reorder" @click.stop @dragstart="onWidgetDragStart($event, widgetId)" @dragend="onWidgetDragEnd"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
                <span class="w-3.5 h-3.5 shrink-0 text-rm-muted inline-block" v-html="sidebarWidgetIcon(widgetId)" aria-hidden="true"></span>
                <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide truncate">Remote</span>
              </span>
              <span class="flex items-center gap-1 shrink-0">
                <button type="button" class="text-xs text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer" :disabled="remoteBranchesLoading" @click.stop="loadRemoteBranches">{{ remoteBranchesLoading ? '…' : (remoteBranchesLoaded ? 'Refresh' : 'Load') }}</button>
                <svg class="w-3.5 h-3.5 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarRemoteOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </button>
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
            <button type="button" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left border-0 bg-transparent cursor-pointer hover:bg-rm-surface-hover/50 text-rm-text" :aria-expanded="sidebarWorktreesOpen" @click="sidebarWorktreesOpen = !sidebarWorktreesOpen">
              <span class="flex items-center gap-1.5 shrink-0 min-w-0">
                <span v-if="hasMultipleVisibleWidgets" class="widget-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text p-0.5 -ml-0.5" draggable="true" title="Drag to reorder" @click.stop @dragstart="onWidgetDragStart($event, widgetId)" @dragend="onWidgetDragEnd"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
                <span class="w-3.5 h-3.5 shrink-0 text-rm-muted inline-block" v-html="sidebarWidgetIcon(widgetId)" aria-hidden="true"></span>
                <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide truncate">Worktrees</span>
              </span>
              <svg class="w-3.5 h-3.5 shrink-0 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarWorktreesOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div v-show="sidebarWorktreesOpen" class="px-2.5 pb-2 pt-0 border-t border-rm-border">
              <button type="button" class="text-xs text-rm-accent hover:underline border-0 bg-transparent cursor-pointer p-0 mb-1.5 font-medium" @click="addWorktreeFromSidebar">+ Add worktree</button>
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
                    <button type="button" class="text-xs text-rm-muted hover:text-rm-text border-0 bg-transparent cursor-pointer p-0" title="Reveal in Finder" @click.stop="revealWorktree(w.path)">Reveal</button>
                    <button type="button" class="text-xs text-rm-warning hover:underline border-0 bg-transparent cursor-pointer p-0" title="Remove worktree" @click.stop="removeWorktreeFromSidebar(w.path)">Remove</button>
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
            <button type="button" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left border-0 bg-transparent cursor-pointer hover:bg-rm-surface-hover/50 text-rm-text" :aria-expanded="sidebarTagsOpen" @click="sidebarTagsOpen = !sidebarTagsOpen">
              <span class="flex items-center gap-1.5 shrink-0 min-w-0">
                <span v-if="hasMultipleVisibleWidgets" class="widget-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text p-0.5 -ml-0.5" draggable="true" title="Drag to reorder" @click.stop @dragstart="onWidgetDragStart($event, widgetId)" @dragend="onWidgetDragEnd"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
                <span class="w-3.5 h-3.5 shrink-0 text-rm-muted inline-block" v-html="sidebarWidgetIcon(widgetId)" aria-hidden="true"></span>
                <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide truncate">Tags</span>
              </span>
              <svg class="w-3.5 h-3.5 shrink-0 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarTagsOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div v-show="sidebarTagsOpen" class="px-2.5 pb-2 pt-0 border-t border-rm-border">
              <button type="button" class="text-xs text-rm-accent hover:underline border-0 bg-transparent cursor-pointer p-0 mb-1.5 font-medium" @click="createTagFromSidebar">+ New tag</button>
              <ul class="max-h-32 overflow-y-auto py-1 px-0 list-none m-0 text-xs text-rm-muted space-y-0.5">
                <li v-for="t in filteredTags" :key="t" class="cursor-pointer hover:text-rm-accent truncate py-0.5 flex items-center justify-between gap-1 group" @click="checkoutTag(t)" @contextmenu.prevent="openTagContextMenu($event, t)">
                  <span class="truncate min-w-0">{{ t }}</span>
                  <span class="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
                    <button type="button" class="text-xs text-rm-accent hover:underline border-0 bg-transparent cursor-pointer p-0" title="Push to origin" @click.stop="pushTagFromSidebar(t)">Push</button>
                    <button type="button" class="text-xs text-rm-warning hover:underline border-0 bg-transparent cursor-pointer p-0" title="Delete tag" @click.stop="deleteTagFromSidebar(t)">Del</button>
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
            <button type="button" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left border-0 bg-transparent cursor-pointer hover:bg-rm-surface-hover/50 text-rm-text" :aria-expanded="sidebarStashOpen" @click="sidebarStashOpen = !sidebarStashOpen">
              <span class="flex items-center gap-1.5 shrink-0 min-w-0">
                <span v-if="hasMultipleVisibleWidgets" class="widget-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text p-0.5 -ml-0.5" draggable="true" title="Drag to reorder" @click.stop @dragstart="onWidgetDragStart($event, widgetId)" @dragend="onWidgetDragEnd"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
                <span class="w-3.5 h-3.5 shrink-0 text-rm-muted inline-block" v-html="sidebarWidgetIcon(widgetId)" aria-hidden="true"></span>
                <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide truncate">Stash</span>
              </span>
              <span class="flex items-center gap-1 shrink-0">
                <span class="text-xs text-rm-muted tabular-nums">{{ stashListEntries.length }}</span>
                <button type="button" class="text-xs text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer" @click.stop="loadStashList(); gitRightSection = 'stash'">Open</button>
                <svg class="w-3.5 h-3.5 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarStashOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </button>
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
            <button type="button" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left border-0 bg-transparent cursor-pointer hover:bg-rm-surface-hover/50 text-rm-text" :aria-expanded="sidebarSubmodulesOpen" @click="sidebarSubmodulesOpen = !sidebarSubmodulesOpen">
              <span class="flex items-center gap-1.5 shrink-0 min-w-0">
                <span v-if="hasMultipleVisibleWidgets" class="widget-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text p-0.5 -ml-0.5" draggable="true" title="Drag to reorder" @click.stop @dragstart="onWidgetDragStart($event, widgetId)" @dragend="onWidgetDragEnd"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
                <span class="w-3.5 h-3.5 shrink-0 text-rm-muted inline-block" v-html="sidebarWidgetIcon(widgetId)" aria-hidden="true"></span>
                <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide truncate">Submodules</span>
              </span>
              <span class="flex items-center gap-1 shrink-0">
                <span class="text-xs text-rm-muted tabular-nums">{{ submodules.length }}</span>
                <button v-if="submodules.length > 0" type="button" class="text-xs text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer" title="Update all submodules" @click.stop="updateSubmodulesFromSidebar">Update</button>
                <svg class="w-3.5 h-3.5 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarSubmodulesOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </button>
            <div v-show="sidebarSubmodulesOpen" class="border-t border-rm-border">
              <div class="px-2 py-1.5 border-b border-rm-border">
                <input
                  v-model="submoduleSearch"
                  type="text"
                  class="w-full text-xs border border-rm-border bg-rm-bg text-rm-text px-2 py-1"
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
                    <button type="button" class="text-xs text-rm-muted hover:text-rm-text border-0 bg-transparent cursor-pointer p-0" title="Reveal in Finder" @click.stop="revealSubmodule(s.path)">Reveal</button>
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
            <button type="button" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2 py-1.5 text-left border-0 bg-transparent cursor-pointer hover:bg-rm-surface-hover/50 text-rm-text" :aria-expanded="sidebarReflogOpen" @click="sidebarReflogOpen = !sidebarReflogOpen">
              <span class="flex items-center gap-1.5 shrink-0 min-w-0">
                <span v-if="hasMultipleVisibleWidgets" class="widget-drag-handle shrink-0 cursor-grab active:cursor-grabbing text-rm-muted hover:text-rm-text p-0.5 -ml-0.5" draggable="true" title="Drag to reorder" @click.stop @dragstart="onWidgetDragStart($event, widgetId)" @dragend="onWidgetDragEnd"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
                <span class="w-3.5 h-3.5 shrink-0 text-rm-muted inline-block" v-html="sidebarWidgetIcon(widgetId)" aria-hidden="true"></span>
                <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide truncate">Reflog</span>
              </span>
              <span class="flex items-center gap-1 shrink-0">
                <span v-if="reflogLoaded" class="text-xs text-rm-muted tabular-nums">{{ reflogEntries.length }}</span>
                <button type="button" class="text-xs text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer" :disabled="reflogLoading" @click.stop="loadReflogFromSidebar">{{ reflogLoading ? '…' : (reflogLoaded ? 'Refresh' : 'Load') }}</button>
                <svg class="w-3.5 h-3.5 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarReflogOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </button>
            <div v-show="sidebarReflogOpen" class="border-t border-rm-border">
              <div class="px-2 py-1.5 border-b border-rm-border">
                <input
                  v-model="reflogSearch"
                  type="text"
                  class="w-full text-xs border border-rm-border bg-rm-bg text-rm-text px-2 py-1"
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
                    <button
                      type="button"
                      class="w-full flex items-center justify-between gap-1 px-2 py-1 text-left border-0 bg-transparent cursor-pointer hover:bg-rm-surface-hover/50 text-rm-text"
                      :aria-expanded="reflogCategoryOpen[cat.key]"
                      @click="toggleReflogCategory(cat.key)"
                    >
                      <span class="flex items-center gap-1 min-w-0">
                        <svg class="w-3 h-3 text-rm-muted shrink-0 transition-transform" :class="{ 'rotate-180': reflogCategoryOpen[cat.key] }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                        <span class="text-xs font-medium text-rm-muted truncate">{{ cat.label }}</span>
                      </span>
                      <span class="text-xs text-rm-muted tabular-nums shrink-0">{{ cat.entries.length }}</span>
                    </button>
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
                          <button type="button" class="text-xs text-rm-accent hover:underline border-0 bg-transparent cursor-pointer p-0" title="Checkout" @click.stop="checkoutReflogEntry(e)">Checkout</button>
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
            <button
              type="button"
              class="w-full text-left text-xs px-2 py-1.5 border border-rm-border bg-rm-bg text-rm-muted hover:text-rm-text hover:bg-rm-surface-hover flex items-center justify-between gap-1"
              :aria-expanded="widgetDropdownOpen"
              @click="widgetDropdownOpen = !widgetDropdownOpen"
            >
              <span>Widgets</span>
              <svg class="w-3.5 h-3.5 shrink-0" :class="{ 'rotate-180': widgetDropdownOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
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
                <input
                  :id="'widget-visible-' + id"
                  type="checkbox"
                  class="rounded border-rm-border"
                  :checked="effectiveWidgetVisible(id)"
                  @change="setWidgetVisible(id, ($event.target).checked)"
                >
                <label :for="'widget-visible-' + id" class="flex-1 truncate cursor-pointer text-rm-text">{{ GIT_SIDEBAR_WIDGET_LABELS[id] || id }}</label>
                <span class="flex gap-0.5 shrink-0">
                  <button type="button" class="p-0.5 rounded border-0 bg-transparent text-rm-muted hover:text-rm-text cursor-pointer" title="Move up" :disabled="sidebarWidgetOrder.indexOf(id) === 0" @click="moveWidgetUp(id)">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
                  </button>
                  <button type="button" class="p-0.5 rounded border-0 bg-transparent text-rm-muted hover:text-rm-text cursor-pointer" title="Move down" :disabled="sidebarWidgetOrder.indexOf(id) === sidebarWidgetOrder.length - 1" @click="moveWidgetDown(id)">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <button type="button" class="detail-sidebar-resizer shrink-0 border-0 bg-transparent hover:bg-rm-accent/20 active:bg-rm-accent/30 transition-colors self-stretch" aria-label="Resize sidebar" @pointerdown="onGitSidebarResize" />
      <div class="detail-git-center-panel flex-1 min-w-0 overflow-auto border-r border-rm-border">
        <div class="detail-git-commit-table-wrap overflow-auto h-full min-w-0">
          <table class="detail-git-commit-table w-full text-sm border-collapse">
            <thead class="sticky top-0 bg-rm-surface/95 z-10">
              <tr class="border-b border-rm-border text-left text-xs font-semibold text-rm-muted uppercase tracking-wide">
                <th class="py-2 px-2 w-14">Graph</th>
                <th class="py-2 px-2 min-w-[12rem]">Commit message</th>
                <th class="py-2 px-2 w-32">Author</th>
                <th class="py-2 px-2 w-24">Date</th>
              </tr>
            </thead>
            <tbody class="text-rm-text">
              <tr
                v-for="(c, i) in commitLog"
                :key="c.sha"
                class="border-b border-rm-border hover:bg-rm-surface-hover cursor-pointer"
                @click="openCommitDetail(c.sha, i === 0)"
              >
                <td class="py-1.5 px-2 w-14">
                  <span
                    class="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-semibold text-rm-bg bg-rm-accent/80 shrink-0"
                    :title="c.author + (c.authorEmail ? ` <${c.authorEmail}>` : '')"
                  >{{ commitAuthorInitials(c.author) }}</span>
                </td>
                <td class="py-1.5 px-2 truncate max-w-[12rem]" :title="c.subject">{{ c.subject }}</td>
                <td class="py-1.5 px-2 truncate max-w-[8rem] text-rm-muted" :title="c.authorEmail || c.author">{{ c.author }}</td>
                <td class="py-1.5 px-2 text-rm-muted">{{ c.date }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="commitLog.length === 0 && !commitLogLoading" class="m-0 p-2 text-xs text-rm-muted">No commits.</p>
        </div>
      </div>
      <button type="button" class="detail-sidebar-resizer shrink-0 border-0 bg-transparent hover:bg-rm-accent/20 active:bg-rm-accent/30 transition-colors self-stretch" aria-label="Resize right panel" @pointerdown="onGitRightPanelResize" />
      <div class="detail-git-right-panel shrink-0 flex flex-col min-h-0 px-2 py-2" :style="gitRightPanelStyle">
        <div class="detail-git-section-dropdown-row mb-2 flex items-center gap-1.5 relative shrink-0">
          <div class="detail-git-section-dropdown flex-1 min-w-0 relative">
            <button
              type="button"
              class="detail-git-section-select-btn w-full inline-flex items-center gap-1.5 text-xs border border-rm-border bg-rm-bg text-rm-text px-1.5 py-1 text-left"
              :aria-expanded="gitSectionDropdownOpen"
              aria-haspopup="listbox"
              @click="gitSectionDropdownOpen = !gitSectionDropdownOpen"
            >
              <span v-if="currentSectionOption?.icon" class="detail-git-jump-icon shrink-0" v-html="currentSectionOption.icon" aria-hidden="true"></span>
              <span class="truncate flex-1">{{ currentSectionOption?.label || 'Section' }}</span>
              <svg class="w-3 h-3 shrink-0 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div v-if="gitSectionDropdownOpen" class="detail-git-section-dropdown-menu absolute left-0 right-0 top-full mt-0.5 z-20 py-1 border border-rm-border bg-rm-bg shadow-lg max-h-64 overflow-y-auto">
              <button
                v-for="opt in gitSectionOptions"
                :key="opt.value"
                type="button"
                role="option"
                class="detail-git-section-option w-full inline-flex items-center gap-2 text-xs px-2 py-1.5 text-left rounded-none hover:bg-rm-surface-hover"
                :class="{ 'bg-rm-accent/10 text-rm-accent': gitRightSection === opt.value }"
                @click="gitRightSection = opt.value; gitSectionDropdownOpen = false"
              >
                <span v-if="opt.icon" class="detail-git-jump-icon shrink-0" v-html="opt.icon" aria-hidden="true"></span>
                <span class="truncate">{{ opt.label }}</span>
              </button>
            </div>
          </div>
          <button v-if="gitSectionDocKey" type="button" class="doc-trigger p-1 text-rm-muted hover:text-rm-accent hover:bg-rm-surface-hover border-0 bg-transparent cursor-pointer text-xs font-normal shrink-0" title="Documentation" aria-label="Documentation" @click="openGitSectionDocs">(i)</button>
        </div>
        <template v-if="gitRightSection === 'working-tree'">
        <!-- Working tree & commit: header + file sections + commit area -->
        <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
          <!-- Toolbar: Discard | status | actions -->
          <div class="detail-git-toolbar-bar">
            <button type="button" class="p-1.5 border-0 bg-transparent cursor-pointer text-rm-muted hover:text-rm-warning hover:bg-rm-warning/10" title="Discard all uncommitted changes" :disabled="!hasChanges" @click="discardAll">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
            <span class="text-xs truncate min-w-0" :class="hasChanges ? 'text-rm-text' : 'text-rm-muted'">
              <template v-if="hasChanges">{{ fileChangesCount }} file {{ fileChangesCount === 1 ? 'change' : 'changes' }} on <code class="px-1.5 py-0.5 bg-rm-accent/15 text-rm-accent text-[11px] font-medium">{{ currentBranch || '…' }}</code></template>
              <template v-else>Working tree clean</template>
            </span>
            <div class="flex items-center gap-1.5 shrink-0">
              <button type="button" class="p-1.5 border border-rm-border bg-transparent cursor-pointer text-rm-muted hover:text-rm-accent hover:bg-rm-accent/10 hover:border-rm-accent/40 shrink-0 text-[11px] transition-colors" title="Create a test file to try staging, diff, discard, etc." :disabled="createTestFileLoading" @click="createTestFileAndRefresh">
                {{ createTestFileLoading ? '…' : '+ Test file' }}
              </button>
              <button v-if="aiGenerateAvailable" type="button" class="p-1.5 border-0 bg-transparent cursor-pointer text-rm-muted hover:text-rm-accent hover:bg-rm-accent/10 shrink-0" title="Generate commit message (AI)" @click="generateCommitMessage">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9z"/></svg>
              </button>
            </div>
          </div>
          <!-- View: Path | Tree | options -->
          <div class="detail-git-view-bar">
            <button type="button" class="detail-git-view-toggle text-xs font-medium px-2 py-1 border border-transparent bg-transparent cursor-pointer" :class="workingTreeView === 'path' ? 'text-rm-accent border-rm-accent/50 bg-rm-accent/10' : 'text-rm-muted hover:text-rm-text'" @click="workingTreeView = 'path'">Path</button>
            <button type="button" class="detail-git-view-toggle text-xs font-medium px-2 py-1 border border-transparent bg-transparent cursor-pointer" :class="workingTreeView === 'tree' ? 'text-rm-accent border-rm-accent/50 bg-rm-accent/10' : 'text-rm-muted hover:text-rm-text'" @click="workingTreeView = 'tree'">Tree</button>
            <template v-if="workingTreeView === 'tree'">
              <label class="flex items-center gap-1.5 text-xs text-rm-text cursor-pointer ml-1">
                <input v-model="viewAllFiles" type="checkbox" class="rounded border-rm-border" />
                <span>View all files</span>
              </label>
              <button v-if="viewAllFiles && workingTreeNested.children?.length" type="button" class="text-[11px] text-rm-muted hover:text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer ml-1" @click="collapseAllTree">Collapse All</button>
            </template>
          </div>
          <!-- Tree mode + View all files: single expandable tree -->
          <div v-if="workingTreeView === 'tree' && viewAllFiles" class="detail-git-files-panel flex-1 min-h-0 overflow-y-auto mx-2 mt-2 overflow-hidden flex flex-col">
            <div class="px-2 py-1.5 shrink-0 border-b border-rm-border">
              <span class="detail-git-sidebar-group-header-modern">{{ trackedFilesLoading ? 'Loading…' : (fileCountInTree > 0 ? `${fileCountInTree} file${fileCountInTree === 1 ? '' : 's'}` : 'No files') }}</span>
            </div>
            <div class="px-2 py-1 overflow-y-auto min-h-0 flex-1 text-xs">
              <p v-if="trackedFilesLoading" class="m-0 py-2 text-rm-muted">{{ viewAllFiles ? 'Loading project files…' : 'Loading…' }}</p>
              <p v-else-if="!workingTreeFlatRows.length" class="m-0 py-2 text-rm-muted">{{ viewAllFiles ? 'No files in project.' : 'No files to show. Check "View all files" to see every file in the project.' }}</p>
              <ul v-else class="m-0 pl-0 list-none space-y-0">
                <template v-for="row in workingTreeFlatRows" :key="row.key">
                  <li v-if="row.type === 'dir'" class="flex items-center gap-1 py-0.5 cursor-pointer hover:bg-rm-surface-hover/50" :style="{ paddingLeft: row.depth * 12 + 4 + 'px' }" @click="toggleTreeExpand(row.key)">
                    <svg class="w-3 h-3 shrink-0 text-rm-muted transition-transform" :class="{ 'rotate-90': treeExpandedKeys.has(row.key) }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                    <span class="truncate text-rm-text font-medium">{{ row.name }}</span>
                  </li>
                  <li v-else class="flex items-center gap-2 py-0.5 group" :style="{ paddingLeft: row.depth * 12 + 4 + 'px' }" @contextmenu.prevent="openFilePathContextMenu($event, row.path)">
                    <span v-if="modifiedPathSet.has(row.path)" class="shrink-0 w-4 text-center" :class="workingTreeBadge(row.path, porcelainByPath.get(row.path)?.isStaged).className" :title="workingTreeBadge(row.path, porcelainByPath.get(row.path)?.isStaged).title">{{ workingTreeBadge(row.path, porcelainByPath.get(row.path)?.isStaged).label }}</span>
                    <span v-else class="shrink-0 w-4 text-center text-rm-muted">·</span>
                    <button v-if="!workingTreeBadge(row.path, porcelainByPath.get(row.path)?.isStaged ?? false).isDeleted" type="button" class="text-left truncate flex-1 min-w-0 text-rm-text hover:text-rm-accent hover:underline bg-transparent border-0 p-0 cursor-pointer" :title="row.path" @click="openSideBySideDiff(row.path, porcelainByPath.get(row.path)?.isStaged ?? false)">{{ row.name }}</button>
                    <span v-else class="truncate flex-1 min-w-0 text-rm-muted" :title="row.path">{{ row.name }}</span>
                    <span class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
                      <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer" title="Diff" @click="openSideBySideDiff(row.path, porcelainByPath.get(row.path)?.isStaged ?? false)">Diff</button>
                      <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer" title="Open in selected editor" @click="openFile(row.path)">Editor</button>
                      <button v-if="isGitattributesFile(row.path)" type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer" title="Open in .gitattributes editor" @click="openGitattributesEditor">Edit</button>
                      <template v-if="modifiedPathSet.has(row.path)">
                        <button v-if="porcelainByPath.get(row.path)?.isStaged" type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer" @click="unstageFile(row.path)">Unstage</button>
                        <button v-else type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer" @click="stageFile(row.path)">Stage</button>
                        <button type="button" class="text-[10px] text-rm-warning hover:underline border-0 bg-transparent p-0 cursor-pointer" title="Discard file" @click="discardFile(row.path)">Discard</button>
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
              <button type="button" class="detail-git-file-group-header w-full flex items-center justify-between gap-1 text-left border-0 bg-transparent cursor-pointer text-rm-text" :aria-expanded="workingTreeUnstagedOpen" @click="workingTreeUnstagedOpen = !workingTreeUnstagedOpen">
                <span class="detail-git-file-group-label">
                  <span class="detail-git-file-group-title">Unstaged</span>
                  <span class="detail-git-file-group-count">({{ unstaged.length }})</span>
                </span>
                <span class="flex items-center gap-1 shrink-0">
                  <button v-if="unstaged.length > 0" type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent px-1.5 py-0.5 border border-rm-accent/50 cursor-pointer" @click.stop="stageAll">Stage all</button>
                  <svg class="w-3.5 h-3.5 shrink-0 text-rm-muted transition-transform" :class="{ 'rotate-180': workingTreeUnstagedOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </button>
              <div v-show="workingTreeUnstagedOpen" class="detail-git-file-group-content">
                <template v-if="workingTreeView === 'path'">
                  <ul v-if="unstaged.length" class="m-0 mt-1 pl-0 list-none text-xs space-y-1">
                    <li v-for="f in unstaged" :key="'u-' + f" class="flex items-center gap-2 py-0.5" @contextmenu.prevent="openFilePathContextMenu($event, f)">
                      <span class="shrink-0 w-4 text-center" :class="workingTreeBadge(f, false).className" :title="workingTreeBadge(f, false).title">{{ workingTreeBadge(f, false).label }}</span>
                      <button v-if="!workingTreeBadge(f, false).isDeleted" type="button" class="text-left truncate flex-1 min-w-0 text-rm-text hover:text-rm-accent hover:underline bg-transparent border-0 p-0 cursor-pointer" :title="f" @click="openSideBySideDiff(f, false)">{{ f }}</button>
                      <span v-else class="truncate flex-1 min-w-0 text-rm-muted" :title="f">{{ f }}</span>
                      <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" title="Diff" @click="openSideBySideDiff(f, false)">Diff</button>
                      <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" title="Open in selected editor" @click="openFile(f)">Editor</button>
                      <button v-if="isGitattributesFile(f)" type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" title="Open in .gitattributes editor" @click="openGitattributesEditor">Edit</button>
                      <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" @click="stageFile(f)">Stage</button>
                      <button type="button" class="text-[10px] text-rm-warning hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" title="Discard file" @click="discardFile(f)">Discard</button>
                    </li>
                  </ul>
                  <template v-else>
                    <p class="m-0 py-1.5 text-xs text-rm-muted">No unstaged files.</p>
                    <button v-if="staged.length > 0" type="button" class="text-xs text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer" @click="unstageAll">Unstage all and show here</button>
                  </template>
                </template>
                <template v-else>
                  <ul v-if="workingTreeByDirUnstaged.length" class="m-0 mt-1 pl-0 list-none text-xs space-y-0.5">
                    <template v-for="group in workingTreeByDirUnstaged" :key="'u-' + group.dir">
                      <li class="font-medium text-rm-muted/90 py-0.5">{{ group.dir || '.' }}</li>
                      <li v-for="item in group.items" :key="'u-' + item.path" class="flex items-center gap-2 pl-3 py-0.5" @contextmenu.prevent="openFilePathContextMenu($event, item.path)">
                        <span class="shrink-0 w-4 text-center" :class="workingTreeBadge(item.path, false).className" :title="workingTreeBadge(item.path, false).title">{{ workingTreeBadge(item.path, false).label }}</span>
                        <button v-if="!workingTreeBadge(item.path, false).isDeleted" type="button" class="text-left truncate flex-1 min-w-0 text-rm-text hover:text-rm-accent hover:underline bg-transparent border-0 p-0 cursor-pointer" :title="item.path" @click="openSideBySideDiff(item.path, false)">{{ item.name }}</button>
                        <span v-else class="truncate flex-1 min-w-0 text-rm-muted" :title="item.path">{{ item.name }}</span>
                        <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" title="Open in selected editor" @click="openFile(item.path)">Editor</button>
                        <button v-if="isGitattributesFile(item.path)" type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" title="Open in .gitattributes editor" @click="openGitattributesEditor">Edit</button>
                        <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" title="Diff (unstaged)" @click="openSideBySideDiff(item.path, false)">Diff</button>
                        <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" @click="stageFile(item.path)">Stage</button>
                        <button type="button" class="text-[10px] text-rm-warning hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" @click="discardFile(item.path)">Discard</button>
                      </li>
                    </template>
                  </ul>
                  <template v-else>
                    <p class="m-0 py-1.5 text-xs text-rm-muted">No unstaged files.</p>
                    <button v-if="staged.length > 0" type="button" class="text-xs text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer" @click="unstageAll">Unstage all and show here</button>
                  </template>
                </template>
              </div>
            </div>
            <div class="detail-git-file-group detail-git-file-group-staged">
              <button type="button" class="detail-git-file-group-header w-full flex items-center justify-between gap-1 text-left border-0 bg-transparent cursor-pointer text-rm-text" :aria-expanded="workingTreeStagedOpen" @click="workingTreeStagedOpen = !workingTreeStagedOpen">
                <span class="detail-git-file-group-label">
                  <span class="detail-git-file-group-title">Staged</span>
                  <span class="detail-git-file-group-count">({{ staged.length }})</span>
                </span>
                <span class="flex items-center gap-1 shrink-0">
                  <button v-if="staged.length > 0" type="button" class="text-[10px] text-rm-warning hover:underline border-0 bg-transparent px-1.5 py-0.5 border border-rm-warning/50 cursor-pointer" @click.stop="unstageAll">Unstage all</button>
                  <svg class="w-3.5 h-3.5 text-rm-muted transition-transform" :class="{ 'rotate-180': workingTreeStagedOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </button>
              <div v-show="workingTreeStagedOpen" class="detail-git-file-group-content">
                <template v-if="workingTreeView === 'path'">
                  <ul v-if="staged.length" class="m-0 mt-1 pl-0 list-none text-xs space-y-1">
                    <li v-for="f in staged" :key="'s-' + f" class="flex items-center gap-2 py-0.5" @contextmenu.prevent="openFilePathContextMenu($event, f)">
                      <span class="shrink-0 w-4 text-center" :class="workingTreeBadge(f, true).className" :title="workingTreeBadge(f, true).title">{{ workingTreeBadge(f, true).label }}</span>
                      <span class="truncate flex-1 min-w-0 text-rm-text" :title="f">{{ f }}</span>
                      <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" title="Diff (staged)" @click="openSideBySideDiff(f, true)">Diff</button>
                      <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" title="Open in selected editor" @click="openFile(f)">Editor</button>
                      <button v-if="isGitattributesFile(f)" type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" title="Open in .gitattributes editor" @click="openGitattributesEditor">Edit</button>
                      <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" @click="unstageFile(f)">Unstage</button>
                      <button type="button" class="text-[10px] text-rm-warning hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" title="Discard file" @click="discardFile(f)">Discard</button>
                    </li>
                  </ul>
                  <template v-else>
                    <p class="m-0 py-1.5 text-xs text-rm-muted">No staged files.</p>
                    <button v-if="unstaged.length > 0" type="button" class="text-xs text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer" @click="stageAll">Stage all changes</button>
                  </template>
                </template>
                <template v-else>
                  <ul v-if="workingTreeByDirStaged.length" class="m-0 mt-1 pl-0 list-none text-xs space-y-0.5">
                    <template v-for="group in workingTreeByDirStaged" :key="'s-' + group.dir">
                      <li class="font-medium text-rm-muted/90 py-0.5">{{ group.dir || '.' }}</li>
                      <li v-for="item in group.items" :key="'s-' + item.path" class="flex items-center gap-2 pl-3 py-0.5" @contextmenu.prevent="openFilePathContextMenu($event, item.path)">
                        <span class="shrink-0 w-4 text-center" :class="workingTreeBadge(item.path, true).className" :title="workingTreeBadge(item.path, true).title">{{ workingTreeBadge(item.path, true).label }}</span>
                        <span class="truncate flex-1 min-w-0 text-rm-text" :title="item.path">{{ item.name }}</span>
                        <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" title="Diff (staged)" @click="openSideBySideDiff(item.path, true)">Diff</button>
                        <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" title="Open in selected editor" @click="openFile(item.path)">Editor</button>
                        <button v-if="isGitattributesFile(item.path)" type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" title="Open in .gitattributes editor" @click="openGitattributesEditor">Edit</button>
                        <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" @click="unstageFile(item.path)">Unstage</button>
                        <button type="button" class="text-[10px] text-rm-warning hover:underline border-0 bg-transparent p-0 cursor-pointer shrink-0" @click="discardFile(item.path)">Discard</button>
                      </li>
                    </template>
                  </ul>
                  <template v-else>
                    <p class="m-0 py-1.5 text-xs text-rm-muted">No staged files.</p>
                    <button v-if="unstaged.length > 0" type="button" class="text-xs text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer" @click="stageAll">Stage all changes</button>
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
                  <textarea
                    v-model="commitSummary"
                    class="input-field detail-git-commit-summary-input"
                    rows="2"
                    placeholder="e.g. feat: add X"
                    maxlength="72"
                  ></textarea>
                  <button v-if="aiGenerateAvailable" type="button" class="detail-git-commit-ai-btn" title="Generate commit message (AI)" @click="generateCommitMessage">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9z"/></svg>
                  </button>
                </div>
              </div>
              <div class="detail-git-commit-row">
                <label class="detail-git-commit-label">Description <span class="text-rm-muted font-normal">(optional)</span></label>
                <textarea
                  v-model="commitDescription"
                  class="input-field detail-git-commit-desc-input"
                  rows="3"
                  placeholder="Add more context…"
                ></textarea>
              </div>
              <div class="detail-git-commit-options">
                <label class="detail-git-commit-option">
                  <input v-model="amendCommit" type="checkbox" class="checkbox-input" />
                  <span>Amend</span>
                </label>
                <label class="detail-git-commit-option">
                  <input v-model="signCommit" type="checkbox" class="checkbox-input" />
                  <span>Sign</span>
                </label>
              </div>
              <div class="detail-git-commit-actions">
                <button
                  type="button"
                  class="btn-primary detail-git-commit-submit"
                  :disabled="!canCommit"
                  @click="commit"
                >
                  {{ staged.length > 0 ? `Commit ${staged.length} file${staged.length === 1 ? '' : 's'}` : 'Commit' }}
                </button>
                <button type="button" class="btn-secondary detail-git-commit-push" title="Push" @click="pushFromFooter">Push</button>
              </div>
              <p v-if="gitActionStatus" class="detail-git-commit-status">{{ gitActionStatus }}</p>
            </div>
          </div>
        </div>
        </template>
        <div v-else class="overflow-y-auto flex-1 min-h-0 border border-rm-border bg-rm-surface/20 p-2">
          <GitBranchSyncCard v-if="gitRightSection === 'branch-sync'" @refresh="$emit('refresh')" />
          <GitMergeRebaseCard v-else-if="gitRightSection === 'merge-rebase'" :current-branch="currentBranch" @refresh="$emit('refresh')" />
          <GitStashCard v-else-if="gitRightSection === 'stash'" @refresh="onStashCardRefresh" />
          <GitTagsCard v-else-if="gitRightSection === 'tags'" @refresh="$emit('refresh')" />
          <GitReflogCard v-else-if="gitRightSection === 'reflog'" @refresh="$emit('refresh')" />
          <GitDeleteBranchCard v-else-if="gitRightSection === 'delete-branch'" :current-branch="currentBranch" @refresh="$emit('refresh')" />
          <GitRemotesCard v-else-if="gitRightSection === 'remotes'" @refresh="$emit('refresh')" />
          <GitCompareResetCard v-else-if="gitRightSection === 'compare-reset'" @refresh="$emit('refresh')" />
          <GitGitignoreCard v-else-if="gitRightSection === 'gitignore'" @refresh="$emit('refresh')" />
          <GitGitattributesCard v-else-if="gitRightSection === 'gitattributes'" @refresh="$emit('refresh')" />
          <GitSubmodulesCard v-else-if="gitRightSection === 'submodules'" @refresh="$emit('refresh')" />
          <GitWorktreesCard v-else-if="gitRightSection === 'worktrees'" @refresh="$emit('refresh')" />
          <GitBisectCard v-else-if="gitRightSection === 'bisect'" :info="info" @refresh="$emit('refresh')" />
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
        <button
          v-if="!branchContextMenu.isRemote"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuCheckout"
        >
          Checkout
        </button>
        <button
          v-if="branchContextMenu.isRemote"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuCheckoutRemote"
        >
          Checkout (track remote)
        </button>
        <template v-if="branchContextMenuBranchIsCurrent">
          <div class="border-t border-rm-border my-1" role="separator"></div>
          <button
            type="button"
            class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
            role="menuitem"
            @click="contextMenuBranchPull"
          >
            Pull (fast-forward if possible)
          </button>
          <button
            type="button"
            class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
            role="menuitem"
            @click="contextMenuBranchPush"
          >
            Push
          </button>
          <button
            v-if="!branchContextMenu.isRemote && api.setBranchUpstream"
            type="button"
            class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
            role="menuitem"
            @click="contextMenuSetUpstream"
          >
            Set Upstream
          </button>
        </template>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuCreateBranchFrom"
        >
          Create branch from this…
        </button>
        <template v-if="!branchContextMenu.isRemote && branchContextMenu.branch !== currentBranch && api.gitReset">
          <button
            type="button"
            class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
            role="menuitem"
            @click="contextMenuResetToHere('soft')"
          >
            Reset current branch to here (soft)
          </button>
          <button
            type="button"
            class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
            role="menuitem"
            @click="contextMenuResetToHere('mixed')"
          >
            Reset current branch to here (mixed)
          </button>
          <button
            type="button"
            class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-warning border-0 bg-transparent cursor-pointer"
            role="menuitem"
            @click="contextMenuResetToHere('hard')"
          >
            Reset current branch to here (hard)
          </button>
        </template>
        <button
          v-if="!branchContextMenu.isRemote && branchContextMenuBranchIsCurrent && api.gitAmend"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuAmendCommit"
        >
          Amend last commit…
        </button>
        <button
          v-if="!branchContextMenu.isRemote && api.createTag"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuCreateTagHere(false)"
        >
          Create tag here
        </button>
        <button
          v-if="!branchContextMenu.isRemote && api.createTag"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuCreateTagHere(true)"
        >
          Create annotated tag here
        </button>
        <button
          v-if="!branchContextMenu.isRemote && branchContextMenu.branch !== currentBranch && api.renameBranch"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuRenameBranch"
        >
          Rename {{ branchContextMenu.branch }}
        </button>
        <button
          v-if="!branchContextMenu.isRemote && branchContextMenu.branch !== currentBranch"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-warning border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuDeleteBranch"
        >
          Delete {{ branchContextMenu.branch }}
        </button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuCopyBranchName"
        >
          Copy branch name
        </button>
        <button
          v-if="api.getBranchRevision"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuCopyCommitSha"
        >
          Copy commit SHA
        </button>
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuCopyBranchLink"
        >
          Copy link to branch
        </button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <button
          v-if="api.gitStashPush"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuStashPush"
        >
          Stash
        </button>
        <button
          v-if="api.gitStashPop"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuStashPop"
        >
          Pop stash
        </button>
      </div>
      <div
        v-if="remoteContextMenu"
        class="git-branch-context-menu fixed z-[10000] min-w-[11rem] py-1 border border-rm-border bg-rm-surface shadow-lg text-sm"
        :style="{ left: remoteContextMenu.x + 'px', top: remoteContextMenu.y + 'px' }"
        role="menu"
      >
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuRemoteFetch"
        >
          Fetch
        </button>
        <button
          v-if="api.gitPruneRemotes"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuRemotePrune"
        >
          Prune remotes
        </button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuRemoteRefresh"
        >
          Refresh list
        </button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <button
          v-if="api.gitStashPush"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuStashPush"
        >
          Stash
        </button>
        <button
          v-if="api.gitStashPop"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuStashPop"
        >
          Pop stash
        </button>
      </div>
      <div
        v-if="tagContextMenu"
        class="git-branch-context-menu fixed z-[10000] min-w-[11rem] py-1 border border-rm-border bg-rm-surface shadow-lg text-sm"
        :style="{ left: tagContextMenu.x + 'px', top: tagContextMenu.y + 'px' }"
        role="menu"
      >
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuCheckoutTag"
        >
          Checkout
        </button>
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuPushTag"
        >
          Push to origin
        </button>
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-warning border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuDeleteTag"
        >
          Delete tag
        </button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <button
          v-if="api.gitStashPush"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuStashPush"
        >
          Stash
        </button>
        <button
          v-if="api.gitStashPop"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuStashPop"
        >
          Pop stash
        </button>
      </div>
      <div
        v-if="worktreeContextMenu"
        class="git-branch-context-menu fixed z-[10000] min-w-[11rem] py-1 border border-rm-border bg-rm-surface shadow-lg text-sm"
        :style="{ left: worktreeContextMenu.x + 'px', top: worktreeContextMenu.y + 'px' }"
        role="menu"
      >
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuRevealWorktree"
        >
          Reveal in Finder
        </button>
        <button
          v-if="!isCurrentWorktree(worktreeContextMenu.worktree?.path)"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-warning border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuRemoveWorktree"
        >
          Remove worktree
        </button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <button
          v-if="api.gitStashPush"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuStashPush"
        >
          Stash
        </button>
        <button
          v-if="api.gitStashPop"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuStashPop"
        >
          Pop stash
        </button>
      </div>
      <div
        v-if="submoduleContextMenu"
        class="git-branch-context-menu fixed z-[10000] min-w-[11rem] py-1 border border-rm-border bg-rm-surface shadow-lg text-sm"
        :style="{ left: submoduleContextMenu.x + 'px', top: submoduleContextMenu.y + 'px' }"
        role="menu"
      >
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuOpenSubmodulesSection"
        >
          Open Submodules section
        </button>
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuRevealSubmodule"
        >
          Reveal in Finder
        </button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <button
          v-if="api.gitStashPush"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuStashPush"
        >
          Stash
        </button>
        <button
          v-if="api.gitStashPop"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuStashPop"
        >
          Pop stash
        </button>
      </div>
      <div
        v-if="reflogContextMenu"
        class="git-branch-context-menu fixed z-[10000] min-w-[11rem] py-1 border border-rm-border bg-rm-surface shadow-lg text-sm"
        :style="{ left: reflogContextMenu.x + 'px', top: reflogContextMenu.y + 'px' }"
        role="menu"
      >
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuOpenReflogSection"
        >
          Open Reflog section
        </button>
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuCheckoutReflog"
        >
          Checkout (detached HEAD)
        </button>
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuCopyReflogSha"
        >
          Copy SHA
        </button>
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuCopyReflogRef"
        >
          Copy ref (e.g. HEAD@&#123;1&#125;)
        </button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <button
          v-if="api.gitStashPush"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuStashPush"
        >
          Stash
        </button>
        <button
          v-if="api.gitStashPop"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuStashPop"
        >
          Pop stash
        </button>
      </div>
      <div
        v-if="filePathContextMenu"
        class="git-branch-context-menu fixed z-[10000] min-w-[12rem] py-1 border border-rm-border bg-rm-surface shadow-lg text-sm"
        :style="{ left: filePathContextMenu.x + 'px', top: filePathContextMenu.y + 'px' }"
        role="menu"
      >
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuCopyFilePath"
        >
          Copy path
        </button>
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuCopyFullPath"
        >
          Copy full path
        </button>
        <button
          v-if="api.openPathInFinder"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuRevealFilePath"
        >
          Reveal in Finder
        </button>
        <div class="border-t border-rm-border my-1" role="separator"></div>
        <button
          v-if="api.gitStashPush"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuStashPush"
        >
          Stash
        </button>
        <button
          v-if="api.gitStashPop"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuStashPop"
        >
          Pop stash
        </button>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useAppStore } from '../../stores/app';
import { useApi } from '../../composables/useApi';
import { useModals } from '../../composables/useModals';
import { useCollapsible } from '../../composables/useCollapsible';
import { useResizableSidebar } from '../../composables/useResizableSidebar';
import { useAiGenerateAvailable } from '../../composables/useAiGenerateAvailable';
import { formatAheadBehind } from '../../utils';
import { GIT_ACTION_CONFIRMS, GIT_ACTION_SUCCESS } from '../../constants';
import GitBranchSyncCard from './git/GitBranchSyncCard.vue';
import GitMergeRebaseCard from './git/GitMergeRebaseCard.vue';
import GitStashCard from './git/GitStashCard.vue';
import GitTagsCard from './git/GitTagsCard.vue';
import GitReflogCard from './git/GitReflogCard.vue';
import GitDeleteBranchCard from './git/GitDeleteBranchCard.vue';
import GitRemotesCard from './git/GitRemotesCard.vue';
import TerminalPanel from './TerminalPanel.vue';
import GitCompareResetCard from './git/GitCompareResetCard.vue';
import GitGitignoreCard from './git/GitGitignoreCard.vue';
import GitGitattributesCard from './git/GitGitattributesCard.vue';
import GitSubmodulesCard from './git/GitSubmodulesCard.vue';
import GitWorktreesCard from './git/GitWorktreesCard.vue';
import GitBisectCard from './git/GitBisectCard.vue';

const props = defineProps({ info: { type: Object, default: null } });
const emit = defineEmits(['refresh']);

const store = useAppStore();
const api = useApi();
const modals = useModals();
const { collapsed, toggle } = useCollapsible('git');
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
const branches = ref([]);
const tags = ref([]);
const remoteBranches = ref([]);
const remoteBranchesLoaded = ref(false);
const remoteBranchesLoading = ref(false);
const pullDropdownOpen = ref(false);
const DEFAULT_PULL_MODE_KEY = 'defaultPullMode';
const defaultPullMode = ref('merge');
const pullOptions = [
  { mode: 'fetch', label: 'Fetch All' },
  { mode: 'merge', label: 'Pull (fast-forward if possible)' },
  { mode: 'ff-only', label: 'Pull (fast-forward only)' },
  { mode: 'rebase', label: 'Pull (rebase)' },
];
const branchSelectRef = ref(null);
const inlineTerminalOpen = ref(false);
const worktrees = ref([]);
const selectedBranch = ref('');
const commitSummary = ref('');
const commitDescription = ref('');
const gitActionStatus = ref('');
const gitFilter = ref('');
const commitLog = ref([]);
const commitLogLoading = ref(false);
const gitUser = ref({ name: '', email: '' });
const amendCommit = ref(false);
const signCommit = ref(false);
const gitRightSection = ref('working-tree');
const gitSectionDropdownOpen = ref(false);
const branchContextMenu = ref(null);
const filePathContextMenu = ref(null);
const remoteContextMenu = ref(null);
const tagContextMenu = ref(null);
const worktreeContextMenu = ref(null);
const submoduleContextMenu = ref(null);
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
const sidebarLocalOpen = ref(true);
const sidebarRemoteOpen = ref(true);
const sidebarWorktreesOpen = ref(true);
const sidebarTagsOpen = ref(true);
const sidebarSubmodulesOpen = ref(true);
const sidebarReflogOpen = ref(true);
const sidebarStashOpen = ref(true);
const stashListEntries = ref([]);
const submodules = ref([]);
const reflogEntries = ref([]);
const reflogLoaded = ref(false);
const reflogLoading = ref(false);
const reflogContextMenu = ref(null);
const submoduleSearch = ref('');
const reflogSearch = ref('');
const reflogCategoryOpen = ref({ commit: true, checkout: true, merge: true, rebase: true, reset: true, other: true });

const GIT_SIDEBAR_WIDGET_IDS = ['local-branches', 'remote', 'worktrees', 'tags', 'stash', 'submodules', 'reflog'];
const GIT_SIDEBAR_WIDGET_LABELS = {
  'local-branches': 'Local branches',
  'remote': 'Remote',
  'worktrees': 'Worktrees',
  'tags': 'Tags',
  'stash': 'Stash',
  'submodules': 'Submodules',
  'reflog': 'Reflog',
};
const sidebarWidgetOrder = ref([...GIT_SIDEBAR_WIDGET_IDS]);
/** null = use auto (hide empty widgets). Object = user's explicit visibility. */
const sidebarWidgetVisible = ref(null);
const widgetDropdownOpen = ref(false);
const GIT_SIDEBAR_WIDGET_ORDER_KEY = 'gitSidebarWidgetOrder';
const GIT_SIDEBAR_WIDGET_VISIBLE_KEY = 'gitSidebarWidgetVisibility';
const draggedWidgetId = ref(null);
const widgetDropTarget = ref({ id: null, position: 'before' });
/** Branch drag-and-drop: { ref, isRemote } while dragging; drop target branch name for highlight. */
const branchDragPayload = ref(null);
const branchDropTarget = ref(null);
const currentSectionOption = computed(() => gitSectionOptions.find((o) => o.value === gitRightSection.value) || null);

const gitSectionIcon = (name) => {
  const size = 'class="git-section-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const icons = {
    'working-tree': `<svg ${size}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    'branch-sync': `<svg ${size}><line x1="6" y1="3" x2="6" y2="15"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 15a3 3 0 0 0 6 0"/></svg>`,
    'merge-rebase': `<svg ${size}><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>`,
    'stash': `<svg ${size}><path d="M5 4h14v8h-4l-4 4-4-4H5z"/></svg>`,
    'tags': `<svg ${size}><path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l6.59-6.59a1 1 0 0 0 0-1.41L12 2Z"/><path d="M7 7h.01"/></svg>`,
    'reflog': `<svg ${size}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    'delete-branch': `<svg ${size}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
    'remotes': `<svg ${size}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`,
    'compare-reset': `<svg ${size}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    'gitignore': `<svg ${size}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
    'gitattributes': `<svg ${size}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
    'submodules': `<svg ${size}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/></svg>`,
    'worktrees': `<svg ${size}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    'bisect': `<svg ${size}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  };
  return icons[name] || '';
};
function sidebarWidgetIcon(widgetId) {
  const key = widgetId === 'local-branches' ? 'branch-sync' : widgetId === 'remote' ? 'remotes' : widgetId;
  return gitSectionIcon(key);
}
function loadStashList() {
  const path = store.selectedPath;
  if (!path || !api.getStashList) return Promise.resolve();
  return api.getStashList(path).then((r) => {
    stashListEntries.value = r?.ok && Array.isArray(r?.entries) ? r.entries : [];
  }).catch(() => { stashListEntries.value = []; });
}
function onStashCardRefresh() {
  loadStashList();
  emit('refresh');
}
const gitSectionOptions = [
  { value: 'working-tree', label: 'Working tree & commit' },
  { value: 'branch-sync', label: 'Branch & sync' },
  { value: 'merge-rebase', label: 'Merge & rebase' },
  { value: 'stash', label: 'Stash' },
  { value: 'tags', label: 'Tags' },
  { value: 'reflog', label: 'Reflog' },
  { value: 'delete-branch', label: 'Delete branch' },
  { value: 'remotes', label: 'Remotes' },
  { value: 'compare-reset', label: 'Compare & reset' },
  { value: 'gitignore', label: '.gitignore' },
  { value: 'gitattributes', label: '.gitattributes' },
  { value: 'submodules', label: 'Submodules' },
  { value: 'worktrees', label: 'Worktrees' },
  { value: 'bisect', label: 'Bisect' },
].map((opt) => ({ ...opt, icon: gitSectionIcon(opt.value) }));

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
  // Deleted – red
  if (code === 'D') return { label: 'D', className: 'text-rm-danger', title: 'Deleted', isDeleted: true };
  // Modified – amber
  if (code === 'M') return { label: 'M', className: 'text-rm-warning', title: 'Modified', isDeleted: false };
  // Added (staged new file) – green
  if (code === 'A') return { label: '+', className: 'text-rm-success', title: 'Added', isDeleted: false };
  // Untracked – blue/gray
  if (code === '?') return { label: '?', className: 'text-rm-info', title: 'Untracked', isDeleted: false };
  // Renamed – green
  if (code === 'R') return { label: 'R', className: 'text-rm-success', title: 'Renamed', isDeleted: false };
  // Copied – green
  if (code === 'C') return { label: 'C', className: 'text-rm-success', title: 'Copied', isDeleted: false };
  // Unmerged / conflict – red
  if (code === 'U') return { label: 'U', className: 'text-rm-danger', title: 'Unmerged (conflict)', isDeleted: false };
  // Type changed – amber
  if (code === 'T') return { label: 'T', className: 'text-rm-warning', title: 'Type changed', isDeleted: false };
  // Ignored – muted
  if (code === '!') return { label: '!', className: 'text-rm-muted', title: 'Ignored', isDeleted: false };
  return { label: isStaged ? 'M' : '+', className: isStaged ? 'text-rm-warning' : 'text-rm-success', title: 'Changed', isDeleted: false };
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

const filterLower = computed(() => (gitFilter.value || '').trim().toLowerCase());
const filteredBranches = computed(() => {
  if (!filterLower.value) return branches.value;
  return branches.value.filter((b) => String(b).toLowerCase().includes(filterLower.value));
});
const filteredTags = computed(() => {
  if (!filterLower.value) return tags.value;
  return tags.value.filter((t) => String(t).toLowerCase().includes(filterLower.value));
});
const filteredRemoteBranches = computed(() => {
  if (!filterLower.value) return remoteBranches.value;
  return remoteBranches.value.filter((r) => String(r).toLowerCase().includes(filterLower.value));
});
const filteredSubmodules = computed(() => {
  if (!filterLower.value) return submodules.value;
  const lower = filterLower.value;
  return submodules.value.filter(
    (s) =>
      String(s?.path || '').toLowerCase().includes(lower) ||
      String(s?.url || '').toLowerCase().includes(lower)
  );
});
const filteredReflogEntries = computed(() => {
  if (!filterLower.value) return reflogEntries.value;
  const lower = filterLower.value;
  return reflogEntries.value.filter(
    (e) =>
      String(e?.sha || '').toLowerCase().includes(lower) ||
      String(e?.ref || '').toLowerCase().includes(lower) ||
      String(e?.message || '').toLowerCase().includes(lower)
  );
});
const submoduleSearchLower = computed(() => (submoduleSearch.value || '').trim().toLowerCase());
const filteredSubmodulesBySearch = computed(() => {
  if (!submoduleSearchLower.value) return submodules.value;
  return submodules.value.filter(
    (s) =>
      String(s?.path || '').toLowerCase().includes(submoduleSearchLower.value) ||
      String(s?.url || '').toLowerCase().includes(submoduleSearchLower.value)
  );
});
const reflogSearchLower = computed(() => (reflogSearch.value || '').trim().toLowerCase());
const filteredReflogBySearch = computed(() => {
  if (!reflogSearchLower.value) return reflogEntries.value;
  return reflogEntries.value.filter(
    (e) =>
      String(e?.sha || '').toLowerCase().includes(reflogSearchLower.value) ||
      String(e?.ref || '').toLowerCase().includes(reflogSearchLower.value) ||
      String(e?.message || '').toLowerCase().includes(reflogSearchLower.value)
  );
});
const REFLOG_CATEGORY_ORDER = ['commit', 'checkout', 'merge', 'rebase', 'reset', 'other'];
const reflogByCategory = computed(() => {
  const list = filteredReflogBySearch.value;
  const groups = { commit: [], checkout: [], merge: [], rebase: [], reset: [], other: [] };
  for (const e of list) {
    const cat = reflogCategoryFromMessage(e?.message);
    if (groups[cat]) groups[cat].push(e);
    else groups.other.push(e);
  }
  return REFLOG_CATEGORY_ORDER.map((key) => ({ key, label: reflogCategoryLabel(key), entries: groups[key] || [] })).filter((g) => g.entries.length > 0);
});
const worktreesSummary = computed(() => {
  const list = worktrees.value ?? [];
  const additional = list.length <= 1 ? 0 : list.length - 1;
  if (additional === 0) return 'No additional worktrees';
  return additional === 1 ? '1 worktree' : `${additional} worktrees`;
});

function widgetHasContent(id) {
  switch (id) {
    case 'local-branches': return branches.value.length > 0;
    case 'remote': return remoteBranchesLoaded.value && remoteBranches.value.length > 0;
    case 'worktrees': return worktrees.value.length > 1;
    case 'tags': return tags.value.length > 0;
    case 'stash': return true;
    case 'submodules': return submodules.value.length > 0;
    case 'reflog': return reflogLoaded.value && reflogEntries.value.length > 0;
    default: return false;
  }
}

function effectiveWidgetVisible(id) {
  const prefs = sidebarWidgetVisible.value;
  if (prefs == null) return widgetHasContent(id);
  if (typeof prefs[id] === 'boolean') return prefs[id];
  return widgetHasContent(id);
}

const visibleOrderedWidgetIds = computed(() =>
  sidebarWidgetOrder.value.filter((id) => effectiveWidgetVisible(id))
);
const hasMultipleVisibleWidgets = computed(() => visibleOrderedWidgetIds.value.length > 1);

function normalizePathForCompare(p) {
  if (!p || typeof p !== 'string') return '';
  return p.replace(/\\/g, '/').trim().replace(/\/+$/, '');
}

const isCurrentWorktree = (wtPath) => {
  const current = normalizePathForCompare(store.selectedPath);
  const wt = normalizePathForCompare(wtPath);
  return current && wt && (current === wt || current === wt + '/' || wt === current + '/');
};

function worktreeLabel(w) {
  const path = w?.path || '';
  const base = path.replace(/\\/g, '/').split('/').filter(Boolean).pop() || path;
  const branch = w?.branch || w?.head || '';
  return branch ? `${base} · ${branch}` : base;
}

function reflogEntryLabel(e) {
  const msg = e?.message || '';
  return msg.length > 20 ? msg.slice(0, 18) + '…' : msg;
}

function reflogCategoryFromMessage(message) {
  const m = String(message || '').toLowerCase();
  if (m.startsWith('commit')) return 'commit';
  if (m.startsWith('checkout')) return 'checkout';
  if (m.startsWith('merge')) return 'merge';
  if (m.startsWith('rebase')) return 'rebase';
  if (m.startsWith('reset')) return 'reset';
  return 'other';
}

function reflogCategoryLabel(key) {
  const labels = { commit: 'Commit', checkout: 'Checkout', merge: 'Merge', rebase: 'Rebase', reset: 'Reset', other: 'Other' };
  return labels[key] || key;
}

function toggleReflogCategory(key) {
  const o = { ...reflogCategoryOpen.value };
  o[key] = !o[key];
  reflogCategoryOpen.value = o;
}

async function loadGitSidebarWidgetPrefs() {
  if (!api.getPreference) return;
  try {
    const [order, visible] = await Promise.all([
      api.getPreference(GIT_SIDEBAR_WIDGET_ORDER_KEY),
      api.getPreference(GIT_SIDEBAR_WIDGET_VISIBLE_KEY),
    ]);
    if (Array.isArray(order) && order.length === GIT_SIDEBAR_WIDGET_IDS.length) {
      const valid = order.filter((id) => GIT_SIDEBAR_WIDGET_IDS.includes(id));
      const missing = GIT_SIDEBAR_WIDGET_IDS.filter((id) => !valid.includes(id));
      sidebarWidgetOrder.value = [...valid, ...missing];
    }
    if (visible && typeof visible === 'object') {
      const next = {};
      GIT_SIDEBAR_WIDGET_IDS.forEach((id) => {
        if (typeof visible[id] === 'boolean') next[id] = visible[id];
      });
      if (Object.keys(next).length > 0) sidebarWidgetVisible.value = next;
    }
  } catch (_) {}
}

function saveGitSidebarWidgetOrder() {
  if (api.setPreference) api.setPreference(GIT_SIDEBAR_WIDGET_ORDER_KEY, JSON.parse(JSON.stringify(sidebarWidgetOrder.value)));
}

function saveGitSidebarWidgetVisibility() {
  if (api.setPreference && sidebarWidgetVisible.value != null) {
    api.setPreference(GIT_SIDEBAR_WIDGET_VISIBLE_KEY, JSON.parse(JSON.stringify(sidebarWidgetVisible.value)));
  }
}

function moveWidgetUp(id) {
  const order = [...sidebarWidgetOrder.value];
  const i = order.indexOf(id);
  if (i <= 0) return;
  [order[i - 1], order[i]] = [order[i], order[i - 1]];
  sidebarWidgetOrder.value = order;
  saveGitSidebarWidgetOrder();
}

function moveWidgetDown(id) {
  const order = [...sidebarWidgetOrder.value];
  const i = order.indexOf(id);
  if (i < 0 || i >= order.length - 1) return;
  [order[i], order[i + 1]] = [order[i + 1], order[i]];
  sidebarWidgetOrder.value = order;
  saveGitSidebarWidgetOrder();
}

function setWidgetVisible(id, visible) {
  const prefs = sidebarWidgetVisible.value;
  const base = prefs != null ? prefs : Object.fromEntries(GIT_SIDEBAR_WIDGET_IDS.map((i) => [i, widgetHasContent(i)]));
  const next = { ...base, [id]: visible };
  sidebarWidgetVisible.value = next;
  saveGitSidebarWidgetVisibility();
}

function onWidgetDragStart(e, widgetId) {
  draggedWidgetId.value = widgetId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', widgetId);
  e.dataTransfer.setData('application/x-widget-id', widgetId);
}

function onWidgetDragOver(e, widgetId) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (draggedWidgetId.value === widgetId) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const position = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
  widgetDropTarget.value = { id: widgetId, position };
}

function onWidgetDragLeave(e, widgetId) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    if (widgetDropTarget.value?.id === widgetId) widgetDropTarget.value = { id: null, position: 'before' };
  }
}

function onWidgetDrop(e, targetWidgetId) {
  e.preventDefault();
  const id = e.dataTransfer.getData('application/x-widget-id') || draggedWidgetId.value;
  if (!id || id === targetWidgetId) {
    draggedWidgetId.value = null;
    widgetDropTarget.value = { id: null, position: 'before' };
    return;
  }
  const order = sidebarWidgetOrder.value.filter((x) => x !== id);
  const targetIdx = order.indexOf(targetWidgetId);
  if (targetIdx === -1) {
    draggedWidgetId.value = null;
    widgetDropTarget.value = { id: null, position: 'before' };
    return;
  }
  const insertIdx = widgetDropTarget.value?.id === targetWidgetId && widgetDropTarget.value?.position === 'after' ? targetIdx + 1 : targetIdx;
  order.splice(insertIdx, 0, id);
  sidebarWidgetOrder.value = order;
  saveGitSidebarWidgetOrder();
  draggedWidgetId.value = null;
  widgetDropTarget.value = { id: null, position: 'before' };
}

function onWidgetDragEnd() {
  draggedWidgetId.value = null;
  widgetDropTarget.value = { id: null, position: 'before' };
}

const BRANCH_DRAG_TYPE = 'application/x-rm-branch';

function onBranchDragStart(e, ref, isRemote) {
  branchDragPayload.value = { ref, isRemote };
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData(BRANCH_DRAG_TYPE, JSON.stringify({ ref, isRemote }));
  e.dataTransfer.setData('text/plain', ref);
}

function onBranchDragOver(e, targetBranch) {
  if (!e.dataTransfer.types.includes(BRANCH_DRAG_TYPE)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  const payload = branchDragPayload.value;
  if (!payload) return;
  const draggedRef = payload.ref;
  const isSame = payload.isRemote ? (targetBranch === draggedRef.replace(/^[^/]+\//, '')) : (targetBranch === draggedRef);
  if (isSame) return;
  branchDropTarget.value = targetBranch;
}

function onBranchDragLeave(e, targetBranch) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    if (branchDropTarget.value === targetBranch) branchDropTarget.value = null;
  }
}

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

function onBranchDragEnd() {
  branchDragPayload.value = null;
  branchDropTarget.value = null;
}

function isWidgetDropBefore(widgetId) {
  const t = widgetDropTarget.value;
  return t?.id === widgetId && t?.position === 'before';
}
function isWidgetDropAfter(widgetId) {
  const t = widgetDropTarget.value;
  return t?.id === widgetId && t?.position === 'after';
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
    const list = res?.ok && Array.isArray(res.files) ? res.files : [];
    trackedFilesList.value = list;
    if (list.length > 0) {
      nextTick(() => {
        const root = workingTreeNested.value;
        const firstLevelDirKeys = (root?.children || []).filter((n) => n.path == null).map((n) => n.key);
        if (firstLevelDirKeys.length) treeExpandedKeys.value = new Set(firstLevelDirKeys);
      });
    }
  } catch {
    trackedFilesList.value = [];
  } finally {
    trackedFilesLoading.value = false;
  }
}

watch(pullDropdownOpen, (open) => {
  if (open) {
    const close = () => { pullDropdownOpen.value = false; };
    nextTick(() => {
      document.addEventListener('click', close, { once: true });
    });
  }
});

watch(() => props.info?.path, async (path) => {
  if (!path) {
    branches.value = [];
    tags.value = [];
    remoteBranches.value = [];
    remoteBranchesLoaded.value = false;
    worktrees.value = [];
    stashListEntries.value = [];
    submodules.value = [];
    reflogEntries.value = [];
    reflogLoaded.value = false;
    selectedBranch.value = '';
    return;
  }
  try {
    const [bRes, tRes, wtRes, stashRes, subRes] = await Promise.all([
      api.getBranches?.(path) ?? { ok: false, branches: [] },
      api.getTags?.(path) ?? { ok: false, tags: [] },
      api.getWorktrees?.(path) ?? Promise.resolve({ ok: false, worktrees: [] }),
      api.getStashList?.(path) ?? Promise.resolve({ ok: false, entries: [] }),
      api.getSubmodules?.(path) ?? Promise.resolve({ ok: false, submodules: [] })
    ]);
    branches.value = bRes?.ok && Array.isArray(bRes.branches) ? bRes.branches : [];
    tags.value = tRes?.ok && Array.isArray(tRes.tags) ? tRes.tags : [];
    worktrees.value = wtRes?.ok && Array.isArray(wtRes.worktrees) ? wtRes.worktrees : [];
    stashListEntries.value = stashRes?.ok && Array.isArray(stashRes?.entries) ? stashRes.entries : [];
    submodules.value = subRes?.ok && Array.isArray(subRes.submodules) ? subRes.submodules : [];
    selectedBranch.value = props.info?.branch || branches.value[0] || '';
    // Load remote branches by default
    loadRemoteBranches();
  } catch {
    branches.value = [];
    tags.value = [];
    worktrees.value = [];
    stashListEntries.value = [];
    submodules.value = [];
    selectedBranch.value = '';
  }
}, { immediate: true });

watch(() => props.info?.branch, (b) => { selectedBranch.value = b || ''; }, { immediate: true });

watch(() => props.info?.path, () => { loadCommitLog(); loadGitUser(); }, { immediate: true });

async function refetchBranches() {
  const path = store.selectedPath;
  if (!path || !api.getBranches) return;
  try {
    const bRes = await api.getBranches(path);
    if (bRes?.ok && Array.isArray(bRes.branches)) {
      branches.value = bRes.branches;
      const current = (bRes.current || props.info?.branch || '').trim();
      if (current) selectedBranch.value = current;
    }
  } catch {
    // keep existing branches
  }
}

async function loadCommitLog() {
  const path = store.selectedPath;
  if (!path || !api.getCommitLog) return;
  commitLogLoading.value = true;
  try {
    const result = await api.getCommitLog(path, 50);
    commitLog.value = result?.ok && Array.isArray(result.commits) ? result.commits : [];
  } catch {
    commitLog.value = [];
  } finally {
    commitLogLoading.value = false;
  }
}

async function loadGitUser() {
  const path = store.selectedPath;
  if (!path || !api.getGitUser) return;
  try {
    const result = await api.getGitUser(path);
    gitUser.value = result?.ok ? { name: result.name || '', email: result.email || '' } : { name: '', email: '' };
  } catch {
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

function closeSectionDropdownOnClickOutside(e) {
  if (!e.target?.closest?.('.detail-git-section-dropdown')) gitSectionDropdownOpen.value = false;
}
function closeWidgetDropdownOnClickOutside(e) {
  if (widgetDropdownOpen.value && !e.target?.closest?.('.detail-git-widget-dropdown-wrap')) {
    widgetDropdownOpen.value = false;
  }
}
onMounted(async () => {
  document.addEventListener('click', closeSectionDropdownOnClickOutside);
  document.addEventListener('click', closeWidgetDropdownOnClickOutside);
  loadGitSidebarWidgetPrefs();
  try {
    const saved = await api.getPreference?.(DEFAULT_PULL_MODE_KEY);
    if (saved && ['fetch', 'merge', 'ff-only', 'rebase'].includes(saved)) defaultPullMode.value = saved;
  } catch {}
});
onUnmounted(() => {
  document.removeEventListener('click', closeSectionDropdownOnClickOutside);
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

async function loadRemoteBranches() {
  const path = store.selectedPath;
  if (!path || !api.getRemoteBranches) return;
  remoteBranchesLoading.value = true;
  try {
    const res = await api.getRemoteBranches(path);
    remoteBranches.value = res?.ok && Array.isArray(res.branches) ? res.branches : [];
    remoteBranchesLoaded.value = true;
  } catch {
    remoteBranches.value = [];
    remoteBranchesLoaded.value = true;
  } finally {
    remoteBranchesLoading.value = false;
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
  pullDropdownOpen.value = false;
  await pull(mode);
}

function focusBranchSelect() {
  branchSelectRef.value?.focus();
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

function toggleInlineTerminal() {
  if (store.selectedPath) {
    inlineTerminalOpen.value = !inlineTerminalOpen.value;
  } else {
    api.openInTerminal?.(store.selectedPath);
  }
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

async function loadTagsOnly() {
  const path = store.selectedPath;
  if (!path || !api.getTags) return;
  try {
    const r = await api.getTags(path);
    tags.value = r?.ok && Array.isArray(r?.tags) ? r.tags : [];
  } catch {
    tags.value = [];
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

async function loadWorktreesOnly() {
  const path = store.selectedPath;
  if (!path || !api.getWorktrees) return;
  try {
    const r = await api.getWorktrees(path);
    worktrees.value = r?.ok && Array.isArray(r?.worktrees) ? r.worktrees : [];
  } catch {
    worktrees.value = [];
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

async function loadSubmodulesOnly() {
  const path = store.selectedPath;
  if (!path || !api.getSubmodules) return;
  try {
    const r = await api.getSubmodules(path);
    submodules.value = r?.ok && Array.isArray(r.submodules) ? r.submodules : [];
  } catch {
    submodules.value = [];
  }
}

async function loadReflogOnly() {
  const path = store.selectedPath;
  if (!path || !api.getReflog) {
    reflogLoading.value = false;
    return;
  }
  reflogLoading.value = true;
  try {
    const r = await api.getReflog(path, 50);
    reflogEntries.value = r?.ok && Array.isArray(r.entries) ? r.entries : [];
    reflogLoaded.value = true;
  } catch {
    reflogEntries.value = [];
    reflogLoaded.value = true;
  } finally {
    reflogLoading.value = false;
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

/* Commit card radius follows Settings > Appearance > Border radius (see input.css) */
</style>
