import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '../stores/app';
import { useApi } from './useApi';
import { useLicense } from './useLicense';
import { useModals } from './useModals';
import { useNotifications } from './useNotifications';
import { useAnnouncer } from './useAnnouncer';
import { getSettingsSections } from '../extensions/settingsRegistry';
import * as debug from '../utils/debug';

const SECTION_ICONS = {
  account: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  git: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a3 3 0 0 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 15a3 3 0 0 0 6 0"/></svg>',
  github: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
  ai: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2 1.33-2 0 0-2.77 2.24-5 5-5 1.66 0 3 1.35 3 3.02 0 1.33 2 1.33 2 0"/></svg>',
  tools: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  appearance: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.648 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c1.051 0 1.906-.855 1.906-1.906V12"/><path d="M18 2a4 4 0 0 1 4 4"/></svg>',
  developer: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>',
  application: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>',
  notifications: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  behavior: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="m8 7 4-4 4 4"/><path d="m8 17 4 4 4-4"/><path d="M3 12h3"/><path d="M18 12h3"/></svg>',
  keyboard: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01"/><path d="M10 10h.01"/><path d="M14 10h.01"/><path d="M18 10h.01"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/></svg>',
  dataPrivacy: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  extensions: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z"/></svg>',
  network: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  webhooks: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"/><path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"/><path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8H12"/></svg>',
  window: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20"/><path d="M6 12h.01"/><path d="M10 12h.01"/><path d="M14 12h.01"/></svg>',
  accessibility: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><path d="M12 14v6"/><path d="M9 18h6"/><path d="M12 14l-3 4"/><path d="M12 14l3 4"/><path d="M12 8a4 4 0 0 0-4 4v2"/><path d="M12 8a4 4 0 0 1 4 4v2"/></svg>',
  subscription: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
  team: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
};

const SECTIONS = [
  { id: 'accessibility', label: 'Accessibility', icon: SECTION_ICONS.accessibility },
  { id: 'account', label: 'Account', icon: SECTION_ICONS.account },
  { id: 'ai', label: 'AI', icon: SECTION_ICONS.ai },
  { id: 'appearance', label: 'Appearance', icon: SECTION_ICONS.appearance },
  { id: 'application', label: 'Application', icon: SECTION_ICONS.application },
  { id: 'behavior', label: 'Behavior', icon: SECTION_ICONS.behavior },
  { id: 'dataPrivacy', label: 'Data & privacy', icon: SECTION_ICONS.dataPrivacy },
  { id: 'developer', label: 'Developer', icon: SECTION_ICONS.developer },
  { id: 'extensions', label: 'Extensions', icon: SECTION_ICONS.extensions },
  { id: 'git', label: 'Git', icon: SECTION_ICONS.git },
  { id: 'github', label: 'GitHub', icon: SECTION_ICONS.github },
  { id: 'keyboard', label: 'Keyboard', icon: SECTION_ICONS.keyboard },
  { id: 'network', label: 'Network', icon: SECTION_ICONS.network },
  { id: 'notifications', label: 'Notifications', icon: SECTION_ICONS.notifications },
  { id: 'subscription', label: 'Subscription', icon: SECTION_ICONS.subscription },
  { id: 'team', label: 'Team', icon: SECTION_ICONS.team },
  { id: 'tools', label: 'Tools', icon: SECTION_ICONS.tools },
  { id: 'webhooks', label: 'Webhooks', icon: SECTION_ICONS.webhooks },
  { id: 'window', label: 'Window', icon: SECTION_ICONS.window },
];

const DEFAULT_VIEW_OPTIONS = [{ value: 'last', label: 'Last view' }, { value: 'dashboard', label: 'Dashboard' }];
const CHECK_FOR_UPDATES_OPTIONS = [{ value: 'auto', label: 'Automatically' }, { value: 'manual', label: 'Manually only' }, { value: 'never', label: 'Never' }];
const AUTO_REFRESH_INTERVAL_OPTIONS = [{ value: 0, label: 'Off' }, { value: 30, label: '30 seconds' }, { value: 60, label: '1 minute' }, { value: 120, label: '2 minutes' }];
const RECENT_LIST_LENGTH_OPTIONS = [{ value: 5, label: '5' }, { value: 10, label: '10' }, { value: 20, label: '20' }];
const GIT_AUTO_FETCH_INTERVAL_OPTIONS = [{ value: 0, label: 'Off' }, { value: 5, label: '5 minutes' }, { value: 15, label: '15 minutes' }, { value: 30, label: '30 minutes' }];
const GIT_PULL_STRATEGY_OPTIONS = [{ value: '', label: 'Default (merge)' }, { value: 'true', label: 'Rebase' }, { value: 'false', label: 'Merge (explicit)' }, { value: 'merges', label: 'Rebase with merges' }];
const GIT_GPG_FORMAT_OPTIONS = [{ value: 'openpgp', label: 'GPG (OpenPGP)' }, { value: 'ssh', label: 'SSH' }];
const AI_PROVIDER_OPTIONS = [{ value: 'ollama', label: 'Ollama (local)' }, { value: 'claude', label: 'Claude (Anthropic)' }, { value: 'openai', label: 'OpenAI' }, { value: 'gemini', label: 'Google Gemini' }];
const CLAUDE_MODEL_PRESET_OPTIONS = [{ value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' }, { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' }, { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' }, { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }, { value: 'custom', label: 'Custom...' }];
const OPENAI_MODEL_PRESET_OPTIONS = [{ value: 'gpt-4o-mini', label: 'GPT-4o mini' }, { value: 'gpt-4o', label: 'GPT-4o' }, { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }, { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }, { value: 'o1-mini', label: 'o1 mini' }, { value: 'custom', label: 'Custom...' }];
const GEMINI_MODEL_PRESET_OPTIONS = [{ value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }, { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }, { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' }, { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }, { value: 'custom', label: 'Custom...' }];
const PREFERRED_EDITOR_OPTIONS = [{ value: '', label: 'Default (Cursor, then VS Code)' }, { value: 'cursor', label: 'Cursor' }, { value: 'code', label: 'VS Code' }];
const PREFERRED_TERMINAL_OPTIONS = [
  { value: 'default', label: 'Default (macOS: Terminal.app)' },
  { value: 'Terminal', label: 'Terminal.app' },
  { value: 'iTerm', label: 'iTerm2' },
  { value: 'Warp', label: 'Warp' },
];
const FONT_SIZE_OPTIONS = [{ value: 'tighter', label: 'Tighter' }, { value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'spacious', label: 'Spacious' }, { value: 'relaxed', label: 'Relaxed' }];
const BORDER_RADIUS_OPTIONS = [{ value: 'sharp', label: 'Sharp' }, { value: 'rounded', label: 'Rounded' }, { value: 'pill', label: 'Pill' }];
const TERMINAL_POPOUT_SIZE_OPTIONS = [{ value: 'compact', label: 'Compact' }, { value: 'default', label: 'Default' }, { value: 'spacious', label: 'Spacious' }];
const REQUEST_TIMEOUT_OPTIONS = [{ value: 10, label: '10' }, { value: 30, label: '30' }, { value: 60, label: '60' }];
const OFFLINE_GRACE_DAYS_OPTIONS = [{ value: 0, label: 'No grace period' }, { value: 3, label: '3 days' }, { value: 7, label: '7 days' }, { value: 14, label: '14 days' }, { value: 30, label: '30 days' }];
const THEME_OPTIONS = [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'System' }];
const ACCENT_OPTIONS = [
  { value: 'green', label: 'Green', hex: 'rgb(34, 197, 94)' },
  { value: 'blue', label: 'Blue', hex: 'rgb(59, 130, 246)' },
  { value: 'purple', label: 'Purple', hex: 'rgb(168, 85, 247)' },
  { value: 'amber', label: 'Amber', hex: 'rgb(245, 158, 11)' },
  { value: 'rose', label: 'Rose', hex: 'rgb(244, 63, 94)' },
];
const ZOOM_OPTIONS = [{ value: 0.8, label: '80%' }, { value: 0.9, label: '90%' }, { value: 1, label: '100%' }, { value: 1.1, label: '110%' }, { value: 1.25, label: '125%' }, { value: 1.5, label: '150%' }];

const SYNCABLE_KEYS = [
  'theme', 'appearanceAccent', 'appearanceFontSize', 'appearanceRadius',
  'appearanceReducedMotion', 'appearanceReduceTransparency', 'appearanceHighContrast',
  'defaultView', 'checkForUpdates', 'notificationsEnabled', 'notificationSound',
  'notificationsOnlyWhenNotFocused', 'doubleClickToOpenProject', 'confirmDestructiveActions',
  'autoRefreshIntervalSeconds', 'recentListLength', 'showTips', 'gitDefaultBranch',
  'gitAutoFetchIntervalMinutes', 'signCommits', 'detailUseTabs', 'preferredEditor',
  'preferredTerminal', 'aiProvider', 'ollamaBaseUrl', 'ollamaModel', 'claudeModel',
  'openaiModel', 'geminiModel', 'telemetry', 'crashReports',
];

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
  const { announcePolite } = useAnnouncer();

  const activeSection = ref('accessibility');
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
  const preferredTerminal = ref('default');
  const phpPath = ref('');
  const codeseerTcpPort = ref(23523);
  const codeseerProxyTcpPort = ref(23524);
  const codeseerProxyHttpPort = ref(23525);
  const codeseerSshEnabled = ref(false);
  const codeseerSshPort = ref(23526);
  const codeseerMcpEnabled = ref(false);
  const codeseerMcpPort = ref(3000);
  const codeseerMcpLimit = ref(300);
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
  const offlineGraceDays = ref(7);
  const offlineLastVerifiedAt = ref(null);
  const offlineGraceStatus = ref(null);
  const connectivityStatus = ref(null); // null | 'checking' | 'online' | 'offline'
  const telemetry = ref(false);
  const telemetryUserIdentifier = ref('');
  const crashReports = ref(false);
  const dataPrivacyMessage = ref('');
  const dataPrivacyMessageOk = ref(false);
  const alwaysOnTop = ref(false);
  const minimizeToTray = ref(false);
  const focusOutlineVisible = ref(false);
  const largeCursor = ref(false);
  const screenReaderSupport = ref(false);
  const customTelemetryEvents = ref([]);
  const ollamaModels = ref([]);
  const ollamaListLoading = ref(false);
  const ollamaListError = ref('');
  const phpVersionOptions = ref([]);
  const phpListLoading = ref(false);
  const phpListError = ref('');
  const licenseServerEnvironment = ref('dev');
  const licenseServerEnvironments = ref([]);
  const gitUserName = ref('');
  const gitUserEmail = ref('');
  const gitGpgKeyId = ref('');
  const gitGpgFormat = ref('openpgp');
  const gitPullRebase = ref('');
  const gitAutoStash = ref(false);
  const gitCommitTemplate = ref('');
  const gpgKeys = ref([]);
  const gpgKeysLoading = ref(false);
  const gpgKeysError = ref('');
  const gpgGenerating = ref(false);
  const gpgGenerateError = ref('');

  const syncStatus = ref('idle'); // 'idle' | 'pulling' | 'pushing' | 'done' | 'error'
  const lastSyncedAt = ref(null);
  const syncError = ref('');

  const githubHealth = ref(null);
  const githubHealthLoading = ref(false);
  const githubHealthError = ref('');

  const ollamaModelOptions = computed(() => {
    const list = ollamaModels.value || [];
    const current = (ollamaModel.value || '').trim();
    const options = list.map((m) => ({ label: m, value: m }));
    if (current && !list.includes(current)) options.unshift({ label: `${current} (current)`, value: current });
    return options;
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
    debouncedPush();
  }

  function setAccent(value) {
    accentColor.value = value;
    api.setPreference?.('appearanceAccent', value);
    applyAppearance();
    debouncedPush();
  }

  function saveLaunchAtLogin() {
    const res = api.setLaunchAtLogin?.(launchAtLogin.value);
    if (res && !res.ok) dataPrivacyMessage.value = res.error || 'Failed';
  }
  function saveDefaultView() { api.setPreference?.('defaultView', defaultView.value); debouncedPush(); }
  function saveCheckForUpdates() { api.setPreference?.('checkForUpdates', checkForUpdates.value); debouncedPush(); }
  function saveConfirmBeforeQuit() { api.setConfirmBeforeQuit?.(confirmBeforeQuit.value); }
  function saveNotificationsEnabled() { api.setPreference?.('notificationsEnabled', notificationsEnabled.value); debouncedPush(); }
  function saveNotificationSound() { api.setPreference?.('notificationSound', notificationSound.value); debouncedPush(); }
  function saveNotificationsOnlyWhenNotFocused() { api.setPreference?.('notificationsOnlyWhenNotFocused', notificationsOnlyWhenNotFocused.value); debouncedPush(); }
  function saveDoubleClickToOpenProject() { api.setPreference?.('doubleClickToOpenProject', doubleClickToOpenProject.value); debouncedPush(); }
  function saveConfirmDestructiveActions() { api.setPreference?.('confirmDestructiveActions', confirmDestructiveActions.value); debouncedPush(); }
  function saveAutoRefreshInterval() { api.setPreference?.('autoRefreshIntervalSeconds', autoRefreshIntervalSeconds.value); debouncedPush(); }
  function saveRecentListLength() { api.setPreference?.('recentListLength', recentListLength.value); debouncedPush(); }
  function saveShowTips() { api.setPreference?.('showTips', showTips.value); debouncedPush(); }
  function saveGitDefaultBranch() { api.setPreference?.('gitDefaultBranch', gitDefaultBranch.value?.trim() || 'main'); debouncedPush(); }
  function saveGitAutoFetchInterval() { api.setPreference?.('gitAutoFetchIntervalMinutes', gitAutoFetchIntervalMinutes.value); debouncedPush(); }
  function saveGitSshKeyPath() { api.setPreference?.('gitSshKeyPath', gitSshKeyPath.value?.trim() ?? ''); }
  function saveGitDiffTool() { api.setPreference?.('gitDiffTool', gitDiffTool.value?.trim() ?? ''); }
  function saveGitUserName() { api.setGitGlobalConfig?.('user.name', gitUserName.value?.trim() ?? ''); }
  function saveGitUserEmail() { api.setGitGlobalConfig?.('user.email', gitUserEmail.value?.trim() ?? ''); }
  function saveGitGpgKeyId() { api.setGitGlobalConfig?.('user.signingkey', gitGpgKeyId.value?.trim() ?? ''); }
  function saveGitGpgFormat() { api.setGitGlobalConfig?.('gpg.format', gitGpgFormat.value || 'openpgp'); }
  function saveGitPullRebase() { api.setGitGlobalConfig?.('pull.rebase', gitPullRebase.value || ''); }
  function saveGitAutoStash() { api.setGitGlobalConfig?.('rebase.autostash', gitAutoStash.value ? 'true' : 'false'); }
  function saveGitCommitTemplate() { api.setGitGlobalConfig?.('commit.template', gitCommitTemplate.value?.trim() ?? ''); }
  async function loadGpgKeys() {
    gpgKeysError.value = '';
    gpgKeysLoading.value = true;
    try {
      const result = await api.listGpgKeys?.();
      if (result?.ok) gpgKeys.value = result.keys || [];
      else { gpgKeys.value = []; gpgKeysError.value = result?.error || 'Failed to list GPG keys'; }
    } catch (e) { gpgKeysError.value = e?.message || 'Failed'; gpgKeys.value = []; }
    finally { gpgKeysLoading.value = false; }
  }
  async function generateGpgKey() {
    const name = gitUserName.value?.trim();
    const email = gitUserEmail.value?.trim();
    if (!name || !email) { gpgGenerateError.value = 'Set your Git user name and email first.'; return; }
    gpgGenerateError.value = '';
    gpgGenerating.value = true;
    try {
      const result = await api.generateGpgKey?.(name, email);
      if (result?.ok) {
        if (result.keyId) { gitGpgKeyId.value = result.keyId; saveGitGpgKeyId(); }
        await loadGpgKeys();
        notifications.add({ title: 'GPG key generated', message: result.keyId ? `Key ID: ${result.keyId}` : 'Key created successfully.', type: 'success' });
      } else { gpgGenerateError.value = result?.error || 'Failed to generate key'; }
    } catch (e) { gpgGenerateError.value = e?.message || 'Failed'; }
    finally { gpgGenerating.value = false; }
  }
  async function loadGitGlobalConfig() {
    try {
      const cfg = await api.getGitGlobalConfig?.();
      if (cfg?.ok) {
        gitUserName.value = cfg.userName || '';
        gitUserEmail.value = cfg.userEmail || '';
        gitGpgKeyId.value = cfg.gpgKeyId || '';
        gitGpgFormat.value = cfg.gpgFormat || 'openpgp';
        gitPullRebase.value = cfg.pullRebase || '';
        gitAutoStash.value = !!cfg.autoStash;
        gitCommitTemplate.value = cfg.commitTemplate || '';
      }
    } catch (_) {}
  }
  function saveProxy() { api.setProxy?.(proxy.value?.trim() ?? ''); }
  function saveRequestTimeout() { api.setPreference?.('requestTimeoutSeconds', requestTimeoutSeconds.value); }
  function saveOfflineMode() { api.setPreference?.('offlineMode', offlineMode.value); }
  function saveOfflineGraceDays() { api.setOfflineGraceDays?.(offlineGraceDays.value); }
  async function loadOfflineGraceConfig() {
    try {
      const config = await api.getOfflineGraceConfig?.();
      if (config) {
        offlineGraceDays.value = typeof config.graceDays === 'number' ? config.graceDays : 7;
        offlineLastVerifiedAt.value = config.lastVerifiedAt ?? null;
        offlineGraceStatus.value = config.grace ?? null;
      }
    } catch (_) {}
  }
  async function checkConnectivity() {
    connectivityStatus.value = 'checking';
    try {
      const result = await api.checkConnectivity?.();
      connectivityStatus.value = result?.online ? 'online' : 'offline';
    } catch (_) {
      connectivityStatus.value = 'offline';
    }
  }
  async function fetchGitHubHealth() {
    if (!license.isLoggedIn?.value) {
      githubHealthError.value = 'Sign in to check GitHub status.';
      return;
    }
    githubHealthLoading.value = true;
    githubHealthError.value = '';
    githubHealth.value = null;
    try {
      const result = await api.fetchGitHubHealth?.();
      if (result?.ok) {
        githubHealth.value = result;
      } else {
        githubHealthError.value = result?.error || 'Failed to fetch GitHub health.';
      }
    } catch (e) {
      githubHealthError.value = e?.message || 'Failed to fetch GitHub health.';
    } finally {
      githubHealthLoading.value = false;
    }
  }

  function saveTelemetry() { api.setPreference?.('telemetry', telemetry.value); api.sendTelemetry?.('settings.usage_data_toggled', { enabled: !!telemetry.value }); debouncedPush(); }
  function saveTelemetryUserIdentifier() { api.setPreference?.('telemetryUserIdentifier', telemetryUserIdentifier.value?.trim() ?? ''); }
  function saveCrashReports() { api.setPreference?.('crashReports', crashReports.value); api.sendTelemetry?.('settings.crash_reports_toggled', { enabled: !!crashReports.value }); debouncedPush(); }
  function saveAlwaysOnTop() { api.setAlwaysOnTop?.(alwaysOnTop.value); }
  function saveMinimizeToTray() { api.setMinimizeToTray?.(minimizeToTray.value); }
  function saveFocusOutlineVisible() { api.setPreference?.('focusOutlineVisible', focusOutlineVisible.value); applyAppearance(); }
  function saveLargeCursor() { api.setPreference?.('largeCursor', largeCursor.value); applyAppearance(); }
  function saveScreenReaderSupport() {
    api.setPreference?.('screenReaderSupport', screenReaderSupport.value);
    applyAppearance();
    if (screenReaderSupport.value) {
      setTimeout(() => announcePolite('Screen reader support enabled'), 100);
    }
  }
  function saveFontSize() { api.setPreference?.('appearanceFontSize', fontSize.value); applyAppearance(); debouncedPush(); }
  function saveBorderRadius() { api.setPreference?.('appearanceRadius', borderRadius.value); applyAppearance(); debouncedPush(); }
  function saveReducedMotion() { api.setPreference?.('appearanceReducedMotion', reducedMotion.value); applyAppearance(); debouncedPush(); }
  function saveZoomFactor() { api.setAppZoomFactor?.(typeof zoomFactor.value === 'number' ? zoomFactor.value : 1); }
  function saveReduceTransparency() { api.setPreference?.('appearanceReduceTransparency', reduceTransparency.value); applyAppearance(); debouncedPush(); }
  function saveHighContrast() { api.setPreference?.('appearanceHighContrast', highContrast.value); applyAppearance(); debouncedPush(); }
  function saveToken() { debug.log('settings', 'save GitHub token'); api.setGitHubToken?.(githubToken.value?.trim() ?? ''); }
  function saveSignCommits() { debug.log('settings', 'save signCommits', signCommits.value); api.setPreference?.('signCommits', signCommits.value); debouncedPush(); }
  function saveOllama() { debug.log('settings', 'save Ollama'); api.setOllamaSettings?.(ollamaBaseUrl.value?.trim() || 'http://localhost:11434', ollamaModel.value?.trim() || 'llama3.2'); }
  function saveClaude() { debug.log('settings', 'save Claude'); const model = claudeModelPreset.value === 'custom' ? (claudeModel.value?.trim() ?? '') : (claudeModelPreset.value || ''); api.setClaudeSettings?.(claudeApiKey.value?.trim() ?? '', model); }
  function onClaudeModelPresetChange() { if (claudeModelPreset.value !== 'custom') claudeModel.value = claudeModelPreset.value; saveClaude(); }
  function saveOpenAI() { debug.log('settings', 'save OpenAI'); const model = openaiModelPreset.value === 'custom' ? (openaiModel.value?.trim() ?? '') : (openaiModelPreset.value || ''); api.setOpenAISettings?.(openaiApiKey.value?.trim() ?? '', model); }
  function onOpenAiModelPresetChange() { if (openaiModelPreset.value !== 'custom') openaiModel.value = openaiModelPreset.value; saveOpenAI(); }
  function saveGemini() { debug.log('settings', 'save Gemini'); const model = geminiModelPreset.value === 'custom' ? (geminiModel.value?.trim() ?? '') : (geminiModelPreset.value || ''); api.setGeminiSettings?.(geminiApiKey.value?.trim() ?? '', model); }
  function onGeminiModelPresetChange() { if (geminiModelPreset.value !== 'custom') geminiModel.value = geminiModelPreset.value; saveGemini(); }
  function saveAiProvider() { debug.log('settings', 'save aiProvider', aiProvider.value); api.setAiProvider?.(aiProvider.value); api.sendTelemetry?.('settings.ai_provider_changed', { provider: aiProvider.value }); debouncedPush(); }
  function openUrl(url) { if (url && api.openUrl) api.openUrl(url); }
  function savePreferredEditor() { debug.log('settings', 'save preferredEditor', preferredEditor.value || ''); api.setPreference?.('preferredEditor', preferredEditor.value || ''); debouncedPush(); }
  function savePreferredTerminal() { debug.log('settings', 'save preferredTerminal', preferredTerminal.value || 'default'); api.setPreference?.('preferredTerminal', preferredTerminal.value || 'default'); debouncedPush(); }
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
  function saveCodeseerTcpPort() {
    const n = parseInt(String(codeseerTcpPort.value), 10);
    const port = Number.isFinite(n) && n >= 1024 && n <= 65535 ? n : 23523;
    codeseerTcpPort.value = port;
    api.setPreference?.('codeseerTcpPort', port);
    api.codeseerRestartServer?.();
  }
  function saveCodeseerProxyTcpPort() {
    const n = parseInt(String(codeseerProxyTcpPort.value), 10);
    const port = Number.isFinite(n) && n >= 1024 && n <= 65535 ? n : 23524;
    codeseerProxyTcpPort.value = port;
    api.setPreference?.('codeseerProxyTcpPort', port);
  }
  function saveCodeseerProxyHttpPort() {
    const n = parseInt(String(codeseerProxyHttpPort.value), 10);
    const port = Number.isFinite(n) && n >= 1024 && n <= 65535 ? n : 23525;
    codeseerProxyHttpPort.value = port;
    api.setPreference?.('codeseerProxyHttpPort', port);
  }
  function saveCodeseerSshEnabled() {
    api.setPreference?.('codeseerSshEnabled', codeseerSshEnabled.value);
    notifications.add({ title: 'Restart required', message: 'Restart the app to apply SSH server changes.', type: 'info' });
  }
  function saveCodeseerSshPort() {
    const n = parseInt(String(codeseerSshPort.value), 10);
    const port = Number.isFinite(n) && n >= 1024 && n <= 65535 ? n : 23526;
    codeseerSshPort.value = port;
    api.setPreference?.('codeseerSshPort', port);
    notifications.add({ title: 'Restart required', message: 'Restart the app to apply SSH port changes.', type: 'info' });
  }
  function saveCodeseerMcpEnabled() {
    api.setPreference?.('codeseerMcpEnabled', codeseerMcpEnabled.value);
    notifications.add({ title: 'Restart required', message: 'Restart the app to apply MCP server changes.', type: 'info' });
  }
  function saveCodeseerMcpPort() {
    const n = parseInt(String(codeseerMcpPort.value), 10);
    const port = Number.isFinite(n) && n >= 1024 && n <= 65535 ? n : 3000;
    codeseerMcpPort.value = port;
    api.setPreference?.('codeseerMcpPort', port);
    notifications.add({ title: 'Restart required', message: 'Restart the app to apply MCP port changes.', type: 'info' });
  }
  function saveCodeseerMcpLimit() {
    const n = parseInt(String(codeseerMcpLimit.value), 10);
    const limit = Number.isFinite(n) && n >= 1 && n <= 500 ? n : 300;
    codeseerMcpLimit.value = limit;
    api.setPreference?.('codeseerMcpLimit', limit);
  }
  async function listPhpVersions() {
    phpListError.value = '';
    phpListLoading.value = true;
    try {
      const list = await api.getAvailablePhpVersions?.() || [];
      phpVersionOptions.value = list.map((r) => ({ value: r.path, label: `PHP ${r.version}` }));
    } catch (e) {
      phpListError.value = e?.message || 'Failed to list PHP versions.';
      phpVersionOptions.value = [];
    } finally {
      phpListLoading.value = false;
    }
  }
  const phpVersionSelectOptions = computed(() => {
    const list = (phpVersionOptions.value || []).filter((o) => o != null);
    const opts = [{ value: '', label: 'Other (enter path below)' }, ...list];
    const current = (phpPath.value || '').trim();
    if (current && !list.some((o) => o.value === current)) {
      opts.push({ value: current, label: `Custom: ${current}` });
    }
    return opts.filter((o) => o != null);
  });
  function saveUseTabs() { debug.log('settings', 'save detailUseTabs', useDetailTabs.value); store.setUseDetailTabs(useDetailTabs.value); api.setPreference?.('detailUseTabs', useDetailTabs.value); debouncedPush(); }
  function saveTerminalPopoutSize() { api.setPreference?.('terminalPopoutSize', terminalPopoutSize.value); }
  function saveTerminalPopoutAlwaysOnTop() { api.setPreference?.('terminalPopoutAlwaysOnTop', terminalPopoutAlwaysOnTop.value); }
  function saveTerminalPopoutFullscreenable() { api.setPreference?.('terminalPopoutFullscreenable', terminalPopoutFullscreenable.value); }
  function saveDebugLogging() { api.setPreference?.('debug', debugLogging.value); debug.setEnabled(debugLogging.value); debug.log('settings', 'debug logging', debugLogging.value ? 'on' : 'off'); }
  function saveLicenseServerEnvironment() {
    api.setLicenseServerConfig?.({ environment: licenseServerEnvironment.value });
    license.loadStatus?.();
  }

  async function loadCustomTelemetryEvents() {
    try {
      const events = await api.getCustomTelemetryEvents?.();
      customTelemetryEvents.value = Array.isArray(events) ? events : [];
    } catch (_) { customTelemetryEvents.value = []; }
  }
  function saveCustomTelemetryEvents() {
    api.setCustomTelemetryEvents?.(customTelemetryEvents.value);
  }
  async function downloadExtensionTemplate() {
    try {
      const result = await api.downloadExtensionTemplate?.();
      if (result?.ok) {
        notifications.add({ title: 'Template saved', message: result.filePath ? `Saved to ${result.filePath}` : 'Extension template downloaded.', type: 'success' });
      } else if (!result?.canceled) {
        notifications.add({ title: 'Download failed', message: result?.error || 'Failed to download template.', type: 'error' });
      }
    } catch (e) {
      notifications.add({ title: 'Download failed', message: e?.message || 'Failed to download template.', type: 'error' });
    }
  }

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

  function collectSyncableSettings() {
    return {
      theme: theme.value,
      appearanceAccent: accentColor.value,
      appearanceFontSize: fontSize.value,
      appearanceRadius: borderRadius.value,
      appearanceReducedMotion: reducedMotion.value,
      appearanceReduceTransparency: reduceTransparency.value,
      appearanceHighContrast: highContrast.value,
      defaultView: defaultView.value,
      checkForUpdates: checkForUpdates.value,
      notificationsEnabled: notificationsEnabled.value,
      notificationSound: notificationSound.value,
      notificationsOnlyWhenNotFocused: notificationsOnlyWhenNotFocused.value,
      doubleClickToOpenProject: doubleClickToOpenProject.value,
      confirmDestructiveActions: confirmDestructiveActions.value,
      autoRefreshIntervalSeconds: autoRefreshIntervalSeconds.value,
      recentListLength: recentListLength.value,
      showTips: showTips.value,
      gitDefaultBranch: gitDefaultBranch.value,
      gitAutoFetchIntervalMinutes: gitAutoFetchIntervalMinutes.value,
      signCommits: signCommits.value,
      detailUseTabs: useDetailTabs.value,
      preferredEditor: preferredEditor.value,
      preferredTerminal: preferredTerminal.value,
      aiProvider: aiProvider.value,
      ollamaBaseUrl: ollamaBaseUrl.value,
      ollamaModel: ollamaModel.value,
      claudeModel: claudeModel.value,
      openaiModel: openaiModel.value,
      geminiModel: geminiModel.value,
      telemetry: telemetry.value,
      crashReports: crashReports.value,
    };
  }

  async function pushSettingsToRemote() {
    if (!license.isLoggedIn?.value) return;
    syncStatus.value = 'pushing';
    syncError.value = '';
    try {
      const result = await api.pushRemoteSettings?.(collectSyncableSettings());
      if (result?.ok) {
        lastSyncedAt.value = result.synced_at || new Date().toISOString();
        syncStatus.value = 'done';
      } else {
        syncError.value = result?.error || 'Push failed';
        syncStatus.value = 'error';
      }
    } catch (e) {
      syncError.value = e?.message || 'Push failed';
      syncStatus.value = 'error';
    }
  }

  async function pullRemoteSettings() {
    if (!license.isLoggedIn?.value) return;
    syncStatus.value = 'pulling';
    syncError.value = '';
    try {
      const result = await api.fetchRemoteSettings?.();
      if (!result?.ok || !result.settings) {
        syncStatus.value = 'idle';
        return;
      }
      const remote = result.settings;
      lastSyncedAt.value = result.synced_at || null;

      if (remote.theme && remote.theme !== theme.value) { theme.value = remote.theme; api.setTheme?.(remote.theme); }
      if (remote.appearanceAccent && remote.appearanceAccent !== accentColor.value) { accentColor.value = remote.appearanceAccent; api.setPreference?.('appearanceAccent', remote.appearanceAccent); }
      if (remote.appearanceFontSize && remote.appearanceFontSize !== fontSize.value) { fontSize.value = remote.appearanceFontSize; api.setPreference?.('appearanceFontSize', remote.appearanceFontSize); }
      if (remote.appearanceRadius && remote.appearanceRadius !== borderRadius.value) { borderRadius.value = remote.appearanceRadius; api.setPreference?.('appearanceRadius', remote.appearanceRadius); }
      if (typeof remote.appearanceReducedMotion === 'boolean' && remote.appearanceReducedMotion !== reducedMotion.value) { reducedMotion.value = remote.appearanceReducedMotion; api.setPreference?.('appearanceReducedMotion', remote.appearanceReducedMotion); }
      if (typeof remote.appearanceReduceTransparency === 'boolean' && remote.appearanceReduceTransparency !== reduceTransparency.value) { reduceTransparency.value = remote.appearanceReduceTransparency; api.setPreference?.('appearanceReduceTransparency', remote.appearanceReduceTransparency); }
      if (typeof remote.appearanceHighContrast === 'boolean' && remote.appearanceHighContrast !== highContrast.value) { highContrast.value = remote.appearanceHighContrast; api.setPreference?.('appearanceHighContrast', remote.appearanceHighContrast); }
      if (remote.defaultView && remote.defaultView !== defaultView.value) { defaultView.value = remote.defaultView; api.setPreference?.('defaultView', remote.defaultView); }
      if (remote.checkForUpdates && remote.checkForUpdates !== checkForUpdates.value) { checkForUpdates.value = remote.checkForUpdates; api.setPreference?.('checkForUpdates', remote.checkForUpdates); }
      if (typeof remote.notificationsEnabled === 'boolean' && remote.notificationsEnabled !== notificationsEnabled.value) { notificationsEnabled.value = remote.notificationsEnabled; api.setPreference?.('notificationsEnabled', remote.notificationsEnabled); }
      if (typeof remote.notificationSound === 'boolean' && remote.notificationSound !== notificationSound.value) { notificationSound.value = remote.notificationSound; api.setPreference?.('notificationSound', remote.notificationSound); }
      if (typeof remote.notificationsOnlyWhenNotFocused === 'boolean' && remote.notificationsOnlyWhenNotFocused !== notificationsOnlyWhenNotFocused.value) { notificationsOnlyWhenNotFocused.value = remote.notificationsOnlyWhenNotFocused; api.setPreference?.('notificationsOnlyWhenNotFocused', remote.notificationsOnlyWhenNotFocused); }
      if (typeof remote.doubleClickToOpenProject === 'boolean' && remote.doubleClickToOpenProject !== doubleClickToOpenProject.value) { doubleClickToOpenProject.value = remote.doubleClickToOpenProject; api.setPreference?.('doubleClickToOpenProject', remote.doubleClickToOpenProject); }
      if (typeof remote.confirmDestructiveActions === 'boolean' && remote.confirmDestructiveActions !== confirmDestructiveActions.value) { confirmDestructiveActions.value = remote.confirmDestructiveActions; api.setPreference?.('confirmDestructiveActions', remote.confirmDestructiveActions); }
      if (typeof remote.autoRefreshIntervalSeconds === 'number' && remote.autoRefreshIntervalSeconds !== autoRefreshIntervalSeconds.value) { autoRefreshIntervalSeconds.value = remote.autoRefreshIntervalSeconds; api.setPreference?.('autoRefreshIntervalSeconds', remote.autoRefreshIntervalSeconds); }
      if (typeof remote.recentListLength === 'number' && remote.recentListLength !== recentListLength.value) { recentListLength.value = remote.recentListLength; api.setPreference?.('recentListLength', remote.recentListLength); }
      if (typeof remote.showTips === 'boolean' && remote.showTips !== showTips.value) { showTips.value = remote.showTips; api.setPreference?.('showTips', remote.showTips); }
      if (remote.gitDefaultBranch && remote.gitDefaultBranch !== gitDefaultBranch.value) { gitDefaultBranch.value = remote.gitDefaultBranch; api.setPreference?.('gitDefaultBranch', remote.gitDefaultBranch); }
      if (typeof remote.gitAutoFetchIntervalMinutes === 'number' && remote.gitAutoFetchIntervalMinutes !== gitAutoFetchIntervalMinutes.value) { gitAutoFetchIntervalMinutes.value = remote.gitAutoFetchIntervalMinutes; api.setPreference?.('gitAutoFetchIntervalMinutes', remote.gitAutoFetchIntervalMinutes); }
      if (typeof remote.signCommits === 'boolean' && remote.signCommits !== signCommits.value) { signCommits.value = remote.signCommits; api.setPreference?.('signCommits', remote.signCommits); }
      if (typeof remote.detailUseTabs === 'boolean' && remote.detailUseTabs !== useDetailTabs.value) { useDetailTabs.value = remote.detailUseTabs; api.setPreference?.('detailUseTabs', remote.detailUseTabs); store.setUseDetailTabs(remote.detailUseTabs); }
      if (typeof remote.preferredEditor === 'string' && remote.preferredEditor !== preferredEditor.value) { preferredEditor.value = remote.preferredEditor; api.setPreference?.('preferredEditor', remote.preferredEditor); }
      if (typeof remote.preferredTerminal === 'string' && remote.preferredTerminal !== preferredTerminal.value) { preferredTerminal.value = remote.preferredTerminal; api.setPreference?.('preferredTerminal', remote.preferredTerminal); }
      if (remote.aiProvider && remote.aiProvider !== aiProvider.value) { aiProvider.value = remote.aiProvider; api.setAiProvider?.(remote.aiProvider); }
      if (typeof remote.ollamaBaseUrl === 'string' && remote.ollamaBaseUrl !== ollamaBaseUrl.value) ollamaBaseUrl.value = remote.ollamaBaseUrl;
      if (typeof remote.ollamaModel === 'string' && remote.ollamaModel !== ollamaModel.value) ollamaModel.value = remote.ollamaModel;
      if (typeof remote.claudeModel === 'string' && remote.claudeModel !== claudeModel.value) claudeModel.value = remote.claudeModel;
      if (typeof remote.openaiModel === 'string' && remote.openaiModel !== openaiModel.value) openaiModel.value = remote.openaiModel;
      if (typeof remote.geminiModel === 'string' && remote.geminiModel !== geminiModel.value) geminiModel.value = remote.geminiModel;
      if (typeof remote.telemetry === 'boolean' && remote.telemetry !== telemetry.value) { telemetry.value = remote.telemetry; api.setPreference?.('telemetry', remote.telemetry); }
      if (typeof remote.crashReports === 'boolean' && remote.crashReports !== crashReports.value) { crashReports.value = remote.crashReports; api.setPreference?.('crashReports', remote.crashReports); }

      applyAppearance();
      syncStatus.value = 'done';
    } catch (e) {
      syncError.value = e?.message || 'Pull failed';
      syncStatus.value = 'error';
    }
  }

  let _pushDebounce = null;
  function debouncedPush() {
    if (_pushDebounce) clearTimeout(_pushDebounce);
    _pushDebounce = setTimeout(() => pushSettingsToRemote(), 2000);
  }

  async function load() {
    try {
      const [token, ollama, claude, openai, geminiSettings, provider, editor, preferredTerminalP, php, codeseerPort, codeseerProxyTcpP, codeseerProxyHttpP, codeseerSshEnabledP, codeseerSshPortP, codeseerMcpEnabledP, codeseerMcpPortP, codeseerMcpLimitP, sign, tabs, debugLoad, themeRes, appearanceAccent, appearanceFontSize, appearanceRadius, appearanceReducedMotion, appearanceZoomFactor, appearanceReduceTransparency, appearanceHighContrast, terminalSize, terminalAlwaysOnTop, terminalFullscreenable, launchAtLoginRes, defaultViewP, checkForUpdatesP, confirmBeforeQuitP, notificationsEnabledP, notificationSoundP, notificationsOnlyWhenNotFocusedP, doubleClickToOpenProjectP, confirmDestructiveActionsP, autoRefreshIntervalSecondsP, recentListLengthP, showTipsP, gitDefaultBranchP, gitAutoFetchIntervalMinutesP, gitSshKeyPathP, gitDiffToolP, proxyP, requestTimeoutSecondsP, offlineModeP, telemetryP, telemetryUserIdentifierP, crashReportsP, alwaysOnTopP, minimizeToTrayP, focusOutlineVisibleP, largeCursorP, screenReaderSupportP, licenseServerConfigP, licenseServerEnvironmentsP] = await Promise.all([
        api.getGitHubToken?.() ?? '', api.getOllamaSettings?.() ?? {}, api.getClaudeSettings?.() ?? {}, api.getOpenAISettings?.() ?? {}, api.getGeminiSettings?.().catch(() => ({ apiKey: '', model: '' })),
        api.getAiProvider?.().catch(() => 'ollama'), api.getPreference?.('preferredEditor').catch(() => ''), api.getPreference?.('preferredTerminal').catch(() => 'default'), api.getPreference?.('phpPath').catch(() => ''), api.getPreference?.('codeseerTcpPort').catch(() => 23523), api.getPreference?.('codeseerProxyTcpPort').catch(() => 23524), api.getPreference?.('codeseerProxyHttpPort').catch(() => 23525), api.getPreference?.('codeseerSshEnabled').catch(() => false), api.getPreference?.('codeseerSshPort').catch(() => 23526), api.getPreference?.('codeseerMcpEnabled').catch(() => false), api.getPreference?.('codeseerMcpPort').catch(() => 3000), api.getPreference?.('codeseerMcpLimit').catch(() => 300), api.getPreference?.('signCommits').catch(() => false), api.getPreference?.('detailUseTabs').catch(() => true), api.getPreference?.('debug').catch(() => undefined),
        api.getTheme?.().catch(() => ({ theme: 'dark' })), api.getPreference?.('appearanceAccent').catch(() => 'green'), api.getPreference?.('appearanceFontSize').catch(() => 'comfortable'), api.getPreference?.('appearanceRadius').catch(() => 'sharp'), api.getPreference?.('appearanceReducedMotion').catch(() => false), api.getAppZoomFactor?.().catch(() => 1), api.getPreference?.('appearanceReduceTransparency').catch(() => false), api.getPreference?.('appearanceHighContrast').catch(() => false), api.getPreference?.('terminalPopoutSize').catch(() => 'default'), api.getPreference?.('terminalPopoutAlwaysOnTop').catch(() => false), api.getPreference?.('terminalPopoutFullscreenable').catch(() => true),
        api.getLaunchAtLogin?.().catch(() => ({ openAtLogin: false })), api.getPreference?.('defaultView').catch(() => 'last'), api.getPreference?.('checkForUpdates').catch(() => 'auto'), api.getConfirmBeforeQuit?.().catch(() => false), api.getPreference?.('notificationsEnabled').catch(() => true), api.getPreference?.('notificationSound').catch(() => false), api.getPreference?.('notificationsOnlyWhenNotFocused').catch(() => false), api.getPreference?.('doubleClickToOpenProject').catch(() => false), api.getPreference?.('confirmDestructiveActions').catch(() => true), api.getPreference?.('autoRefreshIntervalSeconds').catch(() => 0), api.getPreference?.('recentListLength').catch(() => 10), api.getPreference?.('showTips').catch(() => true), api.getPreference?.('gitDefaultBranch').catch(() => 'main'), api.getPreference?.('gitAutoFetchIntervalMinutes').catch(() => 0), api.getPreference?.('gitSshKeyPath').catch(() => ''), api.getPreference?.('gitDiffTool').catch(() => ''), api.getProxy?.().catch(() => ''), api.getPreference?.('requestTimeoutSeconds').catch(() => 30), api.getPreference?.('offlineMode').catch(() => false), api.getPreference?.('telemetry').catch(() => false), api.getPreference?.('telemetryUserIdentifier').catch(() => ''), api.getPreference?.('crashReports').catch(() => false), api.getAlwaysOnTop?.().catch(() => false), api.getMinimizeToTray?.().catch(() => false),         api.getPreference?.('focusOutlineVisible').catch(() => false), api.getPreference?.('largeCursor').catch(() => false), api.getPreference?.('screenReaderSupport').catch(() => false),
        api.getLicenseServerConfig?.().catch(() => ({})), api.getLicenseServerEnvironments?.().catch(() => []),
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
      preferredEditor.value = editor === 'cursor' || editor === 'code' ? editor : '';
      preferredTerminal.value = (preferredTerminalP === 'Terminal' || preferredTerminalP === 'iTerm' || preferredTerminalP === 'Warp') ? preferredTerminalP : 'default';
      phpPath.value = php || '';
      codeseerTcpPort.value = typeof codeseerPort === 'number' && codeseerPort >= 1024 && codeseerPort <= 65535 ? codeseerPort : 23523;
      codeseerProxyTcpPort.value = typeof codeseerProxyTcpP === 'number' && codeseerProxyTcpP >= 1024 && codeseerProxyTcpP <= 65535 ? codeseerProxyTcpP : 23524;
      codeseerProxyHttpPort.value = typeof codeseerProxyHttpP === 'number' && codeseerProxyHttpP >= 1024 && codeseerProxyHttpP <= 65535 ? codeseerProxyHttpP : 23525;
      codeseerSshEnabled.value = !!codeseerSshEnabledP;
      codeseerSshPort.value = typeof codeseerSshPortP === 'number' && codeseerSshPortP >= 1024 && codeseerSshPortP <= 65535 ? codeseerSshPortP : 23526;
      codeseerMcpEnabled.value = !!codeseerMcpEnabledP;
      codeseerMcpPort.value = typeof codeseerMcpPortP === 'number' && codeseerMcpPortP >= 1024 && codeseerMcpPortP <= 65535 ? codeseerMcpPortP : 3000;
      codeseerMcpLimit.value = typeof codeseerMcpLimitP === 'number' && codeseerMcpLimitP >= 1 && codeseerMcpLimitP <= 500 ? codeseerMcpLimitP : 300;
      listPhpVersions();
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
      defaultView.value = defaultViewP === 'dashboard' ? 'dashboard' : 'last';
      checkForUpdates.value = checkForUpdatesP === 'manual' || checkForUpdatesP === 'never' ? checkForUpdatesP : 'auto';
      confirmBeforeQuit.value = !!confirmBeforeQuitP; notificationsEnabled.value = notificationsEnabledP !== false; notificationSound.value = !!notificationSoundP; notificationsOnlyWhenNotFocused.value = !!notificationsOnlyWhenNotFocusedP;
      doubleClickToOpenProject.value = !!doubleClickToOpenProjectP; confirmDestructiveActions.value = confirmDestructiveActionsP !== false;
      autoRefreshIntervalSeconds.value = typeof autoRefreshIntervalSecondsP === 'number' ? autoRefreshIntervalSecondsP : 0; recentListLength.value = [5, 10, 20].includes(recentListLengthP) ? recentListLengthP : 10; showTips.value = showTipsP !== false;
      gitDefaultBranch.value = gitDefaultBranchP || 'main'; gitAutoFetchIntervalMinutes.value = typeof gitAutoFetchIntervalMinutesP === 'number' ? gitAutoFetchIntervalMinutesP : 0; gitSshKeyPath.value = gitSshKeyPathP || ''; gitDiffTool.value = gitDiffToolP || '';
      proxy.value = proxyP || ''; requestTimeoutSeconds.value = [10, 30, 60].includes(requestTimeoutSecondsP) ? requestTimeoutSecondsP : 30; offlineMode.value = !!offlineModeP;
      loadOfflineGraceConfig();
      telemetry.value = !!telemetryP;
      telemetryUserIdentifier.value = typeof telemetryUserIdentifierP === 'string' ? telemetryUserIdentifierP : '';
      crashReports.value = !!crashReportsP;
      alwaysOnTop.value = !!alwaysOnTopP; minimizeToTray.value = !!minimizeToTrayP; focusOutlineVisible.value = !!focusOutlineVisibleP; largeCursor.value = !!largeCursorP; screenReaderSupport.value = !!screenReaderSupportP;
      licenseServerEnvironments.value = Array.isArray(licenseServerEnvironmentsP) ? licenseServerEnvironmentsP : [];
      const env = licenseServerConfigP?.environment;
      licenseServerEnvironment.value = env && licenseServerEnvironments.value.some((e) => e.id === env) ? env : 'dev';
      applyAppearance();
      loadCustomTelemetryEvents();
      loadGitGlobalConfig();
    } catch (_) {}

    pullRemoteSettings();
  }

  onMounted(() => load());

  const sections = computed(() =>
    [...SECTIONS, ...getSettingsSections()].filter((s) => s != null && s.id != null)
  );

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
    gitPullStrategyOptions: GIT_PULL_STRATEGY_OPTIONS,
    gitGpgFormatOptions: GIT_GPG_FORMAT_OPTIONS,
    aiProviderOptions: AI_PROVIDER_OPTIONS,
    claudeModelPresetOptions: CLAUDE_MODEL_PRESET_OPTIONS,
    openaiModelPresetOptions: OPENAI_MODEL_PRESET_OPTIONS,
    geminiModelPresetOptions: GEMINI_MODEL_PRESET_OPTIONS,
    preferredEditorOptions: PREFERRED_EDITOR_OPTIONS,
    preferredTerminalOptions: PREFERRED_TERMINAL_OPTIONS,
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
    preferredTerminal,
    savePreferredTerminal,
    phpPath,
    codeseerTcpPort,
    saveCodeseerTcpPort,
    codeseerProxyTcpPort,
    codeseerProxyHttpPort,
    saveCodeseerProxyTcpPort,
    saveCodeseerProxyHttpPort,
    codeseerSshEnabled,
    codeseerSshPort,
    saveCodeseerSshEnabled,
    saveCodeseerSshPort,
    codeseerMcpEnabled,
    codeseerMcpPort,
    codeseerMcpLimit,
    saveCodeseerMcpEnabled,
    saveCodeseerMcpPort,
    saveCodeseerMcpLimit,
    phpVersionOptions,
    phpVersionSelectOptions,
    listPhpVersions,
    phpListLoading,
    phpListError,
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
    gitUserName,
    gitUserEmail,
    gitGpgKeyId,
    gitGpgFormat,
    gitPullRebase,
    gitAutoStash,
    gitCommitTemplate,
    gpgKeys,
    gpgKeysLoading,
    gpgKeysError,
    gpgGenerating,
    gpgGenerateError,
    proxy,
    requestTimeoutSeconds,
    offlineMode,
    offlineGraceDays,
    offlineGraceDaysOptions: OFFLINE_GRACE_DAYS_OPTIONS,
    offlineLastVerifiedAt,
    offlineGraceStatus,
    connectivityStatus,
    telemetry,
    telemetryUserIdentifier,
    crashReports,
    dataPrivacyMessage,
    dataPrivacyMessageOk,
    alwaysOnTop,
    minimizeToTray,
    focusOutlineVisible,
    largeCursor,
    screenReaderSupport,
    ollamaModelOptions,
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
    saveGitUserName,
    saveGitUserEmail,
    saveGitGpgKeyId,
    saveGitGpgFormat,
    saveGitPullRebase,
    saveGitAutoStash,
    saveGitCommitTemplate,
    loadGpgKeys,
    generateGpgKey,
    loadGitGlobalConfig,
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
  saveOfflineGraceDays,
  checkConnectivity,
  saveTelemetry,
    saveTelemetryUserIdentifier,
    saveCrashReports,
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
    customTelemetryEvents,
    loadCustomTelemetryEvents,
    saveCustomTelemetryEvents,
    downloadExtensionTemplate,
    licenseServerEnvironment,
    licenseServerEnvironments,
    saveLicenseServerEnvironment,
    syncStatus,
    lastSyncedAt,
    syncError,
    pushSettingsToRemote,
    pullRemoteSettings,
    githubHealth,
    githubHealthLoading,
    githubHealthError,
    fetchGitHubHealth,
  };
}
