import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNotificationPreferences } from './useNotificationPreferences';

vi.mock('./useLicense', () => ({
  useLicense: () => ({ isLoggedIn: { value: true } }),
}));

describe('useNotificationPreferences', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        fetchNotificationPreferences: vi.fn(),
        updateNotificationPreferences: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns preferences, loading, saving, error, categories, typesForCategory, fetchPreferences, savePreferences', () => {
    const result = useNotificationPreferences();
    expect(result).toHaveProperty('preferences');
    expect(result).toHaveProperty('loading');
    expect(result).toHaveProperty('saving');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('categories');
    expect(result).toHaveProperty('typesForCategory');
    expect(result).toHaveProperty('fetchPreferences');
    expect(result).toHaveProperty('savePreferences');
  });

  it('typesForCategory returns types for category', () => {
    const { typesForCategory } = useNotificationPreferences();
    const alerts = typesForCategory('alerts');
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]).toHaveProperty('key');
    expect(alerts[0]).toHaveProperty('label');
    expect(alerts[0].category).toBe('alerts');
  });

  it('categories includes expected ids', () => {
    const { categories } = useNotificationPreferences();
    const ids = categories.map((c) => c.id);
    expect(ids).toContain('alerts');
    expect(ids).toContain('team');
    expect(ids).toContain('billing');
  });

  it('fetchPreferences populates preferences when API returns', async () => {
    const api = globalThis.window?.releaseManager;
    api.fetchNotificationPreferences.mockResolvedValue({
      ok: true,
      preferences: { crash_report_alert: true, security_alert: false },
    });
    const { preferences, fetchPreferences } = useNotificationPreferences();
    await fetchPreferences();
    expect(preferences.crash_report_alert).toBe(true);
    expect(preferences.security_alert).toBe(false);
  });

  it('savePreferences calls updateNotificationPreferences', async () => {
    const api = globalThis.window?.releaseManager;
    api.updateNotificationPreferences.mockResolvedValue({ ok: true });
    const { preferences, savePreferences } = useNotificationPreferences();
    preferences.crash_report_alert = false;
    await savePreferences();
    expect(api.updateNotificationPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ crash_report_alert: false })
    );
  });
});
