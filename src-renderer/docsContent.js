/**
 * In-app documentation for section tooltips that open in a modal.
 * Each entry: { title: string, body: string } where body is HTML (h4, p, ul, code, strong).
 */
const DOCS = {
  'branch-sync': {
    title: 'Branch & sync',
    body: `
<h4>Overview</h4>
<p>Branches let you work on features or fixes in isolation. The <strong>current branch</strong> is where new commits go. <strong>Switch branch</strong> changes which branch is checked out (you must have a clean working tree or stash first). <strong>From remote</strong> lists branches that exist on the server but not locally—checking one out creates a local tracking branch so future pull/push know where to sync.</p>
<h4>Pull vs fetch vs push</h4>
<p><strong>Fetch</strong> downloads new commits and refs from the remote but does not change your working tree or current branch. Use it to see what’s new (e.g. ahead/behind counts) without merging. <strong>Pull</strong> is fetch + merge: it fetches and then merges the remote tracking branch into your current branch (creates a merge commit if needed). <strong>Pull (rebase)</strong> fetches and then replays your local commits on top of the updated remote branch, giving a linear history. Prefer rebase for feature branches when you want a clean history. <strong>Push</strong> uploads your branch to the remote and sets the upstream so future pull/push use that branch.</p>
<h4>Prune remotes</h4>
<p>When someone deletes a branch on the remote, your repo keeps a stale remote-tracking ref (e.g. <code>origin/old-feature</code>). <strong>Prune remotes</strong> removes those refs so your branch list stays accurate. Safe to run anytime.</p>
<h4>Create branch</h4>
<p>Creates a new branch from the current HEAD and checks it out. Use for new features or experiments without touching <code>main</code>.</p>
`,
  },
  'merge-rebase': {
    title: 'Merge & rebase',
    body: `
<h4>Merge</h4>
<p><strong>Merge</strong> combines two branches by creating a merge commit that has two parents. The current branch gets the other branch’s commits “merged in.” History shows a branch and then a merge. Use merge when you want to preserve the exact history (e.g. merging a feature branch into <code>main</code>). If you’re in the middle of a merge and have conflicts, resolve them in your editor, then <strong>Continue merge</strong>. To cancel, use <strong>Abort merge</strong>.</p>
<h4>Rebase</h4>
<p><strong>Rebase</strong> moves your current branch’s commits so they sit on top of another branch. The result is a linear history (no merge commit). Use rebase to update a feature branch with the latest <code>main</code>: rebase onto <code>main</code>, then push (you may need to force-push if you already pushed the branch). If conflicts occur, resolve them, then <strong>Continue rebase</strong>. <strong>Skip</strong> skips the current commit (use with care). <strong>Abort rebase</strong> cancels and restores the branch to before the rebase started.</p>
<h4>When to use which</h4>
<p>Merge: integrating long-lived branches, preserving history. Rebase: keeping a feature branch up to date with main, cleaning up local commits before push. Never rebase commits that have been pushed and shared unless your team is okay with force-pushing.</p>
`,
  },
  'stash': {
    title: 'Stash',
    body: `
<h4>What is stash?</h4>
<p>The <strong>stash</strong> is a stack of saved changes. Git can temporarily put your uncommitted changes (modified and optionally untracked files) aside so you get a clean working tree. You can then switch branches, pull, or do other operations, and later reapply the stash.</p>
<h4>Stash vs pop vs apply</h4>
<p><strong>Stash</strong> pushes your current changes onto the stash stack. <strong>Pop stash</strong> applies the most recent stash and removes it from the stack. <strong>Apply</strong> (on a listed stash) reapplies that stash but leaves it in the stack—useful if you want to apply the same changes to multiple branches. If applying causes conflicts, resolve them and commit; the stash entry remains until you drop it.</p>
<h4>Best practices</h4>
<p>Add a message when stashing so you can tell stashes apart. Drop stashes you no longer need. Remember: stash is local only; it is not pushed to the remote.</p>
`,
  },
  'working-tree': {
    title: 'Working tree & commit',
    body: `
<h4>Working tree</h4>
<p>The <strong>working tree</strong> is the set of files in your project directory. When you edit files, they become modified (or untracked if new). <strong>Stage</strong> adds a file (or its changes) to the index; <strong>Unstage</strong> removes it from the index. The index is what gets committed. You can stage per file or stage all and commit in one go.</p>
<h4>Commit & amend</h4>
<p><strong>Commit</strong> creates a new commit from the staged changes and your message. <strong>Amend</strong> rewrites the last commit: it combines your current staged changes with the previous commit and lets you edit the message. Use amend for small fixes (typos, forgot to stage a file) before pushing. Never amend a commit that has already been pushed unless you plan to force-push and your team is okay with it.</p>
<h4>Discard</h4>
<p><strong>Discard</strong> (per file or all) throws away uncommitted changes permanently. Use when you want to reset a file or the whole tree to the last commit. There is no undo.</p>
<h4>Merge conflicts</h4>
<p>If you’re in the middle of a merge or rebase, conflicting files are marked in the working tree. Open them in your editor, resolve the <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code> / <code>=======</code> / <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code> sections, then stage and commit (or continue merge/rebase).</p>
`,
  },
  'tags': {
    title: 'Tags',
    body: `
<h4>What are tags?</h4>
<p><strong>Tags</strong> are named pointers to a specific commit. They’re often used for releases (e.g. <code>v1.0.0</code>). Unlike branches, tags don’t move when you make new commits—they stay on the same commit until you delete or move them.</p>
<h4>Checkout tag</h4>
<p>Checking out a tag puts the repo in <strong>detached HEAD</strong> state: you’re not on a branch. You can look around and build, but new commits won’t belong to any branch unless you create one. To get back, checkout a branch (e.g. <code>main</code>).</p>
<h4>Push tag / delete tag</h4>
<p><strong>Push tag</strong> uploads the tag to the remote so others can fetch it. <strong>Delete tag</strong> removes the tag locally. To remove a tag from the remote you must push a delete: <code>git push origin --delete tagname</code> (or push an empty ref).</p>
`,
  },
  'commit-history': {
    title: 'Commit history',
    body: `
<h4>Viewing history</h4>
<p>The commit list shows recent commits on the current branch (SHA, subject, author, date). Click a commit to open its detail: full message and diff. This helps you see what changed and when.</p>
<h4>Copy SHA</h4>
<p>Use the full SHA to reference the commit in commands (e.g. <code>git cherry-pick &lt;sha&gt;</code>, <code>git show &lt;sha&gt;</code>) or in discussions.</p>
<h4>Cherry-pick</h4>
<p><strong>Cherry-pick</strong> applies that commit’s changes as a new commit on your current branch. Use it to bring a single fix or feature from another branch without merging the whole branch. If conflicts occur, resolve them and continue (or abort).</p>
<h4>Revert</h4>
<p><strong>Revert</strong> creates a new commit that undoes the chosen commit. It’s the safe way to “undo” a commit that’s already shared: no history rewrite. The reverted change is removed in the new commit.</p>
<h4>Amend</h4>
<p>For the <strong>HEAD</strong> commit only, <strong>Amend</strong> lets you change the last commit (message or staged content). Don’t amend commits that have been pushed unless you’re force-pushing intentionally.</p>
`,
  },
  'reflog': {
    title: 'Reflog',
    body: `
<h4>What is the reflog?</h4>
<p>The <strong>reflog</strong> records when HEAD and branch tips moved. Every time you checkout, commit, merge, rebase, or reset, Git logs the previous value. The reflog is local only (not pushed) and is your safety net for recovering “lost” commits.</p>
<h4>Recovering from mistakes</h4>
<p>If you reset too far, rebased away a commit, or deleted a branch by accident, find the commit in the reflog (e.g. <code>HEAD@{1}</code>). Click <strong>Checkout</strong> to move HEAD to that commit. You’re in detached HEAD; create a new branch from there if you want to keep working on it. Reflog entries expire after ~90 days by default.</p>
<h4>Load reflog</h4>
<p>Click <strong>Load reflog</strong> to fetch the current reflog from Git. The list shows SHA and the action that caused the entry.</p>
`,
  },
  'delete-branch': {
    title: 'Delete branch',
    body: `
<h4>Delete local</h4>
<p>Removes the branch only on your machine. Git will not let you delete the branch you’re currently on. If the branch has unmerged changes (commits that aren’t in the branch you’re merging into), Git may refuse unless you force. Use with care: any commits only on that branch become unreachable except via the reflog.</p>
<h4>Delete on remote</h4>
<p>Removes the branch from the remote (e.g. <code>origin</code>). Others will still have the branch locally until they run fetch + prune (or pull). Often used after merging a feature branch to clean up the remote.</p>
`,
  },
  'remotes': {
    title: 'Remotes',
    body: `
<h4>What are remotes?</h4>
<p><strong>Remotes</strong> are named URLs for fetch/push. Typically <code>origin</code> points to the main server repo. You can add more (e.g. a fork, or another team repo). Fetch and push use the remote name to know where to talk.</p>
<h4>Fetch remote</h4>
<p>Fetching a specific remote updates your copy of its branches and tags without merging. Use it to see what’s on that remote or to update a single remote’s refs.</p>
<h4>Add / remove</h4>
<p><strong>Add remote</strong> registers a new name and URL. <strong>Remove</strong> (on a listed remote) deletes that remote config. Removing a remote does not delete any branches or commits; it only stops using that name for fetch/push.</p>
`,
  },
  'compare-reset': {
    title: 'Compare & reset',
    body: `
<h4>Compare</h4>
<p>Enter two refs (branch name, tag, or SHA) to see which files changed between them. The result lists added, modified, and deleted files. <strong>Show full diff</strong> opens the full patch in a modal so you can read the actual changes.</p>
<h4>Reset</h4>
<p><strong>Reset</strong> moves the current branch tip to a given ref. The three modes differ in what happens to your working tree and index:</p>
<ul>
  <li><strong>Soft</strong>: Only moves the branch pointer. Staged and unstaged changes stay; you can recommit or amend.</li>
  <li><strong>Mixed</strong> (default): Moves the branch pointer and unstages everything. Working tree files keep their content but are unstaged.</li>
  <li><strong>Hard</strong>: Moves the branch pointer and discards all uncommitted changes. Working tree and index match the target commit. Irreversible for uncommitted work.</li>
</ul>
<p>Common use: <code>git reset --hard HEAD</code> to throw away all local changes. <code>git reset --soft HEAD~1</code> to undo the last commit but keep changes staged.</p>
`,
  },
  'gitignore': {
    title: '.gitignore',
    body: `
<h4>Purpose</h4>
<p>The <strong>.gitignore</strong> file lists patterns for files and directories that Git should ignore. Ignored files don’t show up as untracked and won’t be committed. Use it for build output, dependencies, local config, and secrets.</p>
<h4>Pattern rules</h4>
<p>One pattern per line. <code>*</code> matches any string; <code>?</code> one character. A trailing <code>/</code> matches directories. A leading <code>/</code> anchors to the repo root. <code>**/</code> matches zero or more directories. Example: <code>node_modules/</code>, <code>*.log</code>, <code>.env</code>. Lines starting with <code>#</code> are comments.</p>
<h4>Already tracked files</h4>
<p>Adding a pattern does not untrack files that are already tracked. To stop tracking a file but keep it on disk, run <code>git rm --cached &lt;file&gt;</code>.</p>
`,
  },
  'gitattributes': {
    title: '.gitattributes',
    body: `
<h4>Purpose</h4>
<p><strong>.gitattributes</strong> controls how Git treats files: line endings (CRLF vs LF), merge strategies, and export behavior (e.g. for <code>git archive</code>). It’s key for cross-platform teams and consistent line endings.</p>
<h4>Common settings</h4>
<p><code>* text=auto</code> lets Git normalize line endings. <code>*.png binary</code> marks binary files. <code>*.php merge=ours</code> uses a custom merge driver. See the <a href="https://git-scm.com/docs/gitattributes" target="_blank" rel="noopener">Git documentation</a> for full syntax.</p>
`,
  },
  'submodules': {
    title: 'Submodules',
    body: `
<h4>What are submodules?</h4>
<p><strong>Submodules</strong> are nested Git repositories. The parent repo stores a reference to a specific commit in the submodule repo. When you clone the parent, you get the submodule path but it’s empty until you run <strong>Update submodules</strong> (or <code>git submodule update --init --recursive</code>), which fetches and checks out the referenced commits.</p>
<h4>Workflow</h4>
<p>After pulling the parent, run submodule update to align submodules with the parent’s expected commits. If you change code inside a submodule, commit and push there, then update the parent’s reference to the new commit and commit in the parent. Submodules are advanced; read the <a href="https://git-scm.com/book/en/v2/Git-Tools-Submodules" target="_blank" rel="noopener">Git Submodules</a> chapter for full workflows.</p>
`,
  },
  'worktrees': {
    title: 'Worktrees',
    body: `
<h4>What are worktrees?</h4>
<p><strong>Git worktrees</strong> let you have multiple working directories for the same repo, each on a different branch. You can work on two branches side by side without stashing or cloning again. The main repo has a “main” worktree; additional worktrees live in separate directories (e.g. <code>../feature</code>).</p>
<h4>Add worktree</h4>
<p>Specify a path (must be empty or not exist) and optionally a branch. Git creates the directory and checks out that branch there. You can open that folder in another editor or terminal.</p>
<h4>Remove</h4>
<p>Remove a worktree when you’re done. You cannot remove the main worktree or one that has uncommitted changes. Delete the worktree directory after removing if it’s empty.</p>
`,
  },
  'bisect': {
    title: 'Bisect',
    body: `
<h4>What is bisect?</h4>
<p><strong>Git bisect</strong> finds the commit that introduced a bug by binary search. You mark one commit as “bad” (has the bug) and an older one as “good” (no bug). Git checks out a commit in the middle; you test and mark it good or bad. Git repeats until it identifies the first bad commit.</p>
<h4>Workflow</h4>
<p>Start bisect with <strong>Start bisect</strong> (optionally set bad/good refs; default bad is HEAD). Git checks out a commit. Run your test (e.g. run the app, run tests). Click <strong>Mark good</strong> or <strong>Mark bad</strong>. Repeat until bisect reports the first bad commit. Use <strong>Reset bisect</strong> to cancel and return to your previous branch.</p>
<h4>Tips</h4>
<p>Automate with <code>git bisect run &lt;script&gt;</code> so the script exits 0 for good, non‑zero for bad. Bisect can also find the first commit that fixed a bug (swap good/bad meaning).</p>
`,
  },
  'version-release': {
    title: 'Version & release',
    body: `
<h4>Overview</h4>
<p>This section ties your project’s <strong>version</strong> (from package.json, Cargo.toml, etc.) to Git tags and optional GitHub releases. For <strong>npm</strong>, you can bump version (patch/minor/major) and then create a tag and push. For other types, <strong>Tag and push</strong> uses the version already in the manifest—edit the file first if you changed the version.</p>
<h4>Release flow</h4>
<p>Bumping (npm) updates the manifest file and leaves the repo with uncommitted changes; you typically commit (“Release v1.2.3”) and then tag and push. Creating the tag and pushing triggers CI (e.g. GitHub Actions) to build and attach installers. With a GitHub token you can add release notes, create drafts, or mark as pre-release.</p>
<h4>Conventional commits</h4>
<p>If the app detects conventional commit messages (<code>feat:</code>, <code>fix:</code>, breaking changes), it may suggest a bump type. You still choose the final bump. Release notes can be loaded from commits or generated with Ollama (if configured in Settings).</p>
`,
  },
  'sync': {
    title: 'Sync & download',
    body: `
<h4>Sync</h4>
<p><strong>Sync</strong> runs <code>git fetch</code> in the project so your local refs and tags match the remote. It does not merge or change your current branch. Use it to see up-to-date ahead/behind counts and to get new tags (e.g. for the version list).</p>
<h4>Download latest / Choose version</h4>
<p>These options fetch <strong>GitHub Release</strong> assets. After syncing, the app can list releases and their assets (e.g. DMG, zip). <strong>Download latest</strong> gets the latest release’s asset for your platform; <strong>Choose version…</strong> lets you pick a release and then an asset. Requires the project to have a GitHub remote and the release to have uploaded assets (often from GitHub Actions).</p>
`,
  },
};
