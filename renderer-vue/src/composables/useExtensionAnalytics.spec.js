import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useExtensionAnalytics } from './useExtensionAnalytics';

describe('useExtensionAnalytics', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getExtensionAnalyticsOverview: vi.fn(),
        getExtensionAnalyticsChartData: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns overview, loading, error, computeds, fetchOverview, fetchChartData', () => {
    const result = useExtensionAnalytics();
    expect(result).toHaveProperty('overview');
    expect(result).toHaveProperty('loading');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('totalExtensions');
    expect(result).toHaveProperty('totalInstalls');
    expect(result).toHaveProperty('mostPopular');
    expect(result).toHaveProperty('zeroInstalls');
    expect(result).toHaveProperty('installCounts');
    expect(result).toHaveProperty('fetchOverview');
    expect(result).toHaveProperty('fetchChartData');
  });

  it('fetchOverview sets overview when API returns ok', async () => {
    const api = globalThis.window?.releaseManager;
    const data = { total_extensions: 5, total_installs: 100 };
    api.getExtensionAnalyticsOverview.mockResolvedValue({ ok: true, ...data });
    const { overview, fetchOverview } = useExtensionAnalytics();
    await fetchOverview();
    expect(overview.value).toMatchObject(data);
  });

  it('fetchOverview sets error when API fails', async () => {
    const api = globalThis.window?.releaseManager;
    api.getExtensionAnalyticsOverview.mockResolvedValue({ ok: false, error: 'Failed' });
    const { error, fetchOverview } = useExtensionAnalytics();
    await fetchOverview();
    expect(error.value).toBe('Failed');
  });

  it('totalExtensions returns overview total_extensions', async () => {
    const api = globalThis.window?.releaseManager;
    api.getExtensionAnalyticsOverview.mockResolvedValue({
      ok: true,
      total_extensions: 42,
      total_installs: 0,
      most_popular: [],
      zero_installs: [],
    });
    const { totalExtensions, fetchOverview } = useExtensionAnalytics();
    await fetchOverview();
    expect(totalExtensions.value).toBe(42);
  });

  it('installCounts builds map from per_extension', async () => {
    const api = globalThis.window?.releaseManager;
    api.getExtensionAnalyticsOverview.mockResolvedValue({
      ok: true,
      per_extension: [
        { id: 'ext1', install_count: 10 },
        { slug: 'ext2', install_count: 5 },
      ],
    });
    const { installCounts, fetchOverview } = useExtensionAnalytics();
    await fetchOverview();
    expect(installCounts.value.ext1).toBe(10);
    expect(installCounts.value.ext2).toBe(5);
  });
});
