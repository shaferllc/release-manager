import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLicense, TIER_FREE, TIER_PLUS, TIER_PRO } from './useLicense';

describe('useLicense', () => {
  let mockApi;

  beforeEach(() => {
    mockApi = {
      getLicenseStatus: vi.fn().mockResolvedValue({ hasLicense: false }),
    };
    if (globalThis.window) globalThis.window.releaseManager = mockApi;
  });

  it('exports tier constants', () => {
    expect(TIER_FREE).toBe('free');
    expect(TIER_PLUS).toBe('plus');
    expect(TIER_PRO).toBe('pro');
  });

  it('loadStatus resets state when no getLicenseStatus', async () => {
    delete mockApi.getLicenseStatus;
    const { loadStatus, isLoggedIn, isTabAllowed } = useLicense();
    await loadStatus();
    expect(isLoggedIn.value).toBe(false);
    expect(isTabAllowed('dashboard')).toBe(false);
  });

  it('loadStatus applies status when hasLicense true', async () => {
    mockApi.getLicenseStatus.mockResolvedValue({
      hasLicense: true,
      tier: 'pro',
      permissions: { tabs: ['dashboard', 'git', 'kanban'] },
      features: { ai_commit_message: true },
      limits: { max_projects: 10, max_extensions: 20 },
    });
    const { loadStatus, isLoggedIn, tier, isTabAllowed, hasFeature, maxProjects, maxExtensions } = useLicense();
    await loadStatus();
    expect(isLoggedIn.value).toBe(true);
    expect(tier.value).toBe('pro');
    expect(isTabAllowed('dashboard')).toBe(true);
    expect(isTabAllowed('kanban')).toBe(true);
    expect(isTabAllowed('unknown-tab')).toBe(false);
    expect(hasFeature('ai_commit_message')).toBe(true);
    expect(hasFeature('missing_feature')).toBe(false);
    expect(maxProjects.value).toBe(10);
    expect(maxExtensions.value).toBe(20);
  });

  it('isTabAllowed uses DEFAULT_TABS when no server permissions but has license', async () => {
    mockApi.getLicenseStatus.mockResolvedValue({
      hasLicense: true,
      permissions: {},
    });
    const { loadStatus, isTabAllowed } = useLicense();
    await loadStatus();
    expect(isTabAllowed('dashboard')).toBe(true);
    expect(isTabAllowed('notes')).toBe(true);
    expect(isTabAllowed('random-tab')).toBe(false);
  });

  it('loadStatus handles API error', async () => {
    mockApi.getLicenseStatus.mockRejectedValue(new Error('Network error'));
    const { loadStatus, isLoggedIn } = useLicense();
    await loadStatus();
    expect(isLoggedIn.value).toBe(false);
  });

  it('normalizes tier to pro/plus/free', async () => {
    mockApi.getLicenseStatus.mockResolvedValue({
      hasLicense: true,
      tier: 'PRO',
    });
    const { loadStatus, tier } = useLicense();
    await loadStatus();
    expect(tier.value).toBe('pro');
  });
});
