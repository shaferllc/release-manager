import { describe, it, expect } from 'vitest';

describe('extensions/index', () => {
  it('loads without error', async () => {
    const mod = await import('./index.js');
    expect(mod).toBeDefined();
  });
});
