# Main branch vs Vue app – feature comparison

Comparison of **main** (original `src-renderer/` vanilla app) vs **explore/vite-vue** (Vue app in `renderer-vue/`).  
Use this to see what’s on main that may be missing or different in Vue.

---

## 1. Nav & global

| Feature | Main | Vue |
|--------|------|-----|
| View dropdown (Project, Dashboard, Settings, Docs, Changelog) | ✅ | ✅ |
| Theme toggle (dark/light) | ✅ | ✅ |
| Refresh (reload projects) | ✅ | ✅ |
| Add project | ✅ | ✅ |
| App logo in nav | ✅ `../assets/icons/icon-128.png` | ✅ `icon-128.png` (verify path) |

---

## 2. Sidebar

| Feature | Main | Vue |
|--------|------|-----|
| Type filter (All / npm / PHP / cargo / go / python) | ✅ | ✅ |
| Tag filter | ✅ | ✅ |
| Batch bar (Patch / Minor / Major when ≥2 selected) | ✅ | ✅ |
| Project list with checkboxes | ✅ | ✅ |
| Star per project (sort starred first) | ✅ | ✅ |
| Remove (X) per project with confirm | ✅ | ✅ |
| Hide filters when no projects | ✅ | ✅ |
| Empty state hint | ✅ | ✅ |

---

## 3. Detail view – header

| Feature | Main | Vue |
|--------|------|-----|
| Project name, path | ✅ | ✅ |
| Tags input | ✅ | ✅ |
| PHP (this project) selector | ✅ | ✅ |
| Coverage summary + Run (when npm/php) | ✅ | ✅ |
| Open in Terminal | ✅ | ✅ |
| Open in Cursor/VS Code | ✅ | ✅ |
| Open in Finder | ✅ | ✅ |
| Copy path + feedback | ✅ | ✅ |
| Remove from list | ✅ | ✅ |

---

## 4. Detail view – tabs

| Feature | Main | Vue |
|--------|------|-----|
| All, Git, Version & release, Composer, Sync, Tests, Coverage | ✅ | ✅ |
| Composer/Tests/Coverage tabs only when project has them | ✅ | ✅ |
| Setting “Use tabs in project detail” | ✅ | ✅ |

---

## 5. Git section – layout (main has 3 panels)

| Feature | Main | Vue |
|--------|------|-----|
| Toolbar: repo name, branch select, ahead/behind | ✅ | ✅ |
| Pull, Push, Create branch, Stash, Open in Terminal | ✅ | ✅ |
| **Left panel:** filter (⌘⌥F) | ✅ | ✅ |
| **Left panel:** Local branches (collapsible) | ✅ | ✅ (no “Remote”/“Worktrees” groups) |
| **Left panel:** Remote branches (collapsible) | ✅ | ✅ Load button + list, click to checkout |
| **Left panel:** Worktrees count | ✅ | ✅ "No additional worktrees" / "N worktrees" |
| **Left panel:** Tags (collapsible) | ✅ | ✅ |
| **Left panel:** Sections jump links | ✅ | ✅ Links set right-panel section |
| **Center panel:** Commit history table (graph, message, author, date) | ✅ | ✅ |
| **Center panel:** Click row → commit detail modal | ✅ | ✅ |
| **Right panel:** Section select (Working tree, Branch & sync, … Bisect) | ✅ | ✅ |
| **Right panel:** Working tree – file count, Path/Tree toggle | ✅ | ✅ Path and Tree (grouped by dir) |
| **Right panel:** Stage all | ✅ | ✅ |
| **Right panel:** Unstaged / Staged lists | ✅ | ✅ |
| **Right panel:** Commit summary + description, Amend, Sign commit | ✅ | ✅ |
| **Right panel:** “Compose commit with AI” / Generate (Ollama) | ✅ | ✅ |
| Git subtabs (Main / History / Advanced) when using tabs | ✅ | ❌ **Missing** (single Git panel) |

---

## 6. Git – right-panel cards (main: 14 sections)

| Card | Main | Vue component |
|------|------|----------------|
| Working tree & commit | ✅ | Inline in DetailGitSection |
| Branch & sync | ✅ | GitBranchSyncCard.vue |
| Merge & rebase | ✅ | GitMergeRebaseCard.vue |
| Stash | ✅ | GitStashCard.vue |
| Tags | ✅ | GitTagsCard.vue |
| Commit history | ✅ (list + click → modal) | Same (center table + CommitDetailModal) |
| Reflog | ✅ | GitReflogCard.vue |
| Delete branch / Branches | ✅ | GitDeleteBranchCard.vue |
| Remotes | ✅ | GitRemotesCard.vue |
| Compare & reset | ✅ | GitCompareResetCard.vue |
| .gitignore | ✅ | GitGitignoreCard.vue |
| .gitattributes | ✅ | GitGitattributesCard.vue |
| Submodules | ✅ | GitSubmodulesCard.vue |
| Worktrees | ✅ | GitWorktreesCard.vue |
| Bisect | ✅ | GitBisectCard.vue |

---

## 7. Git – Branch & sync (main has more actions)

| Feature | Main | Vue |
|--------|------|-----|
| Pull, Pull (rebase), Fetch, Prune, Push, Force push, Force (lease) | ✅ | ⚠️ Pull/Push in toolbar; full set in card? |
| Create branch | ✅ | ✅ |
| From remote: Load branches, remote branch select, Checkout | ✅ | ✅ (GitBranchSyncCard) |
| Copy branch name | ✅ | ⚠️ Check card |

---

## 8. Git – Merge & rebase

| Feature | Main | Vue |
|--------|------|-----|
| Merge branch + strategy + strategy option | ✅ | ✅ |
| Rebase onto + Rebase + Interactive rebase | ✅ | ✅ |
| Continue/Skip/Abort (merge, rebase, cherry-pick) | ✅ | ⚠️ Check GitMergeRebaseCard |

---

## 9. Version & release

| Feature | Main | Vue |
|--------|------|-----|
| Released versions list (tags, links, Download per version) | ✅ | ✅ |
| Recent commits (for release) | ✅ | ✅ |
| Suggested bump (conventional commits) | ✅ | ✅ |
| Load from commits | ✅ | ✅ |
| Generate with Ollama (release notes) | ✅ | ✅ |
| Copy version / tag / release notes | ✅ | ✅ |
| Per-project GitHub token | ✅ | ✅ |
| Release status + Open Actions link | ✅ | ✅ |
| Patch / Minor / Major / Pre-release / Tag and push | ✅ | ✅ |
| Shortcuts hint (⌘1 Patch, …) | ✅ | ✅ |

---

## 10. Sync & download

| Feature | Main | Vue |
|--------|------|-----|
| Sync (fetch) | ✅ | ✅ |
| Download latest | ✅ | ✅ |
| Choose version… (modal → pick release → pick asset) | ✅ | ✅ |
| Copy sync/download status | ✅ | ✅ |

---

## 11. Composer (PHP)

| Feature | Main | Vue |
|--------|------|-----|
| Composer card when hasComposer | ✅ | ✅ |
| Validate, lock warning, scripts, outdated, audit | ✅ | ✅ (DetailComposerCard) |
| Refresh outdated, Update all, Direct only | ✅ | ⚠️ Check card |

---

## 12. Tests & coverage

| Feature | Main | Vue |
|--------|------|-----|
| Tests tab/card (run script, output) | ✅ | ✅ |
| Coverage tab/card + header summary + Run | ✅ | ✅ |

---

## 13. Modals

| Modal | Main | Vue |
|-------|------|-----|
| Switch with uncommitted changes (Stash & switch, etc.) | ✅ | ✅ SwitchWithChangesModal |
| Commit detail (message, diff, Copy SHA, Cherry-pick, Revert, Amend) | ✅ | ✅ CommitDetailModal |
| Diff full | ✅ | ✅ DiffFullModal |
| File viewer (content, Blame, Diff, Open in editor) | ✅ | ✅ FileViewerModal |
| Choose version (releases list) | ✅ | ✅ ChooseVersionModal |
| Pick asset | ✅ | ✅ PickAssetModal |
| Docs (by key) | ✅ | ✅ DocsModal |
| Bisect ref picker (good/bad ref) | ✅ | ✅ BisectRefPickerModal |

---

## 14. Settings

| Feature | Main | Vue |
|--------|------|-----|
| GitHub token (default) | ✅ | ✅ |
| Sign commits (GPG/SSH) | ✅ | ✅ |
| Ollama base URL, model | ✅ | ✅ |
| **Ollama: List models** button + models list | ✅ | ✅ |
| PHP executable (default) | ✅ | ✅ |
| Project view – Use tabs | ✅ | ✅ |

---

## 15. Dashboard

| Feature | Main | Vue |
|--------|------|-----|
| Filter (All / Needs release), Sort (Name / Needs release first) | ✅ | ✅ |
| Table: Name, Version, Latest tag, Unreleased, Branch, Ahead/behind | ✅ | ✅ |
| Row click → select project | ✅ | ✅ |
| Refresh | ✅ | ✅ |

---

## 16. Batch release

| Feature | Main | Vue |
|--------|------|-----|
| Bar when ≥2 selected; Patch / Minor / Major | ✅ | ✅ |
| Confirmation + run in sequence per project | ✅ | ⚠️ Verify flow matches main |

---

## 17. Keyboard shortcuts

| Shortcut | Main | Vue |
|----------|------|-----|
| ⌘1 Patch, ⌘2 Minor, ⌘3 Major | ✅ | ✅ |
| ⌘S Sync, ⌘D Download latest | ✅ | ✅ |
| ⌘⌥F Focus git filter | ✅ | ✅ |

---

## 18. Other

| Feature | Main | Vue |
|--------|------|-----|
| Detail loading overlay (spinner/orb) | ✅ Orb + rings | ✅ Spinner + “Loading…” |
| Collapsible sections (Version, Git cards, etc.) | ✅ PREF_COLLAPSED_SECTIONS | ✅ useCollapsible |
| Refresh uses getAllProjectsInfo for metadata | ✅ | ✅ |
| Doc trigger (i) buttons per section | ✅ | ✅ |

---

## Summary: gaps to fix or add in Vue

1. ~~**Git left sidebar**~~ **Done**
   - Remote branches (Load + list, checkout), Worktrees line, Sections jump links.

2. ~~**Git right panel**~~ **Done:** Path/Tree toggle for file list (main has “Path” vs “Tree” view).

3. **Git subtabs**
   - Main has **Main / History / Advanced** when “Use tabs” is on; Vue uses one Git panel. Optional to add.

4. **Batch release**
   - Vue: one confirm then runs release for each selected npm project. Optional: run in sequence with refresh after each.

5. **Assets**
   - Main uses `../assets/icons/icon-128.png`; Vue uses `icon-128.png` – ensure icon path works in built app.

6. **Smaller**
   - Copy branch name in Branch & sync card.
   - Merge/rebase/cherry-pick Continue/Skip/Abort visibility and behavior in GitMergeRebaseCard.

---

## How this was generated

- **Main:** `git show main:src-renderer/index.html` and structure of `src-renderer/app.js`.
- **Vue:** `renderer-vue/src/` components and conversation summary of implemented features.

If something is marked ✅ in Vue but you don’t see it, it may be a layout/visibility bug (e.g. scroll, collapsed state, or wrong tab).
