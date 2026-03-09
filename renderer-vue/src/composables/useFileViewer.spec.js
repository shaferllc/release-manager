import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { useFileViewer } from './useFileViewer';

function flushPromises() {
  return new Promise((r) => setTimeout(r, 0));
}

describe('useFileViewer', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getFileDiff: vi.fn(),
        getBlame: vi.fn(),
        openFileInEditor: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns filePath, renderedContent, showDiffBtn, close, openInEditor, showBlame, showDiff', () => {
    const emit = vi.fn();
    const result = useFileViewer(() => '/path', () => 'file.js', () => false, emit);
    expect(result).toHaveProperty('filePath');
    expect(result).toHaveProperty('renderedContent');
    expect(result).toHaveProperty('showDiffBtn');
    expect(result).toHaveProperty('close');
    expect(result).toHaveProperty('openInEditor');
    expect(result).toHaveProperty('showBlame');
    expect(result).toHaveProperty('showDiff');
  });

  it('filePath returns getFilePath value', () => {
    const emit = vi.fn();
    const { filePath } = useFileViewer(() => '', () => 'src/foo.js', () => false, emit);
    expect(filePath.value).toBe('src/foo.js');
  });

  it('close emits close', () => {
    const emit = vi.fn();
    const { close } = useFileViewer(() => '', () => '', () => false, emit);
    close();
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('loadDiff sets content and renderedContent has line classes', async () => {
    const api = globalThis.window?.releaseManager;
    api.getFileDiff.mockResolvedValue({ content: 'diff --git a/x b/x\n+added\n-removed' });
    const emit = vi.fn();
    const { renderedContent } = useFileViewer(() => '/path', () => 'x', () => false, emit);
    await nextTick();
    await flushPromises();
    expect(renderedContent.value).toContain('diff-header');
    expect(renderedContent.value).toContain('diff-add');
    expect(renderedContent.value).toContain('diff-remove');
  });
});
