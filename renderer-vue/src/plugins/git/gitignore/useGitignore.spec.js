import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGitignore } from './useGitignore';

describe('useGitignore', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getGitignore: vi.fn(),
        writeGitignore: vi.fn(),
        scanProjectForGitignore: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns content, error, presetSelectOptions, toggleSuggestion, quickAddPattern', () => {
    const result = useGitignore({ presets: [{ id: 'node', label: 'Node' }] });
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('presetSelectOptions');
    expect(result).toHaveProperty('toggleSuggestion');
    expect(result).toHaveProperty('quickAddPattern');
  });

  it('presetSelectOptions includes presets', () => {
    const { presetSelectOptions } = useGitignore({
      presets: [{ id: 'node', label: 'Node' }, { id: 'python', label: 'Python' }],
    });
    expect(presetSelectOptions.value).toContainEqual({ value: '', label: 'Choose preset…' });
    expect(presetSelectOptions.value).toContainEqual({ value: 'node', label: 'Node' });
    expect(presetSelectOptions.value).toContainEqual({ value: 'python', label: 'Python' });
  });

  it('toggleSuggestion adds pattern when checked', () => {
    const { selectedSuggestions, toggleSuggestion } = useGitignore();
    toggleSuggestion('node_modules/', true);
    expect(selectedSuggestions.value).toContain('node_modules/');
  });

  it('quickAddPattern appends pattern to content', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getGitignore.mockResolvedValue({ ok: true, content: 'node_modules/' });

    const { content, quickAddPattern, load } = useGitignore();
    await load();
    quickAddPattern('dist/');
    expect(content.value).toContain('dist/');
  });

  it('toggleSuggestion removes pattern when unchecked', () => {
    const { selectedSuggestions, toggleSuggestion } = useGitignore();
    selectedSuggestions.value = ['node_modules/'];
    toggleSuggestion('node_modules/', false);
    expect(selectedSuggestions.value).not.toContain('node_modules/');
  });

  it('appendPreset appends preset content', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getGitignore.mockResolvedValue({ ok: true, content: 'node_modules/' });
    api.scanProjectForGitignore.mockResolvedValue({ ok: true, suggestions: [] });

    const { content, selectedPresetId, appendPreset, load } = useGitignore({
      presets: [{ id: 'node', label: 'Node', content: 'dist/\n.env' }],
    });
    await load();
    selectedPresetId.value = 'node';
    appendPreset();
    expect(content.value).toContain('dist/');
    expect(content.value).toContain('.env');
  });

  it('loadSuggestions populates suggestions', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getGitignore.mockResolvedValue({ ok: true, content: '' });
    api.scanProjectForGitignore.mockResolvedValue({
      ok: true,
      suggestions: [{ pattern: 'node_modules/', label: 'Node modules' }],
    });

    const { suggestions, load } = useGitignore();
    await load();
    expect(suggestions.value).toHaveLength(1);
    expect(suggestions.value[0].pattern).toBe('node_modules/');
  });
});
