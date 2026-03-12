import { describe, it, expect, beforeAll, vi } from 'vitest';

describe('shipwell-ext-bookmarks extension', () => {
  let registerFn;

  beforeAll(async () => {
    registerFn = vi.fn();
    if (typeof window !== 'undefined') {
      window.__registerDetailTabExtension = registerFn;
    }
    await import('../../../extracted-extensions/shipwell-ext-bookmarks/src/index.js');
  });

  it('registers with correct id and label', () => {
    expect(registerFn).toHaveBeenCalledTimes(1);
    const call = registerFn.mock.calls[0][0];
    expect(call.id).toBe('bookmarks');
    expect(call.label).toBe('Bookmarks');
  });

  it('registers with component and metadata', () => {
    const call = registerFn.mock.calls[0][0];
    expect(call.component).toBeDefined();
    expect(call.description).toContain('Save and organize');
    expect(call.version).toBeDefined();
    expect(call.icon).toBeDefined();
  });
});
