import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';
import { useLicense } from './useLicense';
import { useModals } from './useModals';
import { useNotifications } from './useNotifications';
import { getSettingsSections } from '../extensions/settingsRegistry';
import * as debug from '../utils/debug';

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

const SECTIONS = [
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

const DEFAULT_VIEW_OPTIONS = [{ value: 'last', label: 'Last view' }, { value: 'detail', label: 'Project detail' }, { value: 'dashboard', label: 'Dashboard' }];
const CHECK_FOR_UPDATES_OPTIONS = [{ value: 'auto', label: 'Automatically' }, { value: 'manual', label: 'Manually only' }, { value: 'never', label: 'Never' }];
const AUTO_REFRESH_INTERVAL_OPTIONS = [{ value: 0, label: 'Off' }, { value: 30, label: '30 seconds' }, { value: 60, label: '1 minute' }, { value: 120, label: '2 minutes' }];
const RECENT_LIST_LENGTH_OPTIONS = [{ value: 5, label: '5' }, { value: 10, label: '10' }, { value: 20, label: '20' }];
const GIT_AUTO_FETCH_INTERVAL_OPTIONS = [{ value: 0, label: 'Off' }, { value: 5, label: '5 minutes' }, { value: 15, label: '15 minutes' }, { value: 30, label: '30 minutes' }];
const AI_PROVIDER_OPTIONS = [{ value: 'ollama', label: 'Ollama (local)' }, { value: 'claude', label: 'Claude (Anthropic)' }, { value: 'openai', label: 'OpenAI' }, { value: 'gemini', label: 'Google Gemini' }];
const CLAUDE_MODEL_PRESET_OPTIONS = [{ value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' }, { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' }, { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' }, { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }, { value: 'custom', label: 'Custom...' }];
const OPENAI_MODEL_PRESET_OPTIONS = [{ value: 'gpt-4o-mini', label: 'GPT-4o mini' }, { value: 'gpt-4o', label: 'GPT-4o' }, { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }, { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }, { value: 'o1-mini', label: 'o1 mini' }, { value: 'custom', label: 'Custom...' }];
const GEMINI_MODEL_PRESET_OPTIONS = [{ value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }, { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }, { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' }, { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }, { value: 'custom', label: 'Custom...' }];
const PREFERRED_EDITOR_OPTIONS = [{ value: '', label: 'Default (Cursor, then VS Code)' }, { value: 'cursor', label: 'Cursor' }, { value: 'code', label: 'VS Code' }];
const FONT_SIZE_OPTIONS = [{ value: 'tighter', label: 'Tighter' }, { value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'spacious', label: 'Spacious' }, { value: 'relaxed', label: 'Relaxed' }];
const BORDER_RADIUS_OPTIONS = [{ value: 'sharp', label: 'Sharp' }, { value: 'rounded', label: 'Rounded' }, { value: 'pill', label: 'Pill' }];
const TERMINAL_POPOUT_SIZE_OPTIONS = [{ value: 'compact', label: 'Compact' }, { value: 'default', label: 'Default' }, { value: 'spacious', label: 'Spacious' }];
const REQUEST_TIMEOUT_OPTIONS = [{ value: 10, label: '10' }, { value: 30, label: '30' }, { value: 60, label: '60' }];
const THEME_OPTIONS = [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'System' }];
const ACCENT_OPTIONS = [
  { value: 'green', label: 'Green', hex: 'rgb(34, 197, 94)' },
  { value: 'blue', label: 'Blue', hex: 'rgb(59, 130, 246)' },
  { value: 'purple', label: 'Purple', hex: 'rgb(168, 85, 247)' },
  { value: 'amber', label: 'Amber', hex: 'rgb(245, 158, 11)' },
  { value: 'rose', label: 'Rose', hex: 'rgb(244, 63, 94)' },
];
const ZOOM_OPTIONS = [{ value: 0.8, label: '80%' }, { value: 0.9, label: '90%' }, { value: 1, label: '100%' }, { value: 1.1, label: '110%' }, { value: 1.25, label: '125%' }, { value: 1.5, label: '150%' }];

/**
 * Composable for Settings view: sections, all preference refs, load on mount, save handlers, export/import/reset.
 * No arguments. Returns everything SettingsView.vue template needs.
 */
export function useSettings() {
  const store = useAppStore();
  const api = useApi();
  const license = useLicense();
  const modals = useModals();
  const notifications = useNotifications();

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
  const accentColor = ref('green');
  const fontSize = ref('comfortable');
  const zoomFactor = ref(1);
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

  function saveLaunchAtLogin() {
    const res = api.setLaunchAtLogin?.(launchAtLogin.value);
    if (res && !res.ok) dataPrivacyMessage.value = res.error || 'Failed';
  }
  function saveDefaultView() { api.setPreference?.('defaultView', defaultView.value); }
  function saveCheckForUpdates() { api.setPreference?.('checkForUpdates', checkForUpdates.value); }
  function saveConfirmBeforeQuit() { api.setConfirmBeforeQuit?.(confirmBeforeQuit.value); }
  function saveNotificationsEnabled() { api.setPreference?.('notificationsEnabled', notificationsEnabled.value); }
  function saveNotificationSound() { api.setPreference?.('notificationSound', notificationSound.value); }
  function saveNotificationsOnlyWhenNotFocused() { api.setPreference?.('notificationsOnlyWhenNotFocused', notificationsOnlyWhenNotFocused.value); }
  function saveDoubleClickToOpenProject() { api.setPreference?.('doubleClickToOpenProject', doubleClickToOpenProject.value); }
  function saveConfirmDestructiveActions() { api.setPreference?.('confirmDestructiveActions', confirmDestructiveActions.value); }
  function saveAutoRefreshInterval() { api.setPreference?.('autoRefreshIntervalSeconds', autoRefreshIntervalSeconds.value); }
  function saveRecentListLength() { api.setPreference?.('recentListLength', recentListLength.value); }
  function saveShowTips() { api.setPreference?.('showTips', showTips.value); }
  function saveGitDefaultBranch() { api.setPreference?.('gitDefaultBranch', gitDefaultBranch.value?.trim() || 'main'); }
  function saveGitAutoFetchInterval() { api.setPreference?.('gitAutoFetchIntervalMinutes', gitAutoFetchIntervalMinutes.value); }
  function saveGitSshKeyPath() { api.setPreference?.('gitSshKeyPath', gitSshKeyPath.value?.trim() ?? ''); }
  function saveGitDiffTool() { api.setPreference?.('gitDiffTool', gitDiffTool.value?.trim() ?? ''); }
  function saveProxy() { api.setProxy?.(proxy.value?.trim() ?? ''); }
  function saveRequestTimeout() { api.setPreference?.('requestTimeoutSeconds', requestTimeoutSeconds.value); }
  function saveOfflineMode() { api.setPreference?.('offlineMode', offlineMode.value); }
  function saveTelemetry() { api.setPreference?.('telemetry', telemetry.value); }
  function saveTelemetryEndpoint() { api.setPreference?.('telemetryEndpoint', telemetryEndpoint.value?.trim() ?? ''); }
  function saveTelemetryUserIdentifier() { api.setPreference?.('telemetryUserIdentifier', telemetryUserIdentifier.value?.trim() ?? ''); }
  function saveCrashReports() { api.setPreference?.('crashReports', crashReports.value); }
  function saveCrashReportEndpoint() { api.setPreference?.('crashReportEndpoint', crashReportEndpoint.value?.trim() ?? ''); }
  function saveAlwaysOnTop() { api.setAlwaysOnTop?.(alwaysOnTop.value); }
  function saveMinimizeToTray() { api.setMinimizeToTray?.(minimizeToTray.value); }
  function saveFocusOutlineVisible() { api.setPreference?.('focusOutlineVisible', focusOutlineVisible.value); applyAppearance(); }
  function saveLargeCursor() { api.setPreference?.('largeCursor', largeCursor.value); applyAppearance(); }
  function saveScreenReaderSupport() { api.setPreference?.('screenReaderSupport', screenReaderSupport.value); }
  function saveFontSize() { api.setPreference?.('appearanceFontSize', fontSize.value); applyAppearance(); }
  function saveBorderRadius() { api.setPreference?.('appearanceRadius', borderRadius.value); applyAppearance(); }
  function saveReducedMotion() { api.setPreference?.('appearanceReducedMotion', reducedMotion.value); applyAppearance(); }
  function saveZoomFactor() { api.setAppZoomFactor?.(typeof zoomFactor.value === 'number' ? zoomFactor.value : 1); }
  function saveReduceTransparency() { api.setPreference?.('appearanceReduceTransparency', reduceTransparency.value); applyAppearance(); }
  function saveHighContrast() { api.setPreference?.('appearanceHighContrast', highContrast.value); applyAppearance(); }
  function saveToken() { debug.log('settings', 'save GitHub token'); api.setGitHubToken?.(githubToken.value?.trim() ?? ''); }
  function saveSignCommits() { debug.log('settings', 'save signCommits', signCommits.value); api.setPreference?.('signCommits', signCommits.value); }
  function saveOllama() { debug.log('settings', 'save Ollama'); api.setOllamaSettings?.(ollamaBaseUrl.value?.trim() || 'http://localhost:11434', ollamaModel.value?.trim() || 'llama3.2'); }
  function saveClaude() { debug.log('settings', 'save Claude'); const model = claudeModelPreset.value === 'custom' ? (claudeModel.value?.trim() ?? '') : (claudeModelPreset.value || ''); api.setClaudeSettings?.(claudeApiKey.value?.trim() ?? '', model); }
  function onClaudeModelPresetChange() { if (claudeModelPreset.value !== 'custom') claudeModel.value = claudeModelPreset.value; saveClaude(); }
  function saveOpenAI() { debug.log('settings', 'save OpenAI'); const model = openaiModelPreset.value === 'custom' ? (openaiModel.value?.trim() ?? '') : (openaiModelPreset.value || ''); api.setOpenAISettings?.(openaiApiKey.value?.trim() ?? '', model); }
  function onOpenAiModelPresetChange() { if (openaiModelPreset.value !== 'custom') openaiModel.value = openaiModelPreset.value; saveOpenAI(); }
  function saveGemini() { debug.log('settings', 'save Gemini'); const model = geminiModelPreset.value === 'custom' ? (geminiModel.value?.trim() ?? '') : (geminiModelPreset.value || ''); api.setGeminiSettings?.(geminiApiKey.value?.trim() ?? '', model); }
  function onGeminiModelPresetChange() { if (geminiModelPreset.value !== 'custom') geminiModel.value = geminiModelPreset.value; saveGemini(); }
  function saveAiProvider() { debug.log('settings', 'save aiProvider', aiProvider.value); api.setAiProvider?.(aiProvider.value); }
  function openUrl(url) { if (url && api.openUrl) api.openUrl(url); }
  function savePreferredEditor() { debug.log('settings', 'save preferredEditor', preferredEditor.value || ''); api.setPreference?.('preferredEditor', preferredEditor.value || ''); }
  async function listOllamaModels() {
    ollamaListError.value = ''; ollamaModels.value = []; ollamaListLoading.value = true;
    try {
      const result = await api.ollamaListModels?.(ollamaBaseUrl.value?.trim() || 'http://localhost:11434');
      if (result?.ok && Array.isArray(result.models)) ollamaModels.value = result.models;
      else { ollamaModels.value = []; ollamaListError.value = result?.error || 'No models returned.'; }
    } catch (e) { ollamaListError.value = e?.message || 'Failed to list models.'; }
    finally { ollamaListLoading.value = false; }
  }
  function savePhpPath() { debug.log('settings', 'save phpPath'); api.setPreference?.('phpPath', phpPath.value?.trim() ?? ''); }
  function saveUseTabs() { debug.log('settings', 'save detailUseTabs', useDetailTabs.value); store.setUseDetailTabs(useDetailTabs.value); api.setPreference?.('detailUseTabs', useDetailTabs.value); }
  function saveTerminalPopoutSize() { api.setPreference?.('terminalPopoutSize', terminalPopoutSize.value); }
  function saveTerminalPopoutAlwaysOnTop() { api.setPreference?.('terminalPopoutAlwaysOnTop', terminalPopoutAlwaysOnTop.value); }
  function saveTerminalPopoutFullscreenable() { api.setPreference?.('terminalPopoutFullscreenable', terminalPopoutFullscreenable.value); }
  function saveDebugLogging() { api.setPreference?.('debug', debugLogging.value); debug.setEnabled(debugLogging.value); debug.log('settings', 'debug logging', debugLogging.value ? 'on' : 'off'); }

  async function exportSettingsToFile() {
    dataPrivacyMessage.value = '';
    try {
      const result = await api.exportSettingsToFile?.();
      if (result?.ok) { dataPrivacyMessage.value = 'Settings exported.'; dataPrivacyMessageOk.value = true; notifications.add({ title: 'Settings exported', message: result.filePath ? `Saved to ${result.filePath}` : 'Settings exported.', type: 'success' }); }
      else if (!result?.canceled) { dataPrivacyMessage.value = result?.error || 'Export failed'; dataPrivacyMessageOk.value = false; notifications.add({ title: 'Export failed', message: result?.error || 'Export failed', type: 'error' }); }
    } catch (e) { dataPrivacyMessage.value = e?.message || 'Export failed'; dataPrivacyMessageOk.value = false; notifications.add({ title: 'Export failed', message: e?.message || 'Export failed', type: 'error' }); }
  }
  async function importSettingsFromFile() {
    dataPrivacyMessage.value = '';
    try {
      const result = await api.importSettingsFromFile?.(false);
      if (result?.ok) { dataPrivacyMessage.value = 'Settings imported. Reload the app to apply.'; dataPrivacyMessageOk.value = true; notifications.add({ title: 'Settings imported', message: 'Reload the app to apply.', type: 'success' }); }
      else if (!result?.canceled) { dataPrivacyMessage.value = result?.error || 'Import failed'; dataPrivacyMessageOk.value = false; notifications.add({ title: 'Import failed', message: result?.error || 'Import failed', type: 'error' }); }
    } catch (e) { dataPrivacyMessage.value = e?.message || 'Import failed'; dataPrivacyMessageOk.value = false; notifications.add({ title: 'Import failed', message: e?.message || 'Import failed', type: 'error' }); }
  }
  function confirmResetSettings() {
    if (!window.confirm('Reset all settings to defaults? Projects will not be removed.')) return;
    dataPrivacyMessage.value = '';
    try {
      const result = api.resetSettings?.();
      if (result?.ok) { dataPrivacyMessage.value = 'Settings reset. Reload the app to apply.'; dataPrivacyMessageOk.value = true; notifications.add({ title: 'Settings reset', message: 'Reload the app to apply.', type: 'success' }); }
      else { dataPrivacyMessage.value = result?.error || 'Reset failed'; dataPrivacyMessageOk.value = false; notifications.add({ title: 'Reset failed', message: result?.error || 'Reset failed', type: 'error' }); }
    } catch (e) { dataPrivacyMessage.value = e?.message || 'Reset failed'; dataPrivacyMessageOk.value = false; notifications.add({ title: 'Reset failed', message: e?.message || 'Reset failed', type: 'error' }); }
  }

  async function load() {
    try {
      const [token, ollama, claude, openai, geminiSettings, provider, editor, php, sign, tabs, debugLoad, themeRes, appearanceAccent, appearanceFontSize, appearanceRadius, appearanceReducedMotion, appearanceZoomFactor, appearanceReduceTransparency, appearanceHighContrast, terminalSize, terminalAlwaysOnTop, terminalFullscreenable, launchAtLoginRes, defaultViewP, checkForUpdatesP, confirmBeforeQuitP, notificationsEnabledP, notificationSoundP, notificationsOnlyWhenNotFocusedP, doubleClickToOpenProjectP, confirmDestructiveActionsP, autoRefreshIntervalSecondsP, recentListLengthP, showTipsP, gitDefaultBranchP, gitAutoFetchIntervalMinutesP, gitSshKeyPathP, gitDiffToolP, proxyP, requestTimeoutSecondsP, offlineModeP, telemetryP, telemetryEndpointP, telemetryUserIdentifierP, crashReportsP, crashReportEndpointP, alwaysOnTopP, minimizeToTrayP, focusOutlineVisibleP, largeCursorP, screenReaderSupportP] = await Promise.all([
        api.getGitHubToken?.() ?? '', api.getOllamaSettings?.() ?? {}, api.getClaudeSettings?.() ?? {}, api.getOpenAISettings?.() ?? {}, api.getGeminiSettings?.().catch(() => ({ apiKey: '', model: '' })),
        api.getAiProvider?.().catch(() => 'ollama'), api.getPreference?.('preferredEditor').catch(() => ''), api.getPreference?.('phpPath').catch(() => ''), api.getPreference?.('signCommits').catch(() => false), api.getPreference?.('detailUseTabs').catch(() => true), api.getPreference?.('debug').catch(() => undefined),
        api.getTheme?.().catch(() => ({ theme: 'dark' })), api.getPreference?.('appearanceAccent').catch(() => 'green'), api.getPreference?.('appearanceFontSize').catch(() => 'comfortable'), api.getPreference?.('appearanceRadius').catch(() => 'sharp'), api.getPreference?.('appearanceReducedMotion').catch(() => false), api.getAppZoomFactor?.().catch(() => 1), api.getPreference?.('appearanceReduceTransparency').catch(() => false), api.getPreference?.('appearanceHighContrast').catch(() => false), api.getPreference?.('terminalPopoutSize').catch(() => 'default'), api.getPreference?.('terminalPopoutAlwaysOnTop').catch(() => false), api.getPreference?.('terminalPopoutFullscreenable').catch(() => true),
        api.getLaunchAtLogin?.().catch(() => ({ openAtLogin: false })), api.getPreference?.('defaultView').catch(() => 'last'), api.getPreference?.('checkForUpdates').catch(() => 'auto'), api.getConfirmBeforeQuit?.().catch(() => false), api.getPreference?.('notificationsEnabled').catch(() => true), api.getPreference?.('notificationSound').catch(() => false), api.getPreference?.('notificationsOnlyWhenNotFocused').catch(() => false), api.getPreference?.('doubleClickToOpenProject').catch(() => false), api.getPreference?.('confirmDestructiveActions').catch(() => true), api.getPreference?.('autoRefreshIntervalSeconds').catch(() => 0), api.getPreference?.('recentListLength').catch(() => 10), api.getPreference?.('showTips').catch(() => true), api.getPreference?.('gitDefaultBranch').catch(() => 'main'), api.getPreference?.('gitAutoFetchIntervalMinutes').catch(() => 0), api.getPreference?.('gitSshKeyPath').catch(() => ''), api.getPreference?.('gitDiffTool').catch(() => ''), api.getProxy?.().catch(() => ''), api.getPreference?.('requestTimeoutSeconds').catch(() => 30), api.getPreference?.('offlineMode').catch(() => false), api.getPreference?.('telemetry').catch(() => false), api.getPreference?.('telemetryEndpoint').catch(() => ''), api.getPreference?.('telemetryUserIdentifier').catch(() => ''), api.getPreference?.('crashReports').catch(() => false), api.getPreference?.('crashReportEndpoint').catch(() => ''), api.getAlwaysOnTop?.().catch(() => false), api.getMinimizeToTray?.().catch(() => false),         api.getPreference?.('focusOutlineVisible').catch(() => false), api.getPreference?.('largeCursor').catch(() => false), api.getPreference?.('screenReaderSupport').catch(() => false),
      ]);
      githubToken.value = token || '';
      ollamaBaseUrl.value = ollama?.baseUrl || ''; ollamaModel.value = ollama?.model || '';
      claudeApiKey.value = claude?.apiKey || ''; claudeModel.value = claude?.model || ''; openaiApiKey.value = openai?.apiKey || ''; openaiModel.value = openai?.model || '';
      geminiApiKey.value = geminiSettings?.apiKey || ''; geminiModel.value = geminiSettings?.model || '';
      const claudePresets = ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'];
      claudeModelPreset.value = claudePresets.includes(claude?.model?.trim()) ? claude.model.trim() : 'custom';
      const openaiPresets = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-mini'];
      openaiModelPreset.value = openaiPresets.includes(openai?.model?.trim()) ? openai.model.trim() : 'custom';
      const geminiPresets = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-8b', 'gemini-2.0-flash'];
      geminiModelPreset.value = geminiPresets.includes(geminiSettings?.model?.trim()) ? geminiSettings.model.trim() : 'custom';
      aiProvider.value = provider === 'claude' ? 'claude' : provider === 'openai' ? 'openai' : provider === 'gemini' ? 'gemini' : 'ollama';
      preferredEditor.value = editor === 'cursor' || editor === 'code' ? editor : ''; phpPath.value = php || '';
      signCommits.value = !!sign; useDetailTabs.value = tabs !== false; debugLogging.value = debugLoad !== false;
      debug.setEnabled(debugLoad !== false); store.setUseDetailTabs(tabs !== false);
      if (themeRes?.theme) theme.value = themeRes.theme;
      if (appearanceAccent && ['green', 'blue', 'purple', 'amber', 'rose'].includes(appearanceAccent)) accentColor.value = appearanceAccent;
      if (appearanceFontSize && ['tighter', 'compact', 'comfortable', 'spacious', 'relaxed'].includes(appearanceFontSize)) fontSize.value = appearanceFontSize;
      if (appearanceRadius && ['sharp', 'rounded', 'pill'].includes(appearanceRadius)) borderRadius.value = appearanceRadius;
      reducedMotion.value = !!appearanceReducedMotion; reduceTransparency.value = !!appearanceReduceTransparency; highContrast.value = !!appearanceHighContrast;
      const zoom = appearanceZoomFactor; zoomFactor.value = typeof zoom === 'number' && zoom > 0 ? zoom : 1;
      if (terminalSize && ['compact', 'default', 'spacious'].includes(terminalSize)) terminalPopoutSize.value = terminalSize;
      terminalPopoutAlwaysOnTop.value = !!terminalAlwaysOnTop; terminalPopoutFullscreenable.value = terminalFullscreenable !== false;
      launchAtLogin.value = !!launchAtLoginRes?.openAtLogin;
      defaultView.value = defaultViewP === 'dashboard' || defaultViewP === 'detail' ? defaultViewP : 'last';
      checkForUpdates.value = checkForUpdatesP === 'manual' || checkForUpdatesP === 'never' ? checkForUpdatesP : 'auto';
      confirmBeforeQuit.value = !!confirmBeforeQuitP; notificationsEnabled.value = notificationsEnabledP !== false; notificationSound.value = !!notificationSoundP; notificationsOnlyWhenNotFocused.value = !!notificationsOnlyWhenNotFocusedP;
      doubleClickToOpenProject.value = !!doubleClickToOpenProjectP; confirmDestructiveActions.value = confirmDestructiveActionsP !== false;
      autoRefreshIntervalSeconds.value = typeof autoRefreshIntervalSecondsP === 'number' ? autoRefreshIntervalSecondsP : 0; recentListLength.value = [5, 10, 20].includes(recentListLengthP) ? recentListLengthP : 10; showTips.value = showTipsP !== false;
      gitDefaultBranch.value = gitDefaultBranchP || 'main'; gitAutoFetchIntervalMinutes.value = typeof gitAutoFetchIntervalMinutesP === 'number' ? gitAutoFetchIntervalMinutesP : 0; gitSshKeyPath.value = gitSshKeyPathP || ''; gitDiffTool.value = gitDiffToolP || '';
      proxy.value = proxyP || ''; requestTimeoutSeconds.value = [10, 30, 60].includes(requestTimeoutSecondsP) ? requestTimeoutSecondsP : 30; offlineMode.value = !!offlineModeP;
      telemetry.value = !!telemetryP; telemetryEndpoint.value = typeof telemetryEndpointP === 'string' ? telemetryEndpointP : ''; telemetryUserIdentifier.value = typeof telemetryUserIdentifierP === 'string' ? telemetryUserIdentifierP : '';
      crashReports.value = !!crashReportsP; crashReportEndpoint.value = typeof crashReportEndpointP === 'string' ? crashReportEndpointP : '';
      alwaysOnTop.value = !!alwaysOnTopP; minimizeToTray.value = !!minimizeToTrayP; focusOutlineVisible.value = !!focusOutlineVisibleP; largeCursor.value = !!largeCursorP; screenReaderSupport.value = !!screenReaderSupportP;
      applyAppearance();
    } catch (_) {}
  }

  onMounted(() => load());

  const sections = computed(() => [...SECTIONS, ...getSettingsSections()]);

  return {
    sections,
    settingsExtensionSections: getSettingsSections(),
    activeSection,
    license,
    themeOptions: THEME_OPTIONS,
    accentOptions: ACCENT_OPTIONS,
    defaultViewOptions: DEFAULT_VIEW_OPTIONS,
    checkForUpdatesOptions: CHECK_FOR_UPDATES_OPTIONS,
    autoRefreshIntervalOptions: AUTO_REFRESH_INTERVAL_OPTIONS,
    recentListLengthOptions: RECENT_LIST_LENGTH_OPTIONS,
    gitAutoFetchIntervalOptions: GIT_AUTO_FETCH_INTERVAL_OPTIONS,
    aiProviderOptions: AI_PROVIDER_OPTIONS,
    claudeModelPresetOptions: CLAUDE_MODEL_PRESET_OPTIONS,
    openaiModelPresetOptions: OPENAI_MODEL_PRESET_OPTIONS,
    geminiModelPresetOptions: GEMINI_MODEL_PRESET_OPTIONS,
    preferredEditorOptions: PREFERRED_EDITOR_OPTIONS,
    fontSizeOptions: FONT_SIZE_OPTIONS,
    zoomOptions: ZOOM_OPTIONS,
    borderRadiusOptions: BORDER_RADIUS_OPTIONS,
    terminalPopoutSizeOptions: TERMINAL_POPOUT_SIZE_OPTIONS,
    requestTimeoutOptions: REQUEST_TIMEOUT_OPTIONS,
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
  };
}
