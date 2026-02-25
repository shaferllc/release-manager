const path = require('path');
const {
  PROJECT_TYPES,
  detectProjectType,
  parseCargoVersion,
  parseGoVersion,
  parsePyprojectVersion,
  parseSetupPyVersion,
  getNonNpmProjectInfo,
} = require('../packageManagers');

describe('packageManagers', () => {
  describe('PROJECT_TYPES', () => {
    it('includes npm, cargo, go, python', () => {
      expect(PROJECT_TYPES).toContain('npm');
      expect(PROJECT_TYPES).toContain('cargo');
      expect(PROJECT_TYPES).toContain('go');
      expect(PROJECT_TYPES).toContain('python');
    });
  });

  describe('detectProjectType', () => {
    const fixtures = path.join(__dirname, '..', '..', '..', 'fixtures', 'package-managers');

    it('returns cargo when Cargo.toml exists', () => {
      const fsMock = {
        existsSync: (p) => p.endsWith('Cargo.toml') || p.endsWith('go.mod'),
      };
      const result = detectProjectType('/proj', fsMock);
      expect(result).toEqual({ type: 'cargo', manifestPath: path.join('/proj', 'Cargo.toml') });
    });

    it('returns go when go.mod exists and no Cargo.toml', () => {
      const fsMock = {
        existsSync: (p) => p.endsWith('go.mod'),
      };
      const result = detectProjectType('/proj', fsMock);
      expect(result).toEqual({ type: 'go', manifestPath: path.join('/proj', 'go.mod') });
    });

    it('returns python for pyproject.toml when no cargo or go', () => {
      const fsMock = {
        existsSync: (p) => p.endsWith('pyproject.toml'),
      };
      const result = detectProjectType('/proj', fsMock);
      expect(result).toEqual({ type: 'python', manifestPath: path.join('/proj', 'pyproject.toml') });
    });

    it('returns python for setup.py when no cargo, go, or pyproject', () => {
      const fsMock = {
        existsSync: (p) => p.endsWith('setup.py'),
      };
      const result = detectProjectType('/proj', fsMock);
      expect(result).toEqual({ type: 'python', manifestPath: path.join('/proj', 'setup.py') });
    });

    it('returns null when no manifest', () => {
      const fsMock = { existsSync: () => false };
      expect(detectProjectType('/proj', fsMock)).toBeNull();
    });

    it('returns null for invalid dirPath', () => {
      expect(detectProjectType('', { existsSync: () => true })).toBeNull();
      expect(detectProjectType(null)).toBeNull();
    });
  });

  describe('parseCargoVersion', () => {
    it('extracts version from Cargo.toml', () => {
      const content = '[package]\nname = "foo"\nversion = "1.2.3"\n';
      expect(parseCargoVersion(content)).toBe('1.2.3');
    });
    it('returns null for empty or no version', () => {
      expect(parseCargoVersion('')).toBeNull();
      expect(parseCargoVersion('[package]\nname = "x"')).toBeNull();
    });
    it('returns null for non-string input', () => {
      expect(parseCargoVersion(null)).toBeNull();
      expect(parseCargoVersion(123)).toBeNull();
    });
  });

  describe('parseGoVersion', () => {
    it('returns null', () => {
      expect(parseGoVersion()).toBeNull();
    });
  });

  describe('parsePyprojectVersion', () => {
    it('extracts version from pyproject.toml', () => {
      const content = '[project]\nname = "pkg"\nversion = "0.4.0"\n';
      expect(parsePyprojectVersion(content)).toBe('0.4.0');
    });
    it('returns null for empty or no version', () => {
      expect(parsePyprojectVersion('')).toBeNull();
    });
    it('returns null for non-string input', () => {
      expect(parsePyprojectVersion(null)).toBeNull();
    });
    it('returns null when no version line matches', () => {
      expect(parsePyprojectVersion('[project]\nname = "x"\n')).toBeNull();
    });
  });

  describe('parseSetupPyVersion', () => {
    it('extracts version from setup.py', () => {
      const content = 'setuptools.setup(name="x", version="2.0.1")';
      expect(parseSetupPyVersion(content)).toBe('2.0.1');
    });
    it('returns null for empty or non-string', () => {
      expect(parseSetupPyVersion('')).toBeNull();
      expect(parseSetupPyVersion(undefined)).toBeNull();
    });
    it('returns null when no version match', () => {
      expect(parseSetupPyVersion('setuptools.setup(name="x")')).toBeNull();
    });
  });

  describe('getNonNpmProjectInfo', () => {
    it('returns error when detected is null', () => {
      const result = getNonNpmProjectInfo('/dir', null);
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns cargo name and version', () => {
      const fsMock = {
        readFileSync: () =>
          '[package]\nname = "my-crate"\nversion = "0.1.0"\n',
      };
      const result = getNonNpmProjectInfo('/proj', { type: 'cargo', manifestPath: '/proj/Cargo.toml' }, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('my-crate');
      expect(result.version).toBe('0.1.0');
      expect(result.projectType).toBe('cargo');
    });

    it('returns go module name and null version', () => {
      const fsMock = {
        readFileSync: () => 'module github.com/user/myapp\n\ngo 1.21\n',
      };
      const result = getNonNpmProjectInfo('/proj', { type: 'go', manifestPath: '/proj/go.mod' }, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('myapp');
      expect(result.version).toBeNull();
      expect(result.projectType).toBe('go');
    });

    it('returns python name and version from pyproject.toml', () => {
      const fsMock = {
        readFileSync: () => '[project]\nname = "mypkg"\nversion = "3.0.0"\n',
      };
      const result = getNonNpmProjectInfo('/proj', { type: 'python', manifestPath: '/proj/pyproject.toml' }, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('mypkg');
      expect(result.version).toBe('3.0.0');
      expect(result.projectType).toBe('python');
    });
    it('returns python name from pyproject.toml with single-quoted name', () => {
      const fsMock = {
        readFileSync: () => "[project]\nname = 'single-quote-pkg'\nversion = \"1.0.0\"\n",
      };
      const result = getNonNpmProjectInfo('/proj', { type: 'python', manifestPath: '/proj/pyproject.toml' }, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('single-quote-pkg');
      expect(result.version).toBe('1.0.0');
    });
    it('returns python version from pyproject.toml with no name (uses basename)', () => {
      const fsMock = {
        readFileSync: () => '[project]\nversion = "1.0.0"\n',
      };
      const result = getNonNpmProjectInfo('/proj/my-python', { type: 'python', manifestPath: '/proj/my-python/pyproject.toml' }, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('my-python');
      expect(result.version).toBe('1.0.0');
      expect(result.projectType).toBe('python');
    });

    it('returns python version from setup.py', () => {
      const fsMock = {
        readFileSync: () => 'setuptools.setup(name="pkg", version="1.0.0")',
      };
      const result = getNonNpmProjectInfo('/proj', { type: 'python', manifestPath: '/proj/setup.py' }, fsMock);
      expect(result.ok).toBe(true);
      expect(result.version).toBe('1.0.0');
    });
    it('returns python setup.py with version but no name (uses basename)', () => {
      const fsMock = {
        readFileSync: () => 'setuptools.setup(version="0.5.0")',
      };
      const result = getNonNpmProjectInfo('/proj/my-setup', { type: 'python', manifestPath: '/proj/my-setup/setup.py' }, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('my-setup');
      expect(result.version).toBe('0.5.0');
    });

    it('returns error when readFileSync throws', () => {
      const fsMock = { readFileSync: () => { throw new Error('ENOENT'); } };
      const result = getNonNpmProjectInfo('/proj', { type: 'cargo', manifestPath: '/proj/Cargo.toml' }, fsMock);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('ENOENT');
      expect(result.path).toBe('/proj');
    });

    it('returns fallback error when readFileSync throws with no message', () => {
      const fsMock = {
        readFileSync: () => {
          const e = new Error();
          e.message = '';
          throw e;
        },
      };
      const result = getNonNpmProjectInfo('/proj', { type: 'cargo', manifestPath: '/proj/Cargo.toml' }, fsMock);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Failed to read manifest');
      expect(result.path).toBe('/proj');
    });

    it('uses basename when cargo has no name field', () => {
      const fsMock = { readFileSync: () => 'version = "0.2.0"\n' };
      const result = getNonNpmProjectInfo('/path/to/my-crate', { type: 'cargo', manifestPath: '/proj/Cargo.toml' }, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('my-crate');
      expect(result.version).toBe('0.2.0');
    });

    it('uses basename when go.mod has no module line', () => {
      const fsMock = { readFileSync: () => 'go 1.21\n' };
      const result = getNonNpmProjectInfo('/proj', { type: 'go', manifestPath: '/proj/go.mod' }, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('proj');
    });

    it('uses basename when go module path ends with slash (empty pop)', () => {
      const fsMock = { readFileSync: () => 'module a/b/\n\ngo 1.21\n' };
      const result = getNonNpmProjectInfo('/myapp', { type: 'go', manifestPath: '/myapp/go.mod' }, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('myapp');
    });

    it('uses basename when pyproject has no name', () => {
      const fsMock = { readFileSync: () => 'version = "1.0.0"\n' };
      const result = getNonNpmProjectInfo('/dir/pkg', { type: 'python', manifestPath: '/dir/pkg/pyproject.toml' }, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('pkg');
    });

    it('uses basename when setup.py has no name', () => {
      const fsMock = { readFileSync: () => 'setuptools.setup(version="0.5.0")' };
      const result = getNonNpmProjectInfo('/x', { type: 'python', manifestPath: '/x/setup.py' }, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('x');
    });

    it('uses "project" when dirPath is falsy', () => {
      const fsMock = { readFileSync: () => '[package]\nversion = "1.0.0"\n' };
      const result = getNonNpmProjectInfo(null, { type: 'cargo', manifestPath: '/Cargo.toml' }, fsMock);
      expect(result.ok).toBe(true);
      expect(result.name).toBe('project');
    });
  });
});
