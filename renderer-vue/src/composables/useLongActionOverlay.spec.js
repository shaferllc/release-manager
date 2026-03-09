import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLongActionOverlay } from './useLongActionOverlay';

describe('useLongActionOverlay', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('returns runWithOverlay', () => {
    const result = useLongActionOverlay();
    expect(result).toHaveProperty('runWithOverlay');
    expect(typeof result.runWithOverlay).toBe('function');
  });

  it('runWithOverlay returns promise that resolves', async () => {
    const { runWithOverlay } = useLongActionOverlay();
    const promise = Promise.resolve(42);
    const result = runWithOverlay(promise);
    expect(result).toBeInstanceOf(Promise);
    const val = await result;
    expect(val).toBe(42);
  });

  it('runWithOverlay returns non-promise as-is', () => {
    const { runWithOverlay } = useLongActionOverlay();
    expect(runWithOverlay(null)).toBe(null);
    expect(runWithOverlay(undefined)).toBe(undefined);
  });
});
