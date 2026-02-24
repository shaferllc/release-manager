const path = require('path');
const fs = require('fs');
const os = require('os');
const { getProjectNameVersionAndType, DEFAULT_ERROR } = require('../projectDetection');

describe('projectDetection', () => {
  describe('getProjectNameVersionAndType', () => {
    it('returns npm name and version when package.json exists and is valid', () => {
      const fsMock = {
        readFileSync: () => JSON.stringify({ name: 'my-app', version: '1.0.0' }),
        existsSync: () => false,
      };
      const result = getProjectNameVersionAndType('/proj', path, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('my-app');
      expect(result.version).toBe('1.0.0');
      expect(result.projectType).toBe('npm');
    });

    it('uses default path when pathImpl not passed', () => {
      const fsMock = {
        readFileSync: (p) => {
          if (p === path.join('/proj', 'package.json')) return JSON.stringify({ name: 'default-path', version: '0.0.1' });
          throw new Error('ENOENT');
        },
        existsSync: () => false,
      };
      const result = getProjectNameVersionAndType('/proj', undefined, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('default-path');
      expect(result.projectType).toBe('npm');
    });

    it('returns error when package.json is invalid and no other manifest', () => {
      const fsMock = {
        readFileSync: () => {
          throw new Error('ENOENT');
        },
        existsSync: () => false,
      };
      const result = getProjectNameVersionAndType('/proj', path, fsMock);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Not a supported project');
      expect(result.path).toBe('/proj');
    });

    it('falls back to cargo when package.json missing', () => {
      const fsMock = {
        readFileSync: (p) => {
          if (p.endsWith('package.json')) throw new Error('ENOENT');
          return '[package]\nname = "crate"\nversion = "0.1.0"\n';
        },
        existsSync: (p) => p.endsWith('Cargo.toml'),
      };
      const result = getProjectNameVersionAndType('/proj', path, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('crate');
      expect(result.version).toBe('0.1.0');
      expect(result.projectType).toBe('cargo');
    });

    it('falls back to go when package.json missing', () => {
      const fsMock = {
        readFileSync: (p) => {
          if (p.endsWith('package.json')) throw new Error('ENOENT');
          return 'module github.com/user/app\n\ngo 1.21\n';
        },
        existsSync: (p) => p.endsWith('go.mod'),
      };
      const result = getProjectNameVersionAndType('/proj', path, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('app');
      expect(result.version).toBeNull();
      expect(result.projectType).toBe('go');
    });

    it('falls back to python when package.json missing', () => {
      const fsMock = {
        readFileSync: (p) => {
          if (p.endsWith('package.json')) throw new Error('ENOENT');
          return '[project]\nname = "mypkg"\nversion = "2.0.0"\n';
        },
        existsSync: (p) => p.endsWith('pyproject.toml'),
      };
      const result = getProjectNameVersionAndType('/proj', path, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('mypkg');
      expect(result.version).toBe('2.0.0');
      expect(result.projectType).toBe('python');
    });

    it('falls back to non-npm when package.json parse fails', () => {
      const fsMock = {
        readFileSync: (p) => {
          if (p.endsWith('package.json')) return 'invalid json';
          return '[package]\nname = "r"\nversion = "1.0.0"\n';
        },
        existsSync: (p) => p.endsWith('Cargo.toml'),
      };
      const result = getProjectNameVersionAndType('/proj', path, fsMock);
      expect(result.ok).toBe(true);
      expect(result.projectType).toBe('cargo');
      expect(result.version).toBe('1.0.0');
    });

    it('returns non-npm error message when fallback fails', () => {
      const fsMock = {
        readFileSync: () => {
          throw new Error('ENOENT');
        },
        existsSync: () => false,
      };
      const result = getProjectNameVersionAndType('/empty', path, fsMock);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Not a supported project');
    });

    it('uses default fs when fsImpl not passed', () => {
      const tmpDir = path.join(os.tmpdir(), `rm-pd-${Date.now()}`);
      fs.mkdirSync(tmpDir, { recursive: true });
      const pkgPath = path.join(tmpDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify({ name: 'tmp-pkg', version: '9.9.9' }));
      try {
        const result = getProjectNameVersionAndType(tmpDir, path);
        expect(result.ok).toBe(true);
        expect(result.name).toBe('tmp-pkg');
        expect(result.version).toBe('9.9.9');
        expect(result.projectType).toBe('npm');
      } finally {
        fs.unlinkSync(pkgPath);
        fs.rmdirSync(tmpDir);
      }
    });

    it('uses DEFAULT_ERROR when non-npm returns ok false with no error', () => {
      const getNonNpmStub = () => ({ ok: false, path: '/proj' });
      const fsMock = {
        readFileSync: () => { throw new Error('ENOENT'); },
        existsSync: () => true,
      };
      const result = getProjectNameVersionAndType('/proj', path, fsMock, getNonNpmStub);
      expect(result.ok).toBe(false);
      expect(result.error).toBe(DEFAULT_ERROR);
      expect(result.path).toBe('/proj');
    });
  });
});
