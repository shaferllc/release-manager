import { describe, it, expect } from 'vitest';
import { escapeHtml, truncatePath, formatAheadBehind, projectDisplayName } from './utils';

describe('utils', () => {
  describe('truncatePath', () => {
    it('returns path as-is when shorter than or equal to maxLen', () => {
      expect(truncatePath('short', 50)).toBe('short');
      expect(truncatePath('exactly50charsxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 50)).toBe('exactly50charsxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
      expect(truncatePath('', 50)).toBe('');
    });
    it('returns ellipsis + last (maxLen - 1) chars when longer than maxLen', () => {
      const long = 'a'.repeat(60);
      expect(truncatePath(long, 50)).toBe('…' + long.slice(-49));
      const path = '/very/long/path/to/some/project';
      expect(truncatePath(path, 20)).toBe('…' + path.slice(-19));
    });
    it('uses default maxLen of 50', () => {
      const long = 'a'.repeat(60);
      expect(truncatePath(long)).toBe('…' + long.slice(-49));
    });
    it('treats null/undefined path as empty string', () => {
      expect(truncatePath(null, 50)).toBe('');
      expect(truncatePath(undefined, 50)).toBe('');
    });
  });

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

  describe('projectDisplayName', () => {
    it('returns empty string for null or undefined', () => {
      expect(projectDisplayName(null)).toBe('');
      expect(projectDisplayName(undefined)).toBe('');
    });
    it('returns name when present', () => {
      expect(projectDisplayName({ name: 'My Project' })).toBe('My Project');
      expect(projectDisplayName({ name: 'A', path: '/x/y' })).toBe('A');
    });
    it('returns path basename when name missing', () => {
      expect(projectDisplayName({ path: '/foo/bar/baz' })).toBe('baz');
      expect(projectDisplayName({ path: '/single' })).toBe('single');
    });
    it('normalizes backslashes and takes last segment', () => {
      expect(projectDisplayName({ path: 'C:\\dev\\myapp' })).toBe('myapp');
    });
    it('returns empty string when path yields no segment (e.g. root)', () => {
      expect(projectDisplayName({ path: '/' })).toBe('');
    });
    it('returns empty string when project has no name or path', () => {
      expect(projectDisplayName({})).toBe('');
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
