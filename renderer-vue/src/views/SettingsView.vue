<template>
  <div class="settings-root flex flex-1 min-h-0">
    <nav class="settings-nav shrink-0 flex flex-col border-r border-rm-border bg-rm-bg/50" aria-label="Settings sections">
      <div class="settings-nav-inner py-4 pr-2 pl-4">
        <h2 class="settings-nav-title text-xs font-semibold text-rm-muted uppercase tracking-wider px-3 mb-3">Settings</h2>
        <ul class="settings-nav-list list-none m-0 p-0 space-y-0.5">
          <li v-for="s in sections" :key="s.id">
            <button
              type="button"
              class="settings-nav-btn w-full text-left px-3 py-2.5 rounded-rm text-sm font-medium transition-colors flex items-center gap-2.5"
              :class="{ 'settings-nav-btn-active': activeSection === s.id }"
              :aria-current="activeSection === s.id ? 'page' : undefined"
              @click="activeSection = s.id"
            >
              <span class="settings-nav-icon shrink-0 flex items-center justify-center w-5 h-5 [&>svg]:w-[18px] [&>svg]:h-[18px]" aria-hidden="true" v-html="s.icon"></span>
              {{ s.label }}
            </button>
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
            <RmCheckbox v-model="launchAtLogin" row-layout label="Launch at login" description="Start the app when you log in to your computer." @change="saveLaunchAtLogin" />
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Open to</span>
              <p class="settings-desc">Default view when the app starts.</p>
              <RmSelect v-model="defaultView" :options="defaultViewOptions" option-label="label" option-value="value" class="max-w-xs mt-2" @change="saveDefaultView" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Check for updates</span>
              <p class="settings-desc">When to look for new versions.</p>
              <RmSelect v-model="checkForUpdates" :options="checkForUpdatesOptions" option-label="label" option-value="value" class="max-w-xs mt-2" @change="saveCheckForUpdates" />
            </div>
            <RmCheckbox v-model="confirmBeforeQuit" row-layout label="Confirm before closing" description="Ask for confirmation when quitting the app." class="pt-2 border-t border-rm-border" @change="saveConfirmBeforeQuit" />
          </div>
        </section>

        <!-- Notifications -->
        <section v-show="activeSection === 'notifications'" class="settings-section">
          <h3 class="settings-section-title">Notifications</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">In-app and system notifications.</p>
          <div class="settings-card space-y-5">
            <RmCheckbox v-model="notificationsEnabled" row-layout label="Enable notifications" description="Show in-app and system notifications for releases and errors." @change="saveNotificationsEnabled" />
            <RmCheckbox v-model="notificationSound" row-layout label="Notification sound" description="Play a sound when a notification appears." class="pt-2 border-t border-rm-border" @change="saveNotificationSound" />
            <RmCheckbox v-model="notificationsOnlyWhenNotFocused" row-layout label="Only when app is in background" description="Show system notifications only when the app is not focused." class="pt-2 border-t border-rm-border" @change="saveNotificationsOnlyWhenNotFocused" />
          </div>
        </section>

        <!-- Behavior -->
        <section v-show="activeSection === 'behavior'" class="settings-section">
          <h3 class="settings-section-title">Behavior</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">How you interact with projects and the UI.</p>
          <div class="settings-card space-y-5">
            <RmCheckbox v-model="doubleClickToOpenProject" row-layout label="Double-click to open project" description="Require double-click to open a project in the sidebar (single-click to select only)." @change="saveDoubleClickToOpenProject" />
            <RmCheckbox v-model="confirmDestructiveActions" row-layout label="Confirm destructive actions" description="Ask for confirmation before delete, release, or batch release." class="pt-2 border-t border-rm-border" @change="saveConfirmDestructiveActions" />
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Auto-refresh interval</span>
              <p class="settings-desc">How often to refresh project list and dashboard (0 = off).</p>
              <RmSelect v-model="autoRefreshIntervalSeconds" :options="autoRefreshIntervalOptions" option-label="label" option-value="value" class="max-w-xs mt-2" @change="saveAutoRefreshInterval" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Recent projects list length</span>
              <p class="settings-desc">Maximum number of recent projects to remember.</p>
              <RmSelect v-model="recentListLength" :options="recentListLengthOptions" option-label="label" option-value="value" class="max-w-xs mt-2" @change="saveRecentListLength" />
            </div>
            <RmCheckbox v-model="showTips" row-layout label="Show tips and onboarding" description="Show first-run tips and occasional hints. Uncheck to hide permanently." class="pt-2 border-t border-rm-border" @change="saveShowTips" />
          </div>
        </section>

        <!-- Git -->
        <section v-show="activeSection === 'git'" class="settings-section">
          <h3 class="settings-section-title">Git</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">Commit and repository options.</p>

          <div class="settings-card space-y-5">
            <RmCheckbox v-model="signCommits" row-layout label="Sign commits (GPG/SSH)" description="Use git commit -S when committing." @change="saveSignCommits" />
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Default branch name</span>
              <p class="settings-desc">Default branch to use when creating or referring to repos (e.g. main, master).</p>
              <RmInput v-model="gitDefaultBranch" type="text" class="max-w-xs mt-2" placeholder="main" @blur="saveGitDefaultBranch" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Auto-fetch interval</span>
              <p class="settings-desc">How often to run git fetch in the background (0 = off).</p>
              <RmSelect v-model="gitAutoFetchIntervalMinutes" :options="gitAutoFetchIntervalOptions" option-label="label" option-value="value" class="max-w-xs mt-2" @change="saveGitAutoFetchInterval" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">SSH key path (optional)</span>
              <p class="settings-desc">Path to SSH private key for Git operations. Leave empty for default.</p>
              <RmInput v-model="gitSshKeyPath" type="text" class="mt-2" placeholder="~/.ssh/id_rsa" @blur="saveGitSshKeyPath" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Diff / merge tool (optional)</span>
              <p class="settings-desc">External diff or merge tool command (e.g. code --diff).</p>
              <RmInput v-model="gitDiffTool" type="text" class="mt-2" placeholder="" @blur="saveGitDiffTool" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">GitHub token (default)</span>
              <p class="settings-desc">Optional. Higher API limits and ability to create or update releases. Stored locally.</p>
              <div class="settings-controls flex flex-wrap items-center gap-2 mt-2">
                <RmInput v-model="githubToken" type="password" class="flex-1 min-w-0" placeholder="ghp_..." autocomplete="off" @blur="saveToken" />
                <a href="#" class="text-xs text-rm-accent hover:underline shrink-0" @click.prevent="openUrl('https://github.com/settings/tokens')">Create token</a>
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
              <RmSelect v-model="aiProvider" :options="aiProviderOptions" option-label="label" option-value="value" class="max-w-xs mt-2" @change="saveAiProvider" />
            </div>

            <!-- Ollama -->
            <div v-if="aiProvider === 'ollama'" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Ollama</span>
              <p class="settings-desc">Local models. No API key needed. <a href="#" class="text-rm-accent hover:underline" @click.prevent="openUrl('https://ollama.com')">Download Ollama</a></p>
              <div class="grid gap-3 mt-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Base URL</label>
                  <RmInput v-model="ollamaBaseUrl" type="text" placeholder="http://localhost:11434" autocomplete="off" @blur="saveOllama" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
                  <div class="flex flex-wrap items-center gap-2">
                    <RmInput v-model="ollamaModel" type="text" class="flex-1 min-w-0" placeholder="llama3.2" autocomplete="off" @blur="saveOllama" />
                    <RmButton variant="secondary" size="compact" class="text-xs" :disabled="ollamaListLoading" @click="listOllamaModels">List models</RmButton>
                  </div>
                  <p v-if="ollamaModels.length" class="mt-1 text-xs text-rm-muted">Available: {{ ollamaModels.join(', ') }}</p>
                  <p v-else-if="ollamaListError" class="mt-1 text-xs text-rm-warning">{{ ollamaListError }}</p>
                </div>
              </div>
            </div>

            <!-- Claude -->
            <div v-if="aiProvider === 'claude'" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Claude (Anthropic)</span>
              <p class="settings-desc">Anthropic API. <a href="#" class="text-rm-accent hover:underline" @click.prevent="openUrl('https://console.anthropic.com/')">Get API key</a></p>
              <div class="grid gap-3 mt-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">API key</label>
                  <RmInput v-model="claudeApiKey" type="password" placeholder="sk-ant-..." autocomplete="off" @blur="saveClaude" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
                  <RmSelect v-model="claudeModelPreset" :options="claudeModelPresetOptions" option-label="label" option-value="value" class="max-w-xs" @change="onClaudeModelPresetChange" />
                  <RmInput v-if="claudeModelPreset === 'custom'" v-model="claudeModel" type="text" class="mt-2" placeholder="claude-sonnet-4-20250514" autocomplete="off" @blur="saveClaude" />
                </div>
              </div>
            </div>

            <!-- OpenAI -->
            <div v-if="aiProvider === 'openai'" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">OpenAI</span>
              <p class="settings-desc">OpenAI API. <a href="#" class="text-rm-accent hover:underline" @click.prevent="openUrl('https://platform.openai.com/api-keys')">Get API key</a></p>
              <div class="grid gap-3 mt-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">API key</label>
                  <RmInput v-model="openaiApiKey" type="password" placeholder="sk-..." autocomplete="off" @blur="saveOpenAI" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
                  <RmSelect v-model="openaiModelPreset" :options="openaiModelPresetOptions" option-label="label" option-value="value" class="max-w-xs" @change="onOpenAiModelPresetChange" />
                  <RmInput v-if="openaiModelPreset === 'custom'" v-model="openaiModel" type="text" class="mt-2" placeholder="gpt-4o-mini" autocomplete="off" @blur="saveOpenAI" />
                </div>
              </div>
            </div>

            <!-- Gemini -->
            <div v-if="aiProvider === 'gemini'" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Google Gemini</span>
              <p class="settings-desc">Google AI Studio. <a href="#" class="text-rm-accent hover:underline" @click.prevent="openUrl('https://aistudio.google.com/apikey')">Get API key</a></p>
              <div class="grid gap-3 mt-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">API key</label>
                  <RmInput v-model="geminiApiKey" type="password" placeholder="AIza..." autocomplete="off" @blur="saveGemini" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Model</label>
                  <RmSelect v-model="geminiModelPreset" :options="geminiModelPresetOptions" option-label="label" option-value="value" class="max-w-xs" @change="onGeminiModelPresetChange" />
                  <RmInput v-if="geminiModelPreset === 'custom'" v-model="geminiModel" type="text" class="mt-2" placeholder="gemini-1.5-flash" autocomplete="off" @blur="saveGemini" />
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
              <RmSelect v-model="preferredEditor" :options="preferredEditorOptions" option-label="label" option-value="value" class="max-w-xs mt-2" @change="savePreferredEditor" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">PHP executable (default)</span>
              <p class="settings-desc">Used for Composer and Pest.</p>
              <RmInput v-model="phpPath" type="text" class="mt-2" placeholder="/opt/homebrew/opt/php/bin/php" autocomplete="off" @blur="savePhpPath" />
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
                <button
                  v-for="t in themeOptions"
                  :key="t.value"
                  type="button"
                  class="appearance-option-btn px-3 py-2 rounded-rm text-sm font-medium border transition-colors"
                  :class="theme === t.value ? 'border-rm-accent bg-rm-accent/15 text-rm-accent' : 'border-rm-border bg-rm-surface hover:bg-rm-surface-hover text-rm-text'"
                  @click="setTheme(t.value)"
                >
                  {{ t.label }}
                </button>
              </div>
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Accent color</span>
              <p class="settings-desc">Buttons, links, and highlights.</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <button
                  v-for="a in accentOptions"
                  :key="a.value"
                  type="button"
                  class="accent-swatch w-9 h-9 rounded-full border-2 transition-all"
                  :class="accentColor === a.value ? 'border-rm-text scale-110' : 'border-transparent hover:scale-105'"
                  :style="{ backgroundColor: a.hex }"
                  :title="a.label"
                  aria-label="Accent {{ a.label }}"
                  @click="setAccent(a.value)"
                />
              </div>
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Density</span>
              <p class="settings-desc">Base font and spacing. Tighter fits more on screen; relaxed is easier to read.</p>
              <RmSelect v-model="fontSize" :options="fontSizeOptions" option-label="label" option-value="value" class="max-w-xs mt-2" @change="saveFontSize" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">UI zoom</span>
              <p class="settings-desc">Scale the entire interface (Electron webContents). Useful for high-DPI or accessibility.</p>
              <RmSelect v-model="zoomFactor" :options="zoomOptions" option-label="label" option-value="value" class="max-w-xs mt-2" @change="saveZoomFactor" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Corner style</span>
              <p class="settings-desc">Sharp, rounded, or pill-shaped buttons and inputs.</p>
              <RmSelect v-model="borderRadius" :options="borderRadiusOptions" option-label="label" option-value="value" class="max-w-xs mt-2" @change="saveBorderRadius" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <RmCheckbox v-model="reducedMotion" row-layout label="Reduce motion" description="Minimize animations and transitions. Aligns with system accessibility preferences." @change="saveReducedMotion" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <RmCheckbox v-model="reduceTransparency" row-layout label="Reduce transparency" description="Use solid backgrounds instead of semi-transparent panels. Improves readability (Electron / macOS-style)." @change="saveReduceTransparency" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <RmCheckbox v-model="highContrast" row-layout label="High contrast" description="Stronger borders and higher-contrast text. Helps with visibility (Electron / accessibility)." @change="saveHighContrast" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <RmCheckbox v-model="useDetailTabs" row-layout label="Use tabs in project detail" description="Switch between Git, Version & release, and other sections with tabs." @change="saveUseTabs" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label block mb-1">Terminal popout</span>
              <p class="settings-desc mb-3">When you open a terminal in a separate window, these options control its size and behavior (Electron window options).</p>
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-rm-muted mb-1">Size</label>
                  <RmSelect v-model="terminalPopoutSize" :options="terminalPopoutSizeOptions" option-label="label" option-value="value" class="max-w-xs" @change="saveTerminalPopoutSize" />
                </div>
                <RmCheckbox v-model="terminalPopoutAlwaysOnTop" row-layout label="Always on top" description="Keep the terminal window above other windows." @change="saveTerminalPopoutAlwaysOnTop" />
                <RmCheckbox v-model="terminalPopoutFullscreenable" row-layout label="Allow fullscreen" description="Allow the terminal window to enter fullscreen (e.g. green traffic light on macOS)." @change="saveTerminalPopoutFullscreenable" />
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
              <RmInput v-model="proxy" type="text" class="mt-2" placeholder="System or http://host:port" @blur="saveProxy" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Request timeout (seconds)</span>
              <RmSelect v-model="requestTimeoutSeconds" :options="requestTimeoutOptions" option-label="label" option-value="value" class="max-w-xs mt-2" @change="saveRequestTimeout" />
            </div>
            <RmCheckbox v-model="offlineMode" row-layout label="Offline mode" description="Disable network-dependent features." class="pt-2 border-t border-rm-border" @change="saveOfflineMode" />
          </div>
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
            <RmCheckbox v-model="telemetry" row-layout label="Telemetry / usage data" description="Send usage events (e.g. app opened, feature used). Requires an endpoint URL (POST /api/telemetry, no auth). Throttle: 120/min per IP." @change="saveTelemetry" />
            <div v-if="telemetry" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Telemetry endpoint</span>
              <p class="settings-desc">Full URL to the telemetry API (e.g. https://your-server.com/api/telemetry).</p>
              <RmInput v-model="telemetryEndpoint" type="url" class="mt-2" placeholder="https://your-server.com/api/telemetry" autocomplete="off" @blur="saveTelemetryEndpoint" />
            </div>
            <div v-if="telemetry" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">User identifier (optional)</span>
              <p class="settings-desc">Email or ID for context in events. Leave empty for anonymous.</p>
              <RmInput v-model="telemetryUserIdentifier" type="text" class="mt-2 max-w-md" placeholder="user@example.com" autocomplete="off" @blur="saveTelemetryUserIdentifier" />
            </div>
            <RmCheckbox v-model="crashReports" row-layout label="Crash reports" description="Send crash reports to help fix bugs. Requires an ingestion endpoint URL (POST /api/crash-reports, no auth)." class="pt-2 border-t border-rm-border" @change="saveCrashReports" />
            <div v-if="crashReports" class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Crash report endpoint</span>
              <p class="settings-desc">Full URL to the crash report API (e.g. https://your-server.com/api/crash-reports). Throttling is per-IP on the server.</p>
              <RmInput v-model="crashReportEndpoint" type="url" class="mt-2" placeholder="https://your-server.com/api/crash-reports" autocomplete="off" @blur="saveCrashReportEndpoint" />
            </div>
            <div class="settings-row pt-2 border-t border-rm-border">
              <span class="settings-label">Settings backup</span>
              <p class="settings-desc">Export or import preferences. Reset restores defaults (does not remove projects).</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <RmButton variant="secondary" size="compact" @click="exportSettingsToFile">Export</RmButton>
                <RmButton variant="secondary" size="compact" @click="importSettingsFromFile">Import</RmButton>
                <RmButton variant="secondary" size="compact" class="text-rm-warning" @click="confirmResetSettings">Reset</RmButton>
              </div>
              <p v-if="dataPrivacyMessage" class="mt-2 text-sm m-0" :class="dataPrivacyMessageOk ? 'text-rm-success' : 'text-rm-warning'">{{ dataPrivacyMessage }}</p>
            </div>
          </div>
        </section>

        <!-- Window -->
        <section v-show="activeSection === 'window'" class="settings-section">
          <h3 class="settings-section-title">Window</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">Window behavior and tray.</p>
          <div class="settings-card space-y-5">
            <RmCheckbox v-model="alwaysOnTop" row-layout label="Always on top" description="Keep the app window above other windows." @change="saveAlwaysOnTop" />
            <RmCheckbox v-model="minimizeToTray" row-layout label="Minimize to tray" description="Closing the window hides it to the system tray instead of quitting." class="pt-2 border-t border-rm-border" @change="saveMinimizeToTray" />
          </div>
        </section>

        <!-- Accessibility -->
        <section v-show="activeSection === 'accessibility'" class="settings-section">
          <h3 class="settings-section-title">Accessibility</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">Focus, cursor, and screen reader support.</p>
          <div class="settings-card space-y-5">
            <RmCheckbox v-model="focusOutlineVisible" row-layout label="Always show focus outline" description="Show a visible focus ring on keyboard focus." @change="saveFocusOutlineVisible" />
            <RmCheckbox v-model="largeCursor" row-layout label="Large cursor in inputs" description="Use a larger text cursor in input fields." class="pt-2 border-t border-rm-border" @change="saveLargeCursor" />
            <RmCheckbox v-model="screenReaderSupport" row-layout label="Screen reader support" description="Announce live regions for assistive technologies." class="pt-2 border-t border-rm-border" @change="saveScreenReaderSupport" />
          </div>
        </section>

        <!-- Developer -->
        <section v-show="activeSection === 'developer'" class="settings-section">
          <h3 class="settings-section-title">Developer</h3>
          <p class="settings-section-desc text-sm text-rm-muted mb-6">Options for debugging and troubleshooting.</p>

          <div class="settings-card">
            <RmCheckbox v-model="debugLogging" row-layout label="Enable debug logging" description="Log app actions (project load, IPC, preferences, nav). Renderer logs in DevTools; main process in terminal." @change="saveDebugLogging" />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RmButton, RmCheckbox, RmInput, RmSelect } from '../components/ui';
import { useAppStore } from '../stores/app';
import { useApi } from '../composables/useApi';
import { useLicense } from '../composables/useLicense';
import { useModals } from '../composables/useModals';
import { useNotifications } from '../composables/useNotifications';
import * as debug from '../utils/debug';

const store = useAppStore();
const api = useApi();
const license = useLicense();
const modals = useModals();
const notifications = useNotifications();

const SECTION_ICONS = {
  account: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  git: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a3 3 0 0 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 15a3 3 0 0 0 6 0"/></svg>',
  ai: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2 1.33-2 0 0-2.77 2.24-5 5-5 1.66 0 3 1.35 3 3.02 0 1.33 2 1.33 2 0"/></svg>',
  tools: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  appearance: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.648 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c1.051 0 1.906-.855 1.906-1.906V12"/><path d="M18 2a4 4 0 0 1 4 4"/></svg>',
  developer: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>',
  application: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>',
  notifications: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  behavior: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="m8 7 4-4 4 4"/><path d="m8 17 4 4 4-4"/><path d="M3 12h3"/><path d="M18 12h3"/></svg>',
  keyboard: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01"/><path d="M10 10h.01"/><path d="M14 10h.01"/><path d="M18 10h.01"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/></svg>',
  dataPrivacy: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  network: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  window: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20"/><path d="M6 12h.01"/><path d="M10 12h.01"/><path d="M14 12h.01"/></svg>',
  accessibility: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><path d="M12 14v6"/><path d="M9 18h6"/><path d="M12 14l-3 4"/><path d="M12 14l3 4"/><path d="M12 8a4 4 0 0 0-4 4v2"/><path d="M12 8a4 4 0 0 1 4 4v2"/></svg>',
};
const sections = [
  { id: 'application', label: 'Application', icon: SECTION_ICONS.application },
  { id: 'notifications', label: 'Notifications', icon: SECTION_ICONS.notifications },
  { id: 'behavior', label: 'Behavior', icon: SECTION_ICONS.behavior },
  { id: 'git', label: 'Git', icon: SECTION_ICONS.git },
  { id: 'ai', label: 'AI', icon: SECTION_ICONS.ai },
  { id: 'tools', label: 'Tools', icon: SECTION_ICONS.tools },
  { id: 'network', label: 'Network', icon: SECTION_ICONS.network },
  { id: 'keyboard', label: 'Keyboard', icon: SECTION_ICONS.keyboard },
  { id: 'dataPrivacy', label: 'Data & privacy', icon: SECTION_ICONS.dataPrivacy },
  { id: 'window', label: 'Window', icon: SECTION_ICONS.window },
  { id: 'appearance', label: 'Appearance', icon: SECTION_ICONS.appearance },
  { id: 'accessibility', label: 'Accessibility', icon: SECTION_ICONS.accessibility },
  { id: 'developer', label: 'Developer', icon: SECTION_ICONS.developer },
];

const activeSection = ref('application');

const githubToken = ref('');
const signCommits = ref(false);
const aiProvider = ref('ollama');
const ollamaBaseUrl = ref('');
const ollamaModel = ref('');
const claudeApiKey = ref('');
const claudeModel = ref('');
const openaiApiKey = ref('');
const openaiModel = ref('');
const claudeModelPreset = ref('claude-sonnet-4-20250514');
const openaiModelPreset = ref('gpt-4o-mini');
const geminiApiKey = ref('');
const geminiModel = ref('');
const geminiModelPreset = ref('gemini-1.5-flash');
const preferredEditor = ref('');
const phpPath = ref('');
const useDetailTabs = ref(true);
const debugLogging = ref(false);
const theme = ref('dark');
const themeOptions = [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'System' }];
const accentColor = ref('green');
const accentOptions = [
  { value: 'green', label: 'Green', hex: 'rgb(34, 197, 94)' },
  { value: 'blue', label: 'Blue', hex: 'rgb(59, 130, 246)' },
  { value: 'purple', label: 'Purple', hex: 'rgb(168, 85, 247)' },
  { value: 'amber', label: 'Amber', hex: 'rgb(245, 158, 11)' },
  { value: 'rose', label: 'Rose', hex: 'rgb(244, 63, 94)' },
];
const fontSize = ref('comfortable');
const zoomFactor = ref(1);
const zoomOptions = [
  { value: 0.8, label: '80%' },
  { value: 0.9, label: '90%' },
  { value: 1, label: '100%' },
  { value: 1.1, label: '110%' },
  { value: 1.25, label: '125%' },
  { value: 1.5, label: '150%' },
];
const defaultViewOptions = [
  { value: 'last', label: 'Last view' },
  { value: 'detail', label: 'Project detail' },
  { value: 'dashboard', label: 'Dashboard' },
];
const checkForUpdatesOptions = [
  { value: 'auto', label: 'Automatically' },
  { value: 'manual', label: 'Manually only' },
  { value: 'never', label: 'Never' },
];
const autoRefreshIntervalOptions = [
  { value: 0, label: 'Off' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
];
const recentListLengthOptions = [
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 20, label: '20' },
];
const gitAutoFetchIntervalOptions = [
  { value: 0, label: 'Off' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
];
const aiProviderOptions = [
  { value: 'ollama', label: 'Ollama (local)' },
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
];
const claudeModelPresetOptions = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  { value: 'custom', label: 'Custom...' },
];
const openaiModelPresetOptions = [
  { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'o1-mini', label: 'o1 mini' },
  { value: 'custom', label: 'Custom...' },
];
const geminiModelPresetOptions = [
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'custom', label: 'Custom...' },
];
const preferredEditorOptions = [
  { value: '', label: 'Default (Cursor, then VS Code)' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'code', label: 'VS Code' },
];
const fontSizeOptions = [
  { value: 'tighter', label: 'Tighter' },
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious', label: 'Spacious' },
  { value: 'relaxed', label: 'Relaxed' },
];
const borderRadiusOptions = [
  { value: 'sharp', label: 'Sharp' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'pill', label: 'Pill' },
];
const terminalPopoutSizeOptions = [
  { value: 'compact', label: 'Compact' },
  { value: 'default', label: 'Default' },
  { value: 'spacious', label: 'Spacious' },
];
const requestTimeoutOptions = [
  { value: 10, label: '10' },
  { value: 30, label: '30' },
  { value: 60, label: '60' },
];
const borderRadius = ref('sharp');
const reducedMotion = ref(false);
const reduceTransparency = ref(false);
const highContrast = ref(false);
const terminalPopoutSize = ref('default');
const terminalPopoutAlwaysOnTop = ref(false);
const terminalPopoutFullscreenable = ref(true);
const launchAtLogin = ref(false);
const defaultView = ref('last');
const checkForUpdates = ref('auto');
const confirmBeforeQuit = ref(false);
const notificationsEnabled = ref(true);
const notificationSound = ref(false);
const notificationsOnlyWhenNotFocused = ref(false);
const doubleClickToOpenProject = ref(false);
const confirmDestructiveActions = ref(true);
const autoRefreshIntervalSeconds = ref(0);
const recentListLength = ref(10);
const showTips = ref(true);
const gitDefaultBranch = ref('main');
const gitAutoFetchIntervalMinutes = ref(0);
const gitSshKeyPath = ref('');
const gitDiffTool = ref('');
const proxy = ref('');
const requestTimeoutSeconds = ref(30);
const offlineMode = ref(false);
const telemetry = ref(false);
const telemetryEndpoint = ref('');
const telemetryUserIdentifier = ref('');
const crashReports = ref(false);
const crashReportEndpoint = ref('');
const dataPrivacyMessage = ref('');
const dataPrivacyMessageOk = ref(false);
const alwaysOnTop = ref(false);
const minimizeToTray = ref(false);
const focusOutlineVisible = ref(false);
const largeCursor = ref(false);
const screenReaderSupport = ref(false);
const ollamaModels = ref([]);
const ollamaListLoading = ref(false);
const ollamaListError = ref('');

onMounted(async () => {
  try {
    const [token, ollama, claude, openai, geminiSettings, provider, editor, php, sign, tabs, debugLoad, themeRes, appearanceAccent, appearanceFontSize, appearanceRadius, appearanceReducedMotion, appearanceZoomFactor, appearanceReduceTransparency, appearanceHighContrast, terminalSize, terminalAlwaysOnTop, terminalFullscreenable, launchAtLoginRes, defaultViewP, checkForUpdatesP, confirmBeforeQuitP, notificationsEnabledP, notificationSoundP, notificationsOnlyWhenNotFocusedP, doubleClickToOpenProjectP, confirmDestructiveActionsP, autoRefreshIntervalSecondsP, recentListLengthP, showTipsP, gitDefaultBranchP, gitAutoFetchIntervalMinutesP, gitSshKeyPathP, gitDiffToolP, proxyP, requestTimeoutSecondsP, offlineModeP, telemetryP, telemetryEndpointP, telemetryUserIdentifierP, crashReportsP, crashReportEndpointP, alwaysOnTopP, minimizeToTrayP, focusOutlineVisibleP, largeCursorP, screenReaderSupportP] = await Promise.all([
      api.getGitHubToken?.() ?? '',
      api.getOllamaSettings?.() ?? {},
      api.getClaudeSettings?.() ?? {},
      api.getOpenAISettings?.() ?? {},
      api.getGeminiSettings?.().catch(() => ({ apiKey: '', model: '' })),
      api.getAiProvider?.().catch(() => 'ollama'),
      api.getPreference?.('preferredEditor').catch(() => ''),
      api.getPreference?.('phpPath').catch(() => ''),
      api.getPreference?.('signCommits').catch(() => false),
      api.getPreference?.('detailUseTabs').catch(() => true),
      api.getPreference?.('debug').catch(() => undefined),
      api.getTheme?.().catch(() => ({ theme: 'dark' })),
      api.getPreference?.('appearanceAccent').catch(() => 'green'),
      api.getPreference?.('appearanceFontSize').catch(() => 'comfortable'),
      api.getPreference?.('appearanceRadius').catch(() => 'sharp'),
      api.getPreference?.('appearanceReducedMotion').catch(() => false),
      api.getAppZoomFactor?.().catch(() => 1),
      api.getPreference?.('appearanceReduceTransparency').catch(() => false),
      api.getPreference?.('appearanceHighContrast').catch(() => false),
      api.getPreference?.('terminalPopoutSize').catch(() => 'default'),
      api.getPreference?.('terminalPopoutAlwaysOnTop').catch(() => false),
      api.getPreference?.('terminalPopoutFullscreenable').catch(() => true),
      api.getLaunchAtLogin?.().catch(() => ({ openAtLogin: false })),
      api.getPreference?.('defaultView').catch(() => 'last'),
      api.getPreference?.('checkForUpdates').catch(() => 'auto'),
      api.getConfirmBeforeQuit?.().catch(() => false),
      api.getPreference?.('notificationsEnabled').catch(() => true),
      api.getPreference?.('notificationSound').catch(() => false),
      api.getPreference?.('notificationsOnlyWhenNotFocused').catch(() => false),
      api.getPreference?.('doubleClickToOpenProject').catch(() => false),
      api.getPreference?.('confirmDestructiveActions').catch(() => true),
      api.getPreference?.('autoRefreshIntervalSeconds').catch(() => 0),
      api.getPreference?.('recentListLength').catch(() => 10),
      api.getPreference?.('showTips').catch(() => true),
      api.getPreference?.('gitDefaultBranch').catch(() => 'main'),
      api.getPreference?.('gitAutoFetchIntervalMinutes').catch(() => 0),
      api.getPreference?.('gitSshKeyPath').catch(() => ''),
      api.getPreference?.('gitDiffTool').catch(() => ''),
      api.getProxy?.().catch(() => ''),
      api.getPreference?.('requestTimeoutSeconds').catch(() => 30),
      api.getPreference?.('offlineMode').catch(() => false),
      api.getPreference?.('telemetry').catch(() => false),
      api.getPreference?.('telemetryEndpoint').catch(() => ''),
      api.getPreference?.('telemetryUserIdentifier').catch(() => ''),
      api.getPreference?.('crashReports').catch(() => false),
      api.getPreference?.('crashReportEndpoint').catch(() => ''),
      api.getAlwaysOnTop?.().catch(() => false),
      api.getMinimizeToTray?.().catch(() => false),
      api.getPreference?.('focusOutlineVisible').catch(() => false),
      api.getPreference?.('largeCursor').catch(() => false),
      api.getPreference?.('screenReaderSupport').catch(() => false),
    ]);
    githubToken.value = token || '';
    ollamaBaseUrl.value = ollama?.baseUrl || '';
    ollamaModel.value = ollama?.model || '';
    claudeApiKey.value = claude?.apiKey || '';
    claudeModel.value = claude?.model || '';
    openaiApiKey.value = openai?.apiKey || '';
    openaiModel.value = openai?.model || '';
    geminiApiKey.value = geminiSettings?.apiKey || '';
    geminiModel.value = geminiSettings?.model || '';
    const claudePresets = ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'];
    claudeModelPreset.value = claudePresets.includes(claude?.model?.trim()) ? claude.model.trim() : 'custom';
    const openaiPresets = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-mini'];
    openaiModelPreset.value = openaiPresets.includes(openai?.model?.trim()) ? openai.model.trim() : 'custom';
    const geminiPresets = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-8b', 'gemini-2.0-flash'];
    geminiModelPreset.value = geminiPresets.includes(geminiSettings?.model?.trim()) ? geminiSettings.model.trim() : 'custom';
    aiProvider.value = provider === 'claude' ? 'claude' : provider === 'openai' ? 'openai' : provider === 'gemini' ? 'gemini' : 'ollama';
    preferredEditor.value = editor === 'cursor' || editor === 'code' ? editor : '';
    phpPath.value = php || '';
    signCommits.value = !!sign;
    useDetailTabs.value = tabs !== false;
    debugLogging.value = debugLoad !== false;
    debug.setEnabled(debugLoad !== false);
    store.setUseDetailTabs(tabs !== false);
    if (themeRes?.theme) theme.value = themeRes.theme;
    if (appearanceAccent && ['green', 'blue', 'purple', 'amber', 'rose'].includes(appearanceAccent)) accentColor.value = appearanceAccent;
    if (appearanceFontSize && ['tighter', 'compact', 'comfortable', 'spacious', 'relaxed'].includes(appearanceFontSize)) fontSize.value = appearanceFontSize;
    if (appearanceRadius && ['sharp', 'rounded', 'pill'].includes(appearanceRadius)) borderRadius.value = appearanceRadius;
    reducedMotion.value = !!appearanceReducedMotion;
    reduceTransparency.value = !!appearanceReduceTransparency;
    highContrast.value = !!appearanceHighContrast;
    const zoom = appearanceZoomFactor;
    zoomFactor.value = typeof zoom === 'number' && zoom > 0 ? zoom : 1;
    if (terminalSize && ['compact', 'default', 'spacious'].includes(terminalSize)) terminalPopoutSize.value = terminalSize;
    terminalPopoutAlwaysOnTop.value = !!terminalAlwaysOnTop;
    terminalPopoutFullscreenable.value = terminalFullscreenable !== false;
    launchAtLogin.value = !!launchAtLoginRes?.openAtLogin;
    defaultView.value = defaultViewP === 'dashboard' || defaultViewP === 'detail' ? defaultViewP : 'last';
    checkForUpdates.value = checkForUpdatesP === 'manual' || checkForUpdatesP === 'never' ? checkForUpdatesP : 'auto';
    confirmBeforeQuit.value = !!confirmBeforeQuitP;
    notificationsEnabled.value = notificationsEnabledP !== false;
    notificationSound.value = !!notificationSoundP;
    notificationsOnlyWhenNotFocused.value = !!notificationsOnlyWhenNotFocusedP;
    doubleClickToOpenProject.value = !!doubleClickToOpenProjectP;
    confirmDestructiveActions.value = confirmDestructiveActionsP !== false;
    autoRefreshIntervalSeconds.value = typeof autoRefreshIntervalSecondsP === 'number' ? autoRefreshIntervalSecondsP : 0;
    recentListLength.value = [5, 10, 20].includes(recentListLengthP) ? recentListLengthP : 10;
    showTips.value = showTipsP !== false;
    gitDefaultBranch.value = gitDefaultBranchP || 'main';
    gitAutoFetchIntervalMinutes.value = typeof gitAutoFetchIntervalMinutesP === 'number' ? gitAutoFetchIntervalMinutesP : 0;
    gitSshKeyPath.value = gitSshKeyPathP || '';
    gitDiffTool.value = gitDiffToolP || '';
    proxy.value = proxyP || '';
    requestTimeoutSeconds.value = [10, 30, 60].includes(requestTimeoutSecondsP) ? requestTimeoutSecondsP : 30;
    offlineMode.value = !!offlineModeP;
    telemetry.value = !!telemetryP;
    telemetryEndpoint.value = typeof telemetryEndpointP === 'string' ? telemetryEndpointP : '';
    telemetryUserIdentifier.value = typeof telemetryUserIdentifierP === 'string' ? telemetryUserIdentifierP : '';
    crashReports.value = !!crashReportsP;
    crashReportEndpoint.value = typeof crashReportEndpointP === 'string' ? crashReportEndpointP : '';
    alwaysOnTop.value = !!alwaysOnTopP;
    minimizeToTray.value = !!minimizeToTrayP;
    focusOutlineVisible.value = !!focusOutlineVisibleP;
    largeCursor.value = !!largeCursorP;
    screenReaderSupport.value = !!screenReaderSupportP;
    applyAppearance();
  } catch (_) {}
});

function applyAppearance() {
  const el = document.documentElement;
  el.setAttribute('data-accent', accentColor.value);
  el.setAttribute('data-font-size', fontSize.value);
  el.setAttribute('data-radius', borderRadius.value);
  el.setAttribute('data-reduced-motion', reducedMotion.value ? 'true' : 'false');
  el.setAttribute('data-reduce-transparency', reduceTransparency.value ? 'true' : 'false');
  el.setAttribute('data-high-contrast', highContrast.value ? 'true' : 'false');
  el.setAttribute('data-focus-outline-visible', focusOutlineVisible.value ? 'true' : 'false');
  el.setAttribute('data-large-cursor', largeCursor.value ? 'true' : 'false');
  el.setAttribute('data-screen-reader-support', screenReaderSupport.value ? 'true' : 'false');
}

function setTheme(value) {
  theme.value = value;
  if (api.setTheme) api.setTheme(value);
}

function setAccent(value) {
  accentColor.value = value;
  api.setPreference?.('appearanceAccent', value);
  applyAppearance();
}

function saveFontSize() {
  api.setPreference?.('appearanceFontSize', fontSize.value);
  applyAppearance();
}

function saveBorderRadius() {
  api.setPreference?.('appearanceRadius', borderRadius.value);
  applyAppearance();
}

function saveReducedMotion() {
  api.setPreference?.('appearanceReducedMotion', reducedMotion.value);
  applyAppearance();
}

function saveZoomFactor() {
  const f = zoomFactor.value;
  api.setAppZoomFactor?.(typeof f === 'number' ? f : 1);
}

function saveReduceTransparency() {
  api.setPreference?.('appearanceReduceTransparency', reduceTransparency.value);
  applyAppearance();
}

function saveHighContrast() {
  api.setPreference?.('appearanceHighContrast', highContrast.value);
  applyAppearance();
}

function saveLaunchAtLogin() {
  const res = api.setLaunchAtLogin?.(launchAtLogin.value);
  if (res && !res.ok) dataPrivacyMessage.value = res.error || 'Failed';
}
function saveDefaultView() {
  api.setPreference?.('defaultView', defaultView.value);
}
function saveCheckForUpdates() {
  api.setPreference?.('checkForUpdates', checkForUpdates.value);
}
function saveConfirmBeforeQuit() {
  api.setConfirmBeforeQuit?.(confirmBeforeQuit.value);
}
function saveNotificationsEnabled() {
  api.setPreference?.('notificationsEnabled', notificationsEnabled.value);
}
function saveNotificationSound() {
  api.setPreference?.('notificationSound', notificationSound.value);
}
function saveNotificationsOnlyWhenNotFocused() {
  api.setPreference?.('notificationsOnlyWhenNotFocused', notificationsOnlyWhenNotFocused.value);
}
function saveDoubleClickToOpenProject() {
  api.setPreference?.('doubleClickToOpenProject', doubleClickToOpenProject.value);
}
function saveConfirmDestructiveActions() {
  api.setPreference?.('confirmDestructiveActions', confirmDestructiveActions.value);
}
function saveAutoRefreshInterval() {
  api.setPreference?.('autoRefreshIntervalSeconds', autoRefreshIntervalSeconds.value);
}
function saveRecentListLength() {
  api.setPreference?.('recentListLength', recentListLength.value);
}
function saveShowTips() {
  api.setPreference?.('showTips', showTips.value);
}
function saveGitDefaultBranch() {
  api.setPreference?.('gitDefaultBranch', gitDefaultBranch.value?.trim() || 'main');
}
function saveGitAutoFetchInterval() {
  api.setPreference?.('gitAutoFetchIntervalMinutes', gitAutoFetchIntervalMinutes.value);
}
function saveGitSshKeyPath() {
  api.setPreference?.('gitSshKeyPath', gitSshKeyPath.value?.trim() ?? '');
}
function saveGitDiffTool() {
  api.setPreference?.('gitDiffTool', gitDiffTool.value?.trim() ?? '');
}
function saveProxy() {
  api.setProxy?.(proxy.value?.trim() ?? '');
}
function saveRequestTimeout() {
  api.setPreference?.('requestTimeoutSeconds', requestTimeoutSeconds.value);
}
function saveOfflineMode() {
  api.setPreference?.('offlineMode', offlineMode.value);
}
function saveTelemetry() {
  api.setPreference?.('telemetry', telemetry.value);
}
function saveTelemetryEndpoint() {
  api.setPreference?.('telemetryEndpoint', telemetryEndpoint.value?.trim() ?? '');
}
function saveTelemetryUserIdentifier() {
  api.setPreference?.('telemetryUserIdentifier', telemetryUserIdentifier.value?.trim() ?? '');
}
function saveCrashReports() {
  api.setPreference?.('crashReports', crashReports.value);
}
function saveCrashReportEndpoint() {
  api.setPreference?.('crashReportEndpoint', crashReportEndpoint.value?.trim() ?? '');
}
function saveAlwaysOnTop() {
  api.setAlwaysOnTop?.(alwaysOnTop.value);
}
function saveMinimizeToTray() {
  api.setMinimizeToTray?.(minimizeToTray.value);
}
function saveFocusOutlineVisible() {
  api.setPreference?.('focusOutlineVisible', focusOutlineVisible.value);
  applyAppearance();
}
function saveLargeCursor() {
  api.setPreference?.('largeCursor', largeCursor.value);
  applyAppearance();
}
function saveScreenReaderSupport() {
  api.setPreference?.('screenReaderSupport', screenReaderSupport.value);
}

async function exportSettingsToFile() {
  dataPrivacyMessage.value = '';
  try {
    const result = await api.exportSettingsToFile?.();
    if (result?.ok) {
      dataPrivacyMessage.value = 'Settings exported.';
      dataPrivacyMessageOk.value = true;
      notifications.add({ title: 'Settings exported', message: result.filePath ? `Saved to ${result.filePath}` : 'Settings exported.', type: 'success' });
    } else if (!result?.canceled) {
      dataPrivacyMessage.value = result?.error || 'Export failed';
      dataPrivacyMessageOk.value = false;
      notifications.add({ title: 'Export failed', message: result?.error || 'Export failed', type: 'error' });
    }
  } catch (e) {
    dataPrivacyMessage.value = e?.message || 'Export failed';
    dataPrivacyMessageOk.value = false;
    notifications.add({ title: 'Export failed', message: e?.message || 'Export failed', type: 'error' });
  }
}
async function importSettingsFromFile() {
  dataPrivacyMessage.value = '';
  try {
    const result = await api.importSettingsFromFile?.(false);
    if (result?.ok) {
      dataPrivacyMessage.value = 'Settings imported. Reload the app to apply.';
      dataPrivacyMessageOk.value = true;
      notifications.add({ title: 'Settings imported', message: 'Reload the app to apply.', type: 'success' });
    } else if (!result?.canceled) {
      dataPrivacyMessage.value = result?.error || 'Import failed';
      dataPrivacyMessageOk.value = false;
      notifications.add({ title: 'Import failed', message: result?.error || 'Import failed', type: 'error' });
    }
  } catch (e) {
    dataPrivacyMessage.value = e?.message || 'Import failed';
    dataPrivacyMessageOk.value = false;
    notifications.add({ title: 'Import failed', message: e?.message || 'Import failed', type: 'error' });
  }
}
function confirmResetSettings() {
  if (!window.confirm('Reset all settings to defaults? Projects will not be removed.')) return;
  dataPrivacyMessage.value = '';
  try {
    const result = api.resetSettings?.();
    if (result?.ok) {
      dataPrivacyMessage.value = 'Settings reset. Reload the app to apply.';
      dataPrivacyMessageOk.value = true;
      notifications.add({ title: 'Settings reset', message: 'Reload the app to apply.', type: 'success' });
    } else {
      dataPrivacyMessage.value = result?.error || 'Reset failed';
      dataPrivacyMessageOk.value = false;
      notifications.add({ title: 'Reset failed', message: result?.error || 'Reset failed', type: 'error' });
    }
  } catch (e) {
    dataPrivacyMessage.value = e?.message || 'Reset failed';
    dataPrivacyMessageOk.value = false;
    notifications.add({ title: 'Reset failed', message: e?.message || 'Reset failed', type: 'error' });
  }
}

function saveToken() {
  debug.log('settings', 'save GitHub token');
  api.setGitHubToken?.(githubToken.value?.trim() ?? '');
}

function saveSignCommits() {
  debug.log('settings', 'save signCommits', signCommits.value);
  api.setPreference?.('signCommits', signCommits.value);
}
function saveOllama() {
  debug.log('settings', 'save Ollama');
  api.setOllamaSettings?.(ollamaBaseUrl.value?.trim() || 'http://localhost:11434', ollamaModel.value?.trim() || 'llama3.2');
}
function saveClaude() {
  debug.log('settings', 'save Claude');
  const model = claudeModelPreset.value === 'custom' ? (claudeModel.value?.trim() ?? '') : (claudeModelPreset.value || '');
  api.setClaudeSettings?.(claudeApiKey.value?.trim() ?? '', model);
}
function onClaudeModelPresetChange() {
  if (claudeModelPreset.value !== 'custom') claudeModel.value = claudeModelPreset.value;
  saveClaude();
}
function saveOpenAI() {
  debug.log('settings', 'save OpenAI');
  const model = openaiModelPreset.value === 'custom' ? (openaiModel.value?.trim() ?? '') : (openaiModelPreset.value || '');
  api.setOpenAISettings?.(openaiApiKey.value?.trim() ?? '', model);
}
function onOpenAiModelPresetChange() {
  if (openaiModelPreset.value !== 'custom') openaiModel.value = openaiModelPreset.value;
  saveOpenAI();
}
function saveGemini() {
  debug.log('settings', 'save Gemini');
  const model = geminiModelPreset.value === 'custom' ? (geminiModel.value?.trim() ?? '') : (geminiModelPreset.value || '');
  api.setGeminiSettings?.(geminiApiKey.value?.trim() ?? '', model);
}
function onGeminiModelPresetChange() {
  if (geminiModelPreset.value !== 'custom') geminiModel.value = geminiModelPreset.value;
  saveGemini();
}
function saveAiProvider() {
  debug.log('settings', 'save aiProvider', aiProvider.value);
  api.setAiProvider?.(aiProvider.value);
}
function openDocs(docKey) {
  modals.openModal('docs', { docKey });
}
function openUrl(url) {
  if (url && api.openUrl) api.openUrl(url);
}
function savePreferredEditor() {
  debug.log('settings', 'save preferredEditor', preferredEditor.value || '');
  api.setPreference?.('preferredEditor', preferredEditor.value || '');
}

async function listOllamaModels() {
  ollamaListError.value = '';
  ollamaModels.value = [];
  ollamaListLoading.value = true;
  try {
    const result = await api.ollamaListModels?.(ollamaBaseUrl.value?.trim() || 'http://localhost:11434');
    if (result?.ok && Array.isArray(result.models)) {
      ollamaModels.value = result.models;
    } else {
      ollamaModels.value = [];
      ollamaListError.value = result?.error || 'No models returned.';
    }
  } catch (e) {
    ollamaListError.value = e?.message || 'Failed to list models.';
  } finally {
    ollamaListLoading.value = false;
  }
}
function savePhpPath() {
  debug.log('settings', 'save phpPath');
  api.setPreference?.('phpPath', phpPath.value?.trim() ?? '');
}
function saveUseTabs() {
  debug.log('settings', 'save detailUseTabs', useDetailTabs.value);
  store.setUseDetailTabs(useDetailTabs.value);
  api.setPreference?.('detailUseTabs', useDetailTabs.value);
}
function saveTerminalPopoutSize() {
  api.setPreference?.('terminalPopoutSize', terminalPopoutSize.value);
}
function saveTerminalPopoutAlwaysOnTop() {
  api.setPreference?.('terminalPopoutAlwaysOnTop', terminalPopoutAlwaysOnTop.value);
}
function saveTerminalPopoutFullscreenable() {
  api.setPreference?.('terminalPopoutFullscreenable', terminalPopoutFullscreenable.value);
}
function saveDebugLogging() {
  api.setPreference?.('debug', debugLogging.value);
  debug.setEnabled(debugLogging.value);
  debug.log('settings', 'debug logging', debugLogging.value ? 'on' : 'off');
}
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
