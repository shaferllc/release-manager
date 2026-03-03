const { createGitDiff } = require('../diff');

describe('git diff', () => {
  const dir = '/repo';
  const path = require('path');
  const fs = require('fs');

  it('getDiffBetween returns files and stats', async () => {
    const runInDir = jest
      .fn()
      .mockResolvedValueOnce({ stdout: '1 file changed\n' })
      .mockResolvedValueOnce({ stdout: 'foo.js\n' });
    const runInDirCapture = jest.fn();
    const api = createGitDiff({ runInDir, runInDirCapture, path, fs });
    const result = await api.getDiffBetween(dir, 'HEAD~1', 'HEAD');
    expect(result.ok).toBe(true);
    expect(result.files).toContain('foo.js');
  });

  it('getFileDiffRaw returns diff string', async () => {
    const runInDirCapture = jest.fn().mockResolvedValue({ stdout: 'diff --git a/x b/x\n', stderr: '' });
    const api = createGitDiff({ runInDir: jest.fn(), runInDirCapture, path, fs });
    const result = await api.getFileDiffRaw(dir, 'x');
    expect(result.ok).toBe(true);
    expect(result.diff).toContain('diff --git');
  });

  it('getFileDiffRaw returns (no diff) when empty', async () => {
    const runInDirCapture = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const api = createGitDiff({ runInDir: jest.fn(), runInDirCapture, path, fs });
    const result = await api.getFileDiffRaw(dir, 'x');
    expect(result.ok).toBe(true);
    expect(result.diff).toBe('(no diff)');
  });

  it('parseUnifiedDiffToRows parses hunks', () => {
    const runInDir = jest.fn();
    const api = createGitDiff({ runInDir, runInDirCapture: jest.fn(), path, fs });
    const rows = api.parseUnifiedDiffToRows('@@ -1,2 +1,2 @@\n-old\n+new\n');
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it('getGitDiffForCommit returns string from lib', async () => {
    const runInDir = jest.fn().mockResolvedValue({ stdout: 'diff content' });
    const api = createGitDiff({ runInDir, runInDirCapture: jest.fn(), path, fs });
    const result = await api.getGitDiffForCommit(dir);
    expect(typeof result).toBe('string');
  });

  it('getDiffBetweenFull returns full diff', async () => {
    const runInDir = jest.fn().mockResolvedValue({ stdout: 'diff --git a/x b/x\n--- a/x\n+++ b/x\n' });
    const api = createGitDiff({ runInDir, runInDirCapture: jest.fn(), path, fs });
    const result = await api.getDiffBetweenFull(dir, 'HEAD~1', 'HEAD');
    expect(result.ok).toBe(true);
    expect(result.diff).toContain('diff --git');
  });

  it('getFileAtRef returns content at ref', async () => {
    const runInDir = jest.fn().mockResolvedValue({ stdout: 'file content' });
    const api = createGitDiff({ runInDir, runInDirCapture: jest.fn(), path, fs });
    const result = await api.getFileAtRef(dir, 'foo.js', 'HEAD');
    expect(result.ok).toBe(true);
    expect(result.content).toBe('file content');
  });

  it('getFileDiffStructured returns rows for diff', async () => {
    const runInDirCapture = jest.fn().mockResolvedValue({
      stdout: '@@ -1,2 +1,2 @@\n-old\n+new\n',
      stderr: '',
    });
    const api = createGitDiff({ runInDir: jest.fn(), runInDirCapture, path, fs });
    const result = await api.getFileDiffStructured(dir, 'x.js', { staged: false });
    expect(result.ok).toBe(true);
    expect(result.rows).toBeDefined();
  });
});
