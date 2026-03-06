# Vue component test coverage

This doc lists which `.vue` files have a corresponding spec and which do not. Specs may live beside the component (e.g. `DetailHeader.spec.js` next to `DetailHeader.vue`) or in an `index.spec.js` for extension registration.

## Vue files WITH a component or same-area spec

| Vue file | Spec file |
|----------|-----------|
| `views/NoSelection.vue` | `views/NoSelection.spec.js` |
| `views/ExtensionsView.vue` | `views/ExtensionsView.spec.js` |
| `views/DashboardView.vue` | `views/DashboardView.spec.js` |
| `components/detail/DetailHeader.vue` | `components/detail/DetailHeader.spec.js` |
| `components/LoadingOverlay.vue` | `components/LoadingOverlay.spec.js` |
| `components/NavBar.vue` | `components/NavBar.spec.js` |
| `components/Sidebar.vue` | `components/Sidebar.spec.js` |
| `components/modals/DiffFullModal.vue` | `components/modals/DiffFullModal.spec.js` |
| `extensions/bookmarks/DetailBookmarksCard.vue` | `extensions/bookmarks/DetailBookmarksCard.spec.js` |
| `extensions/kanban/DetailKanbanCard.vue` | `extensions/kanban/DetailKanbanCard.spec.js` |
| `extensions/checklist/DetailReleaseChecklistCard.vue` | `extensions/checklist/DetailReleaseChecklistCard.spec.js` |
| `extensions/markdown/DetailMarkdownCard.vue` | `extensions/markdown/DetailMarkdownCard.spec.js` |
| `extensions/markdown/MarkdownFileTreeNode.vue` | `extensions/markdown/MarkdownFileTreeNode.spec.js` |

Extension **registration** (not the card component) is tested by `index.spec.js` in: `github-issues`, `env`, `changelog-draft`, `runbooks`, `bookmarks`, `kanban`, `checklist`, `markdown` (plus `fileTree.spec.js`, `markdownTags.spec.js`, etc.).

## Vue files WITHOUT a component spec

### Views
- `App.vue`
- `views/ChangelogView.vue`
- `views/DocsView.vue`
- `views/ApiView.vue`
- `views/DetailView.vue`
- `views/SettingsView.vue`
- `views/TerminalPopoutView.vue`

### Detail / core components
- `components/detail/DetailCoverageCard.vue`
- `components/detail/DetailVersionCard.vue`
- `components/detail/DetailApiCard.vue`
- `components/detail/DetailPullRequestsCard.vue`
- `components/detail/DetailTestsCard.vue`
- `components/detail/DetailComposerCard.vue`
- `components/detail/DetailGitSection.vue`
- `components/detail/DetailDashboardCard.vue`
- `components/detail/DetailSyncCard.vue`
- `components/detail/InlineTerminal.vue`
- `components/detail/TerminalPanel.vue`
- `components/detail/ExtensionLayout.vue`
- `components/detail/DetailDashboardOverview.vue`
- `components/detail/CoverageHistoryList.vue`
- `components/detail/CoverageChart.vue`

### Modals
- `components/modals/PickAssetModal.vue`
- `components/modals/ChooseVersionModal.vue`
- `components/modals/DiffSideBySideModal.vue`
- `components/modals/CreateTagModal.vue`
- `components/modals/BisectRefPickerModal.vue`
- `components/modals/FeatureFlagsModal.vue`
- `components/modals/AddWorktreeModal.vue`
- `components/modals/DocsModal.vue`
- `components/modals/GitattributesWizardModal.vue`
- `components/modals/CommitDetailModal.vue`
- `components/modals/FileViewerModal.vue`
- `components/modals/SwitchWithChangesModal.vue`

### Other components
- `components/ModalHost.vue`
- `components/AppToasts.vue`
- `components/LoadingBar.vue`
- `components/LicenseUpgradeBanner.vue`

### Extensions (detail cards)
- `extensions/project-tracker/DetailProjectTrackerCard.vue`
- `extensions/github-issues/DetailGitHubIssuesCard.vue`
- `extensions/env/DetailEnvCard.vue`
- `extensions/changelog-draft/DetailChangelogDraftCard.vue`
- `extensions/terminal/DetailTerminalCard.vue`
- `extensions/runbooks/DetailRunbooksCard.vue`
- `extensions/email/DetailEmailCard.vue`
- `extensions/tunnels/DetailTunnelsCard.vue`
- `extensions/ftp/DetailFtpCard.vue`
- `extensions/ssh/DetailSshCard.vue`
- `extensions/processes/DetailProcessesCard.vue`
- `extensions/dependencies/DetailDependenciesCard.vue`
- `extensions/notes/DetailNotesCard.vue`
- `extensions/email/EmailSettingsSection.vue`

### Git plugin cards
- `plugins/git/GitPanelCard.vue`
- `plugins/git/gitattributes/GitattributesCard.vue`
- `plugins/git/gitignore/GitignoreCard.vue`
- `plugins/git/submodules/SubmodulesCard.vue`
- `plugins/git/worktrees/WorktreesCard.vue`
- `plugins/git/compare-reset/CompareResetCard.vue`
- `plugins/git/merge-rebase/MergeRebaseCard.vue`
- `plugins/git/bisect/BisectCard.vue`
- `plugins/git/bisect/BisectIntro.vue`
- `plugins/git/stash/StashCard.vue`
- `plugins/git/delete-branch/DeleteBranchCard.vue`
- `plugins/git/reflog/ReflogCard.vue`
- `plugins/git/remotes/RemotesCard.vue`
- `plugins/git/tags/TagsCard.vue`
- `plugins/git/branch-sync/BranchSyncCard.vue`

## Adding tests

- Use `@vue/test-utils` and Vitest; see existing specs (e.g. `NoSelection.spec.js`, `DetailBookmarksCard.spec.js`) for patterns.
- Stub `window.releaseManager` and Pinia where needed.
- For cards that use `ExtensionLayout`, use a stub (see `DetailKanbanCard.spec.js` / `DetailBookmarksCard.spec.js`).
