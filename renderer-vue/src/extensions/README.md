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
5. Feature flags: all registered extensions are automatically toggleable in Hidden options (Feature Flags). No extra step needed.
6. Add the `id` to `validDetailTabs` in `App.vue` so the persisted tab selection is valid.

## Command palette integration

The app has a **command palette** (shortcut **⌘⇧P** / **Ctrl+Shift+P**) that lists runnable commands. Extensions can add commands so they appear in the palette and are runnable from there.

### Built-in extensions (in this repo)

Import the registry and call **`registerCommand(def)`** from your extension’s `index.js` (same place you call `registerDetailTabExtension`):

```js
import { registerDetailTabExtension } from '../registry';
import { registerCommand } from '../../commandPalette/registry';
import { useAppStore } from '../../stores/app';
import MyCard from './MyCard.vue';

registerDetailTabExtension({ id: 'my-ext', label: 'My tab', component: MyCard });

registerCommand({
  id: 'my-ext.open-tab',
  label: 'Open My tab',
  category: 'My extension',
  run() {
    const store = useAppStore();
    store.setViewMode('detail');
    store.setDetailTab('my-ext');
  },
});
```

### User-installed extensions (marketplace / userData)

User extensions run in a sandbox and only see **`window`**. Use **`window.__registerCommand(def)`** and **`window.__unregisterCommand(id)`**:

```js
if (typeof window.__registerCommand === 'function') {
  window.__registerCommand({
    id: 'my-ext.open-settings',
    label: 'Open my extension settings',
    category: 'My extension',
    shortcut: '⌘K',  // optional, display-only hint
    run() {
      // Use window.releaseManager API or your own logic
      // e.g. open a URL, show a notification, etc.
    },
  });
}
// Optional: unregister when your extension is disabled
// window.__unregisterCommand('my-ext.open-settings');
```

### Command definition

| Field         | Required | Description |
|---------------|----------|-------------|
| `id`          | Yes      | Unique id, e.g. `'my-ext.do-thing'`. Use a prefix to avoid clashes. Search matches this. |
| `label`       | Yes      | Text shown in the palette; search matches this, `category`, and `description`. |
| `run`         | Yes      | Function called when the user runs the command. Can be async. |
| `category`    | No       | Group label in the list, e.g. `'My extension'`. |
| `shortcut`    | No       | Hint shown in the list (e.g. `'⌘K'`). Display only; no key binding. |
| `description` | No       | Longer description shown as secondary text under the label. |
| `icon`        | No       | Icon class string, e.g. `'pi pi-home'` (PrimeIcons). |

Built-in app commands include: Go to Project/Dashboard/Settings/Extensions/Docs/Changelog/API, Refresh, Add project, Sync all, Open hidden options.

## Built-in extensions

- **Kanban** (`extensions/kanban/`) – Per-project board with columns (To Do, In Progress, Done) and cards. Data is stored via `getPreference` / `setPreference` under a key derived from the project path.
- **SSH** (`extensions/ssh/`) – Saved SSH connections and “open in terminal” (uses `getSshConnections` / `setSshConnections` / `openSshInTerminal` from the API).
