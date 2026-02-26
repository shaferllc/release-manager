const {
  parseStashList,
  parseRemoteBranches,
  parseCommitLog,
  parseRemotes,
  parseLocalBranches,
} = require('../gitOutputParsers');

/**
 * Tests for Git output parsers used by Release Manager.
 * These parsers turn raw `git stash list`, `git branch -r`, `git log`, etc.
 * output into structured data for the UI. Each parser must handle null/empty
 * input and malformed lines without throwing.
 */
describe('gitOutputParsers', () => {
  describe('parseStashList', () => {
    it('returns empty array for null or non-string', () => {
      expect(parseStashList(null)).toEqual([]);
      expect(parseStashList(undefined)).toEqual([]);
      expect(parseStashList(123)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(parseStashList('')).toEqual([]);
      expect(parseStashList('   \n')).toEqual([]);
    });

    it('parses stash list format', () => {
      const out = 'stash@{0} WIP on main: abc123 feat: thing\nstash@{1} On feature: wip';
      const result = parseStashList(out);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ index: 'stash@{0}', message: 'WIP on main: abc123 feat: thing' });
      expect(result[1]).toEqual({ index: 'stash@{1}', message: 'On feature: wip' });
    });

    it('handles lines without match (fallback to first word and full line)', () => {
      const result = parseStashList('weird format here');
      expect(result).toHaveLength(1);
      expect(result[0].index).toBe('weird');
      expect(result[0].message).toBe('weird format here');
    });

    it('ignores empty lines between entries', () => {
      const out = 'stash@{0} WIP on main\n\nstash@{1} On feature';
      const result = parseStashList(out);
      expect(result).toHaveLength(2);
      expect(result[0].message).toBe('WIP on main');
      expect(result[1].index).toBe('stash@{1}');
      expect(result[1].message).toBe('On feature');
    });
  });

  /** Parses `git branch -r` output; used to populate "From remote" and delete-remote branch list. */
  describe('parseRemoteBranches', () => {
    it('returns empty array for null or non-string', () => {
      expect(parseRemoteBranches(null)).toEqual([]);
      expect(parseRemoteBranches('')).toEqual([]);
    });

    it('parses remote branch refs and strips asterisk', () => {
      const out = '  origin/main\n  origin/feature-x\n* origin/HEAD -> origin/main';
      const result = parseRemoteBranches(out);
      expect(result).toContain('origin/main');
      expect(result).toContain('origin/feature-x');
      expect(result).not.toContain('origin/HEAD');
      expect(result.every((r) => r.indexOf('->') === -1)).toBe(true);
    });

    it('filters origin/HEAD and symbolic refs', () => {
      const out = '  origin/HEAD -> origin/main\n  origin/main\n  origin/foo';
      const result = parseRemoteBranches(out);
      expect(result).toEqual(['origin/main', 'origin/foo']);
    });

    it('returns empty array when output is only HEAD line', () => {
      const out = '* origin/HEAD -> origin/main';
      const result = parseRemoteBranches(out);
      expect(result).toEqual([]);
    });
  });

  /** Parses NUL-separated `git log` output for the commit history list and detail modal. */
  describe('parseCommitLog', () => {
    it('returns empty array for null or non-string', () => {
      expect(parseCommitLog(null)).toEqual([]);
      expect(parseCommitLog('')).toEqual([]);
    });

    it('parses NUL-separated log format', () => {
      const nul = '\0';
      const out = `abc1234${nul}fix: bug${nul}Jane Doe${nul}2024-01-15`;
      const result = parseCommitLog(out);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sha: 'abc1234',
        subject: 'fix: bug',
        author: 'Jane Doe',
        date: '2024-01-15',
      });
    });

    it('handles multiple commits', () => {
      const nul = '\0';
      const out = `a1${nul}first${nul}A${nul}1\nb2${nul}second${nul}B${nul}2`;
      const result = parseCommitLog(out);
      expect(result).toHaveLength(2);
      expect(result[0].sha).toBe('a1');
      expect(result[0].subject).toBe('first');
      expect(result[1].sha).toBe('b2');
      expect(result[1].subject).toBe('second');
    });

    it('uses empty string for missing parts', () => {
      const result = parseCommitLog('onlysha');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ sha: 'onlysha', subject: '', author: '', date: '' });
    });

    it('handles subject with colons and special characters', () => {
      const nul = '\0';
      const out = `abc${nul}feat(scope): add thing${nul}Dev${nul}2024-02-01`;
      const result = parseCommitLog(out);
      expect(result[0].subject).toBe('feat(scope): add thing');
    });
  });

  /** Parses `git remote -v` for the Remotes card (name + URL). */
  describe('parseRemotes', () => {
    it('returns empty array for null or non-string', () => {
      expect(parseRemotes(null)).toEqual([]);
      expect(parseRemotes('')).toEqual([]);
    });

    it('parses git remote -v output', () => {
      const out = 'origin  https://github.com/foo/bar.git (fetch)\norigin  https://github.com/foo/bar.git (push)';
      const result = parseRemotes(out);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'origin', url: 'https://github.com/foo/bar.git' });
    });

    it('prefers fetch URL when both fetch and push present', () => {
      const out = 'up  https://fetch (fetch)\nup  https://push (push)';
      const result = parseRemotes(out);
      expect(result[0].url).toBe('https://fetch');
    });

    it('handles multiple remotes', () => {
      const out = 'origin  https://a (fetch)\nupstream  https://b (fetch)';
      const result = parseRemotes(out);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.name)).toEqual(['origin', 'upstream']);
    });

    it('uses push URL when only push line exists', () => {
      const out = 'myremote  https://only-push (push)';
      const result = parseRemotes(out);
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://only-push');
    });
  });

  /** Parses `git branch` output for branch dropdown and delete-branch list. */
  describe('parseLocalBranches', () => {
    it('returns empty array for null or non-string', () => {
      expect(parseLocalBranches(null)).toEqual([]);
      expect(parseLocalBranches('')).toEqual([]);
    });

    it('parses branch list and strips current marker', () => {
      const out = '  main\n* feature\n  develop';
      const result = parseLocalBranches(out);
      expect(result).toEqual(['main', 'feature', 'develop']);
    });

    it('handles single branch (current)', () => {
      const out = '* main';
      const result = parseLocalBranches(out);
      expect(result).toEqual(['main']);
    });
  });
});
