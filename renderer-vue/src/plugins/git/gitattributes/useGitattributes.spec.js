import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGitattributes } from './useGitattributes';

describe('useGitattributes', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getGitattributes: vi.fn(),
        writeGitattributes: vi.fn(),
        getFileAtRef: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns content, error, contentSummary, load, openWizard', () => {
    const result = useGitattributes();
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('contentSummary');
    expect(result).toHaveProperty('load');
    expect(result).toHaveProperty('openWizard');
  });

  it('contentSummary shows line count when content loaded', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getGitattributes.mockResolvedValue({ ok: true, content: '* text=auto\n*.png binary' });

    const { contentSummary, load } = useGitattributes();
    await load();
    expect(contentSummary.value).toContain('2 line');
  });

  it('openWizard opens modal when path selected', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getGitattributes.mockResolvedValue({ ok: true, content: '' });
    api.getFileAtRef.mockResolvedValue({ ok: true, content: '' });

    const { openWizard } = useGitattributes();
    await openWizard();
    const { useModals } = await import('../../../composables/useModals');
    expect(useModals().activeModal.value).toBe('gitattributesWizard');
  });
});
