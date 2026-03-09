# Shipwell

Desktop app to manage releases for all your app projects. Add project folders (npm, Rust, Go, or Python), see version and git status, then bump and push or tag-and-push. Includes a **Documentation** tab in the app with all features and how to use them.

## Requirements

- Node.js 18+
- npm (for npm projects)
- Git (for tag & push)

## Quick start

```bash
cd release-manager
npm install
npm start
```

1. Click **Add project** and choose a folder that contains a supported manifest: `package.json`, `Cargo.toml`, `go.mod`, or `pyproject.toml` / `setup.py`.
2. Select a project to see its version, git state, and release options.
3. For **npm**: use **Patch**, **Minor**, or **Major** to bump, then tag and push. For **Rust / Go / Python**: update the version in your manifest if needed, then use **Tag and push**.

**In-app docs:** Open the **Documentation** tab in the sidebar for the full feature list and usage.

## Downloads

**Latest:** v0.7.0 — [Release & downloads](https://github.com/shaferllc/release-manager/releases/latest)

## Features

| Feature | Description |
|--------|-------------|
| **Multiple package managers** | npm (package.json), Rust (Cargo.toml), Go (go.mod), Python (pyproject.toml / setup.py). Version and name are read from the right manifest. |
| **Project detail** | Version, latest tag, released versions list (with links and download per version for GitHub). Collapsible Git, Version & release, Sync & download sections. |
| **Release (npm)** | Patch / Minor / Major / Pre-release bump, then commit, tag `vX.Y.Z`, and push. Optional release notes, draft, and pre-release (with GitHub token). |
| **Tag and push (Rust/Go/Python)** | Tag current version from the manifest and push (no bump from the app). |
| **Git** | Branch, ahead/behind, uncommitted files. Commit from the app with a message. |
| **Sync & download** | `git fetch` (Sync). Download latest or choose a version to download GitHub Release assets. |
| **Open in Terminal / Editor** | Open project folder in the system terminal or in Cursor / VS Code. |
| **Open in Finder / Copy path** | Reveal in file manager or copy path to clipboard. |
| **Dashboard** | Table of all projects (name, version, tag, branch, ahead/behind). Filter and sort. |
| **Batch release** | Select multiple projects and run Patch / Minor / Major for all (npm only). |
| **Settings** | Optional GitHub token for higher limits, private repos, and creating/updating releases. Optional **Ollama** base URL and model for generating commit messages and release notes. |
| **Generate with Ollama** | Use a local [Ollama](https://ollama.com) model to generate commit messages and release notes. Start Ollama: `ollama serve`. Pull a model: `ollama pull llama3.2`. Set base URL and model in Settings, then use **Generate** (commit) or **Generate with Ollama** (release notes) in the project view. |
| **Theme** | Dark / Light toggle; choice is saved. |

## Project structure

```
release-manager/
├── assets/icons/         # App icon
├── scripts/
│   ├── ensure-icon.js
│   └── generate-icons.js
├── src-main/
│   ├── lib/              # Testable helpers (with __tests__)
│   │   ├── github.js
│   │   ├── config.js
│   │   ├── projects.js
│   │   ├── theme.js
│   │   ├── version.js
│   │   ├── runInDir.js
│   │   ├── migration.js
│   │   ├── packageJson.js
│   │   ├── packageManagers.js   # Cargo, go, Python detection
│   │   ├── projectDetection.js  # npm vs non-npm resolve
│   │   ├── releaseStrategy.js  # bump_and_tag vs tag_only
│   │   └── __tests__/
│   ├── main.js
│   └── preload.js
├── renderer-vue/          # Vue app (builds to dist-renderer/)
├── package.json
└── README.md
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Build Vue renderer and run the app |
| `npm run dev` | Build Vue renderer and run with Electron logging |
| `npm run build:renderer-vue` | Build the Vue UI into `dist-renderer/` (run from repo root) |
| `npm run dev:vue` | Build Vue, then watch for changes and run Electron (auto-rebuild on save) |
| `npm run build` | Package with electron-builder |
| `npm test` | Run test suite (Jest + Vue) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:e2e` | E2E smoke test (launches app, checks UI) |
| `npm run cli -- <cmd> [args]` | Run the app in CLI mode (no window). Example: `npm run cli -- projects` |

### Command-line API

You can interact with the app from the terminal. Output is JSON to stdout; exit code 0 on success, 1 on error. Use the same app data (projects, settings) as the GUI.

```bash
# From repo root (after npm install)
npm run cli -- help
npm run cli -- version
npm run cli -- projects
npm run cli -- dashboard
npm run cli -- info /path/to/project
npm run cli -- add /path/to/project "My Project"
npm run cli -- remove /path/to/project
npm run cli -- api getBranches '["/path/to/project"]'
```

| Command | Description |
|---------|-------------|
| `help` | Show usage and all commands |
| `version` | Print app name and version |
| `projects` | List saved projects (path, name, tags, starred) |
| `dashboard` | List all projects with full info (version, branch, tags, ahead/behind) |
| `info <path>` | Get project info for a directory |
| `add <path> [name]` | Add a project to the list |
| `remove <path>` | Remove a project from the list |
| `api <method> [params]` | Call any API method; params are a JSON array |

**Seeing UI changes:** The app uses the **Vue** renderer (built to `dist-renderer/`). Always run from the **repo root** (`release-manager/`), not from `renderer-vue/`. Use `npm start` or `npm run dev` to build the Vue bundle and launch; both now build the renderer first. If you only changed Vue files, run `npm run build:renderer-vue` then `npx electron .` to refresh without a full restart. For live reload during development, use `npm run dev:vue` (watches `renderer-vue` and rebuilds on save).

## Troubleshooting

- **"Sign-in not configured"** – For **Development** environment to work without entering Client ID/Secret in Settings, create a `.env` in this repo (copy from `.env.example`) and set `LICENSE_DEV_CLIENT_ID` and `LICENSE_DEV_CLIENT_SECRET`. In **shipwell-web** run `php artisan passport:client --password` and use the returned Client ID and Secret. The app loads `.env` at startup when running `npm run dev` or `npm start`.
- **Login / “fetch failed”** – To see why sign-in fails, run with debug logging:
  - **Main process (sign-in requests):** `npm run dev` (logging is on when `NODE_ENV=development`) or `LICENSE_DEBUG=1 npm start`. Watch the terminal for `[licenseServer]` lines: they show the URL used, each request (POST /oauth/token, GET /api/user), response status, and any fetch error (message, cause).
  - **Renderer:** Open DevTools (e.g. **View → Toggle Developer Tools**). In the console, look for `[useLicense]` and `[login]` messages when you try to sign in or when the app loads login status.
  - **Main process (login status):** With `npm run dev`, the terminal also logs `[RM Debug] [main] [license]` when `getLicenseStatus` is called and whether a token exists and remote validation passed.
  - Cross-check with the **shipwell-web** app: enable `AUTH_DEBUG_LOG=true` in its `.env` and check `storage/logs/laravel.log` to see if the server received the request and what status it returned.

- **App exits with SIGABRT** – Reload is only enabled when you run `npm run dev`. If you use `npm start`, the watcher is off and the app should not crash from it. If you still see SIGABRT (e.g. when using `npm run dev`), run with reload disabled: `DISABLE_ELECTRON_RELOAD=1 npm run dev`, or use `npm start` and restart the app manually after code changes.

## Tests

Logic in `src-main/lib/` is unit-tested (Jest). Run `npm run test:coverage` for coverage. `npm run test:e2e` runs a Playwright smoke test that launches the app and checks the main UI (builds the Vue renderer first).

## Releasing this app

Push a tag `v*` (e.g. `v0.2.0`); GitHub Actions builds and creates a Release. Or add this repo as a project in the app and use Release there.

**Sign-in for everyone (built app):** So that Production (and optional Staging) sign-in works in the built app without users configuring Client ID/Secret, add these **repository secrets** in GitHub (Settings → Secrets and variables → Actions):

- `LICENSE_PROD_CLIENT_ID` – Passport password-grant client ID for your production backend (e.g. app.shipwell.com).
- `LICENSE_PROD_CLIENT_SECRET` – That client’s secret.

Optional for Staging:

- `LICENSE_STAGING_CLIENT_ID`, `LICENSE_STAGING_CLIENT_SECRET` – Same for staging (e.g. staging.shipwell.com).

The release workflow runs `scripts/generate-license-bundled.js` before packaging; it writes `license-server.bundled.json` from these env vars so the packaged app has credentials for prod (and staging). Do not commit that file; it is gitignored. Local `npm run build` without these env vars still succeeds; the built app just won’t have bundled prod credentials.

Workflows live in `.github/workflows/` and must be on the **default branch** (e.g. `main`) to appear. Open **Actions** at: `https://github.com/<owner>/<repo>/actions`. If no workflows show, check **Settings → Actions → General** and ensure "Allow all actions" (or the desired level) is enabled.
