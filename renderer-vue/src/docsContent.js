/**
 * In-app documentation for section tooltips that open in a modal.
 * Each entry: { title: string, body: string } where body is Markdown.
 */
export const DOCS = {
  'branch-sync': {
    title: 'Branch & sync',
    body: `
## Overview

Branches let you work on features or fixes in isolation. The **current branch** is where new commits go. **Switch branch** changes which branch is checked out (you must have a clean working tree or stash first). **From remote** lists branches that exist on the server but not locally—checking one out creates a local tracking branch so future pull/push know where to sync.

## Pull vs fetch vs push

**Fetch** downloads new commits and refs from the remote but does not change your working tree or current branch. Use it to see what's new (e.g. ahead/behind counts) without merging. **Pull** is fetch + merge: it fetches and then merges the remote tracking branch into your current branch (creates a merge commit if needed). **Pull (rebase)** fetches and then replays your local commits on top of the updated remote branch, giving a linear history. Prefer rebase for feature branches when you want a clean history. **Push** uploads your branch to the remote and sets the upstream so future pull/push use that branch.

## Prune remotes

When someone deletes a branch on the remote, your repo keeps a stale remote-tracking ref (e.g. \`origin/old-feature\`). **Prune remotes** removes those refs so your branch list stays accurate. Safe to run anytime.

## Create branch

Creates a new branch from the current HEAD and checks it out. Use for new features or experiments without touching \`main\`.
`,
  },
  'merge-rebase': {
    title: 'Merge & rebase',
    body: `
## Merge

**Merge** combines two branches by creating a merge commit that has two parents. The current branch gets the other branch's commits "merged in." History shows a branch and then a merge. Use merge when you want to preserve the exact history (e.g. merging a feature branch into \`main\`). If you're in the middle of a merge and have conflicts, resolve them in your editor, then **Continue merge**. To cancel, use **Abort merge**.

## Rebase

**Rebase** moves your current branch's commits so they sit on top of another branch. The result is a linear history (no merge commit). Use rebase to update a feature branch with the latest \`main\`: rebase onto \`main\`, then push (you may need to force-push if you already pushed the branch). If conflicts occur, resolve them, then **Continue rebase**. **Skip** skips the current commit (use with care). **Abort rebase** cancels and restores the branch to before the rebase started.

## When to use which

Merge: integrating long-lived branches, preserving history. Rebase: keeping a feature branch up to date with main, cleaning up local commits before push. Never rebase commits that have been pushed and shared unless your team is okay with force-pushing.
`,
  },
  'stash': {
    title: 'Stash',
    body: `
## What is stash?

The **stash** is a stack of saved changes. Git can temporarily put your uncommitted changes (modified and optionally untracked files) aside so you get a clean working tree. You can then switch branches, pull, or do other operations, and later reapply the stash.

## Stash vs pop vs apply

**Stash** pushes your current changes onto the stash stack. **Pop stash** applies the most recent stash and removes it from the stack. **Apply** (on a listed stash) reapplies that stash but leaves it in the stack—useful if you want to apply the same changes to multiple branches. If applying causes conflicts, resolve them and commit; the stash entry remains until you drop it.

## Best practices

Add a message when stashing so you can tell stashes apart. Drop stashes you no longer need. Remember: stash is local only; it is not pushed to the remote.
`,
  },
  'working-tree': {
    title: 'Working tree & commit',
    body: `
## Working tree

The **working tree** is the set of files in your project directory. When you edit files, they become modified (or untracked if new). **Stage** adds a file (or its changes) to the index; **Unstage** removes it from the index. The index is what gets committed. You can stage per file or stage all and commit in one go.

## Commit & amend

**Commit** creates a new commit from the staged changes and your message. **Amend** rewrites the last commit: it combines your current staged changes with the previous commit and lets you edit the message. Use amend for small fixes (typos, forgot to stage a file) before pushing. Never amend a commit that has already been pushed unless you plan to force-push and your team is okay with it.

## Discard

**Discard** (per file or all) throws away uncommitted changes permanently. Use when you want to reset a file or the whole tree to the last commit. There is no undo.

## Merge conflicts

If you're in the middle of a merge or rebase, conflicting files are marked in the working tree. Open them in your editor, resolve the \`<<<<<<<\` / \`=======\` / \`>>>>>>>\` sections, then stage and commit (or continue merge/rebase).
`,
  },
  'tags': {
    title: 'Tags',
    body: `
## What are tags?

**Tags** are named pointers to a specific commit. They're often used for releases (e.g. \`v1.0.0\`). Unlike branches, tags don't move when you make new commits—they stay on the same commit until you delete or move them.

## Checkout tag

Checking out a tag puts the repo in **detached HEAD** state: you're not on a branch. You can look around and build, but new commits won't belong to any branch unless you create one. To get back, checkout a branch (e.g. \`main\`).

## Push tag / delete tag

**Push tag** uploads the tag to the remote so others can fetch it. **Delete tag** removes the tag locally. To remove a tag from the remote you must push a delete: \`git push origin --delete tagname\` (or push an empty ref).
`,
  },
  'commit-history': {
    title: 'Commit history',
    body: `
## Viewing history

The commit list shows recent commits on the current branch (SHA, subject, author, date). Click a commit to open its detail: full message and diff. This helps you see what changed and when.

## Copy SHA

Use the full SHA to reference the commit in commands (e.g. \`git cherry-pick <sha>\`, \`git show <sha>\`) or in discussions.

## Cherry-pick

**Cherry-pick** applies that commit's changes as a new commit on your current branch. Use it to bring a single fix or feature from another branch without merging the whole branch. If conflicts occur, resolve them and continue (or abort).

## Revert

**Revert** creates a new commit that undoes the chosen commit. It's the safe way to "undo" a commit that's already shared: no history rewrite. The reverted change is removed in the new commit.

## Amend

For the **HEAD** commit only, **Amend** lets you change the last commit (message or staged content). Don't amend commits that have been pushed unless you're force-pushing intentionally.
`,
  },
  'reflog': {
    title: 'Reflog',
    body: `
## What is the reflog?

The **reflog** records when HEAD and branch tips moved. Every time you checkout, commit, merge, rebase, or reset, Git logs the previous value. The reflog is local only (not pushed) and is your safety net for recovering "lost" commits.

## Recovering from mistakes

If you reset too far, rebased away a commit, or deleted a branch by accident, find the commit in the reflog (e.g. \`HEAD@{1}\`). Click **Checkout** to move HEAD to that commit. You're in detached HEAD; create a new branch from there if you want to keep working on it. Reflog entries expire after ~90 days by default.

## Load reflog

Click **Load reflog** to fetch the current reflog from Git. The list shows SHA and the action that caused the entry.
`,
  },
  'delete-branch': {
    title: 'Delete branch',
    body: `
## Delete local

Removes the branch only on your machine. Git will not let you delete the branch you're currently on. If the branch has unmerged changes (commits that aren't in the branch you're merging into), Git may refuse unless you force. Use with care: any commits only on that branch become unreachable except via the reflog.

## Delete on remote

Removes the branch from the remote (e.g. \`origin\`). Others will still have the branch locally until they run fetch + prune (or pull). Often used after merging a feature branch to clean up the remote.
`,
  },
  'remotes': {
    title: 'Remotes',
    body: `
## What are remotes?

**Remotes** are named URLs for fetch/push. Typically \`origin\` points to the main server repo. You can add more (e.g. a fork, or another team repo). Fetch and push use the remote name to know where to talk.

## Fetch remote

Fetching a specific remote updates your copy of its branches and tags without merging. Use it to see what's on that remote or to update a single remote's refs.

## Add / remove

**Add remote** registers a new name and URL. **Remove** (on a listed remote) deletes that remote config. Removing a remote does not delete any branches or commits; it only stops using that name for fetch/push.
`,
  },
  'compare-reset': {
    title: 'Compare & reset',
    body: `
## Compare

Enter two refs (branch name, tag, or SHA) to see which files changed between them. The result lists added, modified, and deleted files. **Show full diff** opens the full patch in a modal so you can read the actual changes.

## Reset

**Reset** moves the current branch tip to a given ref. The three modes differ in what happens to your working tree and index:

- **Soft**: Only moves the branch pointer. Staged and unstaged changes stay; you can recommit or amend.
- **Mixed** (default): Moves the branch pointer and unstages everything. Working tree files keep their content but are unstaged.
- **Hard**: Moves the branch pointer and discards all uncommitted changes. Working tree and index match the target commit. Irreversible for uncommitted work.

Common use: \`git reset --hard HEAD\` to throw away all local changes. \`git reset --soft HEAD~1\` to undo the last commit but keep changes staged.
`,
  },
  'gitignore': {
    title: '.gitignore',
    body: `
## Purpose

The **.gitignore** file lists patterns for files and directories that Git should ignore. Ignored files don't show up as untracked and won't be committed. Use it for build output, dependencies, local config, and secrets.

## Presets & quick add

Use **Presets** to append or replace with a template (Node, Python, Go, Rust, PHP, macOS, Windows, IDE, or General). **Quick add** inserts a single common pattern (e.g. \`.env\`, \`node_modules/\`, \`dist/\`) without duplicating if it already exists.

## Pattern rules

One pattern per line. \`*\` matches any string; \`?\` one character. A trailing \`/\` matches directories. A leading \`/\` anchors to the repo root. \`**/\` matches zero or more directories. Example: \`node_modules/\`, \`*.log\`, \`.env\`. Lines starting with \`#\` are comments.

## Already tracked files

Adding a pattern does not untrack files that are already tracked. To stop tracking a file but keep it on disk, run \`git rm --cached <file>\`.
`,
  },
  'gitattributes': {
    title: '.gitattributes',
    body: `
## Purpose

**.gitattributes** controls how Git treats files: line endings (CRLF vs LF), merge strategies, and export behavior (e.g. for \`git archive\`). It's key for cross-platform teams and consistent line endings.

## Common settings

\`* text=auto\` lets Git normalize line endings. \`*.png binary\` marks binary files. \`*.php merge=ours\` uses a custom merge driver. See the [Git documentation](https://git-scm.com/docs/gitattributes) for full syntax.
`,
  },
  'submodules': {
    title: 'Submodules',
    body: `
## What are submodules?

**Submodules** are nested Git repositories. The parent repo stores a reference to a specific commit in the submodule repo. When you clone the parent, you get the submodule path but it's empty until you run **Update submodules** (or \`git submodule update --init --recursive\`), which fetches and checks out the referenced commits.

## Workflow

After pulling the parent, run submodule update to align submodules with the parent's expected commits. If you change code inside a submodule, commit and push there, then update the parent's reference to the new commit and commit in the parent. Submodules are advanced; read the [Git Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules) chapter for full workflows.
`,
  },
  'worktrees': {
    title: 'Worktrees',
    body: `
## What are worktrees?

**Git worktrees** let you have multiple working directories for the same repo, each on a different branch. You can work on two branches side by side without stashing or cloning again. The main repo has a "main" worktree; additional worktrees live in separate directories (e.g. \`../feature\`).

## Add worktree

Specify a path (must be empty or not exist) and optionally a branch. Git creates the directory and checks out that branch there. You can open that folder in another editor or terminal.

## Remove

Remove a worktree when you're done. You cannot remove the main worktree or one that has uncommitted changes. Delete the worktree directory after removing if it's empty.
`,
  },
  'bisect': {
    title: 'Bisect',
    body: `
## What is bisect?

**Git bisect** finds the commit that introduced a bug by binary search. You mark one commit as "bad" (has the bug) and an older one as "good" (no bug). Git checks out a commit in the middle; you test and mark it good or bad. Git repeats until it identifies the first bad commit.

## Workflow

Start bisect with **Start bisect** (optionally set bad/good refs; default bad is HEAD). Git checks out a commit. Run your test (e.g. run the app, run tests). Click **Good**, **Bad**, or **Skip** (if this commit cannot be tested). Use **Reset bisect** to cancel and return to your previous branch.

## Run tests & automated bisect

For npm/PHP projects, use **Run tests** to run the project test script at the current commit, then mark Good or Bad. Use **Automated bisect** to run \`git bisect run\` with a script: pick a test script and click **Run bisect**; the app runs the script at each step (exit 0 = good, non-zero = bad) until the first bad commit is found.

## Tips

Use **Skip** when a commit does not build or cannot be tested. Bisect can also find the first commit that fixed a bug (swap good/bad meaning).
`,
  },
  'version-release': {
    title: 'Version & release',
    body: `
## Overview

This section ties your project's **version** (from package.json, Cargo.toml, etc.) to Git tags and optional GitHub releases. For **npm**, you can bump version (patch/minor/major) and then create a tag and push. For other types, **Tag and push** uses the version already in the manifest—edit the file first if you changed the version.

## Release flow

Bumping (npm) updates the manifest file and leaves the repo with uncommitted changes; you typically commit ("Release v1.2.3") and then tag and push. Creating the tag and pushing triggers CI (e.g. GitHub Actions) to build and attach installers. With a GitHub token you can add release notes, create drafts, or mark as pre-release.

## Conventional commits

If the app detects conventional commit messages (\`feat:\`, \`fix:\`, breaking changes), it may suggest a bump type. You still choose the final bump. Release notes can be loaded from commits or generated with Ollama (if configured in Settings).
`,
  },
  'sync': {
    title: 'Sync & download',
    body: `
## Sync

**Sync** runs \`git fetch\` in the project so your local refs and tags match the remote. It does not merge or change your current branch. Use it to see up-to-date ahead/behind counts and to get new tags (e.g. for the version list).

## Download latest / Choose version

These options fetch **GitHub Release** assets. After syncing, the app can list releases and their assets (e.g. DMG, zip). **Download latest** gets the latest release's asset for your platform; **Choose version…** lets you pick a release and then an asset. Requires the project to have a GitHub remote and the release to have uploaded assets (often from GitHub Actions).
`,
  },
  'settings-github-token': {
    title: 'GitHub token',
    body: `
## What it's for

A **GitHub personal access token** (PAT) gives the app permission to call GitHub's API on your behalf. With a token you get higher rate limits and can create or update releases, list pull requests, and merge PRs from the app.

## Getting a token

Create a token at **GitHub → Settings → Developer settings → Personal access tokens**. Use "Generate new token (classic)" and give it the scopes you need (e.g. \`repo\` for private repos and releases, \`read:org\` for org repos). The token is stored locally and never sent anywhere except to GitHub's API.

## Optional

If you leave the token empty, the app still works for local Git and most features; only API-heavy actions (releases, PRs, higher limits) require it.
`,
  },
  'settings-ai': {
    title: 'AI for generation',
    body: `
## Overview

Choose one provider to power **commit messages**, **release notes**, and **test-fix suggestions**. The app uses the selected provider when you click Generate in the working tree, when creating release notes, or when asking for a test fix after a failed run.

## Providers

- **Ollama** — Runs locally. No API key; install Ollama and pull a model. Best for privacy and offline use.
- **Claude** — Anthropic's API. Requires an API key from Anthropic. Paid usage.
- **OpenAI** — OpenAI's API (e.g. GPT-4). Requires an API key from OpenAI. Paid usage.

Configure the provider you select in the sections below. Keys and URLs are stored locally.
`,
  },
  'settings-ollama': {
    title: 'Ollama (local)',
    body: `
## What is Ollama?

**Ollama** runs large language models on your machine. No API key or account is required. Install Ollama, start it (\`ollama serve\`), and pull a model (e.g. \`ollama pull llama3.2\`).

## Base URL

By default the app talks to \`http://127.0.0.1:11434\`. If you run Ollama on another host or port, set the base URL here.

## Model

Pick a model that supports text generation (e.g. \`llama3.2\`, \`llama3.2:3b\`). Use **List models** to see what's available on your Ollama instance.

## Links

[ollama.com](https://ollama.com) — Download and docs.
`,
  },
  'settings-claude': {
    title: 'Claude (Anthropic API)',
    body: `
## API key

To use Claude you need an **API key** from Anthropic. Sign in at the Anthropic console, go to API keys, and create a key. Paste it here; it's stored locally and only sent to Anthropic's API.

## Model

Use a model that supports the Messages API (e.g. \`claude-sonnet-4-20250514\`, \`claude-3-5-sonnet-20241022\`). Check Anthropic's docs for the latest model IDs.

## Billing

Anthropic charges per token. Usage appears in your Anthropic account. The app does not store or display usage.

## Get an API key

Open **console.anthropic.com** → API keys to create and manage keys.
`,
  },
  'wordpress': {
    title: 'WordPress',
    body: `
## Overview

When the app detects a WordPress project (\`wp-config.php\` or \`wp-includes/version.php\` at the project root), a **WordPress** tab appears in the project detail. Use the sidebar to switch between sections: Overview, Plugins, Themes, WP-CLI, Config, Database, and Links.

## Plugins & themes

Plugins live in \`wp-content/plugins\`, themes in \`wp-content/themes\`. You can manage them via the file tree, Git, or WP-CLI (\`wp plugin list\`, \`wp theme list\`) in the terminal.

## WP-CLI

[WP-CLI](https://wp-cli.org/) lets you run WordPress commands from the terminal (e.g. \`wp db export\`, \`wp cache flush\`). Use the inline terminal from the Git tab with your project path to run \`wp\` commands.
`,
  },
  'settings-openai': {
    title: 'OpenAI (OpenAI API)',
    body: `
## API key

To use OpenAI you need an **API key** from OpenAI. Sign in at the OpenAI platform, go to API keys, and create a key. Paste it here; it's stored locally and only sent to OpenAI's API.

## Model

Use a chat model (e.g. \`gpt-4o-mini\`, \`gpt-4o\`). Check OpenAI's docs for the latest model names and pricing.

## Billing

OpenAI charges per token. Usage appears in your OpenAI account. The app does not store or display usage.

## Get an API key

Open **platform.openai.com** → API keys to create and manage keys.
`,
  },
  'settings-gemini': {
    title: 'Google Gemini',
    body: `
## API key

Use a **Gemini API key** from Google AI Studio. Sign in at AI Studio, go to Get API key, and create a key. Paste it here; it's stored locally and only sent to Google's API.

## Model

Pick a model from the list (e.g. Gemini 1.5 Flash, 1.5 Pro) or choose Custom to enter a model ID. See Google's docs for the latest model names.

## Get an API key

Open **aistudio.google.com** → Get API key to create and manage keys.
`,
  },
};
