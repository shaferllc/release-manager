import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSettings } from './useSettings';

describe('useSettings', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getGitHubToken: vi.fn().mockResolvedValue(''),
        getOllamaSettings: vi.fn().mockResolvedValue({}),
        getClaudeSettings: vi.fn().mockResolvedValue({}),
        getOpenAISettings: vi.fn().mockResolvedValue({}),
        getGeminiSettings: vi.fn().mockResolvedValue({}),
        getAiProvider: vi.fn().mockResolvedValue('ollama'),
        getPreference: vi.fn().mockResolvedValue(undefined),
        getTheme: vi.fn().mockResolvedValue({ theme: 'dark' }),
        getLaunchAtLogin: vi.fn().mockResolvedValue({ openAtLogin: false }),
        getConfirmBeforeQuit: vi.fn().mockResolvedValue(false),
        getProxy: vi.fn().mockResolvedValue(''),
        getAlwaysOnTop: vi.fn().mockResolvedValue(false),
        getMinimizeToTray: vi.fn().mockResolvedValue(false),
        getAppZoomFactor: vi.fn().mockResolvedValue(1),
        getLicenseServerConfig: vi.fn().mockResolvedValue({}),
        getLicenseServerEnvironments: vi.fn().mockResolvedValue([]),
        getGitGlobalConfig: vi.fn().mockResolvedValue({}),
        fetchRemoteSettings: vi.fn().mockResolvedValue({ ok: false }),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns sections, activeSection, and option arrays', () => {
    const result = useSettings();
    expect(result.sections).toBeDefined();
    expect(Array.isArray(result.sections.value)).toBe(true);
    expect(result.sections.value.length).toBeGreaterThan(0);
    expect(result.activeSection).toBeDefined();
    expect(result.themeOptions).toBeDefined();
    expect(result.accentOptions).toBeDefined();
    expect(result.defaultViewOptions).toBeDefined();
  });

  it('sections include built-in ids like account, git, appearance', () => {
    const { sections } = useSettings();
    const ids = sections.value.map((s) => s.id);
    expect(ids).toContain('account');
    expect(ids).toContain('git');
    expect(ids).toContain('appearance');
  });

  it('setTheme calls api.setTheme and updates theme ref', () => {
    const api = globalThis.window?.releaseManager;
    api.setTheme = vi.fn();
    const { setTheme, theme } = useSettings();
    setTheme('light');
    expect(api.setTheme).toHaveBeenCalledWith('light');
    expect(theme.value).toBe('light');
  });

  it('setAccent updates accentColor and applies appearance', () => {
    const api = globalThis.window?.releaseManager;
    api.setPreference = vi.fn();
    const { setAccent, accentColor } = useSettings();
    setAccent('blue');
    expect(accentColor.value).toBe('blue');
    expect(api.setPreference).toHaveBeenCalledWith('appearanceAccent', 'blue');
  });

  it('openUrl calls api.openUrl when url provided', () => {
    const api = globalThis.window?.releaseManager;
    api.openUrl = vi.fn();
    const { openUrl } = useSettings();
    openUrl('https://example.com');
    expect(api.openUrl).toHaveBeenCalledWith('https://example.com');
  });

  it('saveGitDefaultBranch calls setPreference', () => {
    const api = globalThis.window?.releaseManager;
    api.setPreference = vi.fn();
    const { gitDefaultBranch, saveGitDefaultBranch } = useSettings();
    gitDefaultBranch.value = 'develop';
    saveGitDefaultBranch();
    expect(api.setPreference).toHaveBeenCalledWith('gitDefaultBranch', 'develop');
  });

  it('activeSection can be set', () => {
    const { activeSection } = useSettings();
    activeSection.value = 'git';
    expect(activeSection.value).toBe('git');
  });

  it('saveDefaultView calls setPreference', () => {
    const api = globalThis.window?.releaseManager;
    api.setPreference = vi.fn();
    const { defaultView, saveDefaultView } = useSettings();
    defaultView.value = 'dashboard';
    saveDefaultView();
    expect(api.setPreference).toHaveBeenCalledWith('defaultView', 'dashboard');
  });

  it('saveCheckForUpdates calls setPreference', () => {
    const api = globalThis.window?.releaseManager;
    api.setPreference = vi.fn();
    const { checkForUpdates, saveCheckForUpdates } = useSettings();
    checkForUpdates.value = 'manual';
    saveCheckForUpdates();
    expect(api.setPreference).toHaveBeenCalledWith('checkForUpdates', 'manual');
  });

  it('saveToken calls setGitHubToken', () => {
    const api = globalThis.window?.releaseManager;
    api.setGitHubToken = vi.fn();
    const { githubToken, saveToken } = useSettings();
    githubToken.value = 'ghp_xxx';
    saveToken();
    expect(api.setGitHubToken).toHaveBeenCalledWith('ghp_xxx');
  });
});
