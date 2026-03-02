# NativePHP Conversion Plan

Plan for converting Release Manager from Electron (Node.js) to NativePHP (Laravel + PHP). This is a **rewrite** of the backend; the UI can be largely preserved.

---

## 1. Overview

| Current | Target |
|--------|--------|
| Electron app (main + preload + renderer) | Laravel app packaged with NativePHP |
| Node.js backend, ~45 IPC handlers | PHP backend (routes / Livewire / services) |
| `src-main/lib/*` (Node modules) | PHP classes + Symfony Process + Guzzle |
| `releaseManager.*` in renderer | NativePHP bridge or Livewire + JS |

**Goal:** Same feature set and UX, running as a NativePHP desktop app.

---

## 2. Current Architecture Summary

### 2.1 Main process (`src-main/main.js`)

- Window lifecycle, menu, dock icon, theme
- All IPC handlers registered in one place
- Uses: `config`, `projects`, `runInDir`, Git helpers, GitHub, Ollama, composer, version bump, preferences, theme, editor/terminal/finder, dialogs

### 2.2 Preload API (`src-main/preload.js`)

Single bridge: `releaseManager` with 60 methods (some map to same IPC channel with different args). Grouped below by domain.

### 2.3 Backend libs (`src-main/lib/`)

| Module | Responsibility | PHP equivalent |
|--------|----------------|----------------|
| `config.js` | Read/write JSON config (projects, paths) | Laravel storage, optional JSON file in app data |
| `projects.js` | Filter valid project paths | PHP helper / service |
| `runInDir.js` | Spawn process in project dir, capture output | `Symfony\Component\Process\Process` |
| `gitPorcelain.js` | Parse `git status --porcelain`, detect conflicts | PHP string parsing / regex |
| `gitLog.js` | Parse `git log` output | PHP parsing |
| `gitDiff.js` | `git diff` for commit message / file view | Process + parse |
| `version.js` | Bump rules, tag format, prerelease | PHP helper / enum |
| `releaseStrategy.js` | Bump vs tag-only plan from project type/version | PHP service |
| `conventionalCommits.js` | Suggest bump from commit messages | PHP parsing |
| `github.js` | Repo slug, releases/actions URLs, pick asset by platform | Guzzle + URL parsing |
| `githubErrors.js` | Format GitHub API errors | PHP helper |
| `ollama.js` | Ollama API (list models, generate), prompt builders | Guzzle + PHP strings |
| `composer.js` | composer.json parsing, validate/audit/outdated parsing | `Composer\*` or Process + JSON |
| `packageJson.js` | Parse package.json name/version/scripts | `json_decode` |
| `packageManagers.js` | Detect project type (npm/cargo/go/python/php), version parsing | PHP + file_exists / regex |
| `projectDetection.js` | Name, version, type for a path | Uses packageManagers + packageJson |
| `projectTestScripts.js` | Get test/coverage script names (npm/composer) | PHP parsing |
| `coverageParse.js` | Parse coverage summary from stdout | PHP regex |
| `documentation.js` | Check HTML for doc sections/features | PHP DOM or regex |
| `theme.js` | theme values, effective theme (system) | PHP + NativePHP window/preferences |
| `shortcuts.js` | Map key to action (view mode, selection) | PHP or keep in JS |
| `migration.js` | Parse old config format | One-time or drop |

### 2.4 Electron-specific

- `electron-store`: persisted key-value (GitHub token, Ollama, theme, preferences) → Laravel config/settings (e.g. `config/release-manager.php` or DB).
- `shell.openPath`, `shell.openExternal`, `clipboard`, native file dialog, “open in Terminal/editor” → NativePHP equivalents where available; else PHP `exec`/proc open per platform.
- `app.getPath('downloads')`, save dialog → NativePHP file dialogs / storage paths.

---

## 3. Target Architecture (Laravel + NativePHP)

- **App:** New Laravel app (or Laravel skeleton) inside repo or subfolder (e.g. `app-nativephp/`).
- **NativePHP:** Install `nativephp/nativephp`, configure window/menu, use Laravel as single entry (no separate “main process”).
- **Frontend:** Reuse existing HTML/CSS (Tailwind) and most JS; replace `releaseManager.*` calls with:
  - **Option A:** Livewire components; backend logic in Livewire methods and PHP services.
  - **Option B:** Blade + JS that call Laravel routes (API) and use NativePHP’s JS bridge for native actions (clipboard, open URL, file dialog).
- **Persistence:** Config/settings in Laravel (config files, or database, or JSON in `storage/` with a simple key-value layer).
- **Process execution:** Symfony Process in PHP for all `git`, `composer`, `npm` commands.
- **External APIs:** Guzzle for GitHub and Ollama.

---

## 4. API Mapping: `releaseManager.*` → Laravel / NativePHP

| Current method | Laravel / NativePHP approach |
|----------------|-------------------------------|
| **Projects & config** | |
| `getProjects` | Service + config/storage → return list |
| `getAllProjectsInfo` | Service: loop projects, call getProjectInfo each → array |
| `setProjects` | Service: persist project list |
| `showDirectoryDialog` | NativePHP file/folder picker (if available) or PHP-native dialog |
| `getProjectInfo` | Service: project detection + git status (Process + gitPorcelain logic) |
| **Composer** | |
| `getComposerInfo` | Service: read composer.json, validate structure |
| `getComposerOutdated` | Process: `composer outdated --format=json` + parse |
| `getComposerValidate` | Process: `composer validate` |
| `getComposerAudit` | Process: `composer audit --format=json` + parse |
| `composerUpdate` | Process: `composer update` with optional packages |
| **Tests & coverage** | |
| `getProjectTestScripts` | Service: package.json / composer.json scripts |
| `runProjectTests` | Process: npm run / composer run (with optional timeout) |
| `runProjectCoverage` | Process: coverage script + parseCoverageSummary |
| **Version & release** | |
| `versionBump` | Process: npm version / composer (or PHP version bump in manifest) |
| `gitTagAndPush` | Process: git tag, git push + tags |
| `release` | Service: orchestrate bump/tag, optional GitHub release (Guzzle) |
| `getCommitsSinceTag` | Process: git log + parse |
| `getRecentCommits` | Process: git log + parse |
| `getSuggestedBump` | Service: conventionalCommits logic |
| **Shortcuts & URLs** | |
| `getShortcutAction` | Can stay in JS or small PHP helper |
| `getActionsUrl` | Service: from git remote |
| **GitHub** | |
| `getGitHubToken` / `setGitHubToken` | Config/settings (storage or config) |
| `getReleasesUrl` | Service: from remote |
| `getGitHubReleases` | Guzzle: GitHub API |
| `downloadLatestRelease` | Guzzle + stream download; NativePHP save dialog |
| `downloadAsset` | Guzzle + stream; save dialog |
| **Ollama** | |
| `getOllamaSettings` / `setOllamaSettings` | Config/settings |
| `ollamaListModels` | Guzzle: Ollama API |
| `ollamaGenerateCommitMessage` | Service: git diff + prompt + Ollama |
| `ollamaGenerateReleaseNotes` | Service: commits + prompt + Ollama |
| **Git** | |
| `getGitStatus` | Process: git status + parse (porcelain) |
| `commitChanges` | Process: git commit |
| `gitPull` | Process: git pull |
| `gitStashPush` / `gitStashPop` | Process |
| `gitDiscardChanges` | Process: git checkout/restore |
| `gitMergeAbort` | Process: git merge --abort |
| **System / UI** | |
| `copyToClipboard` | NativePHP clipboard (if available) or exec fallback |
| `openPathInFinder` | NativePHP “open path” or exec (open/macOS, explorer/Windows) |
| `openInTerminal` | Exec: platform-specific (osascript, cmd, x-terminal-emulator) |
| `openInEditor` / `openFileInEditor` | Exec: cursor/code with path |
| `getFileDiff` | Process: git diff or read file for untracked |
| `syncFromRemote` | Process: git fetch |
| `openUrl` | NativePHP or shell open |
| **App & preferences** | |
| `getAppInfo` | config('app.name'), config('app.version') or package |
| `getChangelog` | Read CHANGELOG.md, markdown→HTML (e.g. league/commonmark) |
| `getPreference` / `setPreference` | Config/settings (e.g. PHP version path, editor path) |
| `getAvailablePhpVersions` | Exec: `php -v` or scan common paths |
| `getPhpVersionFromRequire` | Parse composer platform require |
| `getTheme` / `setTheme` | Config + NativePHP window theme if supported |
| `onTheme` | Laravel event + NativePHP broadcast to frontend |

---

## 5. Phase Plan

### Phase 1: Foundation (1–2 weeks)

- [ ] Create new Laravel app (e.g. `app-nativephp/` or new repo).
- [ ] Install and configure NativePHP (window, menu, entry URL).
- [ ] Implement config/settings layer (projects list, GitHub token, Ollama, theme, preferences).
- [ ] Implement “run command in directory” helper (Symfony Process wrapper).
- [ ] Implement project detection (type, name, version) in PHP.
- [ ] Single “get project info” endpoint that returns same shape as current `getProjectInfo` (or close).

**Exit:** Laravel app opens in NativePHP window; can add project paths and see one project’s basic info.

### Phase 2: Git & GitHub (1–2 weeks)

- [ ] Git status (porcelain parsing, conflict count, uncommitted lines).
- [ ] Git: pull, fetch, commit, stash push/pop, discard, merge abort.
- [ ] Git log parsing (recent commits, since tag).
- [ ] GitHub: repo slug, releases URL, actions URL; fetch releases (Guzzle); error formatting.
- [ ] Download release asset (stream + save dialog).

**Exit:** Git section and GitHub releases usable from Laravel backend.

### Phase 3: Composer, version bump, release flow (1–2 weeks)

- [ ] Composer: manifest info, validate, outdated, audit, update (all via Process).
- [ ] Version bump (npm/composer) and tag + push.
- [ ] Release strategy (bump vs tag-only) and full release orchestration.
- [ ] Conventional commits → suggested bump.
- [ ] Create GitHub release (Guzzle) after tag.

**Exit:** Release flow (bump, tag, push, optional GitHub release) works.

### Phase 4: Tests, coverage, Ollama (1 week)

- [ ] Test scripts detection (npm/composer); run tests via Process.
- [ ] Coverage script detection and run; parse coverage summary.
- [ ] Ollama: list models, generate commit message, generate release notes (Guzzle + prompts).

**Exit:** Tests, coverage, and AI generation work.

### Phase 5: System integration & polish (1 week)

- [ ] Directory picker (NativePHP or fallback).
- [ ] Open in Finder/explorer, Terminal, editor (cursor/code); open file in editor.
- [ ] File diff view (untracked + git diff).
- [ ] Clipboard, open URL.
- [ ] Changelog (markdown → HTML).
- [ ] Preferences (PHP versions, editor path, etc.) and theme.
- [ ] Shortcuts: either keep in JS or small PHP API.

**Exit:** Feature parity with Electron app for core flows.

### Phase 6: Frontend migration & testing

- [ ] Copy/reuse `src-renderer` HTML/CSS/JS into Laravel (Blade or Livewire views).
- [ ] Replace every `releaseManager.*` call with Livewire method or fetch to Laravel route; use NativePHP bridge for native actions.
- [ ] Preserve theme (dark/light/system) and any NativePHP events.
- [ ] E2E / manual testing on macOS (then Windows/Linux if desired).

---

## 6. Decisions & Risks

| Decision | Options | Recommendation |
|----------|---------|-----------------|
| Frontend stack | Livewire vs Blade+JS API | Livewire reduces custom JS bridge surface; Blade+API keeps current JS structure. Choose based on team preference. |
| Config storage | File (JSON) vs DB vs Laravel config | File in `storage/` or `config/` for simplicity; DB if we want multi-profile later. |
| Where to host Laravel | Same repo subfolder vs new repo | Same repo `app-nativephp/` keeps one place for “Release Manager” and allows sharing docs/assets. |
| Electron parity | Full parity vs MVP then iterate | Aim for full parity so we can switch; drop migration.js and non-critical edge cases initially if needed. |

**Risks:**

- NativePHP file dialogs / clipboard / “open in Terminal” may differ per platform; need to verify NativePHP docs and possibly add fallbacks (exec).
- Long-running commands (composer update, full test suite): use Symfony Process with timeout and streaming output if NativePHP supports broadcasting to frontend.
- Packaging: NativePHP’s build/packaging story (e.g. PHP runtime, assets) must be validated early.

---

## 7. References

- [NativePHP Desktop docs](https://nativephp.com/docs/desktop/2/) (window, events, child processes, broadcasting).
- Current codebase: `src-main/main.js` (handlers), `src-main/preload.js` (API), `src-main/lib/*` (logic).
- Laravel: [Process](https://laravel.com/docs/processes), [HTTP Client](https://laravel.com/docs/http-client) (Guzzle).

---

## 8. Checklist before starting Phase 1

- [ ] Confirm NativePHP supports: file/folder picker, clipboard, open external URL, open path in OS (Finder/explorer).
- [ ] Decide Livewire vs Blade+API for frontend.
- [ ] Create `app-nativephp/` (or new repo) and add this plan to it.
- [ ] One “hello project” screen that loads project list from config and shows one project’s name/version/type from new PHP services.
