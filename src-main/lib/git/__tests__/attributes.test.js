const { createGitAttributes } = require('../attributes');

describe('git attributes', () => {
  const dir = '/repo';
  const path = require('path');
  const fs = require('fs');

  it('getGitattributes returns content when file exists', async () => {
    const fsMock = { existsSync: (p) => p.endsWith('.gitattributes'), readFileSync: () => '* text=auto\n' };
    const api = createGitAttributes({ path, fs: fsMock });
    const result = await api.getGitattributes(dir);
    expect(result.ok).toBe(true);
    expect(result.content).toBe('* text=auto\n');
  });

  it('getGitattributes returns content null when file missing', async () => {
    const fsMock = { existsSync: () => false };
    const api = createGitAttributes({ path, fs: fsMock });
    const result = await api.getGitattributes(dir);
    expect(result.ok).toBe(true);
    expect(result.content).toBeNull();
  });

  it('writeGitattributes writes file', async () => {
    const fsMock = { writeFileSync: jest.fn() };
    const api = createGitAttributes({ path, fs: fsMock });
    const result = await api.writeGitattributes(dir, '*.js text');
    expect(result.ok).toBe(true);
    expect(fsMock.writeFileSync).toHaveBeenCalled();
  });
});
