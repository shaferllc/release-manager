/**
 * .gitignore read/write and scan for suggestions.
 * @param {{ path: Object, fs: Object }} deps
 */
function createGitIgnore(deps) {
  const { path, fs } = deps;

  const COMMON_IGNORABLES = [
    { name: 'node_modules', pattern: 'node_modules/', label: 'Node dependencies', category: 'Dependencies' },
    { name: 'vendor', pattern: 'vendor/', label: 'Composer / PHP deps', category: 'Dependencies' },
    { name: 'dist', pattern: 'dist/', label: 'Build output (dist)', category: 'Build' },
    { name: 'build', pattern: 'build/', label: 'Build output (build)', category: 'Build' },
    { name: 'out', pattern: 'out/', label: 'Build output (out)', category: 'Build' },
    { name: 'target', pattern: 'target/', label: 'Rust/Cargo build', category: 'Build' },
    { name: '.next', pattern: '.next/', label: 'Next.js build', category: 'Build' },
    { name: '.nuxt', pattern: '.nuxt/', label: 'Nuxt build', category: 'Build' },
    { name: '.output', pattern: '.output/', label: 'Nuxt output', category: 'Build' },
    { name: '__pycache__', pattern: '__pycache__/', label: 'Python cache', category: 'Build' },
    { name: '.venv', pattern: '.venv/', label: 'Python venv', category: 'Environment' },
    { name: 'venv', pattern: 'venv/', label: 'Python venv', category: 'Environment' },
    { name: '.env', pattern: '.env', label: 'Environment / secrets', category: 'Environment' },
    { name: '.env.local', pattern: '.env.local', label: 'Local env overrides', category: 'Environment' },
    { name: '.idea', pattern: '.idea/', label: 'JetBrains IDE', category: 'IDE' },
    { name: '.vscode', pattern: '.vscode/', label: 'VS Code', category: 'IDE' },
    { name: '.cache', pattern: '.cache', label: 'Cache directory', category: 'Cache' },
    { name: '.parcel-cache', pattern: '.parcel-cache/', label: 'Parcel cache', category: 'Cache' },
    { name: '.vite', pattern: '.vite/', label: 'Vite cache', category: 'Cache' },
    { name: '.pytest_cache', pattern: '.pytest_cache/', label: 'Pytest cache', category: 'Cache' },
    { name: '.mypy_cache', pattern: '.mypy_cache/', label: 'mypy cache', category: 'Cache' },
    { name: 'coverage', pattern: 'coverage/', label: 'Coverage reports', category: 'Test' },
    { name: 'htmlcov', pattern: 'htmlcov/', label: 'Python coverage html', category: 'Test' },
    { name: '.nyc_output', pattern: '.nyc_output/', label: 'Istanbul/nyc output', category: 'Test' },
    { name: '.DS_Store', pattern: '.DS_Store', label: 'macOS folder metadata', category: 'OS' },
    { name: 'Thumbs.db', pattern: 'Thumbs.db', label: 'Windows thumbnails', category: 'OS' },
    { name: 'logs', pattern: 'logs/', label: 'Logs directory', category: 'Logs' },
    { name: 'tmp', pattern: 'tmp/', label: 'Temporary files', category: 'Temp' },
    { name: 'temp', pattern: 'temp/', label: 'Temporary files', category: 'Temp' },
  ];

  function gitignoreCoversPattern(existingLines, pattern) {
    const normalized = pattern.replace(/\/$/, '');
    for (const line of existingLines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const lineNorm = t.replace(/\/$/, '');
      if (lineNorm === normalized || lineNorm === pattern || t === pattern) return true;
      if (pattern.endsWith('/') && lineNorm === normalized) return true;
      if (t.includes('*') && normalized.includes(lineNorm.replace(/\*/g, ''))) return true;
      if (lineNorm.length > 0 && pattern.startsWith(lineNorm)) return true;
    }
    return false;
  }

  async function getGitignore(dirPath) {
    const p = path.join(dirPath, '.gitignore');
    try {
      if (!fs.existsSync(p)) return { ok: true, content: null, path: p };
      const content = fs.readFileSync(p, 'utf8').slice(0, 8192);
      return { ok: true, content, path: p };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to read .gitignore', content: null, path: p };
    }
  }

  async function writeGitignore(dirPath, content) {
    const p = path.join(dirPath, '.gitignore');
    try {
      fs.writeFileSync(p, typeof content === 'string' ? content : '', 'utf8');
      return { ok: true, path: p };
    } catch (e) {
      return { ok: false, error: e.message || 'Failed to write .gitignore', path: p };
    }
  }

  async function scanProjectForGitignore(dirPath) {
    try {
      if (!dirPath || !fs.existsSync(dirPath)) return { ok: true, suggestions: [] };
      let existingContent = '';
      const gitignorePath = path.join(dirPath, '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        existingContent = fs.readFileSync(gitignorePath, 'utf8').slice(0, 8192);
      }
      const existingLines = existingContent.split(/\r?\n/);
      const topLevel = fs.readdirSync(dirPath, { withFileTypes: true });
      const names = new Set(topLevel.map((d) => d.name));

      const suggestions = [];
      for (const entry of COMMON_IGNORABLES) {
        if (!names.has(entry.name)) continue;
        if (gitignoreCoversPattern(existingLines, entry.pattern)) continue;
        suggestions.push({
          pattern: entry.pattern,
          label: entry.label,
          category: entry.category,
        });
      }
      return { ok: true, suggestions };
    } catch (e) {
      return { ok: false, error: e.message || 'Scan failed', suggestions: [] };
    }
  }

  return {
    getGitignore,
    writeGitignore,
    scanProjectForGitignore,
    gitignoreCoversPattern,
    COMMON_IGNORABLES,
  };
}

module.exports = { createGitIgnore };
