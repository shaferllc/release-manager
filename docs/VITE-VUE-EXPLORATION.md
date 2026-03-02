# Vite + Vue exploration

This branch explores moving the Release Manager renderer from the current setup (vanilla JS + esbuild bundle) to **Vite** and **Vue**.

## Why consider it?

### Vite
- **Fast HMR** – Change a Vue file and see updates without full reload.
- **Same speed as now** – Vite uses esbuild for deps and Rollup for the app; we already use esbuild.
- **Standard tooling** – `vite build` for production, clear config, good DX.
- **Electron-friendly** – Dev: load Vite dev server URL; prod: load built `index.html` from disk.

### Vue
- **Component-based UI** – Break the 3.7k-line `app.js` into `<ProjectList>`, `<GitPanel>`, `<DetailView>`, etc.
- **Reactive state** – Replace manual `state.projects` + `renderProjectList()` with `reactive()` / `ref()`; Vue updates the DOM.
- **Single-file components** – `.vue` files keep template, script, and style together.
- **Ecosystem** – Vue Router (if we add views), Pinia (if we want a store), or keep it minimal.

## Tradeoffs

| Pros | Cons |
|------|------|
| Clearer structure, easier to onboard | Migration effort: every screen and flow must be reimplemented or wrapped |
| HMR and faster iteration once in Vue | Preload/IPC surface stays the same; only the renderer implementation changes |
| Aligns with common Electron + Vue patterns | Need to keep Tailwind (or move to Vue-friendly styling) and theme (dark/light) |

## Migration approach (if we commit)

1. **Phase 1 – Coexist**  
   Keep current renderer as default. Add a minimal Vite+Vue renderer (this spike). Electron can load either via env or a flag so we can compare.

2. **Phase 2 – One screen in Vue**  
   Pick one area (e.g. project list + selection) and reimplement it in Vue, calling the same preload APIs (`window.releaseManager.*`). Prove IPC, theme, and styling.

3. **Phase 3 – Incremental**  
   Move one view at a time (Dashboard, Git, Settings, etc.) into Vue components. Shared state via a small store (Pinia or a reactive module) or props/emits.

4. **Phase 4 – Switch default**  
   When all views are in Vue, make the Vue build the default renderer and remove the old bundle.

## Rough checklist

- [ ] Vite app builds and runs in Electron (this branch: minimal spike).
- [ ] Preload / `window.releaseManager` works from Vue (no Node in renderer).
- [ ] Theme (dark/light) still applies; Tailwind or equivalent works.
- [ ] One full flow in Vue (e.g. list projects → select → show detail) to validate approach.
- [ ] Decision: full migration vs. stay on current renderer.

## This branch

- **`docs/VITE-VUE-EXPLORATION.md`** – This file.
- **`renderer-vue/`** – Minimal Vite + Vue 3 app (one view, “Release Manager (Vue)”).
- **Run it:** `npm run start:vue` (builds the Vue renderer then launches Electron with it). On Windows use `set USE_VUE_RENDERER=1 && electron .` after building.

The main process loads the Vue build when `USE_VUE_RENDERER=1`. Default `npm start` still uses the current renderer.
