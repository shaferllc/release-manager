import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCreateTag } from './useCreateTag';

describe('useCreateTag', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getTags: vi.fn(),
        createTag: vi.fn(),
        getCommitSubject: vi.fn(),
        getCommitLog: vi.fn(),
        getCommitLogWithBody: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns tagName, tagMessage, tagRef, error, close, suggestVersion', () => {
    const emit = vi.fn();
    const notifications = { add: vi.fn() };
    const result = useCreateTag(() => '/path', () => 'HEAD', emit, notifications);
    expect(result).toHaveProperty('tagName');
    expect(result).toHaveProperty('tagMessage');
    expect(result).toHaveProperty('tagRef');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('close');
    expect(result).toHaveProperty('suggestVersion');
  });

  it('close emits close', () => {
    const emit = vi.fn();
    const notifications = { add: vi.fn() };
    const { close } = useCreateTag(() => '', () => '', emit, notifications);
    close();
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('suggestVersion sets v1.0.0 when no tags', async () => {
    const api = globalThis.window?.releaseManager;
    api.getTags.mockResolvedValue({ ok: true, tags: [] });
    const emit = vi.fn();
    const notifications = { add: vi.fn() };
    const { tagName, suggestVersion } = useCreateTag(() => '/path', () => 'HEAD', emit, notifications);
    suggestVersion();
    await new Promise((r) => setTimeout(r, 50));
    expect(tagName.value).toBe('v1.0.0');
  });

  it('suggestVersion increments patch when latest is v1.0.0', async () => {
    const api = globalThis.window?.releaseManager;
    api.getTags.mockResolvedValue({ ok: true, tags: ['v1.0.0', 'v0.9.0'] });
    const emit = vi.fn();
    const notifications = { add: vi.fn() };
    const { tagName, suggestVersion } = useCreateTag(() => '/path', () => 'HEAD', emit, notifications);
    suggestVersion();
    await new Promise((r) => setTimeout(r, 50));
    expect(tagName.value).toBe('v1.0.1');
  });

  it('suggestVersion appends -next when latest not semver', async () => {
    const api = globalThis.window?.releaseManager;
    api.getTags.mockResolvedValue({ ok: true, tags: ['release-2024'] });
    const emit = vi.fn();
    const notifications = { add: vi.fn() };
    const { tagName, suggestVersion } = useCreateTag(() => '/path', () => 'HEAD', emit, notifications);
    suggestVersion();
    await new Promise((r) => setTimeout(r, 50));
    expect(tagName.value).toBe('release-2024-next');
  });

  it('fillMessageFromRef sets tagMessage from commit subject', async () => {
    const api = globalThis.window?.releaseManager;
    api.getCommitSubject.mockResolvedValue({ ok: true, subject: 'feat: add feature' });
    const emit = vi.fn();
    const notifications = { add: vi.fn() };
    const { tagMessage, tagRef, fillMessageFromRef } = useCreateTag(() => '/path', () => 'HEAD', emit, notifications);
    tagRef.value = 'abc123';
    await fillMessageFromRef();
    expect(tagMessage.value).toBe('feat: add feature');
  });

  it('submit creates tag and emits', async () => {
    const api = globalThis.window?.releaseManager;
    api.createTag.mockResolvedValue(undefined);
    const emit = vi.fn();
    const notifications = { add: vi.fn() };
    const { tagName, tagMessage, submit } = useCreateTag(() => '/path', () => 'HEAD', emit, notifications);
    tagName.value = 'v2.0.0';
    tagMessage.value = 'Release notes';
    await submit();
    expect(api.createTag).toHaveBeenCalledWith('/path', 'v2.0.0', 'Release notes', 'HEAD');
    expect(notifications.add).toHaveBeenCalledWith({ title: 'Tag created', message: 'v2.0.0', type: 'success' });
    expect(emit).toHaveBeenCalledWith('created');
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('submit sets error on failure', async () => {
    const api = globalThis.window?.releaseManager;
    api.createTag.mockRejectedValue(new Error('Tag exists'));
    const emit = vi.fn();
    const notifications = { add: vi.fn() };
    const { tagName, error, submit } = useCreateTag(() => '/path', () => 'HEAD', emit, notifications);
    tagName.value = 'v1.0.0';
    await submit();
    expect(error.value).toBe('Tag exists');
    expect(notifications.add).toHaveBeenCalledWith({ title: 'Create tag failed', message: 'Tag exists', type: 'error' });
  });

  it('filteredRefCommits filters by refSearch', async () => {
    const api = globalThis.window?.releaseManager;
    api.getCommitLogWithBody = vi.fn().mockResolvedValue({
      ok: true,
      commits: [
        { sha: 'abc', subject: 'Fix bug', author: 'dev' },
        { sha: 'def', subject: 'Add feature', author: 'dev' },
      ],
    });
    api.getCommitLog = api.getCommitLogWithBody;
    const emit = vi.fn();
    const notifications = { add: vi.fn() };
    const { refSearch, filteredRefCommits, toggleRefBrowser } = useCreateTag(
      () => '/path',
      () => 'HEAD',
      emit,
      notifications
    );
    toggleRefBrowser();
    await new Promise((r) => setTimeout(r, 80));
    refSearch.value = 'Fix';
    expect(filteredRefCommits.value).toHaveLength(1);
    expect(filteredRefCommits.value[0].subject).toBe('Fix bug');
  });
});
