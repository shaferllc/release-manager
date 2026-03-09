import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { RESET_MODE_OPTIONS, useCompareReset } from './useCompareReset';

const originalReleaseManager = globalThis.window?.releaseManager;

describe('useCompareReset', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (globalThis.window) {
      globalThis.window.releaseManager = {
        getDiffBetweenFull: vi.fn(),
        gitReset: vi.fn(),
      };
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = originalReleaseManager;
    }
  });
  describe('RESET_MODE_OPTIONS', () => {
    it('exports soft, mixed, hard options', () => {
      expect(RESET_MODE_OPTIONS).toContainEqual({ value: 'soft', label: 'Soft' });
      expect(RESET_MODE_OPTIONS).toContainEqual({ value: 'mixed', label: 'Mixed' });
      expect(RESET_MODE_OPTIONS).toContainEqual({ value: 'hard', label: 'Hard' });
    });
  });

  describe('useCompareReset', () => {
    it('returns refA, refB, resetRef, resetMode, resetModeOptions, error, showDiff, reset', () => {
      const result = useCompareReset();
      expect(result).toHaveProperty('refA');
      expect(result).toHaveProperty('refB');
      expect(result).toHaveProperty('resetRef');
      expect(result).toHaveProperty('resetMode');
      expect(result).toHaveProperty('resetModeOptions');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('showDiff');
      expect(result).toHaveProperty('reset');
    });

    it('returns default refA as HEAD', () => {
      const { refA } = useCompareReset();
      expect(refA.value).toBe('HEAD');
    });

    it('returns default resetRef as HEAD~1', () => {
      const { resetRef } = useCompareReset();
      expect(resetRef.value).toBe('HEAD~1');
    });

    it('returns resetModeOptions as RESET_MODE_OPTIONS', () => {
      const { resetModeOptions } = useCompareReset();
      expect(resetModeOptions).toEqual(RESET_MODE_OPTIONS);
    });

    it('showDiff opens modal when API returns ok', async () => {
      const { useAppStore } = await import('../../../stores/app');
      const store = useAppStore();
      store.selectedPath = '/test';

      const api = globalThis.window?.releaseManager;
      api.getDiffBetweenFull.mockResolvedValue({ ok: true, diff: 'diff content' });

      const { refB, showDiff } = useCompareReset();
      refB.value = 'main';
      await showDiff();
      const { useModals } = await import('../../../composables/useModals');
      expect(useModals().activeModal.value).toBe('diffFull');
    });

    it('reset calls gitReset and onRefresh', async () => {
      const { useAppStore } = await import('../../../stores/app');
      const store = useAppStore();
      store.selectedPath = '/test';

      const onRefresh = vi.fn();
      const api = globalThis.window?.releaseManager;
      api.gitReset.mockResolvedValue(undefined);

      const { resetRef, reset } = useCompareReset({ onRefresh });
      resetRef.value = 'HEAD~1';
      await reset();
      expect(api.gitReset).toHaveBeenCalledWith('/test', 'HEAD~1', 'mixed');
      expect(onRefresh).toHaveBeenCalled();
    });
  });
});
