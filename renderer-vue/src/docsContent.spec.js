import { describe, it, expect } from 'vitest';
import { DOCS } from './docsContent';

describe('docsContent', () => {
  it('exports DOCS with expected keys', () => {
    expect(DOCS).toBeDefined();
    expect(typeof DOCS).toBe('object');
    expect(DOCS['branch-sync']).toBeDefined();
    expect(DOCS['merge-rebase']).toBeDefined();
    expect(DOCS.stash).toBeDefined();
  });

  it('each doc entry has title and body', () => {
    Object.values(DOCS).forEach((entry) => {
      expect(entry).toHaveProperty('title');
      expect(entry).toHaveProperty('body');
      expect(typeof entry.title).toBe('string');
      expect(typeof entry.body).toBe('string');
    });
  });
});
