import { describe, it, expect } from 'vitest';

describe('components/ui/index', () => {
  it('loads without error (documentation-only module)', async () => {
    await expect(import('./index.js')).resolves.toBeDefined();
  });
});
