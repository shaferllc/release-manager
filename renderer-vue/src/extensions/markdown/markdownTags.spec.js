import { describe, it, expect } from 'vitest';
import { parseTagsFromMarkdown } from './markdownTags';

describe('markdownTags', () => {
  describe('parseTagsFromMarkdown', () => {
    it('returns empty array for null or undefined', () => {
      expect(parseTagsFromMarkdown(null)).toEqual([]);
      expect(parseTagsFromMarkdown(undefined)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(parseTagsFromMarkdown('')).toEqual([]);
    });

    it('returns empty array for non-string input', () => {
      expect(parseTagsFromMarkdown(123)).toEqual([]);
      expect(parseTagsFromMarkdown({})).toEqual([]);
    });

    it('parses frontmatter tags as YAML array', () => {
      const md = `---
tags: [a, b, c]
---
# Doc`;
      expect(parseTagsFromMarkdown(md)).toEqual(['a', 'b', 'c']);
    });

    it('parses frontmatter tags as unquoted array', () => {
      const md = `---
tags: [foo, bar]
---
Body`;
      expect(parseTagsFromMarkdown(md)).toEqual(['bar', 'foo']);
    });

    it('parses frontmatter tags as comma-separated list', () => {
      const md = `---
tags: one, two, three
---
Content`;
      expect(parseTagsFromMarkdown(md)).toEqual(['one', 'three', 'two']);
    });

    it('parses frontmatter tags with quoted values', () => {
      const md = `---
tags: 'a', "b", c
---
Body`;
      expect(parseTagsFromMarkdown(md)).toEqual(['a', 'b', 'c']);
    });

    it('parses inline #tag in body', () => {
      const md = 'Some text #feature and more';
      expect(parseTagsFromMarkdown(md)).toEqual(['feature']);
    });

    it('parses multiple inline #tags', () => {
      const md = 'Intro #a middle #b end #c';
      expect(parseTagsFromMarkdown(md)).toEqual(['a', 'b', 'c']);
    });

    it('parses inline tags with hyphens', () => {
      const md = 'See #my-tag and #another-tag';
      expect(parseTagsFromMarkdown(md)).toEqual(['another-tag', 'my-tag']);
    });

    it('requires tag to start with letter', () => {
      const md = 'Number #1invalid and #valid';
      expect(parseTagsFromMarkdown(md)).toEqual(['valid']);
    });

    it('combines frontmatter and inline tags and deduplicates', () => {
      const md = `---
tags: [front, shared]
---
Content #shared and #inline`;
      expect(parseTagsFromMarkdown(md)).toEqual(['front', 'inline', 'shared']);
    });

    it('returns sorted unique tags', () => {
      const md = ' #z #a #m #a ';
      expect(parseTagsFromMarkdown(md)).toEqual(['a', 'm', 'z']);
    });

    it('handles frontmatter with Windows line endings', () => {
      const md = '---\r\ntags: [x, y]\r\n---\r\n';
      expect(parseTagsFromMarkdown(md)).toEqual(['x', 'y']);
    });

    it('ignores tags inside frontmatter when parsing inline (only body)', () => {
      const md = `---
title: Doc
# not-a-tag-in-frontmatter
---
Body #real-tag`;
      expect(parseTagsFromMarkdown(md)).toEqual(['real-tag']);
    });
  });
});
