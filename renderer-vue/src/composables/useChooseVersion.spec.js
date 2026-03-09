import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useChooseVersion } from './useChooseVersion';

describe('useChooseVersion', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getGitHubReleases: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns releases, status, load, close, select', () => {
    const emit = vi.fn();
    const result = useChooseVersion(() => null, () => '', emit);
    expect(result).toHaveProperty('releases');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('load');
    expect(result).toHaveProperty('close');
    expect(result).toHaveProperty('select');
  });

  it('close emits close', () => {
    const emit = vi.fn();
    const { close } = useChooseVersion(() => null, () => '', emit);
    close();
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('select emits select and close', () => {
    const emit = vi.fn();
    const { select } = useChooseVersion(() => null, () => '', emit);
    const release = { tag_name: 'v1.0.0' };
    select(release);
    expect(emit).toHaveBeenCalledWith('select', release);
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('load sets status when no remote', async () => {
    const emit = vi.fn();
    const { status, load } = useChooseVersion(() => null, () => '', emit);
    await load();
    expect(status.value).toBe('No remote configured.');
  });

  it('load sets status on API error', async () => {
    const api = globalThis.window?.releaseManager;
    api.getGitHubReleases.mockRejectedValue(new Error('Network error'));
    const emit = vi.fn();
    const { status, load } = useChooseVersion(() => 'https://github.com/owner/repo', () => '', emit);
    await load();
    expect(status.value).toContain('Network error');
  });

  it('load sets releases when API returns list', async () => {
    const api = globalThis.window?.releaseManager;
    api.getGitHubReleases.mockResolvedValue([
      { tag_name: 'v1.0.0' },
      { tag_name: 'v0.9.0' },
    ]);
    const emit = vi.fn();
    const { releases, load } = useChooseVersion(() => 'https://github.com/owner/repo', () => '', emit);
    await load();
    expect(releases.value).toHaveLength(2);
    expect(releases.value[0].tag_name).toBe('v1.0.0');
  });
});
