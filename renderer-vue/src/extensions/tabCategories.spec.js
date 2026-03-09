import { describe, it, expect } from 'vitest';
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getCategoryForTabId,
  groupEntriesByCategory,
  groupExtensionsByCategory,
} from './tabCategories';

describe('tabCategories', () => {
  describe('getCategoryForTabId', () => {
    it('returns category for known tab ids', () => {
      expect(getCategoryForTabId('composer')).toBe('development');
      expect(getCategoryForTabId('markdown')).toBe('content');
      expect(getCategoryForTabId('kanban')).toBe('collaboration');
      expect(getCategoryForTabId('bookmarks')).toBe('other');
    });

    it('returns other for unknown tab ids', () => {
      expect(getCategoryForTabId('unknown-tab')).toBe('other');
      expect(getCategoryForTabId('')).toBe('other');
    });
  });

  describe('groupEntriesByCategory', () => {
    it('groups entries by category in CATEGORY_ORDER', () => {
      const entries = [
        { id: 'markdown', label: 'Markdown' },
        { id: 'composer', label: 'Composer' },
        { id: 'unknown', label: 'Unknown' },
      ];
      const result = groupEntriesByCategory(entries);
      expect(result.length).toBeGreaterThan(0);
      const dev = result.find((r) => r.categoryId === 'development');
      expect(dev?.entries).toContainEqual({ id: 'composer', label: 'Composer' });
      const content = result.find((r) => r.categoryId === 'content');
      expect(content?.entries).toContainEqual({ id: 'markdown', label: 'Markdown' });
      const other = result.find((r) => r.categoryId === 'other');
      expect(other?.entries).toContainEqual({ id: 'unknown', label: 'Unknown' });
    });

    it('returns empty array for empty input', () => {
      expect(groupEntriesByCategory([])).toEqual([]);
    });

    it('uses CATEGORY_LABELS for label', () => {
      const entries = [{ id: 'composer', label: 'Composer' }];
      const result = groupEntriesByCategory(entries);
      expect(result[0].label).toBe(CATEGORY_LABELS.development);
    });
  });

  describe('groupExtensionsByCategory', () => {
    it('groups extensions by category', () => {
      const extensions = [
        { id: 'markdown', label: 'Markdown', component: {} },
        { id: 'composer', label: 'Composer', component: {} },
      ];
      const result = groupExtensionsByCategory(extensions);
      expect(result.length).toBeGreaterThan(0);
      const dev = result.find((r) => r.categoryId === 'development');
      expect(dev?.extensions).toContainEqual(expect.objectContaining({ id: 'composer', label: 'Composer' }));
      const content = result.find((r) => r.categoryId === 'content');
      expect(content?.extensions).toContainEqual(expect.objectContaining({ id: 'markdown', label: 'Markdown' }));
    });

    it('returns empty array for empty input', () => {
      expect(groupExtensionsByCategory([])).toEqual([]);
    });
  });

  describe('constants', () => {
    it('exports CATEGORY_ORDER', () => {
      expect(CATEGORY_ORDER).toContain('development');
      expect(CATEGORY_ORDER).toContain('other');
    });

    it('exports CATEGORY_LABELS', () => {
      expect(CATEGORY_LABELS.development).toBe('Development');
      expect(CATEGORY_LABELS.other).toBe('Other');
    });
  });
});
