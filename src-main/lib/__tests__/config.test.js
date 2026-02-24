const fs = require('fs');
const path = require('path');
const os = require('os');
const { getStoredConfig, setStoredConfig, getProjects, setProjects } = require('../config');

describe('config', () => {
  let configPath;

  beforeEach(() => {
    configPath = path.join(os.tmpdir(), `rm-config-${Date.now()}.json`);
  });

  afterEach(() => {
    try {
      fs.unlinkSync(configPath);
    } catch (_) {}
  });

  function getConfigPath() {
    return configPath;
  }

  describe('getStoredConfig', () => {
    it('returns empty object when file does not exist', () => {
      expect(getStoredConfig(getConfigPath, fs)).toEqual({});
    });

    it('returns parsed JSON when file exists', () => {
      fs.writeFileSync(configPath, JSON.stringify({ theme: 'dark', projects: [] }));
      expect(getStoredConfig(getConfigPath, fs)).toEqual({ theme: 'dark', projects: [] });
    });

    it('returns empty object when file is invalid JSON', () => {
      fs.writeFileSync(configPath, 'not json');
      expect(getStoredConfig(getConfigPath, fs)).toEqual({});
    });

    it('returns empty object when fs throws (e.g. file not found)', () => {
      const mockFs = {
        readFileSync: () => {
          throw new Error('ENOENT');
        },
      };
      expect(getStoredConfig(getConfigPath, mockFs)).toEqual({});
    });
  });

  describe('setStoredConfig', () => {
    it('uses default fs when fsImpl not passed', () => {
      fs.writeFileSync(configPath, '{}');
      setStoredConfig(getConfigPath, { theme: 'dark' });
      expect(getStoredConfig(getConfigPath, fs)).toEqual({ theme: 'dark' });
    });

    it('writes merged config to file', () => {
      setStoredConfig(getConfigPath, { theme: 'light' }, fs);
      expect(JSON.parse(fs.readFileSync(configPath, 'utf8'))).toEqual({ theme: 'light' });

      setStoredConfig(getConfigPath, { projects: [{ path: '/a', name: 'A' }] }, fs);
      expect(JSON.parse(fs.readFileSync(configPath, 'utf8'))).toEqual({
        theme: 'light',
        projects: [{ path: '/a', name: 'A' }],
      });
    });
  });

  describe('getProjects', () => {
    it('returns empty array when no projects in config', () => {
      fs.writeFileSync(configPath, '{}');
      expect(getProjects(getConfigPath, fs)).toEqual([]);
    });

    it('uses default fs when fsImpl not passed', () => {
      const realFs = require('fs');
      realFs.writeFileSync(configPath, JSON.stringify({ projects: [{ path: '/a', name: 'A' }] }));
      expect(getProjects(getConfigPath)).toEqual([{ path: '/a', name: 'A' }]);
    });

    it('returns only valid projects (path string, non-empty)', () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          projects: [
            { path: '/valid', name: 'Valid' },
            { path: '', name: 'Empty' },
            { path: '  ', name: 'Blank' },
            null,
            { name: 'NoPath' },
            { path: '/also-valid' },
          ],
        })
      );
      expect(getProjects(getConfigPath, fs)).toEqual([
        { path: '/valid', name: 'Valid' },
        { path: '/also-valid' },
      ]);
    });

    it('returns empty when projects is not an array', () => {
      fs.writeFileSync(configPath, JSON.stringify({ projects: {} }));
      expect(getProjects(getConfigPath, fs)).toEqual([]);
    });
  });

  describe('setProjects', () => {
    it('overwrites projects in config', () => {
      fs.writeFileSync(configPath, JSON.stringify({ theme: 'dark', projects: [] }));
      setProjects(
        getConfigPath,
        [
          { path: '/p1', name: 'P1' },
          { path: '/p2', name: 'P2' },
        ],
        fs
      );
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(data.projects).toHaveLength(2);
      expect(data.theme).toBe('dark');
    });
  });
});
