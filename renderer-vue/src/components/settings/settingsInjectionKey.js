/**
 * Injection key for settings composable result.
 * Parent (SettingsView) provides the full useSettings() return value;
 * section components inject it to access refs and methods.
 */
export const SETTINGS_INJECTION_KEY = Symbol('settings');
