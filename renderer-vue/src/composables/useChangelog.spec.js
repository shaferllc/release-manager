import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useChangelog } from './useChangelog';

describe('useChangelog', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getChangelog: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns content, error, load', () => {
    const { content, error, load } = useChangelog();
    expect(content.value).toBe('');
    expect(error.value).toBe(null);
    expect(typeof load).toBe('function');
  });

  it('load sets content when API returns ok', async () => {
    const api = globalThis.window?.releaseManager;
    api.getChangelog.mockResolvedValue({ ok: true, content: '# Changelog' });
    const { content, error, load } = useChangelog();
    await load();
    expect(content.value).toBe('# Changelog');
    expect(error.value).toBe(null);
  });

  it('load sets error when API returns ok but no content', async () => {
    const api = globalThis.window?.releaseManager;
    api.getChangelog.mockResolvedValue({ ok: true });
    const { content, error, load } = useChangelog();
    await load();
    expect(content.value).toBe('');
    expect(error.value).toBeTruthy();
  });

  it('load sets error when API returns error', async () => {
    const api = globalThis.window?.releaseManager;
    api.getChangelog.mockResolvedValue({ ok: false, error: 'Not found' });
    const { content, error, load } = useChangelog();
    await load();
    expect(content.value).toBe('');
    expect(error.value).toBe('Not found');
  });

  it('load sets error on throw', async () => {
    const api = globalThis.window?.releaseManager;
    api.getChangelog.mockRejectedValue(new Error('Network error'));
    const { content, error, load } = useChangelog();
    await load();
    expect(content.value).toBe('');
    expect(error.value).toBe('Network error');
  });
});
