# Renderer modules

The renderer is split into modules for easier maintenance:

- **state.js** – Shared mutable state (`state.projects`, `state.selectedPath`, etc.). Used by `app.js`.
- **constants.js** – `VIEW_LABELS`, `GIT_ACTION_CONFIRMS`, `GIT_ACTION_SUCCESS`, `BTN_ICONS`, Git section IDs, etc.
- **dom.js** – DOM element references (`getElementById`). Available for future refactors (e.g. detail/git logic can import these).
- **utils.js** – `escapeHtml`, `createBtnIcon`, `stripAnsi`, `formatAheadBehind`, `BTN_ICONS`.

**Entry point:** `main.js` imports `app.js`, which imports `state`, `constants`, and `utils` from this folder. The bundle is built with:

```bash
npm run build:js
```

This produces `renderer.js`, which the HTML loads. Run `npm run build:js` before `npm start` or `npm run build` (both scripts already include it).

**Further splitting:** You can move more logic out of `app.js` into new modules under `js/` (e.g. `git.js`, `detail.js`, `dashboard.js`) and import them from `app.js`. Use `state` for shared mutable data and avoid circular dependencies (e.g. inject callbacks like `loadProjectInfo` if needed).
