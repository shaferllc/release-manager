import { describe, it, expect } from 'vitest';
import { GITIGNORE_PRESETS, GITIGNORE_QUICK_ADD } from './gitignorePresets';

describe('gitignorePresets', () => {
  describe('GITIGNORE_PRESETS', () => {
    it('exports array of presets with id, label, content', () => {
      expect(Array.isArray(GITIGNORE_PRESETS)).toBe(true);
      expect(GITIGNORE_PRESETS.length).toBeGreaterThan(0);
      GITIGNORE_PRESETS.forEach((p) => {
        expect(p).toHaveProperty('id');
        expect(p).toHaveProperty('label');
        expect(p).toHaveProperty('content');
      });
    });

    it('includes node and python presets', () => {
      const ids = GITIGNORE_PRESETS.map((p) => p.id);
      expect(ids).toContain('node');
      expect(ids).toContain('python');
    });
  });

  describe('GITIGNORE_QUICK_ADD', () => {
    it('exports array of quick-add entries', () => {
      expect(Array.isArray(GITIGNORE_QUICK_ADD)).toBe(true);
      GITIGNORE_QUICK_ADD.forEach((e) => {
        expect(e).toHaveProperty('pattern');
        expect(e).toHaveProperty('label');
      });
    });
  });
});
