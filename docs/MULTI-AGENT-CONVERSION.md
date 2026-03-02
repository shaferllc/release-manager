# Multi-Agent NativePHP Conversion

This document partitions the Release Manager → NativePHP conversion so **multiple agents can work in parallel**. Each agent owns a set of backend services and API routes; the frontend and shared contracts are defined once.

---

## Prerequisites

The Laravel + NativePHP app is already in `app-nativephp/`. If you need to recreate it:

```bash
composer create-project laravel/laravel app-nativephp --prefer-dist
cd app-nativephp
composer require nativephp/desktop
php artisan native:install
```

Then copy the shared scaffold (routes, AGENTS-API.md, RunInDirService, config) from this repo into `app-nativephp/`.

---

## Shared scaffold (already in repo)

- `app-nativephp/routes/api.php` – defines all API route names and method signatures (stub returns).
- `app-nativephp/app/Services/Contracts/` – interfaces for ProjectService, GitService, etc.
- `app-nativephp/resources/views/app.blade.php` – single-page app shell; frontend JS calls `fetch('/api/...')`.
- `app-nativephp/AGENTS-API.md` – list of every endpoint, request/response shape, and which agent implements it.

Agents must **not** change route names or request/response shapes without updating `AGENTS-API.md` and notifying the frontend agent.

---

## Agent assignments

| Agent | Focus | Key files | Depends on |
|-------|--------|-----------|------------|
| **Agent A** | Foundation: config, projects, project detection, run-in-dir, app info, theme, preferences | `app/Services/ConfigService`, `ProjectDetectionService`, `RunInDirService`, `app/Http/Controllers/Api/ProjectsController`, `ConfigController`, `AppController` | — |
| **Agent B** | Git: status, pull, fetch, commit, stash, discard, merge abort, diff, log, file diff | `app/Services/GitService`, `GitPorcelainParser`, `app/Http/Controllers/Api/GitController` | RunInDirService |
| **Agent C** | GitHub: token, releases URL, actions URL, fetch releases, download asset | `app/Services/GithubService`, `app/Http/Controllers/Api/GithubController` | — |
| **Agent D** | Composer, version bump, release flow, conventional commits, tests, coverage, Ollama | `app/Services/ComposerService`, `ReleaseService`, `OllamaService`, `TestsService`, `app/Http/Controllers/Api/ComposerController`, `ReleaseController`, `OllamaController`, `TestsController` | RunInDirService, GitService (for release) |
| **Agent E** | System & UI: directory picker, open in Finder/terminal/editor, clipboard, open URL, changelog | `app/Services/SystemService`, `app/Http/Controllers/Api/SystemController` | Config (paths) |
| **Agent F** | Frontend: Blade view, JS bridge (replace `releaseManager.*` with `fetch('/api/...')`), Tailwind, NativePHP events | `resources/views/`, `public/js/`, `public/css/`, `AGENTS-API.md` | All API routes implemented |

---

## Agent A – Foundation

**Implement:**

1. **Config/settings**  
   - Persist: projects list, GitHub token, Ollama base URL + model, theme, preferences (PHP path, editor, etc.) in `storage/app/release-manager.json` or `config/release-manager.php` + file.  
   - Files: `app/Services/ConfigService.php`, `config/release-manager.php`.

2. **RunInDirService**  
   - Run a command in a given directory (Symfony Process), return stdout/stderr/exit code.  
   - File: `app/Services/RunInDirService.php`.

3. **Project detection**  
   - Given path, detect project type (npm, php, cargo, go, python), name, version from package.json / composer.json / etc.  
   - File: `app/Services/ProjectDetectionService.php` (mirror `src-main/lib/projectDetection.js`, `packageManagers.js`, `packageJson.js`).

4. **Projects API**  
   - `GET /api/projects` → list of `{ path, name? }`.  
   - `POST /api/projects` → set list (body: `{ projects: [{ path, name? }] }`).  
   - `GET /api/projects/all-info` → array of `{ path, name, ...projectInfo }` (call project detection + git status for each).  
   - `GET /api/project-info?path=` → single project info (detection + git status, branch, ahead/behind, uncommitted, conflict count, etc.).  
   - File: `app/Http/Controllers/Api/ProjectsController.php`.

5. **App & config API**  
   - `GET /api/app-info` → `{ name, version }`.  
   - `GET /api/config/theme`, `POST /api/config/theme`.  
   - `GET /api/config/preference?key=`, `POST /api/config/preference` (body: key, value).  
   - `GET /api/config/ollama`, `POST /api/config/ollama`.  
   - `GET /api/config/github-token`, `POST /api/config/github-token`.  
   - Files: `app/Http/Controllers/Api/AppController.php`, `app/Http/Controllers/Api/ConfigController.php`.

6. **Directory picker**  
   - `POST /api/dialog/directory` → return selected path (use NativePHP if available; else return 501 and Agent E can add fallback).  
   - Can be in ProjectsController or a small `DialogController`.

**Reference:** `src-main/main.js` (getProjects, setProjects, getProjectInfo, getAllProjectsInfo, get/set theme, preference, ollama, github token), `src-main/lib/config.js`, `projects.js`, `projectDetection.js`, `packageManagers.js`, `packageJson.js`.

---

## Agent B – Git

**Implement:**

1. **GitPorcelainParser**  
   - Parse `git status --porcelain=v1 -u` output: list of files, conflict count, unmerged paths.  
   - File: `app/Services/Git/GitPorcelainParser.php` (mirror `src-main/lib/gitPorcelain.js`).

2. **GitService**  
   - Methods: getStatus(dirPath), pull(dirPath), fetch(dirPath), commit(dirPath, message), stashPush(dirPath, message), stashPop(dirPath), discardChanges(dirPath), mergeAbort(dirPath).  
   - getRecentCommits(dirPath, n), getCommitsSinceTag(dirPath, sinceTag).  
   - getFileDiff(dirPath, filePath, isUntracked).  
   - All via RunInDirService + parsing where needed.  
   - File: `app/Services/GitService.php`.

3. **Git API**  
   - `GET /api/git/status?path=`  
   - `POST /api/git/pull`, `POST /api/git/fetch`, `POST /api/git/commit`, `POST /api/git/stash-push`, `POST /api/git/stash-pop`, `POST /api/git/discard`, `POST /api/git/merge-abort` (body: path, and message where needed).  
   - `GET /api/git/recent-commits?path=&n=`, `GET /api/git/commits-since-tag?path=&since=`  
   - `GET /api/git/file-diff?path=&file=&untracked=`  
   - File: `app/Http/Controllers/Api/GitController.php`.

**Reference:** `src-main/lib/gitPorcelain.js`, `gitLog.js`, `gitDiff.js`, `src-main/main.js` (all rm-git-* handlers).

---

## Agent C – GitHub

**Implement:**

1. **GithubService**  
   - getRepoSlug(gitRemote), getReleasesUrl(remote), getActionsUrl(remote).  
   - fetchReleases(owner, repo, token?), pickAssetForPlatform(assets).  
   - createRelease(owner, repo, tag, releaseNotes?, draft, prerelease, token).  
   - formatGitHubError(exception).  
   - Use Laravel HTTP client (Guzzle).  
   - File: `app/Services/GithubService.php` (mirror `src-main/lib/github.js`, `githubErrors.js`).

2. **Github API**  
   - `GET /api/github/releases-url?remote=`  
   - `GET /api/github/actions-url?remote=`  
   - `GET /api/github/releases?remote=&token=`  
   - `POST /api/github/download-asset` (body: url, suggestedFileName) → stream to temp file and return path or use NativePHP save dialog (Agent E can wire dialog).  
   - `POST /api/github/create-release` (body: slug, tag, releaseNotes, draft, prerelease, token).  
   - File: `app/Http/Controllers/Api/GithubController.php`.

**Reference:** `src-main/lib/github.js`, `githubErrors.js`, `src-main/main.js` (rm-get-github-*, rm-download-*).

---

## Agent D – Composer, release, tests, Ollama

**Implement:**

1. **ComposerService**  
   - getComposerInfo(dirPath), getOutdated(dirPath, direct?), validate(dirPath), audit(dirPath), update(dirPath, packageNames?).  
   - All via RunInDirService; parse JSON/output.  
   - File: `app/Services/ComposerService.php` (mirror `src-main/lib/composer.js`).

2. **ReleaseService**  
   - versionBump(dirPath, bump, projectType), gitTagAndPush(dirPath, tagMessage, options?).  
   - getReleasePlan(projectType, currentVersion) (bump vs tag-only).  
   - suggestBumpFromCommits(commits) (conventional commits).  
   - release(dirPath, bump, force, options) – orchestrate: check dirty, get plan, bump if needed, tag & push, optional GitHub release.  
   - Files: `app/Services/ReleaseService.php`, `app/Services/ConventionalCommits.php` (mirror `releaseStrategy.js`, `version.js`, `conventionalCommits.js`).

3. **TestsService**  
   - getProjectTestScripts(dirPath, projectType), runProjectTests(dirPath, projectType, scriptName?), runProjectCoverage(dirPath, projectType) + parseCoverageSummary.  
   - File: `app/Services/TestsService.php` (mirror `projectTestScripts.js`, `coverageParse.js`).

4. **OllamaService**  
   - listModels(baseUrl?), generate(baseUrl, model, prompt).  
   - buildCommitMessagePrompt(diffSummary), buildReleaseNotesPrompt(commits).  
   - File: `app/Services/OllamaService.php` (mirror `src-main/lib/ollama.js`).

5. **Controllers & API**  
   - ComposerController: GET/POST routes for composer info, outdated, validate, audit, update.  
   - ReleaseController: POST version-bump, tag-and-push, release; GET commits-since-tag, recent-commits, suggested-bump, actions-url, shortcut-action (or keep shortcut in JS).  
   - TestsController: GET test-scripts, POST run-tests, run-coverage.  
   - OllamaController: GET list-models, POST generate-commit-message, generate-release-notes (body: path, sinceTag for notes).  
   - Files: `app/Http/Controllers/Api/ComposerController.php`, `ReleaseController.php`, `TestsController.php`, `OllamaController.php`.

**Reference:** `src-main/lib/composer.js`, `releaseStrategy.js`, `version.js`, `conventionalCommits.js`, `projectTestScripts.js`, `coverageParse.js`, `ollama.js`, and main.js handlers for rm-composer-*, rm-version-*, rm-release, rm-get-commits-*, rm-get-suggested-bump, rm-get-project-test-scripts, rm-run-project-*, rm-ollama-*.

---

## Agent E – System & UI

**Implement:**

1. **SystemService**  
   - copyToClipboard(text), openPathInFinder(dirPath), openInTerminal(dirPath), openInEditor(dirPath), openFileInEditor(dirPath, relativePath), openUrl(url).  
   - Use PHP `exec`/proc_open per platform (macOS: osascript for Terminal, `open` for Finder; Windows: explorer, cmd; Linux: xdg-open, x-terminal-emulator).  
   - File: `app/Services/SystemService.php`.

2. **Changelog**  
   - Read CHANGELOG.md from app path, convert markdown to HTML (e.g. league/commonmark), return safe HTML.  
   - `GET /api/changelog` → `{ ok, content }` or `{ ok: false, error }`.

3. **Dialogs**  
   - If NativePHP exposes directory picker: call it and return path. Else return 501 so frontend can show a message.

4. **System API**  
   - `POST /api/system/copy-to-clipboard` (body: text).  
   - `POST /api/system/open-path`, `POST /api/system/open-terminal`, `POST /api/system/open-editor`, `POST /api/system/open-file-in-editor`, `POST /api/system/open-url` (body: path/url as needed).  
   - `GET /api/changelog`.  
   - File: `app/Http/Controllers/Api/SystemController.php`, optional `DialogController.php`.

**Reference:** `src-main/main.js` (rm-copy-to-clipboard, rm-open-path-in-finder, rm-open-in-terminal, rm-open-in-editor, rm-open-file-in-editor, rm-open-url, rm-get-changelog).

---

## Agent F – Frontend

**Implement:**

1. **Single Blade view**  
   - One layout that loads the same UI as the Electron app (sidebar, project list, project detail, settings, docs, changelog).  
   - Copy `src-renderer/index.html` structure into `resources/views/app.blade.php`; keep Tailwind classes and IDs.

2. **JS bridge**  
   - Replace every `window.releaseManager.*` call with `fetch('/api/...')` (or a small helper that wraps fetch and handles JSON).  
   - Keep the same UI logic (renderer.js); only the data layer changes.  
   - Handle `native:init` if using NativePHP events for theme or dialogs.

3. **Assets**  
   - Copy or build Tailwind from `src-renderer/input.css` into `public/css/app.css`.  
   - Copy `src-renderer/renderer.js` and adapt to new API; output to `public/js/app.js` (or use Vite and point to same Blade view).

4. **AGENTS-API.md**  
   - Maintain the list of all endpoints, method, request/response shape, and which agent owns it.  
   - Update when any agent adds or changes an route.

**Reference:** `src-renderer/index.html`, `src-renderer/renderer.js`, `src-main/preload.js` (full list of methods).

---

## Execution order

1. **Agent A** can start immediately (foundation, RunInDir, project detection, projects + config API).
2. **Agent B** and **Agent C** can start as soon as RunInDirService exists (they depend only on that and their own services).
3. **Agent D** can start once RunInDirService exists; it will use GitService for release flow, so either implement release after B is done or stub GitService for tag/push.
4. **Agent E** can start in parallel (minimal dependency on config for paths).
5. **Agent F** starts after at least one backend route exists; can stub the rest and fill in as agents deliver. Prefer implementing against the shared `AGENTS-API.md` and stub responses for missing routes.

---

## Handoff

- All API responses must be JSON. Use the same shapes as the Electron app (see preload + main.js) so the frontend can stay close to the current renderer.js.
- When you add or change a route, update `app-nativephp/routes/api.php` and `app-nativephp/AGENTS-API.md`.
- Store all user data under Laravel `storage/` so the app is portable.
