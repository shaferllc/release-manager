# Extensions

Extensions live in their own GitHub repos and are installed from the marketplace to `userData/extensions/`. They are built at install time (via `vite build`) and loaded at runtime using `eval()`.

This directory contains only the **runtime infrastructure** — no extension source code.

## Files

- `registry.js` — Registration API for tabs and documentation sections
- `settingsRegistry.js` — Registration API for settings sections
- `tabCategories.js` — Tab category definitions
- `index.js` — Empty stub (extensions load at runtime from userData)

## Registry API (`registry.js`)

### Tabs

- **`registerDetailTabExtension(def)`** — Register a tab. Required: `id`, `label`, `component`. Optional: `icon` (SVG string), `isVisible(info)` (show only for certain projects).
- **`getDetailTabExtensions()`** — List all registered extensions.
- **`getDetailTabExtension(tabId)`** — Get the definition for a tab id.

### Documentation sections

- **`registerDocSection(def)`** — Register a docs section. Required: `id`, `title`, `items[]`. Optional: `category`, `order`.
- **`getDocSections()`** — List all registered doc sections.

## Writing an extension

Extensions are standalone repos with:

```
my-extension/
  src/
    index.js              # Entry point — calls window.__registerDetailTabExtension
    MyComponent.vue       # Vue component (receives info prop)
  package.json
  vite.config.js          # IIFE build, externalizes vue
  manifest.json           # id, name, version, description
```

The `src/index.js` registers via globals:

```js
import MyComponent from './MyComponent.vue';

window.__registerDetailTabExtension({
  id: 'my-ext',
  label: 'My Extension',
  description: 'What it does.',
  version: '1.0.0',
  icon: '<svg ...>...</svg>',
  component: MyComponent,
});
```

Extensions must not import PrimeVue components directly. Use plain HTML/CSS or access `window.Vue` for Vue APIs.

## Plan gating

Extensions have a `required_plan` field (`free`, `pro`, `team`). The plan controls:
- Whether the extension can be installed
- Whether its tab appears in the detail view (`isTabAllowed`)
- Whether it can be enabled/disabled
