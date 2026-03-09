import { describe, it, expect } from 'vitest';
import {
  GITATTRIBUTES_PRESETS,
  GITATTRIBUTES_WIZARD_OPTIONS,
} from './gitattributesPresets';

describe('gitattributesPresets', () => {
  describe('GITATTRIBUTES_PRESETS', () => {
    it('exports array of presets with id, label, content', () => {
      expect(Array.isArray(GITATTRIBUTES_PRESETS)).toBe(true);
      expect(GITATTRIBUTES_PRESETS.length).toBeGreaterThan(0);
      GITATTRIBUTES_PRESETS.forEach((p) => {
        expect(p).toHaveProperty('id');
        expect(p).toHaveProperty('label');
        expect(p).toHaveProperty('content');
      });
    });

    it('includes minimal and cross-platform presets', () => {
      const ids = GITATTRIBUTES_PRESETS.map((p) => p.id);
      expect(ids).toContain('minimal');
      expect(ids).toContain('cross-platform');
    });
  });

  describe('GITATTRIBUTES_WIZARD_OPTIONS', () => {
    it('exports array of wizard options with id, label, description, lines', () => {
      expect(Array.isArray(GITATTRIBUTES_WIZARD_OPTIONS)).toBe(true);
      GITATTRIBUTES_WIZARD_OPTIONS.forEach((o) => {
        expect(o).toHaveProperty('id');
        expect(o).toHaveProperty('label');
        expect(o).toHaveProperty('description');
        expect(o).toHaveProperty('lines');
      });
    });

    it('includes line-endings and binary options', () => {
      const ids = GITATTRIBUTES_WIZARD_OPTIONS.map((o) => o.id);
      expect(ids).toContain('line-endings');
      expect(ids).toContain('binary');
    });
  });
});
