const { parseGitLogOutput, getRecentCommits } = require('../gitLog');

describe('gitLog', () => {
  describe('parseGitLogOutput', () => {
    it('returns empty array for null or non-string', () => {
      expect(parseGitLogOutput(null)).toEqual([]);
      expect(parseGitLogOutput(undefined)).toEqual([]);
      expect(parseGitLogOutput(123)).toEqual([]);
    });

    it('returns empty array for empty or whitespace string', () => {
      expect(parseGitLogOutput('')).toEqual([]);
      expect(parseGitLogOutput('   ')).toEqual([]);
      expect(parseGitLogOutput('\n')).toEqual([]);
    });

    it('splits on newlines and trims', () => {
      expect(parseGitLogOutput('feat: one')).toEqual(['feat: one']);
      expect(parseGitLogOutput('feat: one\nfix: two')).toEqual(['feat: one', 'fix: two']);
      expect(parseGitLogOutput('  a  \n  b  \n  c  ')).toEqual(['a', 'b', 'c']);
    });

    it('handles CRLF', () => {
      expect(parseGitLogOutput('a\r\nb\r\nc')).toEqual(['a', 'b', 'c']);
    });

    it('filters empty lines', () => {
      expect(parseGitLogOutput('a\n\nb\n\n')).toEqual(['a', 'b']);
    });
  });

  describe('getRecentCommits', () => {
    it('returns commits from runInDir stdout', async () => {
      const runInDir = async () => ({ stdout: 'feat: one\nfix: two' });
      const result = await getRecentCommits(runInDir, '/path', 10);
      expect(result.ok).toBe(true);
      expect(result.commits).toEqual(['feat: one', 'fix: two']);
    });

    it('returns ok false and error when runInDir throws', async () => {
      const runInDir = async () => {
        throw new Error('git failed');
      };
      const result = await getRecentCommits(runInDir, '/path', 10);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('git failed');
      expect(result.commits).toEqual([]);
    });

    it('clamps n between 1 and 50', async () => {
      let capturedArgs;
      const runInDir = async (_path, _cmd, args) => {
        capturedArgs = args;
        return { stdout: '' };
      };
      await getRecentCommits(runInDir, '/path', 0);
      expect(capturedArgs).toContain('1');
      await getRecentCommits(runInDir, '/path', 100);
      expect(capturedArgs).toContain('50');
    });

    it('handles runInDir returning no stdout', async () => {
      const runInDir = async () => ({});
      const result = await getRecentCommits(runInDir, '/path', 5);
      expect(result.ok).toBe(true);
      expect(result.commits).toEqual([]);
    });

    it('uses fallback error message when thrown error has no message', async () => {
      const runInDir = async () => {
        const e = new Error();
        e.message = '';
        throw e;
      };
      const result = await getRecentCommits(runInDir, '/path', 5);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('git log failed');
      expect(result.commits).toEqual([]);
    });

    it('uses default n when not passed', async () => {
      let capturedN;
      const runInDir = async (_path, _cmd, args) => {
        const idx = args.indexOf('-n');
        capturedN = idx >= 0 ? args[idx + 1] : undefined;
        return { stdout: 'one' };
      };
      await getRecentCommits(runInDir, '/path');
      expect(capturedN).toBe('10');
    });
  });
});
