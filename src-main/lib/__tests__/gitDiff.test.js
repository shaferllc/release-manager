const { getGitDiffForCommit, DEFAULT_MAX_LENGTH } = require('../gitDiff');

describe('gitDiff', () => {
  describe('getGitDiffForCommit', () => {
    it('combines staged and unstaged diff', async () => {
      const runInDir = async (_path, _cmd, args) => {
        if (args[0] === 'diff' && args[1] === '--cached') return { stdout: 'staged' };
        if (args[0] === 'diff') return { stdout: 'unstaged' };
        return { stdout: '' };
      };
      const result = await getGitDiffForCommit(runInDir, '/proj');
      expect(result).toBe('staged\n---\nunstaged');
    });

    it('uses only non-empty parts', async () => {
      const runInDir = async (_path, _cmd, args) => {
        if (args[0] === 'diff' && args[1] === '--cached') return { stdout: '  \n  ' };
        if (args[0] === 'diff') return { stdout: 'unstaged only' };
        return { stdout: '' };
      };
      const result = await getGitDiffForCommit(runInDir, '/proj');
      expect(result).toBe('unstaged only');
    });

    it('falls back to status --short when no diff', async () => {
      const runInDir = async (_path, _cmd, args) => {
        if (args[0] === 'status') return { stdout: ' M file.js' };
        return { stdout: '' };
      };
      const result = await getGitDiffForCommit(runInDir, '/proj');
      expect(result.trim()).toBe('M file.js');
    });

    it('returns "No changes" when diff and status are empty', async () => {
      const runInDir = async () => ({ stdout: '' });
      const result = await getGitDiffForCommit(runInDir, '/proj');
      expect(result).toBe('No changes');
    });

    it('returns "No changes" when runInDir throws for both diff and status', async () => {
      const runInDir = async () => { throw new Error('git not found'); };
      const result = await getGitDiffForCommit(runInDir, '/proj');
      expect(result).toBe('No changes');
    });

    it('truncates to maxLength', async () => {
      const long = 'x'.repeat(20000);
      const runInDir = async (_path, _cmd, args) => {
        if (args[0] === 'diff') return { stdout: long };
        return { stdout: '' };
      };
      const result = await getGitDiffForCommit(runInDir, '/proj', 100);
      expect(result.length).toBe(100);
      expect(result).toBe('x'.repeat(100));
    });

    it('uses DEFAULT_MAX_LENGTH when not specified', async () => {
      const runInDir = async (_path, _cmd, args) => {
        if (args[0] === 'status') return { stdout: 'one line' };
        return { stdout: '' };
      };
      const result = await getGitDiffForCommit(runInDir, '/proj');
      expect(result).toBe('one line');
      expect(result.length).toBeLessThanOrEqual(DEFAULT_MAX_LENGTH);
    });

    it('returns "No changes" when status returns only whitespace', async () => {
      const runInDir = async (_path, _cmd, args) => {
        if (args[0] === 'status') return { stdout: '   \n  ' };
        return { stdout: '' };
      };
      const result = await getGitDiffForCommit(runInDir, '/proj');
      expect(result).toBe('No changes');
    });
  });
});
