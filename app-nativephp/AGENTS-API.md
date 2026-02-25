# Release Manager API – Contract for Multi-Agent Conversion

All endpoints are under `/api`. Request/response shapes match the Electron app so the frontend can swap `releaseManager.*` for `fetch('/api/...')`.

| Method | Endpoint | Agent | Request | Response |
|--------|----------|--------|---------|----------|
| GET | /api/projects | A | — | `{ projects: [{ path, name? }] }` |
| POST | /api/projects | A | `{ projects: [{ path, name? }] }` | 204 |
| GET | /api/projects/all-info | A | — | `[{ path, name, ...projectInfo }]` |
| GET | /api/project-info?path= | A | path (query) | projectInfo (see Electron getProjectInfo) |
| POST | /api/dialog/directory | A | — | `{ path }` or 501 |
| GET | /api/app-info | A | — | `{ name, version }` |
| GET | /api/config/theme | A | — | `{ theme, effective }` |
| POST | /api/config/theme | A | `{ theme }` | 204 |
| GET | /api/config/preference?key= | A | key (query) | `{ value }` |
| POST | /api/config/preference | A | `{ key, value }` | 204 |
| GET | /api/config/ollama | A | — | `{ baseUrl, model }` |
| POST | /api/config/ollama | A | `{ baseUrl, model }` | 204 |
| GET | /api/config/github-token | A | — | `{ token }` |
| POST | /api/config/github-token | A | `{ token }` | 204 |
| GET | /api/git/status?path= | B | path (query) | `{ clean, branch, ahead, behind, uncommittedLines, conflictCount }` |
| POST | /api/git/pull | B | `{ path }` | `{ ok, error? }` |
| POST | /api/git/fetch | B | `{ path }` | `{ ok }` |
| POST | /api/git/commit | B | `{ path, message }` | `{ ok, error? }` |
| POST | /api/git/stash-push | B | `{ path, message? }` | `{ ok }` |
| POST | /api/git/stash-pop | B | `{ path }` | `{ ok }` |
| POST | /api/git/discard | B | `{ path }` | `{ ok }` |
| POST | /api/git/merge-abort | B | `{ path }` | `{ ok }` |
| GET | /api/git/recent-commits?path=&n= | B | path, n (query) | `{ commits }` |
| GET | /api/git/commits-since-tag?path=&since= | B | path, since (query) | `{ ok, commits }` |
| GET | /api/git/file-diff?path=&file=&untracked= | B | path, file, untracked (query) | `{ ok, type, content }` or `{ ok: false, error }` |
| GET | /api/github/releases-url?remote= | C | remote (query) | `{ url }` |
| GET | /api/github/actions-url?remote= | C | remote (query) | `{ url }` |
| GET | /api/github/releases?remote=&token= | C | remote, token (query) | `{ ok, releases }` or `{ ok: false, error, releases: [] }` |
| POST | /api/github/download-asset | C | `{ url, suggestedFileName }` | `{ ok, path? }` or `{ ok: false, error }` |
| POST | /api/github/create-release | C | `{ owner, repo, tag, releaseNotes?, draft, prerelease, token }` | `{ ok }` |
| GET | /api/composer/info?path= | D | path (query) | composer manifest or `{ ok: false, error }` |
| GET | /api/composer/outdated?path=&direct= | D | path, direct (query) | `{ ok, packages }` |
| GET | /api/composer/validate?path= | D | path (query) | `{ valid }` or error shape |
| GET | /api/composer/audit?path= | D | path (query) | `{ ok, advisories }` |
| POST | /api/composer/update | D | `{ path, packageNames? }` | `{ ok, error? }` |
| POST | /api/release/version-bump | D | `{ path, bump }` | `{ ok, version? }` |
| POST | /api/release/tag-and-push | D | `{ path, tagMessage, version? }` | `{ ok, tag? }` |
| POST | /api/release/run | D | `{ path, bump, force, releaseNotes?, draft, prerelease }` | `{ ok, tag?, version?, actionsUrl?, releaseError? }` |
| GET | /api/release/suggested-bump | D | body or query: commits array | `{ bump }` |
| GET | /api/tests/scripts?path=&projectType= | D | path, projectType (query) | `{ ok, scripts }` |
| POST | /api/tests/run | D | `{ path, projectType, scriptName? }` | `{ ok, exitCode, stdout, stderr }` |
| POST | /api/tests/coverage | D | `{ path, projectType }` | `{ ok, stdout, stderr, summary }` |
| GET | /api/ollama/models?baseUrl= | D | baseUrl (query) | `{ ok, models }` or `{ ok: false, error }` |
| POST | /api/ollama/generate-commit-message | D | `{ path }` | `{ ok, text? }` or `{ ok: false, error }` |
| POST | /api/ollama/generate-release-notes | D | `{ path, sinceTag? }` | `{ ok, text? }` or `{ ok: false, error }` |
| POST | /api/system/copy-to-clipboard | E | `{ text }` | 204 |
| POST | /api/system/open-path | E | `{ path }` | `{ ok, error? }` |
| POST | /api/system/open-terminal | E | `{ path }` | `{ ok, error? }` |
| POST | /api/system/open-editor | E | `{ path }` | `{ ok, editor? }` or `{ ok: false, error }` |
| POST | /api/system/open-file-in-editor | E | `{ path, relativePath }` | `{ ok, error? }` |
| POST | /api/system/open-url | E | `{ url }` | 204 |
| GET | /api/changelog | E | — | `{ ok, content }` or `{ ok: false, error }` |

Frontend (Agent F) should use these paths with `fetch()`; send JSON body for POST where indicated. All responses are JSON unless 204.
