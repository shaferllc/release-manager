import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRepoFileContent } from './useRepoFileContent';

describe('useRepoFileContent', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getGitattributes: vi.fn(),
        writeGitattributes: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns content, error, saving, successMessage, loadContent, save', () => {
    const result = useRepoFileContent({
      getKey: 'getGitattributes',
      writeKey: 'writeGitattributes',
    });
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('saving');
    expect(result).toHaveProperty('successMessage');
    expect(result).toHaveProperty('loadContent');
    expect(result).toHaveProperty('save');
  });

  it('loadContent sets content when API returns ok', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getGitattributes.mockResolvedValue({ ok: true, content: '* text=auto' });

    const { content, loadContent } = useRepoFileContent({
      getKey: 'getGitattributes',
      writeKey: 'writeGitattributes',
    });
    await loadContent();
    expect(content.value).toBe('* text=auto');
  });

  it('save calls writeKey and sets successMessage', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.writeGitattributes.mockResolvedValue(undefined);

    const onRefresh = vi.fn();
    const { content, successMessage, save } = useRepoFileContent({
      getKey: 'getGitattributes',
      writeKey: 'writeGitattributes',
      onRefresh,
    });
    content.value = '* text=auto';
    await save();
    expect(api.writeGitattributes).toHaveBeenCalledWith('/test', '* text=auto');
    expect(onRefresh).toHaveBeenCalled();
    expect(successMessage.value).toBe('Saved.');
  });

  it('save sets error on failure', async () => {
    const { useAppStore } = await import('../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.writeGitattributes.mockRejectedValue(new Error('Permission denied'));

    const { content, error, save } = useRepoFileContent({
      getKey: 'getGitattributes',
      writeKey: 'writeGitattributes',
    });
    content.value = '* text=auto';
    await save();
    expect(error.value).toContain('Permission denied');
  });
});
