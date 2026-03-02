import { describe, it, expect } from 'vitest';
import { escapeHtml, formatAheadBehind } from './utils';

describe('utils', () => {
  describe('escapeHtml', () => {
    it('returns empty string for null or undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
    it('escapes & < > " \'', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
      expect(escapeHtml("'single'")).toBe('&#39;single&#39;');
    });
    it('converts non-string to string then escapes', () => {
      expect(escapeHtml(123)).toBe('123');
    });
  });

  describe('formatAheadBehind', () => {
    it('returns empty when both null or zero', () => {
      expect(formatAheadBehind(null, null)).toBe('');
      expect(formatAheadBehind(0, 0)).toBe('');
    });
    it('returns "N ahead" when only ahead', () => {
      expect(formatAheadBehind(2, 0)).toBe('2 ahead');
    });
    it('returns "N behind" when only behind', () => {
      expect(formatAheadBehind(0, 3)).toBe('3 behind');
    });
    it('returns "ahead, behind" when both', () => {
      expect(formatAheadBehind(1, 2)).toBe('1 ahead, 2 behind');
    });
  });
});
