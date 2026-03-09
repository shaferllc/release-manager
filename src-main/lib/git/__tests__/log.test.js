const { createGitLog } = require('../log');

describe('git log', () => {
  const dir = '/repo';
  const parseCommitLog = (stdout) =>
    (stdout || '')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const parts = line.split('\0');
        return { sha: parts[0], subject: parts[1] || '', author: parts[2] || '', date: parts[3] || '' };
      });
  const parseCommitLogWithBody = (stdout) =>
    (stdout || '')
      .trim()
      .split('\x1e')
      .filter(Boolean)
      .map((block) => {
        const parts = block.split('\0');
        return { sha: parts[0], subject: parts[1] || '', body: parts[5] || '' };
      });

  it('getCommitLog returns commits', async () => {
    const runInDir = jest.fn().mockResolvedValue({ stdout: 'abc\tfix bug\tAlice\t2024-01-01\n' });
    const api = createGitLog({ runInDir, parseCommitLog, parseCommitLogWithBody });
    const result = await api.getCommitLog(dir, 5);
    expect(result.ok).toBe(true);
    expect(result.commits).toHaveLength(1);
  });

  it('getCommitSubject returns subject', async () => {
    const runInDir = jest.fn().mockResolvedValue({ stdout: 'fix: thing\n' });
    const api = createGitLog({ runInDir, parseCommitLog, parseCommitLogWithBody });
    const result = await api.getCommitSubject(dir, 'HEAD');
    expect(result.ok).toBe(true);
    expect(result.subject).toBe('fix: thing');
  });

  it('getCommitsSinceTag returns commits', async () => {
    const runInDir = jest.fn().mockResolvedValue({ stdout: 'fix\nfeat\n' });
    const api = createGitLog({ runInDir, parseCommitLog, parseCommitLogWithBody });
    const result = await api.getCommitsSinceTag(dir, 'v1.0.0');
    expect(result.ok).toBe(true);
    expect(result.commits.length).toBeGreaterThanOrEqual(1);
  });

  it('getRecentCommits delegates and returns result', async () => {
    const runInDir = jest.fn().mockResolvedValue({ stdout: 'a\nb\n' });
    const api = createGitLog({ runInDir, parseCommitLog, parseCommitLogWithBody });
    const result = await api.getRecentCommits(dir, 10);
    expect(result).toBeDefined();
    expect(result.ok).toBe(true);
    expect(result.commits).toBeDefined();
  });

  it('getCommitDetail returns subject, author, diff, files', async () => {
    const runInDir = jest
      .fn()
      .mockResolvedValueOnce({ stdout: 'fix\nAlice\n2024-01-01\nbody' })
      .mockResolvedValueOnce({ stdout: 'diff --git a/x b/x\n' })
      .mockResolvedValueOnce({ stdout: 'x.js\n' });
    const api = createGitLog({ runInDir, parseCommitLog, parseCommitLogWithBody });
    const result = await api.getCommitDetail(dir, 'abc123');
    expect(result.ok).toBe(true);
    expect(result.subject).toBe('fix');
    expect(result.author).toBe('Alice');
    expect(result.diff).toBeDefined();
    expect(result.files).toContain('x.js');
  });

  it('getCommitLogWithBody returns commits with body', async () => {
    const runInDir = jest.fn().mockResolvedValue({ stdout: 'abc\tfix\ta\t2024-01-01\te@e.com\tbody here\x1e' });
    const api = createGitLog({ runInDir, parseCommitLog, parseCommitLogWithBody });
    const result = await api.getCommitLogWithBody(dir, 5);
    expect(result.ok).toBe(true);
    expect(result.commits).toBeDefined();
  });
});
