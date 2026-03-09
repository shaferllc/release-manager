import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('extensions/index', () => {
  it('loads built-in codeseer extension without error', async () => {
    const mod = await import('./index.js');
    expect(mod).toBeDefined();
  });
});
