import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { useCommitDetail } from './useCommitDetail';

function flushPromises() {
  return new Promise((r) => setTimeout(r, 0));
}

describe('useCommitDetail', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getCommitDetail: vi.fn(),
        copyToClipboard: vi.fn(),
        gitCherryPick: vi.fn(),
        gitRevert: vi.fn(),
        gitAmend: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns content, title, commitFiles, sideBySideFileOptions, close, etc.', () => {
    const emit = vi.fn();
    const result = useCommitDetail(() => '/path', () => 'abc123', () => false, emit);
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('commitFiles');
    expect(result).toHaveProperty('sideBySideFileOptions');
    expect(result).toHaveProperty('close');
  });

  it('close emits close', () => {
    const emit = vi.fn();
    const { close } = useCommitDetail(() => '', () => '', () => false, emit);
    close();
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('load sets content when API returns ok', async () => {
    const api = globalThis.window?.releaseManager;
    api.getCommitDetail.mockResolvedValue({
      ok: true,
      subject: 'Fix bug',
      body: 'Details',
      files: ['a.js', 'b.js'],
    });
    const emit = vi.fn();
    const { content } = useCommitDetail(() => '/path', () => 'abc123', () => false, emit);
    await nextTick();
    await flushPromises();
    expect(content.value).toContain('Fix bug');
    expect(content.value).toContain('Details');
  });

  it('load sets content when API returns error', async () => {
    const api = globalThis.window?.releaseManager;
    api.getCommitDetail.mockResolvedValue({ error: 'Commit not found' });
    const emit = vi.fn();
    const { content } = useCommitDetail(() => '/path', () => 'abc123', () => false, emit);
    await nextTick();
    await flushPromises();
    expect(content.value).toBe('Commit not found');
  });

  it('sideBySideFileOptions maps commitFiles to options', async () => {
    const api = globalThis.window?.releaseManager;
    api.getCommitDetail.mockResolvedValue({
      ok: true,
      subject: 'Fix',
      files: ['foo.js', 'bar.js'],
    });
    const emit = vi.fn();
    const { commitFiles, sideBySideFileOptions } = useCommitDetail(() => '/path', () => 'abc', () => false, emit);
    await nextTick();
    await flushPromises();
    expect(commitFiles.value).toHaveLength(2);
    expect(sideBySideFileOptions.value).toHaveLength(2);
    expect(sideBySideFileOptions.value[0]).toEqual({ value: 'foo.js', label: 'foo.js' });
  });

  it('copySha copies SHA and closes', async () => {
    const emit = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.getCommitDetail.mockResolvedValue({ ok: true, subject: 'Fix' });
    const { copySha } = useCommitDetail(() => '/path', () => 'abc123', () => false, emit);
    await nextTick();
    await flushPromises();
    await copySha();
    expect(api.copyToClipboard).toHaveBeenCalledWith('abc123');
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('cherryPick calls gitCherryPick and emits refresh', async () => {
    const emit = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.getCommitDetail.mockResolvedValue({ ok: true, subject: 'Fix' });
    api.gitCherryPick.mockResolvedValue(undefined);
    const { cherryPick } = useCommitDetail(() => '/path', () => 'abc123', () => false, emit);
    await nextTick();
    await flushPromises();
    await cherryPick();
    expect(api.gitCherryPick).toHaveBeenCalledWith('/path', 'abc123');
    expect(emit).toHaveBeenCalledWith('refresh');
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('revert calls gitRevert and emits refresh', async () => {
    const emit = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.getCommitDetail.mockResolvedValue({ ok: true, subject: 'Fix' });
    api.gitRevert.mockResolvedValue(undefined);
    const { revert } = useCommitDetail(() => '/path', () => 'abc123', () => false, emit);
    await nextTick();
    await flushPromises();
    await revert();
    expect(api.gitRevert).toHaveBeenCalledWith('/path', 'abc123');
    expect(emit).toHaveBeenCalledWith('refresh');
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('amend calls gitAmend with first line of content', async () => {
    const emit = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.getCommitDetail.mockResolvedValue({
      ok: true,
      subject: 'Fix bug',
      body: 'Details here',
      files: [],
    });
    api.gitAmend.mockResolvedValue(undefined);
    const { amend, content } = useCommitDetail(() => '/path', () => 'abc123', () => true, emit);
    await nextTick();
    await flushPromises();
    expect(content.value).toContain('Fix bug');
    await amend();
    expect(api.gitAmend).toHaveBeenCalledWith('/path', 'Fix bug');
    expect(emit).toHaveBeenCalledWith('refresh');
  });

  it('openSideBySide emits open-diff-side-by-side with file and sha', async () => {
    const emit = vi.fn();
    const api = globalThis.window?.releaseManager;
    api.getCommitDetail.mockResolvedValue({
      ok: true,
      subject: 'Fix',
      files: ['src/foo.js'],
    });
    const { openSideBySide, sideBySideFile } = useCommitDetail(() => '/path', () => 'abc123', () => false, emit);
    await nextTick();
    await flushPromises();
    expect(sideBySideFile.value).toBe('src/foo.js');
    openSideBySide();
    expect(emit).toHaveBeenCalledWith('open-diff-side-by-side', {
      dirPath: '/path',
      filePath: 'src/foo.js',
      commitSha: 'abc123',
    });
  });
});
