const { formatGitHubError, GITHUB_OFFLINE_HINT } = require('../githubErrors');

describe('githubErrors', () => {
  describe('formatGitHubError', () => {
    it('returns offline hint for network-related errors', () => {
      expect(formatGitHubError('ECONNREFUSED')).toBe(GITHUB_OFFLINE_HINT);
      expect(formatGitHubError('fetch failed')).toBe(GITHUB_OFFLINE_HINT);
      expect(formatGitHubError('Failed to fetch')).toBe(GITHUB_OFFLINE_HINT);
      expect(formatGitHubError('ENOTFOUND')).toBe(GITHUB_OFFLINE_HINT);
      expect(formatGitHubError('ETIMEDOUT')).toBe(GITHUB_OFFLINE_HINT);
      expect(formatGitHubError('network error')).toBe(GITHUB_OFFLINE_HINT);
    });
    it('returns token hint for 401', () => {
      expect(formatGitHubError('401 Unauthorized')).toContain('token');
    });
    it('returns access denied hint for 403', () => {
      expect(formatGitHubError('403 Forbidden')).toContain('access denied');
    });
    it('returns not found hint for 404', () => {
      expect(formatGitHubError('404')).toContain('not found');
    });
    it('returns prefixed message for other errors', () => {
      expect(formatGitHubError('Something went wrong')).toBe('GitHub: Something went wrong');
    });
    it('returns offline hint for null or empty', () => {
      expect(formatGitHubError('')).toBe(GITHUB_OFFLINE_HINT);
      expect(formatGitHubError(null)).toBe(GITHUB_OFFLINE_HINT);
    });
    it('truncates very long messages', () => {
      const long = 'x'.repeat(150);
      expect(formatGitHubError(long)).toMatch(/^GitHub: x+…$/);
    });
  });
});
