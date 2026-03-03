const { createGitBlame } = require('../blame');

describe('git blame', () => {
  const dir = '/repo';

  it('getBlame returns error when file path empty', async () => {
    const api = createGitBlame({ runInDir: jest.fn() });
    const result = await api.getBlame(dir, '');
    expect(result.ok).toBe(false);
  });

  it('getBlame returns text from blame output', async () => {
    const runInDir = jest.fn().mockResolvedValue({ stdout: 'abc123 (Author 2024-01-01 1) line\n' });
    const api = createGitBlame({ runInDir });
    const result = await api.getBlame(dir, 'foo.js');
    expect(result.ok).toBe(true);
    expect(result.text).toContain('abc123');
    expect(runInDir).toHaveBeenCalledWith(dir, 'git', ['blame', '-w', '--no-color', '-L', '1,500', '--', 'foo.js']);
  });
});
