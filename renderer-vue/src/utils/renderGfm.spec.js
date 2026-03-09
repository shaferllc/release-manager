import { describe, it, expect } from 'vitest';
import { renderGfmToHtml, parseHeadings } from './renderGfm';

describe('renderGfm', () => {
  describe('renderGfmToHtml', () => {
    it('returns empty string for null or undefined', async () => {
      expect(await renderGfmToHtml(null)).toBe('');
      expect(await renderGfmToHtml(undefined)).toBe('');
    });

    it('returns empty string for non-string', async () => {
      expect(await renderGfmToHtml(123)).toBe('');
    });

    it('returns empty string for empty string', async () => {
      expect(await renderGfmToHtml('')).toBe('');
    });

    it('renders plain text to HTML', async () => {
      const result = await renderGfmToHtml('hello world');
      expect(typeof result).toBe('string');
      expect(result).toContain('hello');
      expect(result).toContain('world');
    });

    it('renders markdown headers', async () => {
      const result = await renderGfmToHtml('# Heading 1');
      expect(result).toContain('Heading 1');
      expect(result).toMatch(/<h[1-6]/);
    });

    it('renders markdown bold', async () => {
      const result = await renderGfmToHtml('**bold**');
      expect(result).toContain('bold');
    });

    it('trims whitespace', async () => {
      const result = await renderGfmToHtml('  \n  # hi  \n  ');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('parseHeadings', () => {
    it('returns empty array for null or undefined', () => {
      expect(parseHeadings(null)).toEqual([]);
      expect(parseHeadings(undefined)).toEqual([]);
    });

    it('returns empty array for non-string', () => {
      expect(parseHeadings(123)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(parseHeadings('')).toEqual([]);
    });

    it('parses single heading', () => {
      const result = parseHeadings('# Hello');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ level: 1, text: 'Hello', id: 'hello' });
    });

    it('parses multiple headings', () => {
      const result = parseHeadings('# One\n## Two\n### Three');
      expect(result).toHaveLength(3);
      expect(result[0].level).toBe(1);
      expect(result[0].text).toBe('One');
      expect(result[1].level).toBe(2);
      expect(result[2].level).toBe(3);
    });

    it('deduplicates heading ids', () => {
      const result = parseHeadings('# Same\n# Same');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('same');
      expect(result[1].id).toBe('same-1');
    });

    it('uses heading id when slug would be empty', () => {
      const result = parseHeadings('# -');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('heading');
    });

    it('strips optional custom id syntax from text', () => {
      const result = parseHeadings('# Foo {#custom-id}');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Foo');
      expect(result[0].id).toBe('foo');
    });
  });
});
