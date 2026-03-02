# Multi-Agent Implementation Plan: Vue Missing Features

This document splits the missing Vue features into **agent-sized tasks**. Each agent can work in a separate Cursor session. Dependencies are called out so agents know what to wait for or stub.

**Reference:** `docs/VUE_MISSING_FEATURES.md` (full feature list).  
**API reference:** `src-main/preload.js` (all `window.releaseManager` methods).  
**Vue app root:** `renderer-vue/src/`.

---

## Dependency order

- **Agent 1 (Modals)** should be done first (or in parallel with Agent 2). Agents 3–8 use modal components or patterns from Agent 1.
- **Agent 2 (Sidebar)** has no dependencies; can run in parallel with Agent 1.
- **Agents 3–5** can run in parallel after Agent 1 (they use modals).
- **Agent 6 (Composer/Tests/Coverage)** can run in parallel with 3–5.
- **Agent 7 (Sync)** uses “Choose version” and “Pick asset” modals from Agent 1.
- **Agent 8 (Shortcuts & polish)** can run last or in parallel; it touches App.vue and Settings.

---

## Agent 1: Shared modals

**Goal:** Add reusable modal components and a small modal state so the rest of the app can open/close modals without duplicating markup.

**Scope:**

1. **Modal container / composable**
   - Add `composables/useModals.js` (or `stores/modals.js`) with reactive state: `activeModal`, `modalPayload`. Methods: `openModal(name, payload)`, `closeModal()`.
   - Optional: a single `components/ModalWrapper.vue` that renders one modal at a time based on `activeModal` (backdrop + close on backdrop click + Escape).

2. **Switch-with-changes modal**
   - When user tries to checkout (branch/tag) and there are uncommitted changes, show modal with:
     - “Stash, switch & pop” (stash → checkout → stash pop)
     - “Stash and switch” (stash → checkout)
     - “Cancel”
   - Component: `components/modals/SwitchWithChangesModal.vue`. Emits `stash-pop`, `stash-only`, `cancel`. Parent (Git section) calls `api.gitStashPush`, `api.checkoutBranch`/`checkoutTag`/`checkoutRemoteBranch`, then optionally `api.gitStashPop`.

3. **Commit detail modal**
   - Content: commit message + full diff (from `api.getCommitDetail(dirPath, sha)`). Buttons: Copy SHA, Cherry-pick, Revert, Amend (only for HEAD). Use `api.copyToClipboard`, `api.gitCherryPick`, `api.gitRevert`, `api.gitAmend`.

4. **Diff full modal**
   - Show full diff text (e.g. from `api.getDiffBetweenFull(dirPath, refA, refB)`). Title + close. Used by Git Compare & reset and others.

5. **File viewer modal**
   - Show file content (diff or blame). Buttons: Open in editor, Blame, Show diff. Use `api.getFileDiff`, `api.getBlame`, `api.openFileInEditor`. Content area shows result (e.g. diff lines with highlighting).

6. **Choose version modal**
   - List GitHub releases (from `api.getGitHubReleases(gitRemote, token)`). On item click → close and emit selected release (or open Pick asset step). Status/loading and empty state.

7. **Pick asset modal**
   - Given a release object with assets, list assets; on click → `api.downloadAsset(url, suggestedFileName)` and close.

8. **Docs modal**
   - Renders static doc content by key (e.g. `branch-sync`, `reflog`). Use existing docs content from original app (see `src-renderer/` or constants). Close button.

9. **Bisect ref picker modal**
   - Small modal: two inputs (bad ref, good ref) + Confirm + Cancel. Used by Git Bisect card.

**Files to create/change:**

- `renderer-vue/src/composables/useModals.js` (or `stores/modals.js`)
- `renderer-vue/src/components/modals/SwitchWithChangesModal.vue`
- `renderer-vue/src/components/modals/CommitDetailModal.vue`
- `renderer-vue/src/components/modals/DiffFullModal.vue`
- `renderer-vue/src/components/modals/FileViewerModal.vue`
- `renderer-vue/src/components/modals/ChooseVersionModal.vue`
- `renderer-vue/src/components/modals/PickAssetModal.vue`
- `renderer-vue/src/components/modals/DocsModal.vue`
- `renderer-vue/src/components/modals/BisectRefPickerModal.vue`
- Optional: `renderer-vue/src/components/ModalWrapper.vue` that mounts one of the above based on state.

**API usage (preload):** `getCommitDetail`, `getDiffBetweenFull`, `getFileDiff`, `getBlame`, `openFileInEditor`, `copyToClipboard`, `gitCherryPick`, `gitRevert`, `gitAmend`, `gitStashPush`, `gitStashPop`, `checkoutBranch`, `checkoutTag`, `checkoutRemoteBranch`, `getGitHubReleases`, `downloadAsset`, `bisectStart`.

**Acceptance criteria:**

- [ ] Switch-with-changes modal appears when checkout would overwrite uncommitted changes; all three actions work.
- [ ] Commit detail modal shows message + diff; Copy SHA, Cherry-pick, Revert, Amend work.
- [ ] Diff full and File viewer modals open with correct content and close.
- [ ] Choose version and Pick asset modals list data and trigger download correctly.
- [ ] Docs modal shows content by key; Bisect ref picker returns two refs.

---

## Agent 2: Sidebar – star, remove, sort

**Goal:** Match original sidebar: star per project, remove from sidebar with confirm, sort starred first then by name; hide filters when no projects.

**Scope:**

1. **Star / unstar**
   - Add star button (outline when unstarred, filled when starred) per project row. Toggle `p.starred` and call `api.setProjects(store.projects)` so it persists. Sort: starred first, then by name (reuse or extend `filteredProjects` sort).

2. **Remove from sidebar**
   - Add “Remove” (X) button per project row. On click: confirm (“Remove ‘ProjectName’ from the list?”). On confirm: remove project from list, call `api.setProjects`, clear selection if needed, re-render.

3. **Sort**
   - In store, ensure `filteredProjects` (or a dedicated “sorted” list) sorts: (1) starred first, (2) then by project name. Use same logic as original: `a.starred` then `(a.name || path).localeCompare(...)`.

4. **Filters visibility**
   - Hide the filters block (Type / Tag) when `store.projects.length === 0` (same as original).

5. **New project default**
   - When adding a project in `App.vue` (or wherever `addProject` adds), ensure new project has `starred: false` (and `tags: []` if not already).

**Files to change:**

- `renderer-vue/src/stores/app.js` – add sort in `filteredProjects` (starred first, then name); ensure projects support `starred`.
- `renderer-vue/src/components/Sidebar.vue` – add star button, remove button, confirm for remove; optionally hide filters when no projects.
- `renderer-vue/src/App.vue` – when appending new project, set `starred: false`.

**API usage:** `setProjects`, `getProjects` (unchanged).

**Acceptance criteria:**

- [ ] Star toggles and persists; list re-sorts with starred on top.
- [ ] Remove shows confirm and removes project from list and persists.
- [ ] Filters are hidden when there are no projects.

---

## Agent 3: Version & release (detail)

**Goal:** Complete the Version card: released versions list, recent commits, suggested bump, Load from commits, Ollama release notes, copy version/tag/notes, per-project token, shortcuts hint, Open Actions link.

**Scope:**

1. **Released versions**
   - Section “Released versions” with list of tags (or from `currentInfo` / GitHub releases). Per row: version/tag, link to release (if URL known), “Download” button (reuse download flow or open Pick asset when multiple assets).

2. **Recent commits (for release)**
   - List recent commits (e.g. `api.getRecentCommits(dirPath, n)` or use `currentInfo.commitsSinceLatestTag`). Show short message + sha.

3. **Suggested bump**
   - Call `api.getSuggestedBump(commits)` (e.g. from commits since tag). Display “Suggested: patch | minor | major” (or similar).

4. **Load from commits**
   - Button “Load from commits”: call `api.getCommitsSinceTag(dirPath, sinceTag)` and format as release notes text; put in release notes textarea.

5. **Generate with Ollama**
   - Button next to release notes: `api.ollamaGenerateReleaseNotes(dirPath, sinceTag)`, set result in textarea.

6. **Copy version / Copy tag / Copy release notes**
   - Buttons that call `api.copyToClipboard(text)` and show brief feedback (e.g. “Copied!”).

7. **Per-project GitHub token**
   - Optional input in Version card to override default token for this project (store in project or in a map by path; main process may need to accept token per release – check `release` options).

8. **Release status + Open Actions link**
   - After release, show status; link “Open Actions” using `api.getActionsUrl(gitRemote)` and `api.openUrl(url)`.

9. **Shortcuts hint**
   - Text like “⌘1 Patch, ⌘2 Minor, ⌘3 Major” (hidden for non-npm projects).

**Files to change:**

- `renderer-vue/src/components/detail/DetailVersionCard.vue`
- Possibly `renderer-vue/src/composables/useApi.js` if you add helpers (no preload change needed).

**API usage:** `getCommitsSinceTag`, `getRecentCommits`, `getSuggestedBump`, `ollamaGenerateReleaseNotes`, `copyToClipboard`, `getActionsUrl`, `openUrl`, `release`, `getGitHubReleases`, `downloadAsset` (if Download per version opens asset picker).

**Acceptance criteria:**

- [ ] Released versions list with Download where applicable.
- [ ] Recent commits and suggested bump visible.
- [ ] Load from commits and Generate with Ollama populate release notes.
- [ ] Copy version/tag/notes with feedback.
- [ ] Open Actions link works; shortcuts hint visible for npm projects.

---

## Agent 4: Git – layout, commit history, commit form extras

**Goal:** 3-panel Git layout, commit history table, use commit detail modal; add Stage all, Amend, Sign commit, Ollama commit; Git toolbar (repo name, Create branch, Stash, Terminal); filter.

**Scope:**

1. **3-panel layout**
   - Left: branches, tags, remotes (existing sidebar content) + “Sections” jump links. Center: commit history table (see below). Right: section selector (dropdown or tabs) + either “Working tree & commit” or one of the extra cards (Agent 5 will add cards). Start with Working tree & commit only in right panel.

2. **Commit history table**
   - Center panel: table with columns Graph, Message, Author, Date. Data from `api.getCommitLog(dirPath, n)`. Click row → open Commit detail modal (Agent 1) with that sha.

3. **Stage all**
   - Button “Stage all changes” in working tree area. Use main process “stage all” if available, or call `stageFile` for each file in `currentInfo.uncommittedLines`.

4. **Amend**
   - Checkbox “Amend previous commit”. When checked and user commits, call `api.commitChanges` with amend option or `api.gitAmend` (see preload).

5. **Sign commit**
   - Checkbox “Sign commit” (reflect setting or per-commit). Pass option into `api.commitChanges(dirPath, message, { sign: true })` (confirm option name in main).

6. **Ollama commit message**
   - Button “Generate” next to commit message: `api.ollamaGenerateCommitMessage(dirPath)`, put result in message field.

7. **Toolbar**
   - Repo name (e.g. from `currentInfo` or path). Buttons: Create branch, Stash, Open in Terminal. Create branch: prompt for name, then `api.createBranch(dirPath, name, true)`. Stash: open stash UI (Agent 5) or simple stash push. Terminal: `api.openInTerminal(dirPath)`.

8. **Filter (⌘⌥F)**
   - Input in Git sidebar to filter branches/tags list (client-side filter on names).

**Files to change:**

- `renderer-vue/src/components/detail/DetailGitSection.vue` (layout + table + toolbar + working tree + commit form)
- Use `components/modals/CommitDetailModal.vue` from Agent 1.

**API usage:** `getCommitLog`, `getCommitDetail`, `stageFile`, `gitAmend`, `commitChanges` (with options), `ollamaGenerateCommitMessage`, `createBranch`, `gitStashPush`, `openInTerminal`, `getProjectInfo` (for repo name).

**Acceptance criteria:**

- [ ] 3-panel layout with commit table in center; click row opens commit detail modal.
- [ ] Stage all, Amend, Sign commit, Generate (Ollama) work.
- [ ] Toolbar shows repo name and Create branch / Stash / Terminal.
- [ ] Filter narrows branches/tags in sidebar.

---

## Agent 5: Git – right-panel cards (Branch & sync, Merge, Stash, Tags, Reflog, etc.)

**Goal:** Implement the right-panel section selector and all Git cards: Branch & sync, Merge & rebase, Stash, Tags, Commit history (inline or link to center), Reflog, Delete branch, Remotes, Compare & reset, .gitignore, .gitattributes, Submodules, Worktrees, Bisect.

**Scope:**

- **Section selector** in Git right panel: dropdown with options matching original. When user picks a section, show the corresponding card below (or replace working tree view).
- **Branch & sync card:** Pull, Pull (rebase), Fetch, Prune, Push, Force push, Create branch, From remote (load remote branches, checkout). Use `gitPull`, `gitPullRebase`, `gitFetch`, `gitPruneRemotes`, `gitPush`, `gitPushForce`, `createBranch`, `getRemoteBranches`, `checkoutRemoteBranch`.
- **Merge & rebase card:** Merge (branch picker + strategy), Rebase onto, Rebase interactive; Continue/Skip/Abort for merge/rebase/cherry-pick. Use `gitMerge`, `gitMergeAbort`, `gitRebase`, `gitRebaseInteractive`, `gitRebaseAbort`, `gitRebaseContinue`, `gitRebaseSkip`, `gitMergeContinue`, `gitCherryPickAbort`, `gitCherryPickContinue`.
- **Stash card:** Include untracked, Keep index; Stash; Pop; list with Apply/Drop. Use `gitStashPush`, `gitStashPop`, `getStashList`, `stashApply`, `stashDrop`.
- **Tags card:** Create tag, push tag, delete tag, list. Use `createTag`, `pushTag`, `deleteTag`, `getTags`.
- **Commit history card:** Can be “see center panel” or duplicate list; click → Commit detail modal.
- **Reflog card:** Load reflog, list entries, checkout ref. Use `getReflog`, `checkoutRef`.
- **Delete branch card:** Rename, delete local, delete on remote. Use `renameBranch`, `deleteBranch`, `deleteRemoteBranch`.
- **Remotes card:** List, add, remove. Use `getRemotes`, `addRemote`, `removeRemote`.
- **Compare & reset card:** Diff between two refs (open Diff full modal), reset (soft/mixed/hard). Use `getDiffBetweenFull`, `gitReset`.
- **.gitignore / .gitattributes:** Load and show content; edit and save. Use `getGitignore`, `getGitattributes`, `writeGitignore`, `writeGitattributes`.
- **Submodules:** List, update (init). Use `getSubmodules`, `submoduleUpdate`.
- **Worktrees:** List, add, remove. Use `getWorktrees`, `worktreeAdd`, `worktreeRemove`.
- **Bisect:** Start (open Bisect ref picker modal for bad/good), Good, Bad, Reset. Use `getBisectStatus`, `bisectStart`, `bisectGood`, `bisectBad`, `bisectReset`.

**Files to create/change:**

- `renderer-vue/src/components/detail/DetailGitSection.vue` – section selector + render one card at a time.
- New card components under `renderer-vue/src/components/detail/git/` e.g. `GitBranchSyncCard.vue`, `GitMergeRebaseCard.vue`, `GitStashCard.vue`, `GitTagsCard.vue`, `GitReflogCard.vue`, `GitDeleteBranchCard.vue`, `GitRemotesCard.vue`, `GitCompareResetCard.vue`, `GitGitignoreCard.vue`, `GitGitattributesCard.vue`, `GitSubmodulesCard.vue`, `GitWorktreesCard.vue`, `GitBisectCard.vue` (and optionally `GitCommitHistoryCard.vue` if not using center panel only).

**Dependencies:** Agent 1 (modals: Diff full, Docs, Bisect ref picker). Agent 4 (layout and commit table).

**Acceptance criteria:**

- [ ] Every section in the selector has a card that loads and performs the listed actions.
- [ ] Stash, Tags, Reflog, Delete branch, Remotes, Compare & reset, .gitignore/.gitattributes, Submodules, Worktrees, Bisect all functional.

---

## Agent 6: Composer, Tests, Coverage

**Goal:** Composer tab + card; Tests tab; Coverage tab + header summary.

**Scope:**

1. **Composer tab**
   - Show Composer tab when `currentInfo.hasComposer` (or project type PHP with composer). Tab content: card with validate, outdated table, audit table, scripts, “Update all” / “Direct only”, refresh. Use `getComposerInfo`, `getComposerOutdated`, `getComposerValidate`, `getComposerAudit`, `composerUpdate`.

2. **Tests tab**
   - Show Tests tab when project has test scripts (`api.getProjectTestScripts(dirPath, projectType)`). List scripts; run one and show output (e.g. in a pre or modal). Use `runProjectTests`.

3. **Coverage tab**
   - Show Coverage tab when relevant. Run coverage and show summary. Use `runProjectCoverage`. Optionally show summary in detail header (Agent 3 or DetailHeader) with “Run” button.

4. **Detail header**
   - PHP version selector (per-project override): `getAvailablePhpVersions`, `getPhpVersionFromRequire`; store preference per project or in main. Coverage summary + Run in header when coverage is available.

**Files to change:**

- `renderer-vue/src/views/DetailView.vue` – add Composer, Tests, Coverage tabs; conditionally show tabs.
- New: `renderer-vue/src/components/detail/DetailComposerCard.vue` (or tab content).
- New: `renderer-vue/src/components/detail/DetailTestsCard.vue`.
- New: `renderer-vue/src/components/detail/DetailCoverageCard.vue`.
- `renderer-vue/src/components/detail/DetailHeader.vue` – PHP version select, coverage summary + Run.

**API usage:** `getComposerInfo`, `getComposerOutdated`, `getComposerValidate`, `getComposerAudit`, `composerUpdate`, `getProjectTestScripts`, `runProjectTests`, `runProjectCoverage`, `getAvailablePhpVersions`, `getPhpVersionFromRequire`.

**Acceptance criteria:**

- [ ] Composer tab appears for PHP projects with composer; validate, outdated, audit, update work.
- [ ] Tests tab appears when scripts exist; run script shows output.
- [ ] Coverage tab runs and shows summary; header shows coverage + Run when applicable.
- [ ] PHP version selector in header works for project.

---

## Agent 7: Sync – choose version, pick asset, copy status

**Goal:** “Choose version…” flow (modal list of releases → pick asset), and copy sync/download status with feedback.

**Scope:**

1. **Choose version…**
   - Button “Choose version…” in Sync card. Open Choose version modal (Agent 1) with `api.getGitHubReleases(gitRemote, token)`. On select release → either download latest asset or open Pick asset modal with that release’s assets. On asset select → `api.downloadAsset(url, suggestedFileName)`.

2. **Pick asset**
   - Use Pick asset modal from Agent 1 when a release has multiple assets.

3. **Copy status**
   - Buttons to copy sync/download status text to clipboard with “Copied!” feedback (`api.copyToClipboard`).

**Files to change:**

- `renderer-vue/src/components/detail/DetailSyncCard.vue`
- Use `ChooseVersionModal.vue` and `PickAssetModal.vue` from Agent 1.

**API usage:** `getGitHubReleases`, `downloadAsset`, `getGitHubToken` (or per-project token), `copyToClipboard`.

**Acceptance criteria:**

- [ ] “Choose version…” opens modal; selecting release and then asset downloads correctly.
- [ ] Copy status buttons copy and show feedback.

---

## Agent 8: Keyboard shortcuts, collapsible cards, refresh, Settings Ollama

**Goal:** Global shortcuts; collapsible detail cards; refresh behavior; filters visibility; Ollama list models in Settings.

**Scope:**

1. **Keyboard shortcuts**
   - In `App.vue` (or a composable), listen for `keydown`. Call `api.getShortcutAction(viewMode, selectedPath, key, metaKey, ctrlKey, inInput)`. If action is e.g. `patch`/`minor`/`major`, run release; if `sync`, run sync; if `download`, run download; etc. Prevent default when handled. Skip when focus is in input/textarea (`inInput`).

2. **Collapsible cards**
   - Detail cards (Version, Git sections, Sync, etc.): click header to expand/collapse. Persist collapsed state in preferences (e.g. `PREF_COLLAPSED_SECTIONS` or per-section keys) via `api.setPreference` / `api.getPreference`.

3. **Refresh**
   - “Refresh” in NavBar should mirror original: reload projects from filesystem and refresh metadata. Use `getAllProjectsInfo` if available and then update store (and current project info); or call existing `getProjectInfo` for selected project after refresh. Ensure `loadProjects` plus a metadata refresh step is invoked.

4. **Filters visibility**
   - Already in Agent 2; ensure filters are hidden when `projects.length === 0`.

5. **Settings – Ollama list models**
   - In Settings view, add “List models” button that calls `api.ollamaListModels(settings.ollamaBaseUrl)` and displays the list (or fills a dropdown).

**Files to change:**

- `renderer-vue/src/App.vue` – keydown listener and shortcut handling; optionally refresh logic.
- `renderer-vue/src/views/SettingsView.vue` – Ollama “List models” button and display.
- Detail card components (Version, Sync, Git cards) – add collapsible header and preference persistence.

**API usage:** `getShortcutAction`, `getPreference`, `setPreference`, `getAllProjectsInfo`, `getProjectInfo`, `ollamaListModels`.

**Acceptance criteria:**

- [ ] ⌘1/2/3 (or equivalent) trigger Patch/Minor/Major; ⌘S Sync; ⌘D Download when applicable.
- [ ] Detail cards can collapse; state persists.
- [ ] Refresh reloads projects and updates metadata.
- [ ] Settings Ollama “List models” shows models from base URL.

---

## Handoff notes

- **Modal composable/store:** Agent 1 should export `useModals()` (or a Pinia store) and component names so Agents 3–5 and 7 can open modals by name and pass payload (e.g. `openModal('commitDetail', { dirPath, sha })`).
- **Checkout with uncommitted changes:** Agent 4 (Git) should use the same pattern as original: before `checkoutBranch`/`checkoutTag`/`checkoutRemoteBranch`, check `currentInfo.uncommittedLines.length`; if > 0, open Switch-with-changes modal and run the chosen flow (stash pop vs stash only vs cancel).
- **Preload:** All APIs used above are already in `src-main/preload.js`. If a method is missing (e.g. “stage all”), add it in main + preload in a separate small PR or in the same agent that needs it.
- **Styling:** Reuse Tailwind and CSS variables from `renderer-vue/src/input.css` and existing components so new UI matches the app.

---

## Quick reference: which agent touches which file

| File | Agents |
|------|--------|
| `App.vue` | 2 (new project `starred`), 8 (shortcuts, refresh) |
| `stores/app.js` | 2 (sort, `starred`) |
| `Sidebar.vue` | 2 |
| `DetailView.vue` | 6 (tabs) |
| `DetailHeader.vue` | 6 (PHP, coverage) |
| `DetailVersionCard.vue` | 3 |
| `DetailSyncCard.vue` | 7 |
| `DetailGitSection.vue` | 4, 5 |
| `SettingsView.vue` | 8 |
| `composables/useModals.js` or `stores/modals.js` | 1 |
| `components/modals/*.vue` | 1 |
| `components/detail/git/*.vue` | 5 |
| `components/detail/DetailComposerCard.vue` etc. | 6 |
