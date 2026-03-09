import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { useMergeRebase } from './useMergeRebase';

describe('useMergeRebase', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getGitState: vi.fn(),
        getBranches: vi.fn(),
        gitMerge: vi.fn(),
        gitMergeContinue: vi.fn(),
        gitMergeAbort: vi.fn(),
        gitRebase: vi.fn(),
        gitRebaseContinue: vi.fn(),
        gitRebaseSkip: vi.fn(),
        gitRebaseAbort: vi.fn(),
        gitCherryPickContinue: vi.fn(),
        gitCherryPickAbort: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns state, mergeBranch, rebaseOnto, mergeBranchOptions, error, merge, mergeContinue, mergeAbort', () => {
    const result = useMergeRebase();
    expect(result).toHaveProperty('state');
    expect(result).toHaveProperty('mergeBranch');
    expect(result).toHaveProperty('rebaseOnto');
    expect(result).toHaveProperty('mergeBranchOptions');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('merge');
    expect(result).toHaveProperty('mergeContinue');
    expect(result).toHaveProperty('mergeAbort');
  });

  it('mergeBranchOptions includes empty option', () => {
    const { mergeBranchOptions } = useMergeRebase();
    expect(mergeBranchOptions.value[0]).toEqual({ value: '', label: '—' });
  });

  it('loadState sets state when API returns merging', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';

    const api = globalThis.window?.releaseManager;
    api.getGitState.mockResolvedValue({ merging: true, rebasing: false });
    api.getBranches.mockResolvedValue(['main', 'feature']);

    const { state } = useMergeRebase({ currentBranchRef: ref('main') });
    await new Promise((r) => setTimeout(r, 10));
    expect(state.value.merging).toBe(true);
  });

  it('merge calls gitMerge when confirmed', async () => {
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getGitState.mockResolvedValue({});
    api.getBranches.mockResolvedValue(['main', 'feature']);
    api.gitMerge.mockResolvedValue(undefined);

    const onRefresh = vi.fn();
    const { mergeBranch, merge } = useMergeRebase({ onRefresh, currentBranchRef: ref('main') });
    mergeBranch.value = 'feature';
    merge();
    await new Promise((r) => setTimeout(r, 50));
    expect(api.gitMerge).toHaveBeenCalledWith('/test', 'feature', {});
    expect(onRefresh).toHaveBeenCalled();
    window.confirm = originalConfirm;
  });

  it('merge does nothing when not confirmed', async () => {
    window.confirm = vi.fn().mockReturnValue(false);
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getGitState.mockResolvedValue({});
    api.getBranches.mockResolvedValue(['main', 'feature']);

    const { mergeBranch, merge } = useMergeRebase({ currentBranchRef: ref('main') });
    mergeBranch.value = 'feature';
    merge();
    expect(api.gitMerge).not.toHaveBeenCalled();
  });

  it('mergeContinue calls gitMergeContinue', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getGitState.mockResolvedValue({});
    api.getBranches.mockResolvedValue(['main']);
    api.gitMergeContinue.mockResolvedValue(undefined);

    const onRefresh = vi.fn();
    const { mergeContinue } = useMergeRebase({ onRefresh });
    mergeContinue();
    await new Promise((r) => setTimeout(r, 50));
    expect(api.gitMergeContinue).toHaveBeenCalledWith('/test');
  });

  it('rebaseContinue calls gitRebaseContinue', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getGitState.mockResolvedValue({});
    api.getBranches.mockResolvedValue(['main']);
    api.gitRebaseContinue.mockResolvedValue(undefined);

    const onRefresh = vi.fn();
    const { rebaseContinue } = useMergeRebase({ onRefresh });
    rebaseContinue();
    await new Promise((r) => setTimeout(r, 50));
    expect(api.gitRebaseContinue).toHaveBeenCalledWith('/test');
  });

  it('rebaseSkip calls gitRebaseSkip', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getGitState.mockResolvedValue({});
    api.getBranches.mockResolvedValue(['main']);
    api.gitRebaseSkip.mockResolvedValue(undefined);

    const onRefresh = vi.fn();
    const { rebaseSkip } = useMergeRebase({ onRefresh });
    rebaseSkip();
    await new Promise((r) => setTimeout(r, 50));
    expect(api.gitRebaseSkip).toHaveBeenCalledWith('/test');
  });

  it('cherryPickContinue calls gitCherryPickContinue', async () => {
    const { useAppStore } = await import('../../../stores/app');
    const store = useAppStore();
    store.selectedPath = '/test';
    const api = globalThis.window?.releaseManager;
    api.getGitState.mockResolvedValue({});
    api.getBranches.mockResolvedValue(['main']);
    api.gitCherryPickContinue.mockResolvedValue(undefined);

    const onRefresh = vi.fn();
    const { cherryPickContinue } = useMergeRebase({ onRefresh });
    cherryPickContinue();
    await new Promise((r) => setTimeout(r, 50));
    expect(api.gitCherryPickContinue).toHaveBeenCalledWith('/test');
  });
});
