# Git panel plugins

Each git feature (Bisect, Tags, Remotes, Stash, etc.) is a **self-contained plugin** under `plugins/git/<id>/`. This keeps changes isolated and makes it easy to add or remove panels.

## Plugin structure

```
plugins/git/<id>/
  index.js       # Export: default { id, label, defaultPosition, component }
  <Name>Card.vue # Panel UI (optional: use composable from ./useX.js)
  useX.js        # Panel logic (optional; use ../../../composables and ../../../stores for shared deps)
```

- **working-tree** has no component (rendered inline in DetailGitSection); only `index.js` with `component: null`.
- **bisect** also exports `useBisectRefPicker` for the Bisect Ref Picker modal.
- **tags** exports `useCreateTag` for the Create Tag modal.
- **worktrees** exports `useAddWorktree` for the Add Worktree modal.

## Adding a new panel

1. Create `plugins/git/<id>/` with:
   - `index.js`: `export default { id: '<id>', label: 'Display name', defaultPosition: 'center', component: YourCard }`
   - Your card component and any composables used only by this panel.
2. Add the panel icon in `plugins/gitPanels/icons.js` under `GIT_PANEL_ICONS['<id>']`.
3. In `plugins/gitPanels/registry.js`, add:
   - `import myPlugin from '../git/<id>/index.js';`
   - Include `myPlugin` in the `PLUGINS` array.

No other files need to change; the Git section and config dialog read from the registry.
