import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePullRequests } from './usePullRequests';

describe('usePullRequests', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getPullRequests: vi.fn(),
        getPullRequestsUrl: vi.fn(),
        getGitHubToken: vi.fn(),
        openUrl: vi.fn(),
        createPullRequest: vi.fn(),
        mergePullRequest: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns pullRequests, prState, prStateOptions, openCreateModal, openPullRequestsUrl', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const emit = vi.fn();
    const result = usePullRequests(store, () => ({}), emit);
    expect(result).toHaveProperty('pullRequests');
    expect(result).toHaveProperty('prState');
    expect(result).toHaveProperty('prStateOptions');
    expect(result).toHaveProperty('openCreateModal');
    expect(result).toHaveProperty('openPullRequestsUrl');
  });

  it('prStateOptions has open and closed', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const emit = vi.fn();
    const { prStateOptions } = usePullRequests(store, () => ({}), emit);
    expect(prStateOptions).toContainEqual({ value: 'open', label: 'Open' });
    expect(prStateOptions).toContainEqual({ value: 'closed', label: 'Closed' });
  });

  it('openCreateModal sets showCreateModal and resets form', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const emit = vi.fn();
    const { showCreateModal, newPrBase, newPrTitle, newPrBody, openCreateModal } = usePullRequests(store, () => ({}), emit);
    newPrTitle.value = 'old';
    openCreateModal();
    expect(showCreateModal.value).toBe(true);
    expect(newPrBase.value).toBe('main');
    expect(newPrTitle.value).toBe('');
    expect(newPrBody.value).toBe('');
  });

  it('openPullRequestsUrl calls openUrl when url set', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const emit = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.getPullRequestsUrl.mockResolvedValue('https://github.com/owner/repo/pulls');
    const { pullRequestsUrl, openPullRequestsUrl } = usePullRequests(store, () => ({ gitRemote: 'https://github.com/owner/repo' }), emit);
    await new Promise((r) => setTimeout(r, 10));
    pullRequestsUrl.value = 'https://github.com/x/y/pulls';
    openPullRequestsUrl();
    expect(api.openUrl).toHaveBeenCalledWith('https://github.com/x/y/pulls');
  });

  it('load populates pullRequests when API returns', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getPullRequestsUrl.mockResolvedValue('https://github.com/x/y/pulls');
    api.getPullRequests.mockResolvedValue({
      ok: true,
      pullRequests: [{ number: 1, title: 'Fix bug', html_url: 'https://github.com/x/y/pull/1' }],
    });
    api.getGitHubToken.mockResolvedValue('');
    const emit = vi.fn();
    const { pullRequests, load } = usePullRequests(
      store,
      () => ({ path: '/test', gitRemote: 'https://github.com/x/y' }),
      emit
    );
    await load();
    expect(pullRequests.value).toHaveLength(1);
    expect(pullRequests.value[0].number).toBe(1);
  });

  it('load sets error when API fails', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getPullRequestsUrl.mockResolvedValue('');
    api.getPullRequests.mockRejectedValue(new Error('Network error'));
    const emit = vi.fn();
    const { error, load } = usePullRequests(
      store,
      () => ({ path: '/test', gitRemote: 'https://github.com/x/y' }),
      emit
    );
    await load();
    expect(error.value).toContain('Network error');
  });

  it('submitCreatePr creates PR and opens url', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.createPullRequest.mockResolvedValue({
      ok: true,
      pullRequest: { html_url: 'https://github.com/x/y/pull/2', title: 'New PR' },
    });
    api.getPullRequests.mockResolvedValue({ ok: true, pullRequests: [] });
    api.getPullRequestsUrl.mockResolvedValue('');
    api.getGitHubToken.mockResolvedValue('');
    const emit = vi.fn();
    const { newPrTitle, newPrBase, submitCreatePr } = usePullRequests(
      store,
      () => ({ path: '/test', gitRemote: 'origin' }),
      emit
    );
    newPrTitle.value = 'Add feature';
    newPrBase.value = 'main';
    await submitCreatePr();
    expect(api.createPullRequest).toHaveBeenCalled();
  });

  it('mergePr merges when confirmed', async () => {
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.mergePullRequest.mockResolvedValue({ ok: true });
    api.getPullRequests.mockResolvedValue({ ok: true, pullRequests: [] });
    api.getPullRequestsUrl.mockResolvedValue('');
    api.getGitHubToken.mockResolvedValue('');
    const emit = vi.fn();
    const { mergePr } = usePullRequests(
      store,
      () => ({ path: '/test', gitRemote: 'https://github.com/x/y' }),
      emit
    );
    await mergePr({ number: 5, title: 'Fix' });
    expect(api.mergePullRequest).toHaveBeenCalledWith('https://github.com/x/y', 5, 'merge', undefined);
    window.confirm = originalConfirm;
  });
});
