# Detail tab extensions

Detail-view tabs (Dashboard, Git, Version, etc.) can be extended via a **plugin extension system**. New tabs register with the registry and appear in the tab bar; the detail view renders the extension’s component when the tab is active.

**Tab order** is user-configurable: drag and drop any tab in the detail tab bar to reorder. Order is persisted in `state.detailTabOrder` and applied to both built-in and extension tabs.

**Extensions manager**: Use **View → Extensions** in the app to see all loaded extensions, enable/disable them, and see version and description. Extensions are updated with the app (no separate update flow yet).

## Registry API (`registry.js`)

- **`registerDetailTabExtension(def)`** – Register a tab. Required: `id`, `label`, `component`. Optional: `icon` (SVG string), `featureFlagId` (gated by feature flags), `isVisible(info)` (show only for certain projects).
- **`getDetailTabExtensions()`** – List all registered extensions.
- **`getDetailTabExtension(tabId)`** – Get the definition for a tab id (used by DetailView to render the panel).

## Adding an extension

1. Create a folder under `extensions/` (e.g. `extensions/my-tab/`).
2. Implement a Vue component that receives the `info` prop (same as built-in detail cards).
3. In an `index.js`, call `registerDetailTabExtension({ id, label, icon, component, featureFlagId?, isVisible? })`.
4. **Add one line to `extensions/index.js`**: `import './my-tab';` so the extension is loaded at app startup.
5. Add the extension’s `id` to `TAB_FLAG_IDS` in `composables/useFeatureFlags.js` if it should be toggleable in Feature Flags.
6. Add the `id` to `validDetailTabs` in `App.vue` so the persisted tab selection is valid.

## Built-in extensions

- **Kanban** (`extensions/kanban/`) – Per-project board with columns (To Do, In Progress, Done) and cards. Data is stored via `getPreference` / `setPreference` under a key derived from the project path.
- **SSH** (`extensions/ssh/`) – Saved SSH connections and “open in terminal” (uses `getSshConnections` / `setSshConnections` / `openSshInTerminal` from the API).
