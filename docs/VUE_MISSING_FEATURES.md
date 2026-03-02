# Missing Features: Vue vs Original Renderer

Features present in the original (vanilla) renderer that are not yet implemented in the Vue app.

---

## Sidebar & project list

| Feature | Original | Vue |
|--------|----------|-----|
| **Star / unstar project** | Star button per project; starred projects sort to top; `p.starred` persisted via `setProjects` | ❌ No star button or sorting |
| **Remove from sidebar** | Per-project "Remove" (X) button with confirm; `removeProject(path)` | ❌ Remove only in detail header |
| **Project list sort** | Starred first, then by name | ❌ No explicit sort (filtered only) |
| **Filters visibility** | Type/tag filters hidden when `projects.length === 0` | ✅ Shown always (minor) |

---

## Detail: Version & release

| Feature | Original | Vue |
|--------|----------|-----|
| **Released versions list** | "Released versions" section with all tags, links, Download per version | ❌ Not shown |
| **Recent commits (release)** | "Recent commits" list + "Load from commits" for release notes | ❌ Not shown |
| **Suggested bump** | From conventional commits (feat → minor, fix → patch, etc.) | ❌ Not shown |
| **Load from commits** | Button to populate release notes from commits since tag | ❌ Not in Vue |
| **Generate with Ollama** (release notes) | Button next to release notes | ❌ Not in Vue |
| **Copy release notes** | Copy to clipboard + feedback | ❌ Not in Vue |
| **Copy version / Copy tag** | Buttons with copy feedback | ❌ Not in Vue |
| **Release status + Open Actions link** | After release, show status and link to GitHub Actions | ⚠️ Vue shows status text only |
| **GitHub token (per-project)** | Input in Version card to override default token | ❌ Not in Vue |
| **Shortcuts hint** | "⌘1 Patch, ⌘2 Minor, …" (hidden for non-npm) | ❌ Not in Vue |

---

## Detail: Git section

| Feature | Original | Vue |
|--------|----------|-----|
| **3-panel layout** | Left: branches/tags/remotes + Sections jump. Center: commit history table. Right: section selector + working tree **or** one of many cards | ⚠️ Vue has simplified 2-panel (working tree + commit, sidebar branches/tags) |
| **Commit history table** | Center panel: graph, message, author, date; click row → commit detail | ❌ Vue has no commit table |
| **Right-panel section selector** | "Working tree & commit" \| "Branch & sync" \| "Merge & rebase" \| "Stash" \| "Tags" \| "Commit history" \| "Reflog" \| "Branches" \| "Remotes" \| "Compare & reset" \| ".gitignore" \| ".gitattributes" \| "Submodules" \| "Worktrees" \| "Bisect" | ❌ Vue only has working tree + commit in one view |
| **Branch & sync card** | Pull, Pull (rebase), Fetch, Prune, Push, Force push, Force (lease), Create branch, From remote (load + checkout) | ⚠️ Vue has pull/push + branch/tag checkout in sidebar only |
| **Merge & rebase card** | Merge branch picker + strategy + Merge; Rebase onto + Rebase; Interactive rebase; Continue/Skip/Abort for merge/rebase/cherry-pick | ❌ Not in Vue |
| **Stash card** | Include untracked, Keep index; Stash; Pop; Stash list (apply/drop) | ❌ Vue has no stash UI |
| **Tags card** | Create tag, push tag, delete tag, list with actions | ❌ Vue only has tag list + checkout in sidebar |
| **Commit history card** | List of commits, click → commit detail modal (Copy SHA, Cherry-pick, Revert, Amend) | ❌ Not in Vue |
| **Reflog card** | Load reflog, list entries, checkout ref | ❌ Not in Vue |
| **Delete branch card** | Rename branch, delete local, delete on remote | ❌ Not in Vue |
| **Remotes card** | List remotes, add, remove | ❌ Not in Vue |
| **Compare & reset card** | Diff between refs, reset (soft/mixed/hard) | ❌ Not in Vue |
| **.gitignore / .gitattributes** | View/edit content | ❌ Not in Vue |
| **Submodules card** | List, update (init) | ❌ Not in Vue |
| **Worktrees card** | List, add, remove | ❌ Not in Vue |
| **Bisect card** | Start (bad/good), Good, Bad, Reset; ref picker modal | ❌ Not in Vue |
| **Git filter (⌘⌥F)** | Filter branches/tags in sidebar | ❌ Not in Vue |
| **Repository name in toolbar** | `detail-git-repo-name` | ❌ Not in Vue |
| **Create branch (toolbar)** | Button to create branch | ❌ Not in Vue |
| **Stash (toolbar)** | Button | ❌ Not in Vue |
| **Open in Terminal (toolbar)** | Button in Git toolbar | ❌ Not in Vue |
| **Stage all** | "Stage all changes" in right panel | ❌ Not in Vue (per-file stage only) |
| **Amend checkbox** | Amend previous commit | ❌ Not in Vue |
| **Compose commit with AI (Ollama)** | Button next to commit form | ❌ Not in Vue |
| **Sign commit** | Checkbox (from Settings) | ❌ Not in Vue |
| **Doc triggers** | (i) buttons to open docs modal for each section | ❌ Not in Vue |
| **Collapsible Git cards** | Main / History / Advanced subtabs; cards can collapse | ❌ Vue uses a single simplified layout |

---

## Modals

| Feature | Original | Vue |
|--------|----------|-----|
| **Switch with uncommitted changes** | When switching branch/tag with changes: modal "Stash, switch & pop" \| "Stash and switch" \| "Cancel" | ❌ Vue uses simple `confirm()` for checkout |
| **Commit detail modal** | Click commit → modal with message, Copy SHA, Cherry-pick, Revert, Amend | ❌ No commit list → no modal |
| **Diff full modal** | Full diff view (e.g. between refs) | ❌ Not in Vue |
| **File viewer modal** | Click file → content, Blame, Diff, Open in editor | ❌ Not in Vue |
| **Choose version (download)** | Modal list of releases, pick one → then pick asset | ❌ Not in Vue |
| **Pick asset modal** | When downloading a release, choose which asset | ❌ Not in Vue |
| **Docs modal** | In-app docs for section (e.g. "Branch & sync") from doc-trigger buttons | ❌ Not in Vue |
| **Bisect ref picker** | Modal to pick good/bad ref for bisect start | ❌ Not in Vue |

---

## Detail: Composer (PHP)

| Feature | Original | Vue |
|--------|----------|-----|
| **Composer tab** | Shown when `hasComposer`; summary, validate, lock warning, scripts, outdated table, audit table, Refresh outdated, Update all, Direct only | ❌ No Composer tab or section |

---

## Detail: Tests & coverage

| Feature | Original | Vue |
|--------|----------|-----|
| **Tests tab** | When project has test scripts; run script, show output | ❌ No Tests tab |
| **Coverage tab** | Run coverage, show summary in header + card | ❌ No Coverage tab or header |

---

## Detail: Header & tabs

| Feature | Original | Vue |
|--------|----------|-----|
| **PHP (this project)** | Select to override default PHP for Composer/Pest; options from `getAvailablePhpVersions` / `getPhpVersionFromRequire` | ❌ Not in Vue |
| **Coverage in header** | Summary + "Run" when coverage available | ❌ Not in Vue |
| **Composer / Tests / Coverage tabs** | Shown when project has composer or test scripts | ❌ Only All, Git, Version, Sync in Vue |

---

## Sync & download

| Feature | Original | Vue |
|--------|----------|-----|
| **Choose version…** | Modal: list GitHub releases, pick version → then pick asset | ❌ Not in Vue |
| **Copy sync/download status** | Button + feedback | ❌ Not in Vue |

---

## Settings

| Feature | Original | Vue |
|--------|----------|-----|
| **Ollama: List models** | Button to fetch models from base URL, show list | ❌ Not in Vue |
| **Save on blur/change** | Same as Vue | ✅ |

---

## Dashboard

| Feature | Original | Vue |
|--------|----------|-----|
| **Row click → select project** | Same as Vue | ✅ |
| **Filter / Sort** | Same as Vue | ✅ |

---

## Batch release

| Feature | Original | Vue |
|--------|----------|-----|
| **Batch bar** | Patch / Minor / Major; confirmation; run release in sequence per project | ⚠️ Vue has bar + buttons but batch release runs without full confirmation/sequence flow like original |
| **Checkbox state** | Persisted in `state.selectedPaths`; bar visibility when ≥2 | ✅ Vue has this |

---

## Keyboard shortcuts

| Feature | Original | Vue |
|--------|----------|-----|
| **Global keydown** | `getShortcutAction(viewMode, selectedPath, key, metaKey, ctrlKey, inInput)` → e.g. ⌘1 Patch, ⌘2 Minor, ⌘3 Major, ⌘S Sync, ⌘D Download | ❌ No shortcut handling in Vue |

---

## Other behavior

| Feature | Original | Vue |
|--------|----------|-----|
| **Refresh** | `refreshFromFilesystem()` (reload projects from disk + refresh metadata) then re-render | ⚠️ Vue calls `loadProjects()` (getProjects only); no `refreshProjectsMetadata` / `getAllProjectsInfo` for metadata |
| **Detail loading overlay** | Spinner overlay while loading project info | ❌ Vue shows "Loading…" text only |
| **Collapsible sections** | Cards (Version, Git cards, etc.) can collapse; state in `PREF_COLLAPSED_SECTIONS` | ❌ Vue cards are always expanded |
| **Confirm before checkout** | When clean: one confirm; when dirty: switch-with-changes modal | ❌ Vue uses simple confirm for checkout |

---

## Summary (counts)

- **Sidebar:** Star, per-item remove, sort by starred — **3**
- **Detail Version & release:** Released versions, recent commits, suggested bump, Load from commits, Ollama release notes, copy version/tag/notes, Actions link, per-project token, shortcuts hint — **9**
- **Detail Git:** Full 3-panel layout, commit table, right-panel sections (Branch & sync, Merge & rebase, Stash, Tags, Commit history, Reflog, Delete branch, Remotes, Compare & reset, .gitignore, .gitattributes, Submodules, Worktrees, Bisect), filter, toolbar extras, stage all, amend, Ollama commit, sign commit, doc triggers, collapsible — **many**
- **Modals:** Switch with changes, commit detail, diff full, file viewer, choose version, pick asset, docs, bisect ref — **8**
- **Composer / Tests / Coverage:** Full Composer tab, Tests tab, Coverage tab + header — **3**
- **Detail header:** PHP select, coverage summary — **2**
- **Sync:** Choose version modal, copy status — **2**
- **Settings:** Ollama list models — **1**
- **Batch release:** Full confirm + sequence flow — **1**
- **Keyboard shortcuts:** All — **1**

**Total:** Dozens of discrete features; the largest gaps are the **full Git UI** (commit history, merge/rebase, stash, remotes, reflog, bisect, etc.), **modals** (file viewer, commit detail, switch-with-changes, choose version/asset, docs), **Composer/Tests/Coverage**, and **keyboard shortcuts**.
