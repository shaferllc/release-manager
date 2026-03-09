import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('useExtensionPrefs', () => {
  let useExtensionPrefs;

  beforeEach(async () => {
    vi.resetModules();
    const mockApi = {
      getPreference: vi.fn().mockResolvedValue(null),
      setPreference: vi.fn().mockResolvedValue(undefined),
    };
    if (globalThis.window) globalThis.window.releaseManager = mockApi;
    const mod = await import('./useExtensionPrefs');
    useExtensionPrefs = mod.useExtensionPrefs;
  });

  it('returns disabledExtensions, isEnabled, setEnabled, load', () => {
    const prefs = useExtensionPrefs();
    expect(prefs.disabledExtensions).toBeDefined();
    expect(typeof prefs.isEnabled).toBe('function');
    expect(typeof prefs.setEnabled).toBe('function');
    expect(typeof prefs.load).toBe('function');
  });

  it('isEnabled returns true when extension is not disabled', () => {
    const { isEnabled } = useExtensionPrefs();
    expect(isEnabled('kanban')).toBe(true);
    expect(isEnabled('wiki')).toBe(true);
  });

  it('load fetches preference and populates disabled set', async () => {
    const mockApi = globalThis.window?.releaseManager;
    mockApi.getPreference.mockResolvedValue({ disabled: ['kanban', 'wiki'] });
    const { load, isEnabled } = useExtensionPrefs();
    await load();
    expect(isEnabled('kanban')).toBe(false);
    expect(isEnabled('wiki')).toBe(false);
    expect(isEnabled('notes')).toBe(true);
  });

  it('load handles invalid response', async () => {
    const mockApi = globalThis.window?.releaseManager;
    mockApi.getPreference.mockResolvedValue({});
    const { load, isEnabled } = useExtensionPrefs();
    await load();
    expect(isEnabled('kanban')).toBe(true);
  });

  it('setEnabled enables extension and persists', async () => {
    const mockApi = globalThis.window?.releaseManager;
    mockApi.getPreference.mockResolvedValue({ disabled: ['kanban'] });
    const { load, setEnabled, isEnabled } = useExtensionPrefs();
    await load();
    expect(isEnabled('kanban')).toBe(false);
    await setEnabled('kanban', true);
    expect(isEnabled('kanban')).toBe(true);
    expect(mockApi.setPreference).toHaveBeenCalledWith('extensionPrefs', expect.objectContaining({ disabled: expect.any(Array) }));
  });

  it('setEnabled disables extension and persists', async () => {
    const { setEnabled, isEnabled } = useExtensionPrefs();
    expect(isEnabled('notes')).toBe(true);
    await setEnabled('notes', false);
    expect(isEnabled('notes')).toBe(false);
  });
});
