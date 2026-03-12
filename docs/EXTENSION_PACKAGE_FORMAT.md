# Extension Package Format

Extensions installed from the marketplace are stored under the app’s user data directory in `extensions/<id>/`. The app supports two package shapes: a **zip archive** or a **single JS file**.

## Directory layout (after install)

- `extensions/<id>/manifest.json` – Required. Written by the app on install (id, name, version, description).
- `extensions/<id>/index.js` – Entry script. Either the only file (when the marketplace serves a single `.js`), or the main entry inside a zip. The app will load this at runtime to register the extension.
- Any other files (e.g. assets) may live next to `index.js` if the package is a zip.

## Manifest (manifest.json)

The app writes this when installing; authors can include one in a zip for reference. Fields:

- `id` (string) – Unique extension id (e.g. `my-extension`).
- `name` (string) – Display name.
- `version` (string) – Semver-style version.
- `description` (string, optional) – Short description.

## Entry script (index.js)

The entry script runs in the renderer. It must register the extension with the app’s registry so the detail tab appears. The app will load the script in a context where a global registration function is available:

- **`window.__registerDetailTabExtension(def)`** – Registers a detail-tab extension.  
  `def` must include:
  - `id` (string)
  - `label` (string)
  - `component` (Vue component or a loader that returns one)
  - Optional: `description`, `version`, `icon` (SVG string), `featureFlagId`, `isVisible(info)`.

Because user extensions are loaded at runtime (not bundled by Vite), the script should be **pre-built**: a single JS bundle that does not rely on Vue SFCs or raw npm imports unless the app exposes them. In practice, authors build a small bundle (e.g. with Vite or Rollup) that:

1. Imports or defines a Vue component for the tab content.
2. Calls `window.__registerDetailTabExtension({ id, label, component, ... })` when the script runs.

The app exposes `window.PrimeVue` with UI components (button, panel, dialog, inputtext, textarea, select, checkbox, message, etc.). Extensions use these via `window.PrimeVue['button']`, `window.PrimeVue['panel']`, etc. (lowercase keys). Do not import PrimeVue directly.

## Marketplace API

The marketplace backend (Laravel or standalone PHP) exposes:

- `GET /api/extensions` – List extensions (response: `{ "data": [ { "id", "slug", "name", "description", "version", "download_url", ... } ] }`).
- `GET /api/extensions/{id}` – Single extension.
- `GET /api/extensions/{id}/download` – Either:
  - Stream the package file (zip or js), or
  - Return JSON `{ "download_url": "https://..." }` for an external URL.

The app downloads the package, extracts or copies it into `extensions/<id>/`, and writes `manifest.json`. On next load, the runtime loader will load `extensions/<id>/index.js` and call the registration function so the new tab appears.

## Runtime loader (app side)

The app does the following during renderer startup:

1. **Before** loading built-in extensions, it sets `window.__registerDetailTabExtension` to the same `registerDetailTabExtension` from the registry.
2. Built-in extensions are loaded via `renderer-vue/src/extensions/index.js` and register as usual.
3. After the app is mounted, it calls `getInstalledUserExtensions()`, then for each id loads the script with `getExtensionScriptContent(id)` and runs it (e.g. `eval(content)`). Each script is expected to call `window.__registerDetailTabExtension(def)`.
4. The registry is reactive (`ref`); when a user script registers, the UI (e.g. detail tab list and Extensions view) updates automatically.

Built-in extensions are registered at load time; user-installed extensions are registered asynchronously after mount from `userData/extensions/<id>/index.js`.
