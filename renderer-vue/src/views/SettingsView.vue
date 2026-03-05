<template>
  <div class="settings-root flex flex-1 min-h-0">
    <nav class="settings-nav shrink-0 flex flex-col border-r border-rm-border bg-rm-bg/50" aria-label="Settings sections">
      <div class="settings-nav-inner py-4 pr-2 pl-4">
        <h2 class="settings-nav-title text-xs font-semibold text-rm-muted uppercase tracking-wider px-3 mb-3">Settings</h2>
        <ul class="settings-nav-list list-none m-0 p-0 space-y-0.5">
          <li v-for="s in sections" :key="s.id">
            <Button
              variant="text"
              size="small"
              class="settings-nav-btn w-full justify-start px-3 py-2.5 rounded-rm text-sm font-medium min-w-0"
              :class="{ 'settings-nav-btn-active': activeSection === s.id }"
              :aria-current="activeSection === s.id ? 'page' : undefined"
              @click="activeSection = s.id"
            >
              <span class="settings-nav-icon shrink-0 flex items-center justify-center w-5 h-5 [&>svg]:w-[18px] [&>svg]:h-[18px]" aria-hidden="true" v-html="s.icon"></span>
              {{ s.label }}
            </Button>
          </li>
        </ul>
      </div>
    </nav>
    <div class="settings-content flex-1 overflow-auto min-w-0">
      <div class="settings-content-inner py-8 px-8 max-w-2xl">
        <!-- Application -->
        <section v-show="activeSection === 'application'" class="settings-section">
          <h3 class="settings-section-title">Application</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">Startup and quit behavior.</p>
          <div class="settings-card space-y-5">
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
              <Checkbox v-model="launchAtLogin" binary @update:model-value="saveLaunchAtLogin" />
              <span class="settings-label block text-rm-text">Launch at login</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Start the app when you log in to your computer.</p>
            </label>
            <Divider />
            <div class="settings-row pt-2">
              <span class="settings-label">Open to</span>
              <p class="settings-desc">Default view when the app starts.</p>
              <Select v-model="defaultView" :options="defaultViewOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveDefaultView" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Check for updates</span>
              <p class="settings-desc">When to look for new versions.</p>
              <Select v-model="checkForUpdates" :options="checkForUpdatesOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveCheckForUpdates" />
            </div>
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 pt-2 border-t border-rm-border">
              <Checkbox v-model="confirmBeforeQuit" binary @update:model-value="saveConfirmBeforeQuit" />
              <span class="settings-label block text-rm-text">Confirm before closing</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Ask for confirmation when quitting the app.</p>
            </label>
          </div>
        </section>

        <!-- Notifications -->
        <section v-show="activeSection === 'notifications'" class="settings-section">
          <h3 class="settings-section-title">Notifications</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">In-app and system notifications.</p>
          <div class="settings-card space-y-5">
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
              <Checkbox v-model="notificationsEnabled" binary @update:model-value="saveNotificationsEnabled" />
              <span class="settings-label block text-rm-text">Enable notifications</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Show in-app and system notifications for releases and errors.</p>
            </label>
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 pt-2 border-t border-rm-border">
              <Checkbox v-model="notificationSound" binary @update:model-value="saveNotificationSound" />
              <span class="settings-label block text-rm-text">Notification sound</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Play a sound when a notification appears.</p>
            </label>
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 pt-2 border-t border-rm-border">
              <Checkbox v-model="notificationsOnlyWhenNotFocused" binary @update:model-value="saveNotificationsOnlyWhenNotFocused" />
              <span class="settings-label block text-rm-text">Only when app is in background</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Show system notifications only when the app is not focused.</p>
            </label>
          </div>
        </section>

        <!-- Behavior -->
        <section v-show="activeSection === 'behavior'" class="settings-section">
          <h3 class="settings-section-title">Behavior</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">How you interact with projects and the UI.</p>
          <div class="settings-card space-y-5">
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
              <Checkbox v-model="doubleClickToOpenProject" binary @update:model-value="saveDoubleClickToOpenProject" />
              <span class="settings-label block text-rm-text">Double-click to open project</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Require double-click to open a project in the sidebar (single-click to select only).</p>
            </label>
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 pt-2 border-t border-rm-border">
              <Checkbox v-model="confirmDestructiveActions" binary @update:model-value="saveConfirmDestructiveActions" />
              <span class="settings-label block text-rm-text">Confirm destructive actions</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Ask for confirmation before delete, release, or batch release.</p>
            </label>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Auto-refresh interval</span>
              <p class="settings-desc">How often to refresh project list and dashboard (0 = off).</p>
              <Select v-model="autoRefreshIntervalSeconds" :options="autoRefreshIntervalOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveAutoRefreshInterval" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Recent projects list length</span>
              <p class="settings-desc">Maximum number of recent projects to remember.</p>
              <Select v-model="recentListLength" :options="recentListLengthOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveRecentListLength" />
            </div>
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 pt-2 border-t border-rm-border">
              <Checkbox v-model="showTips" binary @update:model-value="saveShowTips" />
              <span class="settings-label block text-rm-text">Show tips and onboarding</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Show first-run tips and occasional hints. Uncheck to hide permanently.</p>
            </label>
          </div>
        </section>

        <!-- Git -->
        <section v-show="activeSection === 'git'" class="settings-section">
          <h3 class="settings-section-title">Git</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">Commit and repository options.</p>

          <div class="settings-card space-y-5">
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
              <Checkbox v-model="signCommits" binary @update:model-value="saveSignCommits" />
              <span class="settings-label block text-rm-text">Sign commits (GPG/SSH)</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Use git commit -S when committing.</p>
            </label>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Default branch name</span>
              <p class="settings-desc">Default branch to use when creating or referring to repos (e.g. main, master).</p>
              <InputText v-model="gitDefaultBranch" type="text" class="max-w-xs mt-2" placeholder="main" @blur="saveGitDefaultBranch" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Auto-fetch interval</span>
              <p class="settings-desc">How often to run git fetch in the background (0 = off).</p>
              <Select v-model="gitAutoFetchIntervalMinutes" :options="gitAutoFetchIntervalOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveGitAutoFetchInterval" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">SSH key path (optional)</span>
              <p class="settings-desc">Path to SSH private key for Git operations. Leave empty for default.</p>
              <InputText v-model="gitSshKeyPath" type="text" class="mt-2" placeholder="~/.ssh/id_rsa" @blur="saveGitSshKeyPath" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Diff / merge tool (optional)</span>
              <p class="settings-desc">External diff or merge tool command (e.g. code --diff).</p>
              <InputText v-model="gitDiffTool" type="text" class="mt-2" placeholder="" @blur="saveGitDiffTool" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">GitHub token (default)</span>
              <p class="settings-desc">Optional. Higher API limits and ability to create or update releases. Stored locally.</p>
              <div class="settings-controls flex flex-wrap items-center gap-2 mt-2">
                <InputText v-model="githubToken" type="password" class="flex-1 min-w-0" placeholder="ghp_..." autocomplete="off" @blur="saveToken" />
                <Button variant="link" label="Create token" class="text-xs text-rm-accent p-0 min-w-0 h-auto shrink-0" @click="openUrl('https://github.com/settings/tokens')" />
              </div>
            </div>
          </div>
        </section>

        <!-- AI -->
        <section v-show="activeSection === 'ai'" class="settings-section">
          <h3 class="settings-section-title">AI</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">
            Used for commit messages, release notes, and test-fix suggestions.
            <span v-if="!license.hasLicense?.value" class="text-rm-warning"> Requires a license.</span>
          </p>

          <div class="settings-card space-y-5">
            <div class="settings-row">
              <span class="settings-label">Provider</span>
              <p class="settings-desc">Choose where to send prompts.</p>
              <Select v-model="aiProvider" :options="aiProviderOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveAiProvider" />
            </div>

            <!-- Ollama -->
            <div v-if="aiProvider === 'ollama'" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Ollama</span>
              <p class="settings-desc m-0">Local models. No API key needed. <Button variant="link" label="Download Ollama" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://ollama.com')" /></p>
              <div class="grid gap-3 mt-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Base URL</label>
                  <InputText v-model="ollamaBaseUrl" type="text" placeholder="http://localhost:11434" autocomplete="off" @blur="saveOllama" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
                  <div class="flex flex-wrap items-center gap-2">
                    <InputText v-model="ollamaModel" type="text" class="flex-1 min-w-0" placeholder="llama3.2" autocomplete="off" @blur="saveOllama" />
                    <Button severity="secondary" size="small" class="text-xs" :disabled="ollamaListLoading" @click="listOllamaModels">List models</Button>
                  </div>
                  <p v-if="ollamaModels.length" class="mt-1 text-xs text-rm-muted">Available: {{ ollamaModels.join(', ') }}</p>
                  <p v-else-if="ollamaListError" class="mt-1 text-xs text-rm-warning">{{ ollamaListError }}</p>
                </div>
              </div>
            </div>

            <!-- Claude -->
            <div v-if="aiProvider === 'claude'" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Claude (Anthropic)</span>
              <p class="settings-desc m-0">Anthropic API. <Button variant="link" label="Get API key" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://console.anthropic.com/')" /></p>
              <div class="grid gap-3 mt-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">API key</label>
                  <InputText v-model="claudeApiKey" type="password" placeholder="sk-ant-..." autocomplete="off" @blur="saveClaude" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
                  <Select v-model="claudeModelPreset" :options="claudeModelPresetOptions" optionLabel="label" optionValue="value" class="max-w-xs" @change="onClaudeModelPresetChange" />
                  <InputText v-if="claudeModelPreset === 'custom'" v-model="claudeModel" type="text" class="mt-2" placeholder="claude-sonnet-4-20250514" autocomplete="off" @blur="saveClaude" />
                </div>
              </div>
            </div>

            <!-- OpenAI -->
            <div v-if="aiProvider === 'openai'" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">OpenAI</span>
              <p class="settings-desc m-0">OpenAI API. <Button variant="link" label="Get API key" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://platform.openai.com/api-keys')" /></p>
              <div class="grid gap-3 mt-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">API key</label>
                  <InputText v-model="openaiApiKey" type="password" placeholder="sk-..." autocomplete="off" @blur="saveOpenAI" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
                  <Select v-model="openaiModelPreset" :options="openaiModelPresetOptions" optionLabel="label" optionValue="value" class="max-w-xs" @change="onOpenAiModelPresetChange" />
                  <InputText v-if="openaiModelPreset === 'custom'" v-model="openaiModel" type="text" class="mt-2" placeholder="gpt-4o-mini" autocomplete="off" @blur="saveOpenAI" />
                </div>
              </div>
            </div>

            <!-- Gemini -->
            <div v-if="aiProvider === 'gemini'" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Google Gemini</span>
              <p class="settings-desc m-0">Google AI Studio. <Button variant="link" label="Get API key" class="text-rm-accent p-0 min-w-0 h-auto inline" @click="openUrl('https://aistudio.google.com/apikey')" /></p>
              <div class="grid gap-3 mt-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">API key</label>
                  <InputText v-model="geminiApiKey" type="password" placeholder="AIza..." autocomplete="off" @blur="saveGemini" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
                  <Select v-model="geminiModelPreset" :options="geminiModelPresetOptions" optionLabel="label" optionValue="value" class="max-w-xs" @change="onGeminiModelPresetChange" />
                  <InputText v-if="geminiModelPreset === 'custom'" v-model="geminiModel" type="text" class="mt-2" placeholder="gemini-1.5-flash" autocomplete="off" @blur="saveGemini" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Tools -->
        <section v-show="activeSection === 'tools'" class="settings-section">
          <h3 class="settings-section-title">Tools</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">Editor and runtimes used when opening files or running commands.</p>

          <div class="settings-card space-y-5">
            <div class="settings-row">
              <span class="settings-label">Preferred editor</span>
              <p class="settings-desc">When opening a project or file from the Git section. Cursor and VS Code must be in your PATH.</p>
              <Select v-model="preferredEditor" :options="preferredEditorOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="savePreferredEditor" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">PHP executable (default)</span>
              <p class="settings-desc">Used for Composer and Pest.</p>
              <InputText v-model="phpPath" type="text" class="mt-2" placeholder="/opt/homebrew/opt/php/bin/php" autocomplete="off" @blur="savePhpPath" />
            </div>
          </div>
        </section>

        <!-- Appearance & behavior -->
        <section v-show="activeSection === 'appearance'" class="settings-section">
          <h3 class="settings-section-title">Appearance &amp; behavior</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">Theme, colors, density, and layout.</p>

          <div class="settings-card space-y-5">
            <div class="settings-row">
              <span class="settings-label">Theme</span>
              <p class="settings-desc">Light, dark, or follow your system.</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <Button
                  v-for="t in themeOptions"
                  :key="t.value"
                  :variant="theme === t.value ? 'outlined' : 'outlined'"
                  size="small"
                  class="appearance-option-btn px-3 py-2 rounded-rm text-sm font-medium min-w-0"
                  :class="theme === t.value ? 'border-rm-accent bg-rm-accent/15 text-rm-accent' : 'border-rm-border bg-rm-surface hover:bg-rm-surface-hover text-rm-text'"
                  @click="setTheme(t.value)"
                >
                  {{ t.label }}
                </Button>
              </div>
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Accent color</span>
              <p class="settings-desc">Buttons, links, and highlights.</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <Button
                  v-for="a in accentOptions"
                  :key="a.value"
                  variant="text"
                  size="small"
                  class="accent-swatch w-9 h-9 min-w-[2.25rem] min-h-[2.25rem] p-0 rounded-full border-2 transition-all"
                  :class="accentColor === a.value ? 'border-rm-text scale-110' : 'border-transparent hover:scale-105'"
                  :style="{ backgroundColor: a.hex }"
                  :title="a.label"
                  :aria-label="`Accent ${a.label}`"
                  @click="setAccent(a.value)"
                />
              </div>
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Density</span>
              <p class="settings-desc">Base font and spacing. Tighter fits more on screen; relaxed is easier to read.</p>
              <Select v-model="fontSize" :options="fontSizeOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveFontSize" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">UI zoom</span>
              <p class="settings-desc">Scale the entire interface (Electron webContents). Useful for high-DPI or accessibility.</p>
              <Select v-model="zoomFactor" :options="zoomOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveZoomFactor" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Corner style</span>
              <p class="settings-desc">Sharp, rounded, or pill-shaped buttons and inputs.</p>
              <Select v-model="borderRadius" :options="borderRadiusOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveBorderRadius" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
              <Checkbox v-model="reducedMotion" binary @update:model-value="saveReducedMotion" />
              <span class="settings-label block text-rm-text">Reduce motion</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Minimize animations and transitions. Aligns with system accessibility preferences.</p>
            </label>
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
              <Checkbox v-model="reduceTransparency" binary @update:model-value="saveReduceTransparency" />
              <span class="settings-label block text-rm-text">Reduce transparency</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Use solid backgrounds instead of semi-transparent panels. Improves readability (Electron / macOS-style).</p>
            </label>
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
              <Checkbox v-model="highContrast" binary @update:model-value="saveHighContrast" />
              <span class="settings-label block text-rm-text">High contrast</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Stronger borders and higher-contrast text. Helps with visibility (Electron / accessibility).</p>
            </label>
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
              <Checkbox v-model="useDetailTabs" binary @update:model-value="saveUseTabs" />
              <span class="settings-label block text-rm-text">Use tabs in project detail</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Switch between Git, Version & release, and other sections with tabs.</p>
            </label>
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label block mb-1">Terminal popout</span>
              <p class="settings-desc mb-3">When you open a terminal in a separate window, these options control its size and behavior (Electron window options).</p>
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Size</label>
                  <Select v-model="terminalPopoutSize" :options="terminalPopoutSizeOptions" optionLabel="label" optionValue="value" class="max-w-xs" @change="saveTerminalPopoutSize" />
                </div>
                <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
              <Checkbox v-model="terminalPopoutAlwaysOnTop" binary @update:model-value="saveTerminalPopoutAlwaysOnTop" />
              <span class="settings-label block text-rm-text">Always on top</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Keep the terminal window above other windows.</p>
            </label>
                <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
              <Checkbox v-model="terminalPopoutFullscreenable" binary @update:model-value="saveTerminalPopoutFullscreenable" />
              <span class="settings-label block text-rm-text">Allow fullscreen</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Allow the terminal window to enter fullscreen (e.g. green traffic light on macOS).</p>
            </label>
              </div>
            </div>
          </div>
        </section>

        <!-- Network -->
        <section v-show="activeSection === 'network'" class="settings-section">
          <h3 class="settings-section-title">Network</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">Proxy and connection options.</p>
          <div class="settings-card space-y-5">
            <div class="settings-row">
              <span class="settings-label">Proxy</span>
              <p class="settings-desc">Use system proxy or set custom (e.g. http://proxy:8080). Leave empty for system.</p>
              <InputText v-model="proxy" type="text" class="mt-2" placeholder="System or http://host:port" @blur="saveProxy" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Request timeout (seconds)</span>
              <Select v-model="requestTimeoutSeconds" :options="requestTimeoutOptions" optionLabel="label" optionValue="value" class="max-w-xs mt-2" @change="saveRequestTimeout" />
            </div>
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 pt-2 border-t border-rm-border">
              <Checkbox v-model="offlineMode" binary @update:model-value="saveOfflineMode" />
              <span class="settings-label block text-rm-text">Offline mode</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Disable network-dependent features.</p>
            </label>
          </div>
        </section>

        <!-- Extension settings (e.g. Email) -->
        <section
          v-for="ext in settingsExtensionSections"
          :key="ext.id"
          v-show="activeSection === ext.id"
          class="settings-section"
        >
          <component :is="ext.component" />
        </section>

        <!-- Keyboard -->
        <section v-show="activeSection === 'keyboard'" class="settings-section">
          <h3 class="settings-section-title">Keyboard</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">Shortcuts use app defaults. Custom shortcut editing may be added later.</p>
          <div class="settings-card">
            <p class="text-sm text-rm-muted m-0">Use View → Toggle Developer Tools to inspect.</p>
          </div>
        </section>

        <!-- Data & privacy -->
        <section v-show="activeSection === 'dataPrivacy'" class="settings-section">
          <h3 class="settings-section-title">Data &amp; privacy</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">Telemetry, crash reports, and settings backup.</p>
          <div class="settings-card space-y-5">
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
              <Checkbox v-model="telemetry" binary @update:model-value="saveTelemetry" />
              <span class="settings-label block text-rm-text">Telemetry / usage data</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Send usage events (e.g. app opened, feature used). Requires an endpoint URL (POST /api/telemetry, no auth). Throttle: 120/min per IP.</p>
            </label>
            <div v-if="telemetry" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Telemetry endpoint</span>
              <p class="settings-desc">Full URL to the telemetry API (e.g. https://your-server.com/api/telemetry).</p>
              <InputText v-model="telemetryEndpoint" type="url" class="mt-2" placeholder="https://your-server.com/api/telemetry" autocomplete="off" @blur="saveTelemetryEndpoint" />
            </div>
            <div v-if="telemetry" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">User identifier (optional)</span>
              <p class="settings-desc">Email or ID for context in events. Leave empty for anonymous.</p>
              <InputText v-model="telemetryUserIdentifier" type="text" class="mt-2 max-w-md" placeholder="user@example.com" autocomplete="off" @blur="saveTelemetryUserIdentifier" />
            </div>
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 pt-2 border-t border-rm-border">
              <Checkbox v-model="crashReports" binary @update:model-value="saveCrashReports" />
              <span class="settings-label block text-rm-text">Crash reports</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Send crash reports to help fix bugs. Requires an ingestion endpoint URL (POST /api/crash-reports, no auth).</p>
            </label>
            <div v-if="crashReports" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Crash report endpoint</span>
              <p class="settings-desc">Full URL to the crash report API (e.g. https://your-server.com/api/crash-reports). Throttling is per-IP on the server.</p>
              <InputText v-model="crashReportEndpoint" type="url" class="mt-2" placeholder="https://your-server.com/api/crash-reports" autocomplete="off" @blur="saveCrashReportEndpoint" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Settings backup</span>
              <p class="settings-desc">Export or import preferences. Reset restores defaults (does not remove projects).</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <Button severity="secondary" size="small" @click="exportSettingsToFile">Export</Button>
                <Button severity="secondary" size="small" @click="importSettingsFromFile">Import</Button>
                <Button severity="danger" size="small" @click="confirmResetSettings">Reset</Button>
              </div>
              <Message v-if="dataPrivacyMessage" :severity="dataPrivacyMessageOk ? 'success' : 'warn'" class="mt-2 text-sm">{{ dataPrivacyMessage }}</Message>
            </div>
          </div>
        </section>

        <!-- Window -->
        <section v-show="activeSection === 'window'" class="settings-section">
          <h3 class="settings-section-title">Window</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">Window behavior and tray.</p>
          <div class="settings-card space-y-5">
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
              <Checkbox v-model="alwaysOnTop" binary @update:model-value="saveAlwaysOnTop" />
              <span class="settings-label block text-rm-text">Always on top</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Keep the app window above other windows.</p>
            </label>
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 pt-2 border-t border-rm-border">
              <Checkbox v-model="minimizeToTray" binary @update:model-value="saveMinimizeToTray" />
              <span class="settings-label block text-rm-text">Minimize to tray</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Closing the window hides it to the system tray instead of quitting.</p>
            </label>
          </div>
        </section>

        <!-- Accessibility -->
        <section v-show="activeSection === 'accessibility'" class="settings-section">
          <h3 class="settings-section-title">Accessibility</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">Focus, cursor, and screen reader support.</p>
          <div class="settings-card space-y-5">
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
              <Checkbox v-model="focusOutlineVisible" binary @update:model-value="saveFocusOutlineVisible" />
              <span class="settings-label block text-rm-text">Always show focus outline</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Show a visible focus ring on keyboard focus.</p>
            </label>
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 pt-2 border-t border-rm-border">
              <Checkbox v-model="largeCursor" binary @update:model-value="saveLargeCursor" />
              <span class="settings-label block text-rm-text">Large cursor in inputs</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Use a larger text cursor in input fields.</p>
            </label>
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 pt-2 border-t border-rm-border">
              <Checkbox v-model="screenReaderSupport" binary @update:model-value="saveScreenReaderSupport" />
              <span class="settings-label block text-rm-text">Screen reader support</span>
              <p class="settings-desc m-0 text-sm text-rm-muted">Announce live regions for assistive technologies.</p>
            </label>
          </div>
        </section>

        <!-- Developer -->
        <section v-show="activeSection === 'developer'" class="settings-section">
          <h3 class="settings-section-title">Developer</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">Options for debugging and troubleshooting.</p>

          <div class="settings-card">
            <label class="settings-row settings-row-clickable grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
              <Checkbox v-model="debugLogging" binary @update:model-value="saveDebugLogging" />
              <span class="settings-label block text-rm-text">Enable debug logging</span>
              <p class="settings-desc m-0 text-sm text-rm-muted col-start-2">Log app actions (project load, IPC, preferences, nav). Renderer logs in DevTools; main process in terminal.</p>
            </label>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Divider from 'primevue/divider';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import { useSettings } from '../composables/useSettings';

const {
  sections,
  activeSection,
  license,
  themeOptions,
  accentOptions,
  defaultViewOptions,
  checkForUpdatesOptions,
  autoRefreshIntervalOptions,
  recentListLengthOptions,
  gitAutoFetchIntervalOptions,
  aiProviderOptions,
  claudeModelPresetOptions,
  openaiModelPresetOptions,
  geminiModelPresetOptions,
  preferredEditorOptions,
  fontSizeOptions,
  zoomOptions,
  borderRadiusOptions,
  terminalPopoutSizeOptions,
  requestTimeoutOptions,
  settingsExtensionSections,
  githubToken,
  signCommits,
  aiProvider,
  ollamaBaseUrl,
  ollamaModel,
  claudeApiKey,
  claudeModel,
  claudeModelPreset,
  openaiApiKey,
  openaiModel,
  openaiModelPreset,
  geminiApiKey,
  geminiModel,
  geminiModelPreset,
  preferredEditor,
  phpPath,
  useDetailTabs,
  debugLogging,
  theme,
  accentColor,
  fontSize,
  zoomFactor,
  borderRadius,
  reducedMotion,
  reduceTransparency,
  highContrast,
  terminalPopoutSize,
  terminalPopoutAlwaysOnTop,
  terminalPopoutFullscreenable,
  launchAtLogin,
  defaultView,
  checkForUpdates,
  confirmBeforeQuit,
  notificationsEnabled,
  notificationSound,
  notificationsOnlyWhenNotFocused,
  doubleClickToOpenProject,
  confirmDestructiveActions,
  autoRefreshIntervalSeconds,
  recentListLength,
  showTips,
  gitDefaultBranch,
  gitAutoFetchIntervalMinutes,
  gitSshKeyPath,
  gitDiffTool,
  proxy,
  requestTimeoutSeconds,
  offlineMode,
  telemetry,
  telemetryEndpoint,
  telemetryUserIdentifier,
  crashReports,
  crashReportEndpoint,
  dataPrivacyMessage,
  dataPrivacyMessageOk,
  alwaysOnTop,
  minimizeToTray,
  focusOutlineVisible,
  largeCursor,
  screenReaderSupport,
  ollamaModels,
  ollamaListLoading,
  ollamaListError,
  setTheme,
  setAccent,
  saveLaunchAtLogin,
  saveDefaultView,
  saveCheckForUpdates,
  saveConfirmBeforeQuit,
  saveNotificationsEnabled,
  saveNotificationSound,
  saveNotificationsOnlyWhenNotFocused,
  saveDoubleClickToOpenProject,
  saveConfirmDestructiveActions,
  saveAutoRefreshInterval,
  saveRecentListLength,
  saveShowTips,
  saveGitDefaultBranch,
  saveGitAutoFetchInterval,
  saveGitSshKeyPath,
  saveGitDiffTool,
  saveToken,
  openUrl,
  saveOllama,
  saveClaude,
  saveOpenAI,
  saveGemini,
  saveAiProvider,
  onClaudeModelPresetChange,
  onOpenAiModelPresetChange,
  onGeminiModelPresetChange,
  listOllamaModels,
  savePreferredEditor,
  savePhpPath,
  saveFontSize,
  saveZoomFactor,
  saveBorderRadius,
  saveReducedMotion,
  saveReduceTransparency,
  saveHighContrast,
  saveUseTabs,
  saveTerminalPopoutSize,
  saveTerminalPopoutAlwaysOnTop,
  saveTerminalPopoutFullscreenable,
  saveProxy,
  saveRequestTimeout,
  saveOfflineMode,
  saveTelemetry,
  saveTelemetryEndpoint,
  saveTelemetryUserIdentifier,
  saveCrashReports,
  saveCrashReportEndpoint,
  exportSettingsToFile,
  importSettingsFromFile,
  confirmResetSettings,
  saveAlwaysOnTop,
  saveMinimizeToTray,
  saveFocusOutlineVisible,
  saveLargeCursor,
  saveScreenReaderSupport,
  saveDebugLogging,
  saveSignCommits,
} = useSettings();
</script>

<style scoped>
.settings-root {
  background: rgb(var(--rm-bg));
}
.settings-nav {
  width: 12rem;
}
.settings-nav-title {
  letter-spacing: 0.05em;
}
.settings-nav-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
  color: rgb(var(--rm-text));
}
.settings-nav-btn:hover {
  background: rgb(var(--rm-surface-hover) / 0.6);
}
.settings-nav-btn-active,
.settings-nav-btn[aria-current="page"] {
  background: rgb(var(--rm-accent) / 0.15);
  color: rgb(var(--rm-accent));
  border-left: 3px solid rgb(var(--rm-accent));
  margin-left: -3px;
  padding-left: calc(0.75rem + 3px);
}
.settings-nav-btn:focus {
  outline: none;
}
.settings-nav-btn:focus-visible {
  box-shadow: 0 0 0 2px rgb(var(--rm-border-focus) / 0.4);
}
.settings-section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
  letter-spacing: -0.02em;
  margin: 0 0 0.25rem 0;
}
.settings-section-desc {
  margin: 0 0 1.5rem 0;
}
.settings-section {
  animation: settings-fade 0.15s ease-out;
}
@keyframes settings-fade {
  from { opacity: 0.6; }
  to { opacity: 1; }
}
.settings-card {
  background: rgb(var(--rm-surface));
  border: 1px solid rgb(var(--rm-border));
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
}
.settings-row {
  display: block;
}
/* Override .settings-row so checkbox + label are one line, description below (grid wins over block) */
.settings-row.settings-checkbox-inline {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: 0.75rem;
  row-gap: 0.25rem;
}
.settings-row.settings-checkbox-inline > .checkbox-input {
  grid-column: 1;
  grid-row: 1;
  align-self: center;
}
.settings-row.settings-checkbox-inline > div {
  display: contents;
}
.settings-row.settings-checkbox-inline .settings-label {
  grid-column: 2;
  grid-row: 1;
}
.settings-row.settings-checkbox-inline .settings-desc {
  grid-column: 2;
  grid-row: 2;
  margin: 0;
}
.settings-row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.settings-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgb(var(--rm-text));
}
.settings-status {
  font-size: 0.75rem;
  font-weight: 500;
}
.settings-desc {
  font-size: 0.8125rem;
  color: rgb(var(--rm-muted));
  margin: 0.25rem 0 0 0;
  line-height: 1.4;
}
.settings-desc a {
  color: inherit;
}
.settings-controls {
  margin-top: 0.5rem;
}
.settings-divider {
  height: 1px;
  background: rgb(var(--rm-border));
  margin: 1.25rem 0;
}

.settings-row-clickable:hover .settings-label {
  color: rgb(var(--rm-accent));
}
.settings-nav-icon :deep(svg) {
  stroke: currentColor;
  color: inherit;
}
.accent-swatch {
  cursor: pointer;
  border: 2px solid transparent;
}
</style>
