# __EXT_NAME__

__EXT_DESCRIPTION__

## Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production build
```

## Deploying

1. Run `npm run build` to produce `dist/index.js`
2. Create a GitHub release and attach `dist/index.js` as an asset, **or** ensure `dist/index.js` is committed so the repo zipball includes it
3. Add the extension to Shipwell via **View > Extensions > Add from GitHub**

## Structure

```
src/
  index.js            # Entry point — registers the extension
  ExtensionPanel.vue  # Main Vue component
manifest.json         # Extension metadata
vite.config.js        # Build config
```

## API

Extensions run in the renderer process and have access to:

- `window.releaseManager` — full IPC API (preferences, git, AI, etc.)
- `window.__registerDetailTabExtension(def)` — register a detail tab
- `window.__registerSettingsSection(def)` — register a settings section
- `window.__registerCommand(def)` — register a command palette command
- `window.__registerDocSection(def)` — register a documentation section
- `window.__sendTelemetry(event, properties)` — fire a usage/telemetry event
- `window.Vue` — Vue 3 runtime (`h`, `ref`, `reactive`, `computed`, etc.)

## Telemetry / Custom Events

Extensions can fire usage events to track how features are used:

```js
// Fire from anywhere in your extension
window.__sendTelemetry('custom.my_action', { detail: 'some value' });
```

Users opt in to telemetry in **Settings > Data & privacy**. Events are only
sent when the user has usage data enabled. You can define custom event names
in **Settings > Data & privacy > Custom events** so they show up in the UI.

### Creating your own custom events

1. Open **Settings > Data & privacy > Custom events**
2. Add event names like `custom.deploy_started` or `custom.report_generated`
3. In your extension code, call `window.__sendTelemetry('custom.deploy_started', { env: 'prod' })`
4. Events are batched and sent with the rest of the app's telemetry

The `ExtensionPanel.vue` in this template includes a working example.
