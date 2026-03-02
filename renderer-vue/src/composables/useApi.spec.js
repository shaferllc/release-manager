import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useApi } from './useApi';

describe('useApi', () => {
  const original = globalThis.window?.releaseManager;

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.releaseManager = original;
    }
  });

  it('returns window.releaseManager when defined', () => {
    const mock = { getProjects: () => {} };
    if (globalThis.window) globalThis.window.releaseManager = mock;
    expect(useApi()).toBe(mock);
  });

  it('returns empty object when window.releaseManager is undefined', () => {
    if (globalThis.window) globalThis.window.releaseManager = undefined;
    expect(useApi()).toEqual({});
  });
});
