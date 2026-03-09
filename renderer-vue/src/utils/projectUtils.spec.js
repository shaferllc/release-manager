import { describe, it, expect } from 'vitest';
import { isProjectAlreadyAdded } from './projectUtils';

describe('projectUtils', () => {
  describe('isProjectAlreadyAdded', () => {
    it('returns true when repo name matches project path basename', () => {
      const proj = { github_repo: 'owner/my-app' };
      const projects = [{ path: '/dev/some/path/my-app' }];
      expect(isProjectAlreadyAdded(proj, projects)).toBe(true);
    });

    it('returns false when no match', () => {
      const proj = { github_repo: 'owner/other-repo' };
      const projects = [{ path: '/dev/my-app' }];
      expect(isProjectAlreadyAdded(proj, projects)).toBe(false);
    });

    it('returns false when projects is empty', () => {
      const proj = { github_repo: 'owner/my-app' };
      expect(isProjectAlreadyAdded(proj, [])).toBe(false);
    });

    it('handles Windows paths', () => {
      const proj = { github_repo: 'owner/my-app' };
      const projects = [{ path: 'C:\\dev\\my-app' }];
      expect(isProjectAlreadyAdded(proj, projects)).toBe(true);
    });
  });
});
