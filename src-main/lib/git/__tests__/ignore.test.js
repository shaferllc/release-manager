const { createGitIgnore } = require('../ignore');

describe('git ignore', () => {
  const dir = '/repo';
  const path = require('path');
  const fs = require('fs');

  it('COMMON_IGNORABLES is exported and has entries', () => {
    const api = createGitIgnore({ path, fs });
    expect(api.COMMON_IGNORABLES).toBeDefined();
    expect(Array.isArray(api.COMMON_IGNORABLES)).toBe(true);
    expect(api.COMMON_IGNORABLES.some((e) => e.name === 'node_modules')).toBe(true);
  });

  it('gitignoreCoversPattern returns true when pattern already in lines', () => {
    const api = createGitIgnore({ path, fs });
    const result = api.gitignoreCoversPattern(['node_modules/', 'dist'], 'node_modules');
    expect(result).toBe(true);
  });

  it('gitignoreCoversPattern returns false when not covered', () => {
    const api = createGitIgnore({ path, fs });
    const result = api.gitignoreCoversPattern(['dist'], 'node_modules');
    expect(result).toBe(false);
  });

  it('getGitignore returns content when file exists', async () => {
    const fsMock = {
      existsSync: jest.fn().mockReturnValue(true),
      readFileSync: jest.fn().mockReturnValue('node_modules\n'),
    };
    const api = createGitIgnore({ path, fs: fsMock });
    const result = await api.getGitignore(dir);
    expect(result.ok).toBe(true);
    expect(result.content).toBe('node_modules\n');
  });

  it('getGitignore returns content null when file missing', async () => {
    const fsMock = { existsSync: jest.fn().mockReturnValue(false) };
    const api = createGitIgnore({ path, fs: fsMock });
    const result = await api.getGitignore(dir);
    expect(result.ok).toBe(true);
    expect(result.content).toBeNull();
  });

  it('writeGitignore writes file', async () => {
    const fsMock = { writeFileSync: jest.fn() };
    const api = createGitIgnore({ path, fs: fsMock });
    const result = await api.writeGitignore(dir, 'node_modules\n');
    expect(result.ok).toBe(true);
    expect(fsMock.writeFileSync).toHaveBeenCalled();
  });

  it('scanProjectForGitignore returns suggestions', async () => {
    const fsMock = {
      existsSync: jest.fn().mockReturnValue(true),
      readFileSync: jest.fn().mockReturnValue(''),
      readdirSync: jest.fn().mockReturnValue([]),
    };
    const api = createGitIgnore({ path, fs: fsMock });
    const result = await api.scanProjectForGitignore(dir);
    expect(result.ok).toBe(true);
    expect(result.suggestions).toBeDefined();
  });
});
