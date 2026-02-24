const { suggestBumpFromCommits } = require('../conventionalCommits');

describe('conventionalCommits', () => {
  describe('suggestBumpFromCommits', () => {
    it('returns null for empty or non-array', () => {
      expect(suggestBumpFromCommits([])).toBeNull();
      expect(suggestBumpFromCommits(null)).toBeNull();
      expect(suggestBumpFromCommits(undefined)).toBeNull();
      expect(suggestBumpFromCommits('feat: x')).toBeNull();
    });

    it('returns patch when only fix: commits', () => {
      expect(suggestBumpFromCommits(['fix: bug'])).toBe('patch');
      expect(suggestBumpFromCommits(['fix(scope): bug'])).toBe('patch');
      expect(suggestBumpFromCommits(['fix: one', 'chore: two'])).toBe('patch');
    });

    it('returns minor when feat: commits and no breaking', () => {
      expect(suggestBumpFromCommits(['feat: add x'])).toBe('minor');
      expect(suggestBumpFromCommits(['feat(api): add x'])).toBe('minor');
      expect(suggestBumpFromCommits(['fix: bug', 'feat: new'])).toBe('minor');
    });

    it('returns major when breaking change present', () => {
      expect(suggestBumpFromCommits(['feat!: breaking'])).toBe('major');
      expect(suggestBumpFromCommits(['feat(api)!: breaking'])).toBe('major');
      expect(suggestBumpFromCommits(['BREAKING CHANGE: remove API'])).toBe('major');
      expect(suggestBumpFromCommits(['fix: bug', 'feat!: break'])).toBe('major');
    });

    it('prioritizes major over minor over patch', () => {
      expect(suggestBumpFromCommits(['fix: a', 'feat: b', 'feat!: c'])).toBe('major');
      expect(suggestBumpFromCommits(['fix: a', 'feat: b'])).toBe('minor');
      expect(suggestBumpFromCommits(['fix: a'])).toBe('patch');
    });

    it('trims subject lines', () => {
      expect(suggestBumpFromCommits(['  feat: x  '])).toBe('minor');
    });

    it('returns null when no conventional type found', () => {
      expect(suggestBumpFromCommits(['chore: update'])).toBeNull();
      expect(suggestBumpFromCommits(['docs: readme', 'style: lint'])).toBeNull();
      expect(suggestBumpFromCommits(['refactor: x', 'perf: y', 'test: z'])).toBeNull();
    });

    it('handles non-string commit entries', () => {
      expect(suggestBumpFromCommits([123, 'feat: add'])).toBe('minor');
    });
  });
});
