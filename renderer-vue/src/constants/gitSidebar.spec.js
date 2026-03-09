import { describe, it, expect } from 'vitest';
import {
  GIT_SIDEBAR_WIDGET_IDS,
  GIT_SIDEBAR_WIDGET_LABELS,
  REFLOG_CATEGORY_ORDER,
  reflogCategoryFromMessage,
  reflogCategoryLabel,
} from './gitSidebar';

describe('gitSidebar', () => {
  describe('reflogCategoryFromMessage', () => {
    it('returns commit for commit messages', () => {
      expect(reflogCategoryFromMessage('commit (initial)')).toBe('commit');
      expect(reflogCategoryFromMessage('COMMIT')).toBe('commit');
    });

    it('returns checkout for checkout messages', () => {
      expect(reflogCategoryFromMessage('checkout: moving to main')).toBe('checkout');
    });

    it('returns merge for merge messages', () => {
      expect(reflogCategoryFromMessage('merge branch')).toBe('merge');
    });

    it('returns rebase for rebase messages', () => {
      expect(reflogCategoryFromMessage('rebase (finish)')).toBe('rebase');
    });

    it('returns reset for reset messages', () => {
      expect(reflogCategoryFromMessage('reset: moving to HEAD~1')).toBe('reset');
    });

    it('returns other for unknown messages', () => {
      expect(reflogCategoryFromMessage('pull')).toBe('other');
      expect(reflogCategoryFromMessage('')).toBe('other');
      expect(reflogCategoryFromMessage(null)).toBe('other');
    });
  });

  describe('reflogCategoryLabel', () => {
    it('returns label for known keys', () => {
      expect(reflogCategoryLabel('commit')).toBe('Commit');
      expect(reflogCategoryLabel('checkout')).toBe('Checkout');
      expect(reflogCategoryLabel('merge')).toBe('Merge');
      expect(reflogCategoryLabel('rebase')).toBe('Rebase');
      expect(reflogCategoryLabel('reset')).toBe('Reset');
      expect(reflogCategoryLabel('other')).toBe('Other');
    });

    it('returns key for unknown keys', () => {
      expect(reflogCategoryLabel('unknown')).toBe('unknown');
    });
  });

  describe('constants', () => {
    it('exports GIT_SIDEBAR_WIDGET_IDS', () => {
      expect(GIT_SIDEBAR_WIDGET_IDS).toContain('local-branches');
      expect(GIT_SIDEBAR_WIDGET_IDS).toContain('reflog');
    });

    it('exports GIT_SIDEBAR_WIDGET_LABELS', () => {
      expect(GIT_SIDEBAR_WIDGET_LABELS['local-branches']).toBe('Local branches');
    });

    it('exports REFLOG_CATEGORY_ORDER', () => {
      expect(REFLOG_CATEGORY_ORDER).toContain('commit');
      expect(REFLOG_CATEGORY_ORDER).toContain('other');
    });
  });
});
