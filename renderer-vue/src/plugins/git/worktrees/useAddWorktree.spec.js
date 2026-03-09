import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAddWorktree } from './useAddWorktree';

describe('useAddWorktree', () => {
  const originalReleaseManager = globalThis.window?.releaseManager;

  beforeEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        worktreeAdd: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });

  it('returns worktreePath, branch, error, submitting, close, submit', () => {
    const emit = vi.fn();
    const result = useAddWorktree(() => '/dir', emit);
    expect(result).toHaveProperty('worktreePath');
    expect(result).toHaveProperty('branch');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('submitting');
    expect(result).toHaveProperty('close');
    expect(result).toHaveProperty('submit');
  });

  it('close emits close', () => {
    const emit = vi.fn();
    const { close } = useAddWorktree(null, emit);
    close();
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('close works when emit is undefined', () => {
    const { close } = useAddWorktree(null, undefined);
    expect(() => close()).not.toThrow();
  });

  it('submit does nothing when path is empty', async () => {
    const emit = vi.fn();
    const getDirPath = vi.fn().mockReturnValue('/dir');
    const { submit, worktreePath } = useAddWorktree(getDirPath, emit);
    worktreePath.value = '';
    await submit();
    expect(emit).not.toHaveBeenCalled();
    expect(globalThis.window.releaseManager.worktreeAdd).not.toHaveBeenCalled();
  });

  it('submit does nothing when getDirPath returns null', async () => {
    const emit = vi.fn();
    const getDirPath = vi.fn().mockReturnValue(null);
    const { submit, worktreePath } = useAddWorktree(getDirPath, emit);
    worktreePath.value = '/path/to/worktree';
    await submit();
    expect(emit).not.toHaveBeenCalled();
    expect(globalThis.window.releaseManager.worktreeAdd).not.toHaveBeenCalled();
  });

  it('submit does nothing when worktreeAdd API is missing', async () => {
    delete globalThis.window.releaseManager.worktreeAdd;
    const emit = vi.fn();
    const getDirPath = vi.fn().mockReturnValue('/dir');
    const { submit, worktreePath } = useAddWorktree(getDirPath, emit);
    worktreePath.value = '/path/to/worktree';
    await submit();
    expect(emit).not.toHaveBeenCalled();
  });

  it('submit calls worktreeAdd and emits added and close on success', async () => {
    globalThis.window.releaseManager.worktreeAdd = vi.fn().mockResolvedValue(undefined);
    const emit = vi.fn();
    const getDirPath = vi.fn().mockReturnValue('/repo/dir');
    const { submit, worktreePath, branch } = useAddWorktree(getDirPath, emit);
    worktreePath.value = '/path/to/worktree';
    branch.value = 'feature-branch';
    await submit();
    expect(globalThis.window.releaseManager.worktreeAdd).toHaveBeenCalledWith(
      '/repo/dir',
      '/path/to/worktree',
      'feature-branch'
    );
    expect(emit).toHaveBeenCalledWith('added');
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('submit uses undefined branch when branch is empty', async () => {
    globalThis.window.releaseManager.worktreeAdd = vi.fn().mockResolvedValue(undefined);
    const emit = vi.fn();
    const getDirPath = vi.fn().mockReturnValue('/repo/dir');
    const { submit, worktreePath, branch } = useAddWorktree(getDirPath, emit);
    worktreePath.value = '/path/to/worktree';
    branch.value = '';
    await submit();
    expect(globalThis.window.releaseManager.worktreeAdd).toHaveBeenCalledWith(
      '/repo/dir',
      '/path/to/worktree',
      undefined
    );
  });

  it('submit sets error on API failure', async () => {
    globalThis.window.releaseManager.worktreeAdd = vi
      .fn()
      .mockRejectedValue(new Error('Permission denied'));
    const emit = vi.fn();
    const getDirPath = vi.fn().mockReturnValue('/repo/dir');
    const { submit, worktreePath, error } = useAddWorktree(getDirPath, emit);
    worktreePath.value = '/path/to/worktree';
    await submit();
    expect(error.value).toBe('Permission denied');
    expect(emit).not.toHaveBeenCalled();
  });

  it('submit sets generic error when exception has no message', async () => {
    globalThis.window.releaseManager.worktreeAdd = vi.fn().mockRejectedValue({});
    const emit = vi.fn();
    const getDirPath = vi.fn().mockReturnValue('/repo/dir');
    const { submit, worktreePath, error } = useAddWorktree(getDirPath, emit);
    worktreePath.value = '/path/to/worktree';
    await submit();
    expect(error.value).toBe('Add worktree failed.');
    expect(emit).not.toHaveBeenCalled();
  });
});
