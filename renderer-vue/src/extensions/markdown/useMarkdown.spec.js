import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { useMarkdown } from './useMarkdown';

vi.mock('../../composables/useApi', () => ({
  useApi: vi.fn(),
}));

const { useApi } = await import('../../composables/useApi');

describe('useMarkdown', () => {
  let getInfo;
  let mockApi;

  beforeEach(() => {
    getInfo = ref({ path: '/project' });
    mockApi = {
      getProjectFiles: vi.fn(),
      readProjectFile: vi.fn(),
      writeProjectFile: vi.fn(),
      openFileInEditor: vi.fn(),
      getPreference: vi.fn().mockResolvedValue('{}'),
      setPreference: vi.fn().mockResolvedValue(),
    };
    useApi.mockReturnValue(mockApi);
  });

  it('exposes dirPath from getInfo.path', () => {
    const { dirPath } = useMarkdown(getInfo);
    expect(dirPath.value).toBe('/project');
  });

  it('dirPath is null when getInfo has no path', () => {
    getInfo.value = {};
    const { dirPath } = useMarkdown(getInfo);
    expect(dirPath.value).toBeNull();
  });

  it('dirPath is null when getInfo is null/undefined', () => {
    getInfo.value = null;
    const { dirPath } = useMarkdown(getInfo);
    expect(dirPath.value).toBeNull();
  });

  it('markdownFiles filters to .md/.markdown and sorts', async () => {
    mockApi.getProjectFiles.mockResolvedValue({
      ok: true,
      files: ['a.txt', 'b.md', 'c.markdown', 'd.MD'],
    });
    const result = useMarkdown(getInfo);
    await nextTick();
    await vi.waitFor(() => {
      expect(result.loading.value).toBe(false);
    });
    expect(result.markdownFiles.value).toEqual(['b.md', 'c.markdown', 'd.MD']);
  });

  it('loadFiles calls getProjectFiles and sets files on success', async () => {
    mockApi.getProjectFiles.mockResolvedValue({ ok: true, files: ['readme.md', 'doc.md'] });
    const result = useMarkdown(getInfo);
    await nextTick();
    await vi.waitFor(() => {
      expect(result.loading.value).toBe(false);
    });
    expect(result.markdownFiles.value).toEqual(['doc.md', 'readme.md']);
    expect(result.error.value).toBe('');
  });

  it('loadFiles sets error on API failure', async () => {
    mockApi.getProjectFiles.mockResolvedValue({ ok: false, error: 'Not found' });
    const result = useMarkdown(getInfo);
    await nextTick();
    await vi.waitFor(() => {
      expect(result.loading.value).toBe(false);
    });
    expect(result.markdownFiles.value).toEqual([]);
    expect(result.error.value).toBe('Not found');
  });

  it('loadFiles sets error on throw', async () => {
    mockApi.getProjectFiles.mockRejectedValue(new Error('Network error'));
    const result = useMarkdown(getInfo);
    await nextTick();
    await vi.waitFor(() => {
      expect(result.loading.value).toBe(false);
    });
    expect(result.error.value).toBe('Network error');
  });

  it('loadContent loads file and sets content', async () => {
    const result = useMarkdown(getInfo);
    result.selectedPath.value = 'doc.md';
    mockApi.readProjectFile.mockResolvedValue({ ok: true, content: '# Hello' });
    await result.loadContent('doc.md');
    expect(result.content.value).toBe('# Hello');
    expect(result.contentError.value).toBe('');
    expect(mockApi.readProjectFile).toHaveBeenCalledWith('/project', 'doc.md');
  });

  it('loadContent sets contentError on failure', async () => {
    const result = useMarkdown(getInfo);
    mockApi.readProjectFile.mockResolvedValue({ ok: false, error: 'File not found' });
    await result.loadContent('missing.md');
    expect(result.content.value).toBe('');
    expect(result.contentError.value).toBe('File not found');
  });

  it('saveContent writes and clears dirty', async () => {
    const result = useMarkdown(getInfo);
    result.selectedPath.value = 'doc.md';
    result.content.value = 'updated';
    result.contentDirty.value = true;
    mockApi.writeProjectFile.mockResolvedValue({ ok: true });
    await result.saveContent();
    expect(mockApi.writeProjectFile).toHaveBeenCalledWith('/project', 'doc.md', 'updated');
    expect(result.contentDirty.value).toBe(false);
    expect(result.saveError.value).toBe('');
  });

  it('saveContent sets saveError on failure', async () => {
    const result = useMarkdown(getInfo);
    result.selectedPath.value = 'doc.md';
    result.content.value = 'x';
    mockApi.writeProjectFile.mockResolvedValue({ ok: false, error: 'Permission denied' });
    await result.saveContent();
    expect(result.saveError.value).toBe('Permission denied');
  });

  it('openInEditor calls api when path and selectedPath set', () => {
    const result = useMarkdown(getInfo);
    result.selectedPath.value = 'doc.md';
    result.openInEditor();
    expect(mockApi.openFileInEditor).toHaveBeenCalledWith('/project', 'doc.md');
  });

  it('openInEditor does nothing when api.openFileInEditor missing', () => {
    mockApi.openFileInEditor = undefined;
    const result = useMarkdown(getInfo);
    result.selectedPath.value = 'doc.md';
    result.openInEditor();
    expect(mockApi.openFileInEditor).toBeUndefined();
  });

  it('tryRestoreLastOpen sets selectedPath when preference has last file', async () => {
    mockApi.getProjectFiles.mockResolvedValue({ ok: true, files: ['a.md', 'b.md'] });
    mockApi.getPreference.mockResolvedValue(JSON.stringify({ '/project': 'b.md' }));
    const result = useMarkdown(getInfo);
    await nextTick();
    await vi.waitFor(() => {
      expect(result.markdownFiles.value.length).toBe(2);
    });
    await nextTick();
    await vi.waitFor(() => {
      expect(result.selectedPath.value).toBe('b.md');
    }, { timeout: 500 });
  });

  it('tryRestoreLastOpen does nothing when selectedPath already set', async () => {
    mockApi.getProjectFiles.mockResolvedValue({ ok: true, files: ['a.md'] });
    mockApi.getPreference.mockResolvedValue(JSON.stringify({ '/project': 'a.md' }));
    const result = useMarkdown(getInfo);
    result.selectedPath.value = 'other.md';
    await nextTick();
    await vi.waitFor(() => {
      expect(result.markdownFiles.value.length).toBe(1);
    });
    await nextTick();
    expect(result.selectedPath.value).toBe('other.md');
  });
});
