<template>
  <div class="docs-view flex-1 flex min-h-0 overflow-hidden">
    <!-- Sidebar nav -->
    <aside class="docs-sidebar">
      <div class="docs-sidebar-inner">
        <h2 class="docs-sidebar-title">Documentation</h2>
        <nav class="docs-nav">
          <button
            v-for="s in allSections"
            :key="s.id"
            class="docs-nav-item"
            :class="{ active: activeSection === s.id }"
            @click="activeSection = s.id"
          >{{ s.title }}</button>
          <template v-if="extensionSections.length">
            <div class="docs-nav-divider" />
            <span class="docs-nav-group-label">Extensions</span>
            <button
              v-for="es in extensionSections"
              :key="es.id"
              class="docs-nav-item"
              :class="{ active: activeSection === es.id }"
              @click="activeSection = es.id"
            >{{ es.title }}</button>
          </template>
        </nav>
      </div>
    </aside>

    <!-- Content -->
    <main class="docs-content">
      <!-- Built-in sections -->
      <template v-for="s in allSections" :key="s.id">
        <section v-show="activeSection === s.id" class="docs-section">
          <h2 class="docs-section-heading">{{ s.title }}</h2>
          <div v-for="(item, i) in s.items" :key="i" class="docs-block">
            <h3 v-if="item.heading" class="docs-block-heading">{{ item.heading }}</h3>
            <div class="docs-block-body" v-html="item.body" />
          </div>
        </section>
      </template>

      <!-- Extension-contributed sections -->
      <template v-for="es in extensionSections" :key="es.id">
        <section v-show="activeSection === es.id" class="docs-section">
          <h2 class="docs-section-heading">{{ es.title }}</h2>
          <div v-for="(item, i) in es.items" :key="i" class="docs-block">
            <h3 v-if="item.heading" class="docs-block-heading">{{ item.heading }}</h3>
            <div class="docs-block-body" v-html="item.body" />
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { getDocSections } from '../extensions/registry';

const activeSection = ref('overview');

const builtinSections = [
  {
    id: 'overview',
    title: 'Overview',
    items: [
      {
        heading: 'What is Shipwell?',
        body: `<p>Shipwell is a desktop app for managing versions, tags, and releases across multiple projects. It supports <strong>npm</strong>, <strong>Rust</strong> (Cargo.toml), <strong>Go</strong> (go.mod), <strong>Python</strong> (pyproject.toml / setup.py), and <strong>PHP</strong> (composer.json).</p>
<p>Add project folders, see version and git status at a glance, then bump, tag, and push — all from one place.</p>`,
      },
      {
        heading: 'Supported project types',
        body: `<table class="docs-table"><thead><tr><th>Type</th><th>Detected via</th><th>Version source</th></tr></thead><tbody>
<tr><td>Node / npm</td><td><code>package.json</code></td><td><code>version</code> field</td></tr>
<tr><td>Rust</td><td><code>Cargo.toml</code></td><td><code>[package] version</code></td></tr>
<tr><td>Go</td><td><code>go.mod</code></td><td>Latest git tag</td></tr>
<tr><td>Python</td><td><code>pyproject.toml</code> or <code>setup.py</code></td><td><code>version</code> field</td></tr>
<tr><td>PHP</td><td><code>composer.json</code></td><td><code>version</code> field</td></tr>
</tbody></table>`,
      },
    ],
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    items: [
      {
        heading: 'Adding projects',
        body: `<p>Click <strong>Add project</strong> in the nav bar or dashboard, then choose a folder containing one of the supported manifest files. The app detects the project type and reads its name and version.</p>
<p>Projects are stored in app data. Use <strong>Remove</strong> on a project to drop it from the list (this does not delete files on disk).</p>`,
      },
      {
        heading: 'Signing in',
        body: `<p>Sign in with <strong>email &amp; password</strong> or <strong>GitHub OAuth</strong> to unlock your plan's features. Your session persists across restarts — the app auto-logs you in when reopened.</p>
<p>If the server is unreachable, the app runs in <strong>offline mode</strong> using cached credentials within the configured grace period.</p>`,
      },
      {
        heading: 'Navigation',
        body: `<p>Use the <strong>view dropdown</strong> in the top bar to switch between Dashboard, Settings, Extensions, Documentation, Changelog, and API views. Select a project in the sidebar to open its detail view with tabs.</p>`,
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    items: [
      {
        heading: 'Overview',
        body: `<p>The dashboard shows a summary of all your projects: total count, how many need a release, untagged projects, and total commits ahead.</p>`,
      },
      {
        heading: 'Needs Attention',
        body: `<p>Projects with unreleased commits or that are ahead of their latest tag appear in the <strong>Needs Attention</strong> section with one-click <strong>Patch release</strong> buttons.</p>`,
      },
      {
        heading: 'Quick actions',
        body: `<p><strong>Sync all</strong> fetches from remotes for every project. <strong>Patch all</strong> runs a patch release on every project that needs one. Use the filter and sort dropdowns to narrow the project list.</p>`,
      },
    ],
  },
  {
    id: 'git',
    title: 'Git Management',
    items: [
      {
        heading: 'Status & commits',
        body: `<p>The <strong>Git</strong> tab shows branch, ahead/behind, and uncommitted files. Stage, unstage, or discard individual files. Enter a commit message and click <strong>Commit</strong>.</p>`,
      },
      {
        heading: 'Branches',
        body: `<p>Create, checkout, rename, and delete local and remote branches. Switch between branches, create branches from any ref, and set upstream tracking.</p>`,
      },
      {
        heading: 'Merge, rebase & cherry-pick',
        body: `<p>Merge or rebase onto another branch. Cherry-pick individual commits. Abort or continue in-progress merges, rebases, and cherry-picks. Resolve conflicts and continue.</p>`,
      },
      {
        heading: 'Stash',
        body: `<p>Stash uncommitted changes with an optional message. View the stash list, apply or drop stash entries.</p>`,
      },
      {
        heading: 'Tags',
        body: `<p>List all tags, create new tags (lightweight or annotated), delete tags, push tags to a remote, and checkout any tag.</p>`,
      },
      {
        heading: 'Remotes',
        body: `<p>View, add, remove, rename remotes, and update remote URLs. Fetch from specific remotes. Prune stale remote-tracking branches.</p>`,
      },
      {
        heading: 'Advanced',
        body: `<p><strong>Bisect</strong> — start, good, bad, skip, reset, and run automated bisect. <strong>Worktrees</strong> — add and remove git worktrees. <strong>Submodules</strong> — view and update submodules. <strong>Reflog</strong> — browse and checkout from the reflog. <strong>Blame</strong> — view line-by-line blame for any file. <strong>Reset</strong> — soft, mixed, or hard reset to any ref. <strong>Revert</strong> — revert a commit. <strong>Amend</strong> — amend the last commit message.</p>`,
      },
      {
        heading: 'Diff viewer',
        body: `<p>View structured diffs between any two refs. See file-level diffs with additions and deletions highlighted. Compare file content at any ref. Revert individual lines from diffs.</p>`,
      },
    ],
  },
  {
    id: 'version-release',
    title: 'Version & Release',
    items: [
      {
        heading: 'Bumping versions',
        body: `<p>For <strong>npm</strong> projects: choose Patch, Minor, or Major bump. The app updates <code>package.json</code>, creates a git tag, and pushes. For <strong>Rust, Go, Python, PHP</strong>: the app reads the current version from the manifest and runs <strong>Tag and push</strong>.</p>`,
      },
      {
        heading: 'Release flow',
        body: `<p>The <code>release()</code> command bumps the version, commits the change, creates a git tag, and pushes to the remote — all in one step. Use the <strong>force</strong> option to skip safety checks. Pass custom options like pre-release identifiers.</p>`,
      },
      {
        heading: 'Conventional commits',
        body: `<p>The app can analyze commit messages since the last tag and <strong>suggest a bump level</strong> (patch, minor, or major) based on conventional commit prefixes (feat, fix, breaking change).</p>`,
      },
      {
        heading: 'Batch release',
        body: `<p>From the dashboard, use <strong>Patch all</strong> to release every project that needs it in one click. <em>(Pro plan)</em></p>`,
      },
    ],
  },
  {
    id: 'pull-requests',
    title: 'Pull Requests',
    items: [
      {
        heading: 'Viewing PRs',
        body: `<p>The <strong>Pull Requests</strong> tab lists open, closed, and merged PRs for the project's GitHub repository. Requires a GitHub token for private repos.</p>`,
      },
      {
        heading: 'Creating & merging',
        body: `<p>Create a new PR from the current branch with a title and description. Merge PRs using merge, squash, or rebase strategy — all from inside the app.</p>`,
      },
    ],
  },
  {
    id: 'github-issues',
    title: 'GitHub Issues',
    items: [
      {
        heading: 'Browsing issues',
        body: `<p>The <strong>GitHub Issues</strong> tab lists issues for the project's repository. Filter by state (open/closed) and labels. Requires a GitHub token for private repos.</p>`,
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI Generation',
    items: [
      {
        heading: 'Providers',
        body: `<p>Shipwell supports multiple AI providers: <strong>Ollama</strong> (local), <strong>Claude</strong> (Anthropic), <strong>OpenAI</strong>, and <strong>Gemini</strong> (Google). Configure your preferred provider and API key in Settings.</p>`,
      },
      {
        heading: 'Commit messages',
        body: `<p>Auto-generate commit messages from staged changes. The AI analyzes the diff and suggests a descriptive, conventional commit message.</p>`,
      },
      {
        heading: 'Release notes',
        body: `<p>Generate release notes from commits since a given tag. The AI summarizes changes grouped by category.</p>`,
      },
      {
        heading: 'Tag messages',
        body: `<p>Generate annotated tag messages summarizing the changes included in the release.</p>`,
      },
      {
        heading: 'Test fix suggestions',
        body: `<p>When tests fail, the AI can analyze the test output (stdout/stderr) and suggest fixes.</p>`,
      },
      {
        heading: 'Test generation',
        body: `<p>Generate test files for any source file in your project. The AI reads the file and produces a test suite.</p>`,
      },
    ],
  },
  {
    id: 'terminal',
    title: 'Terminal',
    items: [
      {
        heading: 'Integrated terminal',
        body: `<p>Each project gets an integrated terminal. Run commands without leaving the app. Open additional terminals and pop out into a separate window.</p>`,
      },
    ],
  },
  {
    id: 'tests',
    title: 'Tests & Coverage',
    items: [
      {
        heading: 'Running tests',
        body: `<p>The <strong>Tests</strong> tab detects available test scripts for the project type (e.g. <code>npm test</code>, <code>cargo test</code>, <code>phpunit</code>) and runs them. View stdout/stderr output in the app.</p>`,
      },
      {
        heading: 'Code coverage',
        body: `<p>Run coverage and view reports. The app parses coverage output and displays a summary.</p>`,
      },
    ],
  },
  {
    id: 'processes',
    title: 'Processes',
    items: [
      {
        heading: 'Dev servers & tasks',
        body: `<p>Configure per-project processes (dev servers, watchers, etc.) in the <strong>Processes</strong> tab. Start, stop, and restart individual processes or all at once. View live output logs.</p>`,
      },
      {
        heading: 'Suggested processes',
        body: `<p>The app can auto-detect common processes from your project (e.g. <code>npm run dev</code>, <code>php artisan serve</code>) and suggest them.</p>`,
      },
    ],
  },
  {
    id: 'email',
    title: 'Email Testing',
    items: [
      {
        heading: 'SMTP capture',
        body: `<p>Built-in SMTP server captures outgoing emails. Point your app's mail config to <code>localhost</code> on the configured port. View captured emails with HTML preview, headers, and attachments.</p>`,
      },
    ],
  },
  {
    id: 'tunnels',
    title: 'Tunnels',
    items: [
      {
        heading: 'Public URLs',
        body: `<p>Expose local dev servers to the internet. Start a tunnel on any port with an optional custom subdomain. Share the public URL for testing webhooks, mobile devices, or client demos.</p>`,
      },
    ],
  },
  {
    id: 'dependencies',
    title: 'Dependencies',
    items: [
      {
        heading: 'npm & Composer',
        body: `<p>View and audit dependencies. Check for outdated packages, run updates, and view security advisories. Supports both npm and Composer (PHP) projects.</p>`,
      },
    ],
  },
  {
    id: 'ssh-ftp',
    title: 'SSH & FTP',
    items: [
      {
        heading: 'SSH connections',
        body: `<p>Save SSH connection profiles and open them in the integrated terminal with one click.</p>`,
      },
      {
        heading: 'FTP file transfer',
        body: `<p>Connect to FTP servers, browse remote directories, upload and download files, and remove remote files.</p>`,
      },
    ],
  },
  {
    id: 'kanban',
    title: 'Kanban Board',
    items: [
      {
        heading: 'Per-project boards',
        body: `<p>Each project gets a kanban board with columns (To Do, In Progress, Done). Add, move, and delete cards. Data is stored locally per project.</p>`,
      },
    ],
  },
  {
    id: 'notes-wiki',
    title: 'Notes & Wiki',
    items: [
      {
        heading: 'Markdown notes',
        body: `<p>Write markdown notes per project. Notes are stored locally and render with full markdown support including code blocks, tables, and links.</p>`,
      },
    ],
  },
  {
    id: 'agent-crew',
    title: 'Agent Crew',
    items: [
      {
        heading: 'AI agents',
        body: `<p>Run autonomous AI agents on your projects. Agents can analyze code, suggest improvements, and perform automated tasks. <em>(Pro plan)</em></p>`,
      },
    ],
  },
  {
    id: 'api',
    title: 'REST API',
    items: [
      {
        heading: 'Local HTTP API',
        body: `<p>Control the app programmatically via a local HTTP API. Enable the API server in Settings, then call any method over HTTP. View full API documentation and test methods in the <strong>API</strong> view.</p>`,
      },
      {
        heading: 'MCP server',
        body: `<p>Shipwell includes an MCP (Model Context Protocol) server that AI coding assistants can connect to. Start it from Settings or the API view.</p>`,
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    items: [
      {
        heading: 'General',
        body: `<p><strong>Theme</strong> — Dark or Light mode. <strong>Launch at login</strong> — start the app when your system boots. <strong>Always on top</strong> — keep the window above others. <strong>Minimize to tray</strong> — closing minimizes instead of quitting. <strong>Confirm before quit</strong> — show a dialog before exiting. <strong>Zoom</strong> — adjust UI scale.</p>`,
      },
      {
        heading: 'Appearance',
        body: `<p>Accent color, font size (compact / comfortable / spacious), border radius, reduced motion, reduced transparency, and high contrast mode.</p>`,
      },
      {
        heading: 'GitHub token',
        body: `<p>Set a GitHub personal access token for higher API rate limits, private repo access, and the ability to create releases, PRs, and issues from the app.</p>`,
      },
      {
        heading: 'AI providers',
        body: `<p>Configure Ollama (local), Claude, OpenAI, or Gemini. Set API keys, base URLs, and model names. Choose the active provider.</p>`,
      },
      {
        heading: 'Network',
        body: `<p><strong>Proxy</strong> — set an HTTP proxy. <strong>Offline mode</strong> — force the app to use cached credentials. <strong>Offline grace period</strong> — configure how many days the app works offline before requiring re-authentication (0–30 days). View connectivity status and last verification timestamp.</p>`,
      },
      {
        heading: 'Accessibility',
        body: `<p><strong>Focus outline</strong> — visible focus ring on keyboard navigation. <strong>Large cursor</strong> — enlarged text cursor with visual highlight in inputs. <strong>Screen reader support</strong> — live region announcements for assistive technologies.</p>`,
      },
      {
        heading: 'Keyboard shortcuts',
        body: `<p>View all keyboard shortcuts in Settings → Keyboard. Shortcuts include <kbd>⌘1/2/3</kbd> for patch/minor/major release, <kbd>⌘S</kbd> for sync, <kbd>⌘D</kbd> for download, and <kbd>⌘⇧P</kbd> for the command palette.</p>`,
      },
      {
        heading: 'Import / Export',
        body: `<p>Export all settings as JSON. Import settings from a file (merge or replace). Reset all settings to defaults.</p>`,
      },
      {
        heading: 'Telemetry & crash reports',
        body: `<p>Optional telemetry sends anonymous usage events. Crash reports send error details to help improve the app. Both can be disabled in Settings.</p>`,
      },
    ],
  },
  {
    id: 'keyboard',
    title: 'Keyboard Shortcuts',
    items: [
      {
        heading: 'Navigation',
        body: `<table class="docs-table"><tbody>
<tr><td><kbd>⌘⇧P</kbd></td><td>Command palette</td></tr>
<tr><td><kbd>⌘/</kbd></td><td>Focus git filter</td></tr>
</tbody></table>`,
      },
      {
        heading: 'Releases (project detail)',
        body: `<table class="docs-table"><tbody>
<tr><td><kbd>⌘1</kbd></td><td>Patch release</td></tr>
<tr><td><kbd>⌘2</kbd></td><td>Minor release</td></tr>
<tr><td><kbd>⌘3</kbd></td><td>Major release</td></tr>
</tbody></table>`,
      },
      {
        heading: 'Actions (project detail)',
        body: `<table class="docs-table"><tbody>
<tr><td><kbd>S</kbd></td><td>Sync from remote</td></tr>
<tr><td><kbd>D</kbd></td><td>Download latest release</td></tr>
</tbody></table>
<p class="mt-2 text-xs text-rm-muted">Release and action shortcuts only work in the project detail view when no input is focused. On Windows/Linux, use <kbd>Ctrl</kbd> instead of <kbd>⌘</kbd>.</p>`,
      },
      {
        heading: 'Command palette',
        body: `<p>Open with <kbd>⌘⇧P</kbd>, then type to search. Commands include: Go to Dashboard, Project, Settings, Extensions, Docs, Changelog, API, Refresh, Add project, Sync all, Open hidden options.</p>`,
      },
    ],
  },
  {
    id: 'extensions-dev',
    title: 'Building Extensions',
    items: [
      {
        heading: 'Extension system',
        body: `<p>Extensions add detail-view tabs, command palette commands, and documentation sections. Built-in extensions live in <code>extensions/</code>; user-installed extensions are loaded from the marketplace at runtime.</p>`,
      },
      {
        heading: 'Registering a tab',
        body: `<pre><code>import { registerDetailTabExtension } from '../registry';
import MyCard from './MyCard.vue';

registerDetailTabExtension({
  id: 'my-ext',
  label: 'My Tab',
  description: 'What this tab does',
  version: '1.0.0',
  icon: '&lt;svg ...&gt;',
  component: MyCard,
  isVisible: (info) => true, // optional
});</code></pre>`,
      },
      {
        heading: 'Registering commands',
        body: `<pre><code>import { registerCommand } from '../../commandPalette/registry';

registerCommand({
  id: 'my-ext.open-tab',
  label: 'Open My Tab',
  category: 'My Extension',
  run() { /* ... */ },
});</code></pre>
<p>User-installed extensions use <code>window.__registerCommand(def)</code> instead.</p>`,
      },
      {
        heading: 'Registering documentation',
        body: `<pre><code>import { registerDocSection } from '../registry';

registerDocSection({
  id: 'my-ext-docs',
  title: 'My Extension',
  category: 'Extensions',
  order: 100,
  items: [
    { heading: 'Setup', body: '&lt;p&gt;How to set up...&lt;/p&gt;' },
    { heading: 'Usage', body: '&lt;p&gt;How to use...&lt;/p&gt;' },
  ],
});</code></pre>
<p>User-installed extensions use <code>window.__registerDocSection(def)</code>. Sections appear in the Documentation view under the <strong>Extensions</strong> sidebar group.</p>`,
      },
      {
        heading: 'User extensions (marketplace)',
        body: `<p>User extensions are sandboxed and access the API via <code>window.releaseManager</code>. They register tabs, commands, and docs via <code>window.__registerDetailTabExtension</code>, <code>window.__registerCommand</code>, and <code>window.__registerDocSection</code>.</p>`,
      },
    ],
  },
  {
    id: 'offline',
    title: 'Offline Mode',
    items: [
      {
        heading: 'How it works',
        body: `<p>When the server is unreachable (network down, DNS failure, etc.), the app falls back to <strong>cached credentials</strong> stored from your last successful sign-in. The cached license includes your email, plan tier, and permissions.</p>`,
      },
      {
        heading: 'Grace period',
        body: `<p>The offline grace period (default: 7 days) controls how long the app works without contacting the server. After the grace period expires, you must sign in again. Configure this in Settings → Network.</p>`,
      },
      {
        heading: 'Forced offline mode',
        body: `<p>Enable <strong>Offline mode</strong> in Settings → Network to skip all server checks. The app uses the cached license immediately. Useful for air-gapped environments.</p>`,
      },
    ],
  },
];

const extensionSections = computed(() => getDocSections());

const allSections = computed(() => builtinSections);
</script>

<style scoped>
.docs-view {
  background: rgb(var(--rm-bg));
}

/* Sidebar */
.docs-sidebar {
  width: 14rem;
  flex-shrink: 0;
  border-right: 1px solid rgb(var(--rm-border));
  background: rgb(var(--rm-surface));
  overflow-y: auto;
}
.docs-sidebar-inner {
  padding: 1.25rem 0;
}
.docs-sidebar-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(var(--rm-text));
  margin: 0 0 0.75rem;
  padding: 0 1rem;
  letter-spacing: -0.01em;
}
.docs-nav {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.docs-nav-item {
  display: block;
  width: 100%;
  padding: 0.375rem 1rem;
  background: none;
  border: none;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgb(var(--rm-muted));
  cursor: pointer;
  transition: color 0.12s, background 0.12s;
  border-left: 2px solid transparent;
}
.docs-nav-item:hover {
  color: rgb(var(--rm-text));
  background: rgb(var(--rm-surface-hover) / 0.3);
}
.docs-nav-item.active {
  color: rgb(var(--rm-accent));
  background: rgb(var(--rm-accent) / 0.06);
  border-left-color: rgb(var(--rm-accent));
  font-weight: 600;
}
.docs-nav-divider {
  height: 1px;
  background: rgb(var(--rm-border));
  margin: 0.5rem 1rem;
}
.docs-nav-group-label {
  display: block;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgb(var(--rm-muted));
  padding: 0.25rem 1rem 0.375rem;
}

/* Content */
.docs-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}
.docs-section-heading {
  font-size: 1.25rem;
  font-weight: 700;
  color: rgb(var(--rm-text));
  margin: 0 0 1.5rem;
  letter-spacing: -0.02em;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgb(var(--rm-border));
}
.docs-block {
  margin-bottom: 1.5rem;
}
.docs-block-heading {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
  margin: 0 0 0.5rem;
}
.docs-block-body {
  font-size: 0.8125rem;
  color: rgb(var(--rm-muted));
  line-height: 1.65;
}
.docs-block-body :deep(p) {
  margin: 0 0 0.5rem;
}
.docs-block-body :deep(p:last-child) {
  margin-bottom: 0;
}
.docs-block-body :deep(strong) {
  color: rgb(var(--rm-text));
  font-weight: 600;
}
.docs-block-body :deep(code) {
  background: rgb(var(--rm-surface));
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: ui-monospace, 'SF Mono', monospace;
  color: rgb(var(--rm-accent));
}
.docs-block-body :deep(pre) {
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(var(--rm-border));
  border-radius: 6px;
  padding: 0.75rem 1rem;
  overflow-x: auto;
  margin: 0.5rem 0;
}
.docs-block-body :deep(pre code) {
  background: none;
  padding: 0;
  font-size: 0.75rem;
  line-height: 1.6;
  color: rgb(var(--rm-text));
}
.docs-block-body :deep(kbd) {
  display: inline-block;
  padding: 0.0625rem 0.375rem;
  border-radius: 4px;
  border: 1px solid rgb(var(--rm-border));
  background: rgb(var(--rm-surface));
  font-size: 0.6875rem;
  font-family: ui-monospace, monospace;
  color: rgb(var(--rm-text));
  line-height: 1.5;
}
.docs-block-body :deep(em) {
  color: rgb(var(--rm-accent));
  font-style: normal;
  font-weight: 500;
  font-size: 0.6875rem;
}
.docs-block-body :deep(ul) {
  margin: 0.375rem 0;
  padding-left: 1.25rem;
}
.docs-block-body :deep(li) {
  margin-bottom: 0.25rem;
}

/* Tables */
.docs-block-body :deep(.docs-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5rem 0;
  font-size: 0.75rem;
}
.docs-block-body :deep(.docs-table th),
.docs-block-body :deep(.docs-table td) {
  padding: 0.5rem 0.75rem;
  border: 1px solid rgb(var(--rm-border));
  text-align: left;
}
.docs-block-body :deep(.docs-table th) {
  background: rgb(var(--rm-surface));
  font-weight: 600;
  color: rgb(var(--rm-text));
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.docs-block-body :deep(.docs-table td) {
  color: rgb(var(--rm-muted));
}
.docs-block-body :deep(.docs-table td code) {
  font-size: 0.6875rem;
}
</style>
