<template>
  <section class="card mb-6 collapsible-card detail-tab-panel flex flex-col min-h-0" data-detail-tab="git" :class="{ 'is-collapsed': collapsed }">
    <div class="collapsible-card-header-row">
      <button type="button" class="collapsible-card-header" :aria-expanded="!collapsed" @click="toggle">
        <span class="collapsible-card-title">Git</span>
        <svg class="collapsible-card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
    <div class="collapsible-card-body flex flex-col flex-1 min-h-0">
    <nav class="detail-git-sections-top flex flex-wrap items-center gap-x-2 gap-y-1.5 py-2 px-3 border-b border-rm-border bg-rm-bg-elevated/50 shrink-0">
      <span class="text-[10px] font-semibold text-rm-muted uppercase tracking-wider shrink-0 mr-1">Sections:</span>
      <button
        v-for="opt in gitSectionOptions"
        :key="opt.value"
        type="button"
        class="detail-git-jump-link inline-flex items-center gap-1.5 text-xs rounded-rm px-2 py-1 border bg-transparent cursor-pointer text-left shrink-0"
        :class="gitRightSection === opt.value ? 'text-rm-accent border-rm-accent/50 bg-rm-accent/10' : 'text-rm-muted hover:text-rm-text border-rm-border hover:bg-rm-surface-hover'"
        @click="gitRightSection = opt.value"
      >
        <span v-if="opt.icon" class="detail-git-jump-icon shrink-0 w-3.5 h-3.5 inline-block" v-html="opt.icon" aria-hidden="true"></span>
        <span class="truncate max-w-[7rem]">{{ opt.label }}</span>
      </button>
    </nav>
    <div class="detail-git-toolbar flex flex-wrap items-end gap-1 sm:gap-3 py-3 px-3 border-b border-rm-border bg-rm-surface/50 shrink-0">
      <div class="detail-git-toolbar-meta flex items-center gap-2 shrink-0 mr-2">
        <span class="text-xs font-medium text-rm-muted">repository:</span>
        <span class="text-sm text-rm-text truncate max-w-[8rem]" :title="repoName">{{ repoName }}</span>
        <span class="text-rm-border mx-1">|</span>
        <span class="text-xs font-medium text-rm-muted">branch:</span>
        <select ref="branchSelectRef" v-model="selectedBranch" class="detail-git-toolbar-select text-sm rounded-rm border border-rm-border bg-rm-bg text-rm-text px-2 py-1 min-w-[10rem]" @change="onBranchChangeSelect">
          <option value="">—</option>
          <option value="__new__">+ New branch…</option>
          <option v-for="b in filteredBranches" :key="b" :value="b">{{ b }}</option>
        </select>
        <span v-if="aheadBehind" class="text-xs text-rm-muted">{{ aheadBehind }}</span>
      </div>
      <div class="detail-git-toolbar-actions flex flex-wrap items-end gap-1 sm:gap-2">
        <button type="button" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 rounded-rm border-0 bg-transparent cursor-pointer text-rm-text hover:bg-rm-surface-hover" title="Discard all uncommitted changes" @click="undoDiscard">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h10a5 5 0 0 1 5 5v2"/><path d="M3 10 7 6 3 2"/></svg>
          <span class="text-[10px] font-medium">Undo</span>
        </button>
        <button type="button" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 rounded-rm border-0 bg-transparent cursor-not-allowed opacity-50" title="Redo (not available)" disabled>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10H11a5 5 0 0 0-5 5v2"/><path d="m21 10-4 4 4 4"/></svg>
          <span class="text-[10px] font-medium">Redo</span>
        </button>
        <div class="detail-git-toolbar-dropdown relative flex flex-col items-center gap-0.5">
          <button type="button" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 rounded-rm border-0 bg-transparent cursor-pointer text-rm-text hover:bg-rm-surface-hover min-w-[2.5rem]" title="Pull" @click="pullDropdownOpen = !pullDropdownOpen">
            <span class="flex items-center gap-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </span>
            <span class="text-[10px] font-medium">Pull</span>
          </button>
          <div v-if="pullDropdownOpen" class="detail-git-toolbar-dropdown-menu absolute left-0 top-full mt-0.5 z-30 py-1 rounded-rm border border-rm-border bg-rm-bg shadow-lg min-w-[8rem]">
            <button type="button" class="w-full text-left text-xs px-2 py-1.5 hover:bg-rm-surface-hover" @click="pull('merge'); pullDropdownOpen = false">Pull (merge)</button>
            <button type="button" class="w-full text-left text-xs px-2 py-1.5 hover:bg-rm-surface-hover" @click="pull('rebase'); pullDropdownOpen = false">Pull (rebase)</button>
          </div>
        </div>
        <button type="button" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 rounded-rm border-0 bg-transparent cursor-pointer text-rm-text hover:bg-rm-surface-hover" title="Push" @click="push">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
          <span class="text-[10px] font-medium">Push</span>
        </button>
        <button type="button" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 rounded-rm border-0 bg-transparent cursor-pointer text-rm-text hover:bg-rm-surface-hover" title="Branch" @click="focusBranchSelect">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 15a3 3 0 0 0 6 0"/></svg>
          <span class="text-[10px] font-medium">Branch</span>
        </button>
        <button type="button" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 rounded-rm border-0 bg-transparent cursor-pointer text-rm-text hover:bg-rm-surface-hover" title="Stash changes" @click="stashPush">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h14v8h-4l-4 4-4-4H5z"/></svg>
          <span class="text-[10px] font-medium">Stash</span>
        </button>
        <button type="button" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 rounded-rm border-0 bg-transparent cursor-pointer text-rm-text hover:bg-rm-surface-hover" title="Pop stash" @click="stashPop">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="12" width="14" height="8" rx="1"/><path d="M12 12V6M9 9l3-3 3 3"/></svg>
          <span class="text-[10px] font-medium">Pop</span>
        </button>
        <button type="button" class="detail-git-toolbar-btn flex flex-col items-center gap-0.5 p-1.5 rounded-rm border-0 bg-transparent cursor-pointer text-rm-text hover:bg-rm-surface-hover" :class="{ 'bg-rm-accent/15 text-rm-accent': inlineTerminalOpen }" :title="inlineTerminalOpen ? 'Close inline terminal' : 'Open inline terminal'" @click="toggleInlineTerminal">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
          <span class="text-[10px] font-medium">Terminal</span>
        </button>
      </div>
    </div>
    <div v-if="inlineTerminalOpen && store.selectedPath" class="detail-git-inline-terminal shrink-0 border-t border-rm-border p-2">
      <TerminalPanel :min-height="280" :initial-dir-path="store.selectedPath" @close="inlineTerminalOpen = false" />
    </div>
    <div class="detail-git-three-panels flex-1 min-h-[380px] min-w-0 border-t border-rm-border overflow-auto">
      <div class="detail-git-three-panels-row flex min-h-[380px] min-w-[33rem]">
      <aside class="detail-git-sidebar-panel w-52 min-w-[13rem] shrink-0 border-r border-rm-border bg-rm-bg-elevated/50 flex flex-col overflow-hidden">
        <div class="p-2 border-b border-rm-border shrink-0">
          <input v-model="gitFilter" type="text" class="detail-git-filter-input w-full text-xs rounded-rm border border-rm-border bg-rm-bg text-rm-text px-2 py-1.5" placeholder="Filter (⌘⌥F)" />
        </div>
        <div class="detail-git-sidebar-scroll flex-1 overflow-y-auto py-2 min-h-0 flex flex-col gap-2">
          <div class="detail-git-sidebar-group rounded-rm border border-rm-border bg-rm-surface/40 overflow-hidden">
            <button type="button" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2.5 py-2 text-left border-0 bg-transparent cursor-pointer hover:bg-rm-surface-hover/50 text-rm-text" :aria-expanded="sidebarLocalOpen" @click="sidebarLocalOpen = !sidebarLocalOpen">
              <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide">Local branches</span>
              <svg class="w-3.5 h-3.5 shrink-0 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarLocalOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div v-show="sidebarLocalOpen" class="px-2.5 pb-2 pt-0 border-t border-rm-border/50">
              <ul class="py-1 px-0 list-none m-0 text-sm text-rm-text space-y-0.5">
                <li class="cursor-pointer hover:text-rm-accent truncate py-0.5 flex items-center gap-1 text-rm-accent font-medium" @click="createBranch">
                  <span class="shrink-0" aria-hidden="true">+</span>
                  New branch
                </li>
                <li
                  v-for="b in filteredBranches"
                  :key="b"
                  class="cursor-pointer hover:text-rm-accent truncate py-0.5"
                  :class="{ 'font-medium text-rm-accent': b === currentBranch }"
                  @click="checkoutBranch(b)"
                  @contextmenu.prevent="openBranchContextMenu($event, b, false)"
                >
                  {{ b }}
                </li>
              </ul>
            </div>
          </div>
          <div class="detail-git-sidebar-group rounded-rm border border-rm-border bg-rm-surface/40 overflow-hidden">
            <button type="button" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2.5 py-2 text-left border-0 bg-transparent cursor-pointer hover:bg-rm-surface-hover/50 text-rm-text" :aria-expanded="sidebarRemoteOpen" @click="sidebarRemoteOpen = !sidebarRemoteOpen">
              <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide">Remote</span>
              <span class="flex items-center gap-1 shrink-0">
                <button type="button" class="text-[10px] text-rm-accent hover:underline border-0 bg-transparent p-0 cursor-pointer" :disabled="remoteBranchesLoading" @click.stop="loadRemoteBranches">{{ remoteBranchesLoading ? '…' : (remoteBranchesLoaded ? 'Refresh' : 'Load') }}</button>
                <svg class="w-3.5 h-3.5 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarRemoteOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </button>
            <div v-show="sidebarRemoteOpen" class="px-2.5 pb-2 pt-0 border-t border-rm-border/50">
              <ul class="max-h-28 overflow-y-auto py-1 px-0 list-none m-0 text-sm text-rm-text space-y-0.5">
                <li v-for="r in filteredRemoteBranches" :key="r" class="cursor-pointer hover:text-rm-accent truncate py-0.5" @click="checkoutRemoteBranch(r)" @contextmenu.prevent="openBranchContextMenu($event, r, true)">{{ r }}</li>
                <li v-if="!remoteBranchesLoading && remoteBranches.length === 0 && remoteBranchesLoaded" class="text-xs text-rm-muted py-0.5">None</li>
              </ul>
            </div>
          </div>
          <div class="detail-git-sidebar-group rounded-rm border border-rm-border bg-rm-surface/40 overflow-hidden">
            <button type="button" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2.5 py-2 text-left border-0 bg-transparent cursor-pointer hover:bg-rm-surface-hover/50 text-rm-text" :aria-expanded="sidebarWorktreesOpen" @click="sidebarWorktreesOpen = !sidebarWorktreesOpen">
              <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide">Worktrees</span>
              <svg class="w-3.5 h-3.5 shrink-0 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarWorktreesOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div v-show="sidebarWorktreesOpen" class="px-2.5 pb-2 pt-0 border-t border-rm-border/50">
              <p class="m-0 text-xs text-rm-muted py-0.5">{{ worktreesSummary }}</p>
            </div>
          </div>
          <div class="detail-git-sidebar-group rounded-rm border border-rm-border bg-rm-surface/40 overflow-hidden">
            <button type="button" class="detail-git-sidebar-group-header w-full flex items-center justify-between gap-1 px-2.5 py-2 text-left border-0 bg-transparent cursor-pointer hover:bg-rm-surface-hover/50 text-rm-text" :aria-expanded="sidebarTagsOpen" @click="sidebarTagsOpen = !sidebarTagsOpen">
              <span class="text-xs font-semibold text-rm-muted uppercase tracking-wide">Tags</span>
              <svg class="w-3.5 h-3.5 shrink-0 text-rm-muted transition-transform" :class="{ 'rotate-180': sidebarTagsOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div v-show="sidebarTagsOpen" class="px-2.5 pb-2 pt-0 border-t border-rm-border/50">
              <ul class="max-h-32 overflow-y-auto py-1 px-0 list-none m-0 text-xs text-rm-muted space-y-0.5">
                <li v-for="t in filteredTags" :key="t" class="cursor-pointer hover:text-rm-accent truncate py-0.5" @click="checkoutTag(t)">{{ t }}</li>
              </ul>
            </div>
          </div>
        </div>
      </aside>
      <div class="detail-git-center-panel flex-1 min-w-0 overflow-auto border-r border-rm-border">
        <div class="detail-git-commit-table-wrap overflow-auto h-full">
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
                class="border-b border-rm-border/50 hover:bg-rm-surface-hover cursor-pointer"
                @click="openCommitDetail(c.sha, i === 0)"
              >
                <td class="py-1.5 px-2 text-rm-muted">●</td>
                <td class="py-1.5 px-2 truncate max-w-[12rem]" :title="c.subject">{{ c.subject }}</td>
                <td class="py-1.5 px-2 truncate max-w-[8rem] text-rm-muted">{{ c.author }}</td>
                <td class="py-1.5 px-2 text-rm-muted">{{ c.date }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="commitLog.length === 0 && !commitLogLoading" class="m-0 p-4 text-xs text-rm-muted">No commits.</p>
        </div>
      </div>
      <div class="detail-git-right-panel w-80 shrink-0 flex flex-col overflow-hidden bg-rm-bg-elevated/30 p-4 border-l border-rm-border">
        <div class="mb-3 flex items-center gap-2 relative">
          <div class="detail-git-section-dropdown flex-1 min-w-0 relative">
            <button
              type="button"
              class="detail-git-section-select-btn w-full inline-flex items-center gap-2 text-xs rounded-rm border border-rm-border bg-rm-bg text-rm-text px-2 py-1.5 text-left"
              :aria-expanded="gitSectionDropdownOpen"
              aria-haspopup="listbox"
              @click="gitSectionDropdownOpen = !gitSectionDropdownOpen"
            >
              <span v-if="currentSectionOption?.icon" class="detail-git-jump-icon shrink-0" v-html="currentSectionOption.icon" aria-hidden="true"></span>
              <span class="truncate flex-1">{{ currentSectionOption?.label || 'Section' }}</span>
              <svg class="w-3 h-3 shrink-0 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div v-if="gitSectionDropdownOpen" class="detail-git-section-dropdown-menu absolute left-0 right-0 top-full mt-0.5 z-20 py-1 rounded-rm border border-rm-border bg-rm-bg shadow-lg max-h-64 overflow-y-auto">
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
          <button v-if="gitSectionDocKey" type="button" class="doc-trigger p-1 rounded-rm text-rm-muted hover:text-rm-accent hover:bg-rm-surface-hover border-0 bg-transparent cursor-pointer text-xs font-normal shrink-0" title="Documentation" aria-label="Documentation" @click="openGitSectionDocs">(i)</button>
        </div>
        <template v-if="gitRightSection === 'working-tree'">
        <div class="flex-1 min-h-0 overflow-y-auto flex flex-col rounded-rm border border-rm-border bg-rm-surface/20 p-3">
          <div class="mb-3 flex items-center justify-between gap-2 flex-wrap">
            <p class="m-0 text-xs font-medium text-rm-muted">{{ uncommittedLabel }}</p>
            <div class="flex items-center gap-1">
              <button type="button" class="detail-git-view-toggle text-xs font-medium px-2 py-1 rounded-rm border border-transparent bg-transparent cursor-pointer" :class="workingTreeView === 'path' ? 'text-rm-accent border-rm-accent/50 bg-rm-accent/10' : 'text-rm-muted hover:text-rm-text'" @click="workingTreeView = 'path'">Path</button>
              <button type="button" class="detail-git-view-toggle text-xs font-medium px-2 py-1 rounded-rm border border-transparent bg-transparent cursor-pointer" :class="workingTreeView === 'tree' ? 'text-rm-accent border-rm-accent/50 bg-rm-accent/10' : 'text-rm-muted hover:text-rm-text'" @click="workingTreeView = 'tree'">Tree</button>
            </div>
          </div>
          <button v-if="unstaged.length > 0" type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent p-0 cursor-pointer mb-1.5" @click="stageAll">Stage all changes</button>
          <div v-if="workingTreeView === 'path'" class="mb-4">
            <ul v-if="unstaged.length || staged.length" class="m-0 mt-1.5 pl-0 list-none text-xs text-rm-muted space-y-1">
              <li v-for="f in unstaged" :key="'u-' + f" class="flex items-center gap-2">
                <span class="shrink-0" :class="workingTreeBadge(f, false).className" :title="workingTreeBadge(f, false).title">{{ workingTreeBadge(f, false).label }}</span>
                <button v-if="!workingTreeBadge(f, false).isDeleted" type="button" class="text-left truncate flex-1 min-w-0 text-rm-muted hover:text-rm-accent hover:underline bg-transparent border-0 p-0 cursor-pointer" @click="openFile(f)">{{ f }}</button>
                <span v-else class="truncate flex-1 min-w-0 text-rm-muted">{{ f }}</span>
                <button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent p-0 cursor-pointer shrink-0" title="View side-by-side diff (discard line by line)" @click="openSideBySideDiff(f)">Diff</button>
                <button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent p-0 cursor-pointer shrink-0" @click="stageFile(f)">Stage</button>
                <button type="button" class="text-xs text-rm-warning hover:underline border-none bg-transparent p-0 cursor-pointer shrink-0" title="Discard all changes in this file" @click="discardFile(f)">Discard</button>
              </li>
              <li v-for="f in staged" :key="'s-' + f" class="flex items-center gap-2">
                <span class="shrink-0" :class="workingTreeBadge(f, true).className" :title="workingTreeBadge(f, true).title">{{ workingTreeBadge(f, true).label }}</span>
                <span class="truncate flex-1 min-w-0 text-rm-text">{{ f }}</span>
                <button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent p-0 cursor-pointer shrink-0" title="View side-by-side diff (discard line by line)" @click="openSideBySideDiff(f)">Diff</button>
                <button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent p-0 cursor-pointer shrink-0" @click="unstageFile(f)">Unstage</button>
                <button type="button" class="text-xs text-rm-warning hover:underline border-none bg-transparent p-0 cursor-pointer shrink-0" title="Discard all changes in this file" @click="discardFile(f)">Discard</button>
              </li>
            </ul>
          </div>
          <div v-else class="mb-4">
            <ul class="m-0 mt-1.5 pl-0 list-none text-xs text-rm-muted space-y-0.5 max-h-48 overflow-y-auto">
              <template v-for="group in workingTreeByDir" :key="group.dir">
                <li class="font-medium text-rm-muted/90 py-0.5">{{ group.dir || '.' }}</li>
                <li v-for="item in group.items" :key="item.path" class="flex items-center gap-2 pl-3">
                  <span class="shrink-0" :class="workingTreeBadge(item.path, item.staged).className" :title="workingTreeBadge(item.path, item.staged).title">{{ workingTreeBadge(item.path, item.staged).label }}</span>
                  <button v-if="!item.staged && !workingTreeBadge(item.path, false).isDeleted" type="button" class="text-left truncate flex-1 min-w-0 hover:text-rm-accent hover:underline bg-transparent border-0 p-0 cursor-pointer" @click="openFile(item.path)">{{ item.name }}</button>
                  <span v-else-if="!item.staged" class="truncate flex-1 min-w-0 text-rm-muted">{{ item.name }}</span>
                  <span v-else class="truncate flex-1 min-w-0 text-rm-text">{{ item.name }}</span>
                  <button type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent p-0 cursor-pointer shrink-0" title="View side-by-side diff (discard line by line)" @click="openSideBySideDiff(item.path)">Diff</button>
                  <button v-if="!item.staged" type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent p-0 cursor-pointer shrink-0" @click="stageFile(item.path)">Stage</button>
                  <button v-else type="button" class="text-xs text-rm-accent hover:underline border-none bg-transparent p-0 cursor-pointer shrink-0" @click="unstageFile(item.path)">Unstage</button>
                  <button type="button" class="text-xs text-rm-warning hover:underline border-none bg-transparent p-0 cursor-pointer shrink-0" title="Discard all changes in this file" @click="discardFile(item.path)">Discard</button>
                </li>
              </template>
            </ul>
          </div>
        </div>
        <div class="border-t border-rm-border pt-4 mt-auto shrink-0">
          <label class="block text-xs font-semibold text-rm-text uppercase tracking-wider mb-2">Commit</label>
          <div class="flex flex-wrap gap-2 mb-1">
            <textarea v-model="commitSummary" class="input-field flex-1 min-w-0 text-sm resize-none" rows="4" placeholder="Commit summary" maxlength="72"></textarea>
            <button type="button" class="btn-secondary btn-compact text-xs shrink-0" title="Generate with Ollama" @click="generateCommitMessage">Generate</button>
          </div>
          <span class="text-xs text-rm-muted block mb-2">{{ commitSummary.length }}/72</span>
          <textarea v-model="commitDescription" class="input-field w-full text-sm resize-none" rows="5" placeholder="Description (optional)"></textarea>
          <div class="flex flex-wrap gap-3 mt-2 text-sm">
            <label class="checkbox-label cursor-pointer flex items-center gap-2">
              <input v-model="amendCommit" type="checkbox" class="checkbox-input" />
              <span>Amend</span>
            </label>
            <label class="checkbox-label cursor-pointer flex items-center gap-2">
              <input v-model="signCommit" type="checkbox" class="checkbox-input" />
              <span>Sign commit</span>
            </label>
          </div>
          <div class="flex flex-wrap gap-2 mt-2">
            <button type="button" class="btn-primary btn-compact text-xs" :disabled="!canCommit" @click="commit">Commit</button>
            <button type="button" class="btn-secondary btn-compact text-xs" title="Push current branch to remote" @click="pushFromFooter">Push</button>
            <button type="button" class="btn-secondary btn-compact text-xs text-rm-warning hover:bg-rm-warning/10" :disabled="!hasChanges" @click="discardAll">Discard all</button>
          </div>
          <p v-if="gitActionStatus" class="m-0 mt-2 text-xs text-rm-muted">{{ gitActionStatus }}</p>
        </div>
        </template>
        <div v-else class="overflow-y-auto flex-1 min-h-0 rounded-rm border border-rm-border bg-rm-surface/20 p-3">
          <GitBranchSyncCard v-if="gitRightSection === 'branch-sync'" @refresh="$emit('refresh')" />
          <GitMergeRebaseCard v-else-if="gitRightSection === 'merge-rebase'" :current-branch="currentBranch" @refresh="$emit('refresh')" />
          <GitStashCard v-else-if="gitRightSection === 'stash'" @refresh="$emit('refresh')" />
          <GitTagsCard v-else-if="gitRightSection === 'tags'" @refresh="$emit('refresh')" />
          <GitReflogCard v-else-if="gitRightSection === 'reflog'" @refresh="$emit('refresh')" />
          <GitDeleteBranchCard v-else-if="gitRightSection === 'delete-branch'" :current-branch="currentBranch" @refresh="$emit('refresh')" />
          <GitRemotesCard v-else-if="gitRightSection === 'remotes'" @refresh="$emit('refresh')" />
          <GitCompareResetCard v-else-if="gitRightSection === 'compare-reset'" @refresh="$emit('refresh')" />
          <GitGitignoreCard v-else-if="gitRightSection === 'gitignore'" @refresh="$emit('refresh')" />
          <GitGitattributesCard v-else-if="gitRightSection === 'gitattributes'" @refresh="$emit('refresh')" />
          <GitSubmodulesCard v-else-if="gitRightSection === 'submodules'" @refresh="$emit('refresh')" />
          <GitWorktreesCard v-else-if="gitRightSection === 'worktrees'" @refresh="$emit('refresh')" />
          <GitBisectCard v-else-if="gitRightSection === 'bisect'" @refresh="$emit('refresh')" />
        </div>
      </div>
      </div>
    </div>
    </div>
    <Teleport to="body">
      <div
        v-if="branchContextMenu"
        class="git-branch-context-menu fixed z-[10000] min-w-[11rem] py-1 rounded-rm border border-rm-border bg-rm-surface shadow-lg text-sm"
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
        <button
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-text border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuCreateBranchFrom"
        >
          Create new branch from this…
        </button>
        <button
          v-if="!branchContextMenu.isRemote && branchContextMenu.branch !== currentBranch"
          type="button"
          class="git-context-menu-item w-full text-left px-3 py-1.5 hover:bg-rm-surface-hover text-rm-warning border-0 bg-transparent cursor-pointer"
          role="menuitem"
          @click="contextMenuDeleteBranch"
        >
          Delete branch
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
const branches = ref([]);
const tags = ref([]);
const remoteBranches = ref([]);
const remoteBranchesLoaded = ref(false);
const remoteBranchesLoading = ref(false);
const pullDropdownOpen = ref(false);
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
const amendCommit = ref(false);
const signCommit = ref(false);
const gitRightSection = ref('working-tree');
const gitSectionDropdownOpen = ref(false);
const branchContextMenu = ref(null);
const workingTreeView = ref('path');
const sidebarLocalOpen = ref(true);
const sidebarRemoteOpen = ref(true);
const sidebarWorktreesOpen = ref(true);
const sidebarTagsOpen = ref(true);
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
const worktreesSummary = computed(() => {
  const list = worktrees.value ?? [];
  const additional = list.length <= 1 ? 0 : list.length - 1;
  if (additional === 0) return 'No additional worktrees';
  return additional === 1 ? '1 worktree' : `${additional} worktrees`;
});

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
    selectedBranch.value = '';
    return;
  }
  try {
    const [bRes, tRes, wtRes] = await Promise.all([
      api.getBranches?.(path) ?? { ok: false, branches: [] },
      api.getTags?.(path) ?? { ok: false, tags: [] },
      api.getWorktrees?.(path) ?? Promise.resolve({ ok: false, worktrees: [] })
    ]);
    branches.value = bRes?.ok && Array.isArray(bRes.branches) ? bRes.branches : [];
    tags.value = tRes?.ok && Array.isArray(tRes.tags) ? tRes.tags : [];
    worktrees.value = wtRes?.ok && Array.isArray(wtRes.worktrees) ? wtRes.worktrees : [];
    selectedBranch.value = props.info?.branch || branches.value[0] || '';
    // Load remote branches by default
    loadRemoteBranches();
  } catch {
    branches.value = [];
    tags.value = [];
    worktrees.value = [];
    selectedBranch.value = '';
  }
}, { immediate: true });

watch(() => props.info?.branch, (b) => { selectedBranch.value = b || ''; }, { immediate: true });

watch(() => props.info?.path, loadCommitLog, { immediate: true });

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
onMounted(() => document.addEventListener('click', closeSectionDropdownOnClickOutside));
onUnmounted(() => document.removeEventListener('click', closeSectionDropdownOnClickOutside));

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
  if (!window.confirm(GIT_ACTION_CONFIRMS.pull)) return;
  const path = store.selectedPath;
  try {
    if (mode === 'rebase' && api.gitPullRebase) {
      await api.gitPullRebase(path);
      gitActionStatus.value = 'Pulled (rebase).';
    } else {
      await api.gitPull?.(path);
      gitActionStatus.value = GIT_ACTION_SUCCESS.pull;
    }
    emit('refresh');
  } catch (e) {
    gitActionStatus.value = e?.message || 'Pull failed.';
  }
}

function focusBranchSelect() {
  branchSelectRef.value?.focus();
}

function undoDiscard() {
  discardAll();
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
  if (!path || !api.createBranch) return;
  const name = window.prompt('New branch name');
  if (!name?.trim()) return;
  try {
    await api.createBranch(path, name.trim(), true);
    gitActionStatus.value = 'Branch created and checked out.';
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

async function stashPush() {
  const path = store.selectedPath;
  if (!path || !api.gitStashPush) return;
  const message = window.prompt('Stash message (optional)') || '';
  try {
    await api.gitStashPush(path, message, {});
    gitActionStatus.value = 'Stashed.';
    emit('refresh');
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

function openSideBySideDiff(filePath) {
  const path = store.selectedPath;
  if (path && filePath) modals.openModal('diffSideBySide', { dirPath: path, filePath });
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
    loadCommitLog();
  } catch (e) {
    gitActionStatus.value = e?.message || 'Commit failed.';
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
