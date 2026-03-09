import { describe, it, expect } from 'vitest';
import { GIT_PANEL_ICONS, getGitPanelIcon } from './icons';

describe('gitPanels icons', () => {
  describe('getGitPanelIcon', () => {
    it('returns SVG for known panel ids', () => {
      expect(getGitPanelIcon('working-tree')).toContain('<svg');
      expect(getGitPanelIcon('branch-sync')).toContain('<svg');
      expect(getGitPanelIcon('stash')).toContain('<svg');
      expect(getGitPanelIcon('tags')).toContain('<svg');
      expect(getGitPanelIcon('reflog')).toContain('<svg');
    });

    it('returns empty string for unknown id', () => {
      expect(getGitPanelIcon('unknown')).toBe('');
      expect(getGitPanelIcon('')).toBe('');
    });
  });

  describe('GIT_PANEL_ICONS', () => {
    it('has icons for all expected panels', () => {
      const ids = [
        'working-tree', 'branch-sync', 'merge-rebase', 'stash', 'tags',
        'reflog', 'delete-branch', 'remotes', 'compare-reset', 'gitignore',
        'gitattributes', 'submodules', 'worktrees', 'bisect',
      ];
      ids.forEach((id) => {
        expect(GIT_PANEL_ICONS[id]).toBeTruthy();
        expect(GIT_PANEL_ICONS[id]).toContain('<svg');
      });
    });
  });
});
