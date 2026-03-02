/**
 * Documentation for every API method. Each entry: { name, category, description, params: [{ name, type, description }], returns, sampleResponse? }.
 * params and returns are optional. sampleResponse is optional JSON string showing example API response (with ok/result envelope).
 * category is used to browse by topic when you don't know the method name.
 */
const CATEGORIES = ['Projects', 'Composer', 'Tests & coverage', 'Version & release', 'GitHub & tokens', 'AI', 'Git', 'System & UI', 'GitHub releases & downloads', 'App & preferences', 'API (meta)'];

const API_DOCS = [
  // Projects
  { name: 'getProjects', category: 'Projects', description: 'Return the list of project directories (paths) currently tracked by the app.', params: [], returns: 'Array of project objects with path, name, tags, starred, etc.', sampleResponse: `{
  "ok": true,
  "result": [
    { "path": "/Users/me/projects/my-app", "name": "my-app", "tags": [], "starred": false }
  ]
}` },
  { name: 'getAllProjectsInfo', category: 'Projects', description: 'Return full info for every tracked project (path, name, type, version, git status, etc.).', params: [], returns: 'Array of project info objects.', sampleResponse: `{
  "ok": true,
  "result": [
    {
      "path": "/Users/me/projects/my-app",
      "name": "my-app",
      "type": "npm",
      "version": "1.2.0",
      "git": { "branch": "main", "clean": true, "ahead": 0, "behind": 0 },
      "remotes": [{ "name": "origin", "url": "https://github.com/owner/repo.git" }]
    }
  ]
}` },
  { name: 'setProjects', category: 'Projects', description: 'Replace the tracked project list. Pass the full array of project objects (path, name, tags, starred, etc.).', params: [{ name: 'projects', type: 'Array', description: 'Array of { path, name?, tags?, starred? }' }], returns: 'null' },
  { name: 'showDirectoryDialog', category: 'Projects', description: 'Open the system folder picker. Used to add a project; the chosen path is returned to the caller (UI typically adds it via setProjects).', params: [], returns: 'Promise resolving to { canceled, filePaths } from the dialog.' },
  { name: 'getProjectInfo', category: 'Projects', description: 'Get detailed info for one project: type, version, git branch, status, remotes, test scripts, etc.', params: [{ name: 'dirPath', type: 'string', description: 'Absolute path to the project directory' }], returns: 'Object with path, name, type, version, git, composer/npm info, etc.', sampleResponse: `{
  "ok": true,
  "result": {
    "path": "/Users/me/projects/my-app",
    "name": "my-app",
    "type": "npm",
    "version": "1.2.0",
    "git": { "branch": "main", "clean": false, "ahead": 1, "behind": 0 },
    "remotes": [{ "name": "origin", "url": "https://github.com/owner/repo.git" }]
  }
}` },

  // Composer (PHP)
  { name: 'getComposerInfo', category: 'Composer', description: 'Get Composer manifest (composer.json) info for a PHP project.', params: [{ name: 'dirPath', type: 'string', description: 'Project directory path' }], returns: '{ ok, name?, version?, require?, ... } or { ok: false, error }' },
  { name: 'getComposerOutdated', category: 'Composer', description: 'List outdated Composer dependencies (composer outdated --format=json).', params: [{ name: 'dirPath', type: 'string', description: 'Project directory' }, { name: 'direct', type: 'boolean', description: 'If true, only direct dependencies' }], returns: '{ ok, packages: [] } or { ok: false, error, packages: [] }' },
  { name: 'getComposerValidate', category: 'Composer', description: 'Validate composer.json (composer validate).', params: [{ name: 'dirPath', type: 'string', description: 'Project directory' }], returns: '{ valid: true } or validation error object' },
  { name: 'getComposerAudit', category: 'Composer', description: 'Run Composer security audit (composer audit --format=json).', params: [{ name: 'dirPath', type: 'string', description: 'Project directory' }], returns: '{ ok, advisories: [] } or { ok: false, error, advisories: [] }' },
  { name: 'composerUpdate', category: 'Composer', description: 'Run composer update. Optionally pass package names to update only those.', params: [{ name: 'dirPath', type: 'string', description: 'Project directory' }, { name: 'packageNames', type: 'Array<string>', description: 'Optional list of package names to update' }], returns: '{ ok: true } or { ok: false, error }' },

  // Tests & coverage
  { name: 'getProjectTestScripts', category: 'Tests & coverage', description: 'Get available test script names for the project (e.g. test, test:coverage from package.json or composer.json).', params: [{ name: 'dirPath', type: 'string', description: 'Project directory' }, { name: 'projectType', type: 'string', description: 'One of: npm, php' }], returns: '{ ok, scripts: string[] } or { ok: false, scripts: [], error }' },
  { name: 'runProjectTests', category: 'Tests & coverage', description: 'Run a test script (npm run &lt;script&gt; or composer run &lt;script&gt;).', params: [{ name: 'dirPath', type: 'string', description: 'Project directory' }, { name: 'projectType', type: 'string', description: 'npm or php' }, { name: 'scriptName', type: 'string', description: 'Script name (e.g. test); defaults to "test" if empty' }], returns: '{ ok, exitCode, stdout, stderr }' },
  { name: 'runProjectCoverage', category: 'Tests & coverage', description: 'Run the project\'s coverage script and parse summary (e.g. lines %).', params: [{ name: 'dirPath', type: 'string', description: 'Project directory' }, { name: 'projectType', type: 'string', description: 'npm or php' }], returns: '{ ok, exitCode, stdout, stderr, summary: { lines?, statements?, ... } } or { ok: false, error, ... }' },

  // Version & release
  { name: 'versionBump', category: 'Version & release', description: 'Bump version in package.json / Cargo.toml / etc. (no tag or push).', params: [{ name: 'dirPath', type: 'string', description: 'Project directory' }, { name: 'bump', type: 'string', description: 'patch, minor, or major' }], returns: 'void' },
  { name: 'gitTagAndPush', category: 'Version & release', description: 'Create a git tag from current version and push it (and branch) to remote.', params: [{ name: 'dirPath', type: 'string', description: 'Project directory' }, { name: 'tagMessage', type: 'string', description: 'Tag message (e.g. "v1.2.0")' }], returns: 'void' },
  { name: 'release', category: 'Version & release', description: 'Full release: bump version, commit, tag, and push. Uses conventional commits to suggest bump if not forced.', params: [{ name: 'dirPath', type: 'string', description: 'Project directory' }, { name: 'bump', type: 'string', description: 'patch, minor, or major' }, { name: 'force', type: 'boolean', description: 'Skip conventional-commit suggestion' }, { name: 'options', type: 'object', description: 'Optional options (e.g. tagMessage)' }], returns: 'Promise<{ ok: true, tag, bump } | { ok: false, error }>' },
  { name: 'getCommitsSinceTag', category: 'Version & release', description: 'Get commit messages since a given tag (for release notes).', params: [{ name: 'dirPath', type: 'string', description: 'Project directory' }, { name: 'sinceTag', type: 'string', description: 'Tag name (e.g. v1.0.0)' }], returns: 'Array of commit objects' },
  { name: 'getRecentCommits', category: 'Version & release', description: 'Get the N most recent commits.', params: [{ name: 'dirPath', type: 'string', description: 'Project directory' }, { name: 'n', type: 'number', description: 'Number of commits' }], returns: 'Array of commit objects' },
  { name: 'getSuggestedBump', category: 'Version & release', description: 'Suggest bump type (patch/minor/major) from an array of conventional commit messages.', params: [{ name: 'commits', type: 'Array', description: 'Array of commit objects with message/subject' }], returns: 'patch, minor, or major' },

  // Shortcuts & GitHub
  { name: 'getShortcutAction', category: 'GitHub & tokens', description: 'Map a key press to an action (e.g. release-patch, sync). For UI keyboard shortcuts.', params: [{ name: 'viewMode', type: 'string' }, { name: 'selectedPath', type: 'string|null' }, { name: 'key', type: 'string' }, { name: 'metaKey', type: 'boolean' }, { name: 'ctrlKey', type: 'boolean' }, { name: 'inInput', type: 'boolean' }], returns: 'Action string or null' },
  { name: 'getActionsUrl', category: 'GitHub & tokens', description: 'Get GitHub Actions workflow URL for the repo.', params: [{ name: 'gitRemote', type: 'string', description: 'Remote URL (e.g. https://github.com/owner/repo)' }], returns: 'URL string or null' },
  { name: 'getGitHubToken', category: 'GitHub & tokens', description: 'Get stored GitHub token (for API and releases).', params: [], returns: 'string' },
  { name: 'setGitHubToken', category: 'GitHub & tokens', description: 'Store GitHub token.', params: [{ name: 'token', type: 'string', description: 'GitHub personal access token' }], returns: 'null' },

  // AI (Ollama / Claude)
  { name: 'getOllamaSettings', category: 'AI', description: 'Get Ollama base URL and model name.', params: [], returns: '{ baseUrl, model }' },
  { name: 'setOllamaSettings', category: 'AI', description: 'Set Ollama base URL and model.', params: [{ name: 'baseUrl', type: 'string' }, { name: 'model', type: 'string' }], returns: 'null' },
  { name: 'getClaudeSettings', category: 'AI', description: 'Get Claude API key and model.', params: [], returns: '{ apiKey, model }' },
  { name: 'setClaudeSettings', category: 'AI', description: 'Set Claude API key and model.', params: [{ name: 'apiKey', type: 'string' }, { name: 'model', type: 'string' }], returns: 'null' },
  { name: 'getAiProvider', category: 'AI', description: 'Get current AI provider: ollama or claude.', params: [], returns: 'string' },
  { name: 'setAiProvider', category: 'AI', description: 'Set AI provider to ollama or claude.', params: [{ name: 'provider', type: 'string', description: 'ollama or claude' }], returns: 'null' },
  { name: 'ollamaListModels', category: 'AI', description: 'List models available at an Ollama base URL.', params: [{ name: 'baseUrl', type: 'string', description: 'Ollama server URL (optional; uses saved if omitted)' }], returns: 'Array of model names' },
  { name: 'ollamaGenerateCommitMessage', category: 'AI', description: 'Generate a commit message using Ollama from staged changes.', params: [{ name: 'dirPath', type: 'string', description: 'Project directory' }], returns: 'Promise<{ ok, message? } | { ok: false, error }>' },
  { name: 'ollamaGenerateReleaseNotes', category: 'AI', description: 'Generate release notes using Ollama from commits since a tag.', params: [{ name: 'dirPath', type: 'string' }, { name: 'sinceTag', type: 'string' }], returns: 'Promise<{ ok, content? } | { ok: false, error }>' },
  { name: 'ollamaSuggestTestFix', category: 'AI', description: 'Suggest a test fix using Ollama from script name and stdout/stderr.', params: [{ name: 'testScriptName', type: 'string' }, { name: 'stdout', type: 'string' }, { name: 'stderr', type: 'string' }], returns: 'Promise<{ ok, suggestion? } | { ok: false, error }>' },

  // Git – status, pull, branches
  { name: 'getGitStatus', category: 'Git', description: 'Get git status (branch, ahead/behind, dirty, untracked).', params: [{ name: 'dirPath', type: 'string', description: 'Project directory' }], returns: 'Object with branch, clean, ahead, behind, etc.', sampleResponse: `{
  "ok": true,
  "result": {
    "branch": "main",
    "clean": false,
    "ahead": 2,
    "behind": 0,
    "hasUntracked": true
  }
}` },
  { name: 'gitPull', category: 'Git', description: 'Run git pull.', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },
  { name: 'getBranches', category: 'Git', description: 'List local branch names.', params: [{ name: 'dirPath', type: 'string' }], returns: 'Array of branch names', sampleResponse: `{
  "ok": true,
  "result": ["main", "develop", "feature/add-api-docs"]
}` },
  { name: 'checkoutBranch', category: 'Git', description: 'Check out a local branch by name.', params: [{ name: 'dirPath', type: 'string' }, { name: 'branchName', type: 'string' }], returns: 'void' },
  { name: 'createBranch', category: 'Git', description: 'Create a new branch, optionally check it out.', params: [{ name: 'dirPath', type: 'string' }, { name: 'branchName', type: 'string' }, { name: 'checkout', type: 'boolean', description: 'If true (default), checkout the new branch' }], returns: 'void' },
  { name: 'createBranchFrom', category: 'Git', description: 'Create a new branch from a ref (commit, branch, or tag).', params: [{ name: 'dirPath', type: 'string' }, { name: 'newBranchName', type: 'string' }, { name: 'fromRef', type: 'string' }], returns: 'void' },
  { name: 'gitPush', category: 'Git', description: 'Push current branch (with upstream if needed).', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },
  { name: 'gitPushForce', category: 'Git', description: 'Force-push. Optionally use --force-with-lease.', params: [{ name: 'dirPath', type: 'string' }, { name: 'withLease', type: 'boolean', description: 'Use --force-with-lease' }], returns: 'void' },
  { name: 'gitFetch', category: 'Git', description: 'Fetch from remote (git fetch). Same as syncFromRemote.', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },
  { name: 'gitMerge', category: 'Git', description: 'Merge a branch into the current branch.', params: [{ name: 'dirPath', type: 'string' }, { name: 'branchName', type: 'string' }, { name: 'options', type: 'object', description: 'Optional merge options' }], returns: 'void' },
  { name: 'gitStashPush', category: 'Git', description: 'Stash changes. Optional message and options.', params: [{ name: 'dirPath', type: 'string' }, { name: 'message', type: 'string' }, { name: 'options', type: 'object' }], returns: 'void' },
  { name: 'commitChanges', category: 'Git', description: 'Commit staged changes with a message. Options can include sign.', params: [{ name: 'dirPath', type: 'string' }, { name: 'message', type: 'string' }, { name: 'options', type: 'object' }], returns: 'void' },
  { name: 'gitStashPop', category: 'Git', description: 'Pop the most recent stash.', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },
  { name: 'gitDiscardChanges', category: 'Git', description: 'Discard all uncommitted changes (reset --hard).', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },
  { name: 'gitMergeAbort', category: 'Git', description: 'Abort an in-progress merge.', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },

  // Git – remotes, stash, tags, commits
  { name: 'getRemoteBranches', category: 'Git', description: 'List remote-tracking branches (from remote).', params: [{ name: 'dirPath', type: 'string' }], returns: 'Array of ref names' },
  { name: 'checkoutRemoteBranch', category: 'Git', description: 'Check out a remote branch (create local tracking branch).', params: [{ name: 'dirPath', type: 'string' }, { name: 'ref', type: 'string', description: 'Remote branch ref (e.g. origin/feature)' }], returns: 'void' },
  { name: 'getStashList', category: 'Git', description: 'List stash entries.', params: [{ name: 'dirPath', type: 'string' }], returns: 'Array of stash objects' },
  { name: 'stashApply', category: 'Git', description: 'Apply a stash by index (0 = most recent).', params: [{ name: 'dirPath', type: 'string' }, { name: 'index', type: 'number' }], returns: 'void' },
  { name: 'stashDrop', category: 'Git', description: 'Drop a stash by index.', params: [{ name: 'dirPath', type: 'string' }, { name: 'index', type: 'number' }], returns: 'void' },
  { name: 'getTags', category: 'Git', description: 'List git tags.', params: [{ name: 'dirPath', type: 'string' }], returns: 'Array of tag names' },
  { name: 'checkoutTag', category: 'Git', description: 'Check out a tag (detached HEAD).', params: [{ name: 'dirPath', type: 'string' }, { name: 'tagName', type: 'string' }], returns: 'void' },
  { name: 'getCommitLog', category: 'Git', description: 'Get commit log (last N commits).', params: [{ name: 'dirPath', type: 'string' }, { name: 'n', type: 'number' }], returns: 'Array of commit objects' },
  { name: 'getCommitDetail', category: 'Git', description: 'Get full detail for one commit (message, diff, etc.).', params: [{ name: 'dirPath', type: 'string' }, { name: 'sha', type: 'string', description: 'Commit SHA' }], returns: 'Commit detail object' },
  { name: 'deleteBranch', category: 'Git', description: 'Delete a local branch. Optionally force.', params: [{ name: 'dirPath', type: 'string' }, { name: 'branchName', type: 'string' }, { name: 'force', type: 'boolean' }], returns: 'void' },
  { name: 'deleteRemoteBranch', category: 'Git', description: 'Delete a branch on the remote.', params: [{ name: 'dirPath', type: 'string' }, { name: 'remoteName', type: 'string', description: 'e.g. origin' }, { name: 'branchName', type: 'string' }], returns: 'void' },

  // Git – rebase, merge continue
  { name: 'gitRebase', category: 'Git', description: 'Rebase current branch onto another branch.', params: [{ name: 'dirPath', type: 'string' }, { name: 'ontoBranch', type: 'string' }], returns: 'void' },
  { name: 'gitRebaseAbort', category: 'Git', description: 'Abort an in-progress rebase.', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },
  { name: 'gitRebaseContinue', category: 'Git', description: 'Continue after resolving rebase conflicts.', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },
  { name: 'gitRebaseSkip', category: 'Git', description: 'Skip current commit during rebase.', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },
  { name: 'gitMergeContinue', category: 'Git', description: 'Continue after resolving merge conflicts.', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },

  // Git – remotes, cherry-pick, tag
  { name: 'getRemotes', category: 'Git', description: 'List remotes (name and URL).', params: [{ name: 'dirPath', type: 'string' }], returns: 'Array of { name, url }' },
  { name: 'addRemote', category: 'Git', description: 'Add a remote.', params: [{ name: 'dirPath', type: 'string' }, { name: 'name', type: 'string' }, { name: 'url', type: 'string' }], returns: 'void' },
  { name: 'removeRemote', category: 'Git', description: 'Remove a remote.', params: [{ name: 'dirPath', type: 'string' }, { name: 'name', type: 'string' }], returns: 'void' },
  { name: 'renameRemote', category: 'Git', description: 'Rename a remote (e.g. origin → upstream).', params: [{ name: 'dirPath', type: 'string' }, { name: 'oldName', type: 'string' }, { name: 'newName', type: 'string' }], returns: '{ ok } | { ok: false, error }' },
  { name: 'setRemoteUrl', category: 'Git', description: "Change a remote's URL.", params: [{ name: 'dirPath', type: 'string' }, { name: 'name', type: 'string' }, { name: 'url', type: 'string' }], returns: '{ ok } | { ok: false, error }' },
  { name: 'gitCherryPick', category: 'Git', description: 'Cherry-pick a commit by SHA.', params: [{ name: 'dirPath', type: 'string' }, { name: 'sha', type: 'string' }], returns: 'void' },
  { name: 'gitCherryPickAbort', category: 'Git', description: 'Abort cherry-pick.', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },
  { name: 'gitCherryPickContinue', category: 'Git', description: 'Continue after resolving cherry-pick conflicts.', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },
  { name: 'renameBranch', category: 'Git', description: 'Rename a branch.', params: [{ name: 'dirPath', type: 'string' }, { name: 'oldName', type: 'string' }, { name: 'newName', type: 'string' }], returns: 'void' },
  { name: 'createTag', category: 'Git', description: 'Create a tag. Optionally with message and ref.', params: [{ name: 'dirPath', type: 'string' }, { name: 'tagName', type: 'string' }, { name: 'message', type: 'string' }, { name: 'ref', type: 'string', description: 'Ref to tag (default HEAD)' }], returns: 'void' },
  { name: 'writeGitignore', category: 'Git', description: 'Overwrite .gitignore with given content.', params: [{ name: 'dirPath', type: 'string' }, { name: 'content', type: 'string' }], returns: 'void' },
  { name: 'writeGitattributes', category: 'Git', description: 'Overwrite .gitattributes with given content.', params: [{ name: 'dirPath', type: 'string' }, { name: 'content', type: 'string' }], returns: 'void' },
  { name: 'gitRebaseInteractive', category: 'Git', description: 'Start interactive rebase from a ref.', params: [{ name: 'dirPath', type: 'string' }, { name: 'ref', type: 'string' }], returns: 'void' },
  { name: 'gitReset', category: 'Git', description: 'Reset HEAD to a ref. Mode: soft, mixed, hard.', params: [{ name: 'dirPath', type: 'string' }, { name: 'ref', type: 'string' }, { name: 'mode', type: 'string', description: 'soft, mixed, or hard' }], returns: 'void' },
  { name: 'getDiffBetween', category: 'Git', description: 'Get short diff between two refs.', params: [{ name: 'dirPath', type: 'string' }, { name: 'refA', type: 'string' }, { name: 'refB', type: 'string' }], returns: 'Diff string or object' },
  { name: 'getDiffBetweenFull', category: 'Git', description: 'Get full diff between two refs.', params: [{ name: 'dirPath', type: 'string' }, { name: 'refA', type: 'string' }, { name: 'refB', type: 'string' }], returns: 'Full diff' },
  { name: 'getFileDiffStructured', category: 'Git', description: 'Get structured diff for one file (aligned rows for side-by-side view). Options: { commitSha? } for commit vs parent.', params: [{ name: 'dirPath', type: 'string' }, { name: 'filePath', type: 'string' }, { name: 'options', type: 'object' }], returns: '{ ok, filePath, rows, diff? }' },
  { name: 'revertFileLine', category: 'Git', description: 'Revert a single line in working copy: replace, delete, or insert. op: "replace"|"delete"|"insert".', params: [{ name: 'dirPath', type: 'string' }, { name: 'filePath', type: 'string' }, { name: 'op', type: 'string' }, { name: 'lineNum', type: 'number' }, { name: 'content', type: 'string', description: 'Optional for delete' }], returns: '{ ok } | { ok: false, error }' },
  { name: 'gitRevert', category: 'Git', description: 'Revert a commit by SHA.', params: [{ name: 'dirPath', type: 'string' }, { name: 'sha', type: 'string' }], returns: 'void' },
  { name: 'gitPruneRemotes', category: 'Git', description: 'Prune stale remote-tracking branches.', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },
  { name: 'gitAmend', category: 'Git', description: 'Amend the last commit with a new message or staged changes.', params: [{ name: 'dirPath', type: 'string' }, { name: 'message', type: 'string' }], returns: 'void' },
  { name: 'getReflog', category: 'Git', description: 'Get reflog (last N entries).', params: [{ name: 'dirPath', type: 'string' }, { name: 'n', type: 'number' }], returns: 'Array of reflog entries' },
  { name: 'checkoutRef', category: 'Git', description: 'Check out an arbitrary ref (commit SHA, branch, tag).', params: [{ name: 'dirPath', type: 'string' }, { name: 'ref', type: 'string' }], returns: 'void' },
  { name: 'getBlame', category: 'Git', description: 'Get git blame for a file.', params: [{ name: 'dirPath', type: 'string' }, { name: 'filePath', type: 'string', description: 'Path relative to repo' }], returns: 'Blame result' },
  { name: 'deleteTag', category: 'Git', description: 'Delete a local tag.', params: [{ name: 'dirPath', type: 'string' }, { name: 'tagName', type: 'string' }], returns: 'void' },
  { name: 'pushTag', category: 'Git', description: 'Push a tag to a remote.', params: [{ name: 'dirPath', type: 'string' }, { name: 'tagName', type: 'string' }, { name: 'remoteName', type: 'string' }], returns: 'void' },

  // Git – staging
  { name: 'stageFile', category: 'Git', description: 'Stage a file (git add).', params: [{ name: 'dirPath', type: 'string' }, { name: 'filePath', type: 'string', description: 'Path relative to repo' }], returns: 'void' },
  { name: 'unstageFile', category: 'Git', description: 'Unstage a file.', params: [{ name: 'dirPath', type: 'string' }, { name: 'filePath', type: 'string' }], returns: 'void' },
  { name: 'discardFile', category: 'Git', description: 'Discard changes to a file (checkout -- file).', params: [{ name: 'dirPath', type: 'string' }, { name: 'filePath', type: 'string' }], returns: 'void' },
  { name: 'gitFetchRemote', category: 'Git', description: 'Fetch from a specific remote (and optional ref).', params: [{ name: 'dirPath', type: 'string' }, { name: 'remoteName', type: 'string' }, { name: 'ref', type: 'string' }], returns: 'void' },
  { name: 'gitPullRebase', category: 'Git', description: 'Pull with rebase (pull --rebase).', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },
  { name: 'getGitignore', category: 'Git', description: 'Read .gitignore content.', params: [{ name: 'dirPath', type: 'string' }], returns: 'string' },
  { name: 'getGitattributes', category: 'Git', description: 'Read .gitattributes content.', params: [{ name: 'dirPath', type: 'string' }], returns: 'string' },
  { name: 'getSubmodules', category: 'Git', description: 'List submodules.', params: [{ name: 'dirPath', type: 'string' }], returns: 'Array of submodule info' },
  { name: 'submoduleUpdate', category: 'Git', description: 'Update submodules. Optionally init.', params: [{ name: 'dirPath', type: 'string' }, { name: 'init', type: 'boolean' }], returns: 'void' },
  { name: 'getGitState', category: 'Git', description: 'Get high-level git state (branch, rebase/merge in progress, etc.).', params: [{ name: 'dirPath', type: 'string' }], returns: 'State object' },

  // Worktrees & bisect
  { name: 'getWorktrees', category: 'Git', description: 'List git worktrees.', params: [{ name: 'dirPath', type: 'string' }], returns: 'Array of worktree paths' },
  { name: 'worktreeAdd', category: 'Git', description: 'Add a worktree at a path for a branch.', params: [{ name: 'dirPath', type: 'string' }, { name: 'worktreePath', type: 'string' }, { name: 'branch', type: 'string' }], returns: 'void' },
  { name: 'worktreeRemove', category: 'Git', description: 'Remove a worktree.', params: [{ name: 'dirPath', type: 'string' }, { name: 'worktreePath', type: 'string' }], returns: 'void' },
  { name: 'getBisectStatus', category: 'Git', description: 'Get current git bisect status.', params: [{ name: 'dirPath', type: 'string' }], returns: 'Bisect status object' },
  { name: 'bisectStart', category: 'Git', description: 'Start bisect (bad and good refs).', params: [{ name: 'dirPath', type: 'string' }, { name: 'badRef', type: 'string' }, { name: 'goodRef', type: 'string' }], returns: 'void' },
  { name: 'bisectGood', category: 'Git', description: 'Mark current commit as good.', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },
  { name: 'bisectBad', category: 'Git', description: 'Mark current commit as bad.', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },
  { name: 'bisectReset', category: 'Git', description: 'Reset bisect session.', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },

  // System & UI
  { name: 'copyToClipboard', category: 'System & UI', description: 'Copy text to the system clipboard.', params: [{ name: 'text', type: 'string' }], returns: 'null' },
  { name: 'openPathInFinder', category: 'System & UI', description: 'Reveal the path in the system file manager (Finder on macOS).', params: [{ name: 'dirPath', type: 'string' }], returns: 'Promise<string> (empty or error)' },
  { name: 'openInTerminal', category: 'System & UI', description: 'Open the project directory in the system terminal.', params: [{ name: 'dirPath', type: 'string' }], returns: 'Promise<{ ok } | { ok: false, error }>' },
  { name: 'openInEditor', category: 'System & UI', description: 'Open the project in the preferred editor (Cursor or VS Code).', params: [{ name: 'dirPath', type: 'string' }], returns: 'Promise<{ ok, editor? } | { ok: false, error }>' },
  { name: 'openFileInEditor', category: 'System & UI', description: 'Open a file in the project in the preferred editor.', params: [{ name: 'dirPath', type: 'string' }, { name: 'relativePath', type: 'string' }], returns: 'Promise<{ ok, editor? } | { ok: false, error }>' },
  { name: 'getFileDiff', category: 'System & UI', description: 'Get diff or content for a file (staged/unstaged/untracked).', params: [{ name: 'dirPath', type: 'string' }, { name: 'filePath', type: 'string' }, { name: 'isUntracked', type: 'boolean' }], returns: '{ ok, type: "diff"|"new"|"image", content?|dataUrl? } or { ok: false, error }' },

  // GitHub releases & downloads
  { name: 'getReleasesUrl', category: 'GitHub releases & downloads', description: 'Get GitHub releases page URL for the repo.', params: [{ name: 'gitRemote', type: 'string' }], returns: 'URL string or null' },
  { name: 'syncFromRemote', category: 'GitHub releases & downloads', description: 'Fetch from remote (same as gitFetch).', params: [{ name: 'dirPath', type: 'string' }], returns: 'void' },
  { name: 'getGitHubReleases', category: 'GitHub releases & downloads', description: 'Fetch GitHub releases for the repo (requires token for private repos).', params: [{ name: 'gitRemote', type: 'string' }, { name: 'token', type: 'string', description: 'Optional GitHub token' }], returns: '{ ok, releases: [] } or { ok: false, error, releases: [] }' },
  { name: 'downloadLatestRelease', category: 'GitHub releases & downloads', description: 'Download the latest release asset for the current platform. May open save dialog.', params: [{ name: 'gitRemote', type: 'string' }], returns: 'Promise<{ ok, path? } | { ok: false, error }>' },
  { name: 'downloadAsset', category: 'GitHub releases & downloads', description: 'Download a file from a URL. May open save dialog.', params: [{ name: 'url', type: 'string' }, { name: 'suggestedFileName', type: 'string', description: 'Suggested filename for save dialog' }], returns: 'Promise<{ ok, path? } | { ok: false, error }>' },
  { name: 'openUrl', category: 'GitHub releases & downloads', description: 'Open a URL in the default browser.', params: [{ name: 'url', type: 'string', description: 'Must be http(s) URL' }], returns: 'null' },

  // App & preferences
  { name: 'getAppInfo', category: 'App & preferences', description: 'Get app name and version.', params: [], returns: '{ name, version }' },
  { name: 'getChangelog', category: 'App & preferences', description: 'Get CHANGELOG.md content as sanitized HTML.', params: [], returns: '{ ok, content } or { ok: false, error }' },
  { name: 'getPreference', category: 'App & preferences', description: 'Get a stored preference value by key.', params: [{ name: 'key', type: 'string', description: 'e.g. selectedProjectPath, state.viewMode, apiServerPort' }], returns: 'any' },
  { name: 'setPreference', category: 'App & preferences', description: 'Store a preference value.', params: [{ name: 'key', type: 'string' }, { name: 'value', type: 'any' }], returns: 'null' },
  { name: 'getAvailablePhpVersions', category: 'App & preferences', description: 'List available PHP versions on the system (for Composer).', params: [], returns: 'Array of version strings' },
  { name: 'getPhpVersionFromRequire', category: 'App & preferences', description: 'Parse a PHP version constraint (e.g. from composer.json require.php) to a single version.', params: [{ name: 'phpRequire', type: 'string', description: 'Version constraint string' }], returns: 'Version string or null' },
  { name: 'getTheme', category: 'App & preferences', description: 'Get current theme setting and effective theme (dark/light).', params: [], returns: '{ theme, effective }' },
  { name: 'setTheme', category: 'App & preferences', description: 'Set theme: dark, light, or system.', params: [{ name: 'theme', type: 'string', description: 'dark, light, or system' }], returns: 'null' },

  // API docs (meta)
  { name: 'listApiMethods', category: 'API (meta)', description: 'Return the list of all API method names.', params: [], returns: 'Array of method name strings' },
  { name: 'getApiDocs', category: 'API (meta)', description: 'Return full documentation for every API method (name, description, params, returns). Use this to build clients or docs.', params: [], returns: 'Array of { name, description, params?, returns? }' },
  { name: 'getApiMethodDoc', category: 'API (meta)', description: 'Return documentation for a single method by name.', params: [{ name: 'methodName', type: 'string', description: 'API method name (e.g. getProjects)' }], returns: '{ name, description, params?, returns? } or null' },
  { name: 'getSampleResponse', category: 'API (meta)', description: 'Return sample/fixture response for a method that has sampleResponse in its docs. Use to test the API without real data.', params: [{ name: 'methodName', type: 'string', description: 'API method name (e.g. getAllProjectsInfo)' }], returns: 'The sample result value, or null if the method has no sample.' },
];

function getApiDocs() {
  return API_DOCS;
}

function getApiMethodDoc(methodName) {
  return API_DOCS.find((d) => d.name === methodName) || null;
}

/**
 * Return the parsed "result" value from the sample response for a method, or null.
 * Used by the getSampleResponse API method so callers get { ok: true, result: ... }.
 */
function getSampleResponseForMethod(methodName) {
  const doc = API_DOCS.find((d) => d.name === methodName);
  if (!doc || !doc.sampleResponse) return null;
  try {
    const parsed = JSON.parse(doc.sampleResponse);
    return parsed && typeof parsed.result !== 'undefined' ? parsed.result : parsed;
  } catch {
    return null;
  }
}

module.exports = { getApiDocs, getApiMethodDoc, getSampleResponseForMethod, API_DOCS };
