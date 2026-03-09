import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useVersion } from './useVersion';

describe('useVersion', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getReleasesUrl: vi.fn(),
        getGitHubReleases: vi.fn(),
        getRecentCommits: vi.fn(),
        getSuggestedBump: vi.fn(),
        getGitHubToken: vi.fn(),
        release: vi.fn(),
        gitTagAndPush: vi.fn(),
        getCommitsSinceTag: vi.fn(),
        copyToClipboard: vi.fn(),
        openUrl: vi.fn(),
        setProjects: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns canBump, releaseHint, releasedTags, openDocs, release, etc.', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const result = useVersion(store, () => ({}), modals, runWithOverlay, notifications, () => {});
    expect(result).toHaveProperty('canBump');
    expect(result).toHaveProperty('releaseHint');
    expect(result).toHaveProperty('releasedTags');
    expect(result).toHaveProperty('openDocs');
    expect(result).toHaveProperty('release');
  });

  it('canBump is true for npm project', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const { canBump } = useVersion(store, () => ({ projectType: 'npm' }), modals, runWithOverlay, notifications, () => {});
    expect(canBump.value).toBe(true);
  });

  it('canBump is false for non-npm project', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const { canBump } = useVersion(store, () => ({ projectType: 'php' }), modals, runWithOverlay, notifications, () => {});
    expect(canBump.value).toBe(false);
  });

  it('releaseHint returns npm hint for npm project', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const { releaseHint } = useVersion(store, () => ({ projectType: 'npm' }), modals, runWithOverlay, notifications, () => {});
    expect(releaseHint.value).toContain('GitHub token');
    expect(releaseHint.value).toContain('vX.Y.Z');
  });

  it('openDocs opens docs modal', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const { openDocs } = useVersion(store, () => ({}), modals, runWithOverlay, notifications, () => {});
    openDocs('branch-sync');
    expect(modals.openModal).toHaveBeenCalledWith('docs', { docKey: 'branch-sync' });
  });

  it('releasedTags gets allTags from getInfo when no git remote (via watch)', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const { releasedTags } = useVersion(
      store,
      () => ({ path: '/test', hasGit: false, gitRemote: null, allTags: ['v1.0.0'] }),
      modals,
      runWithOverlay,
      notifications,
      () => {}
    );
    await new Promise((r) => setTimeout(r, 10));
    expect(releasedTags.value).toEqual(['v1.0.0']);
  });

  it('releasedTags fetches from API when hasGit and gitRemote (via watch)', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getReleasesUrl.mockResolvedValue('https://github.com/x/y/releases');
    api.getGitHubReleases.mockResolvedValue({ ok: true, releases: [{ tag_name: 'v1.0.0' }] });
    api.getGitHubToken.mockResolvedValue('');
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const getInfo = () => ({ path: '/test', hasGit: true, gitRemote: 'origin', allTags: [] });
    const { releasedTags } = useVersion(store, getInfo, modals, runWithOverlay, notifications, () => {});
    await new Promise((r) => setTimeout(r, 100));
    expect(releasedTags.value).toContain('v1.0.0');
  });

  it('recentCommits and suggestedBump populated when API returns (via watch)', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getRecentCommits.mockResolvedValue({ ok: true, commits: [{ subject: 'feat: add x' }] });
    api.getSuggestedBump.mockResolvedValue('minor');
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const getInfo = () => ({ path: '/test', hasGit: true });
    const { recentCommits, suggestedBump } = useVersion(
      store,
      getInfo,
      modals,
      runWithOverlay,
      notifications,
      () => {}
    );
    await new Promise((r) => setTimeout(r, 100));
    expect(recentCommits.value).toHaveLength(1);
    expect(suggestedBump.value).toBe('minor');
  });

  it('release calls api.release with bump and options', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.release.mockResolvedValue({ ok: true, tag: 'v1.0.0' });
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (fn) => fn;
    const notifications = { add: vi.fn() };
    const getInfo = () => ({ path: '/test', projectType: 'npm' });
    const { release } = useVersion(store, getInfo, modals, runWithOverlay, notifications, () => {});
    release('patch');
    await new Promise((r) => setTimeout(r, 50));
    expect(api.release).toHaveBeenCalledWith('/test', 'patch', false, expect.any(Object));
  });

  it('tagAndPush calls api.gitTagAndPush', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.gitTagAndPush.mockResolvedValue(undefined);
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (fn) => fn;
    const notifications = { add: vi.fn() };
    const getInfo = () => ({ path: '/test' });
    const { tagAndPush } = useVersion(store, getInfo, modals, runWithOverlay, notifications, () => {});
    tagAndPush();
    await new Promise((r) => setTimeout(r, 50));
    expect(api.gitTagAndPush).toHaveBeenCalledWith('/test', '');
  });

  it('openReleaseTag opens URL when releasesUrl', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getReleasesUrl.mockResolvedValue('https://github.com/x/y/releases');
    api.getGitHubReleases.mockResolvedValue({ ok: true, releases: [] });
    api.getGitHubToken.mockResolvedValue('');
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const getInfo = () => ({ path: '/test', hasGit: true, gitRemote: 'origin', allTags: [] });
    const { openReleaseTag, releasedTags } = useVersion(
      store,
      getInfo,
      modals,
      runWithOverlay,
      notifications,
      () => {}
    );
    await new Promise((r) => setTimeout(r, 100));
    openReleaseTag('v1.0.0');
    expect(api.openUrl).toHaveBeenCalledWith('https://github.com/x/y/releases/tag/v1.0.0');
  });

  it('copyVersion copies when getInfo has version', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const getInfo = () => ({ path: '/test', version: '1.2.3' });
    const { copyVersion } = useVersion(store, getInfo, modals, runWithOverlay, notifications, () => {});
    await copyVersion();
    expect(globalThis.window.releaseManager.copyToClipboard).toHaveBeenCalledWith('1.2.3');
  });

  it('loadFromCommits populates releaseNotes', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getCommitsSinceTag.mockResolvedValue({ ok: true, commits: ['feat: add x', 'fix: y'] });
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const getInfo = () => ({ path: '/test', hasGit: true, latestTag: 'v1.0.0' });
    const { loadFromCommits, releaseNotes } = useVersion(store, getInfo, modals, runWithOverlay, notifications, () => {});
    await loadFromCommits();
    expect(releaseNotes.value).toBe('feat: add x\nfix: y');
  });

  it('previewChangelog populates changelogPreview', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getCommitsSinceTag.mockResolvedValue({ ok: true, commits: ['a', 'b'] });
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const getInfo = () => ({ path: '/test', hasGit: true, latestTag: null });
    const { previewChangelog, changelogPreview } = useVersion(store, getInfo, modals, runWithOverlay, notifications, () => {});
    await previewChangelog();
    expect(changelogPreview.value).toEqual(['a', 'b']);
  });

  it('useChangelogForReleaseNotes copies changelog to releaseNotes', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const getInfo = () => ({ path: '/test' });
    const { useChangelogForReleaseNotes, changelogPreview, releaseNotes } = useVersion(store, getInfo, modals, runWithOverlay, notifications, () => {});
    changelogPreview.value = ['commit 1', 'commit 2'];
    useChangelogForReleaseNotes();
    expect(releaseNotes.value).toBe('commit 1\ncommit 2');
  });

  it('generateWithOllama populates releaseNotes', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.ollamaGenerateReleaseNotes = vi.fn().mockResolvedValue({ ok: true, text: 'Generated notes' });
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const getInfo = () => ({ path: '/test', latestTag: null });
    const { generateWithOllama, releaseNotes } = useVersion(store, getInfo, modals, runWithOverlay, notifications, () => {});
    await generateWithOllama();
    expect(releaseNotes.value).toBe('Generated notes');
  });

  it('release handles error on catch', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.release.mockRejectedValue(new Error('Network error'));
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (fn) => fn;
    const notifications = { add: vi.fn() };
    const getInfo = () => ({ path: '/test' });
    const { release, releaseStatus } = useVersion(store, getInfo, modals, runWithOverlay, notifications, () => {});
    release('patch');
    await new Promise((r) => setTimeout(r, 50));
    expect(releaseStatus.value).toBe('Network error');
    expect(notifications.add).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('copyChangelog copies to clipboard', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const api = globalThis.window?.releaseManager;
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const getInfo = () => ({ path: '/test' });
    const { changelogPreview, copyChangelog } = useVersion(store, getInfo, modals, runWithOverlay, notifications, () => {});
    changelogPreview.value = ['a', 'b'];
    await copyChangelog();
    expect(api.copyToClipboard).toHaveBeenCalledWith('a\nb');
  });

  it('copyTag copies when getInfo has latestTag', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const getInfo = () => ({ path: '/test', latestTag: 'v1.0.0' });
    const { copyTag } = useVersion(store, getInfo, modals, runWithOverlay, notifications, () => {});
    await copyTag();
    expect(globalThis.window.releaseManager.copyToClipboard).toHaveBeenCalledWith('v1.0.0');
  });

  it('copyReleaseNotes copies when releaseNotes has content', async () => {
    const store = (await import('../stores/app')).useAppStore();
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (p) => p;
    const notifications = { add: vi.fn() };
    const getInfo = () => ({ path: '/test' });
    const { releaseNotes, copyReleaseNotes } = useVersion(store, getInfo, modals, runWithOverlay, notifications, () => {});
    releaseNotes.value = 'Release notes text';
    await copyReleaseNotes();
    expect(globalThis.window.releaseManager.copyToClipboard).toHaveBeenCalledWith('Release notes text');
  });

  it('tagAndPush handles error on catch', async () => {
    const store = (await import('../stores/app')).useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.gitTagAndPush.mockRejectedValue(new Error('Push failed'));
    const modals = { openModal: vi.fn() };
    const runWithOverlay = (fn) => fn;
    const notifications = { add: vi.fn() };
    const getInfo = () => ({ path: '/test' });
    const { tagAndPush, releaseStatus } = useVersion(store, getInfo, modals, runWithOverlay, notifications, () => {});
    tagAndPush();
    await new Promise((r) => setTimeout(r, 50));
    expect(releaseStatus.value).toBe('Push failed');
  });
});
