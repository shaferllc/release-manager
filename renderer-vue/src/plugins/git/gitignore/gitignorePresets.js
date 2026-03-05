/**
 * .gitignore presets (condensed from common templates).
 * Use with "Append preset" to add to existing content.
 */
export const GITIGNORE_PRESETS = [
  {
    id: 'node',
    label: 'Node / npm',
    content: `# Dependencies
node_modules/

# Build / output
dist/
out/
.next/
.nuxt/
.output/
*.tsbuildinfo

# Logs & cache
*.log
npm-debug.log*
.npm
.eslintcache
.cache
.parcel-cache
.vite/

# Env
.env
.env.*
!.env.example
`,
  },
  {
    id: 'python',
    label: 'Python',
    content: `# Byte-compiled
__pycache__/
*.py[cod]
*.pyo
*.so

# Virtual envs
.venv/
venv/
env/
.env
.envrc

# Build / dist
build/
dist/
*.egg-info/
*.egg

# Test / coverage
.coverage
htmlcov/
.pytest_cache/
.tox/

# IDE
.idea/
.mypy_cache/
`,
  },
  {
    id: 'go',
    label: 'Go',
    content: `# Binaries
*.exe
*.dll
*.so
*.dylib

# Test
*.test
*.out
coverage.*

# Env
.env

# Optional
# vendor/
`,
  },
  {
    id: 'rust',
    label: 'Rust',
    content: `# Build
target/

# Cargo lock (uncomment to ignore; often kept in repo)
# Cargo.lock
`,
  },
  {
    id: 'php',
    label: 'PHP / Composer',
    content: `# Dependencies
vendor/

# Env
.env
.env.*
!.env.example

# IDE
.idea/
.vscode/
*.swp
*.swo

# Logs
*.log
`,
  },
  {
    id: 'macos',
    label: 'macOS',
    content: `# macOS
.DS_Store
.AppleDouble
.LSOverride
*.Spotlight-V100
*.Trashes
`,
  },
  {
    id: 'windows',
    label: 'Windows',
    content: `# Windows
Thumbs.db
Thumbs.db:encryptable
ehthumbs.db
Desktop.ini
*.stackdump
`,
  },
  {
    id: 'ide',
    label: 'IDE / editors',
    content: `# JetBrains
.idea/
*.iml
*.ipr
*.iws
out/

# VS Code (optional)
# .vscode/

# Vim
*.swp
*.swo
*~

# Emacs
*~
\\#*\\#
`,
  },
  {
    id: 'general',
    label: 'General (logs, env, tmp)',
    content: `# Env & secrets
.env
.env.*
!.env.example

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db

# Temp
tmp/
temp/
*.tmp
*.bak
*.swp
`,
  },
];

/** Single-line patterns for quick-add buttons */
export const GITIGNORE_QUICK_ADD = [
  { pattern: '.env', label: '.env' },
  { pattern: 'node_modules/', label: 'node_modules/' },
  { pattern: 'dist/', label: 'dist/' },
  { pattern: '*.log', label: '*.log' },
  { pattern: '.DS_Store', label: '.DS_Store' },
  { pattern: 'vendor/', label: 'vendor/' },
  { pattern: 'target/', label: 'target/' },
  { pattern: '__pycache__/', label: '__pycache__/' },
  { pattern: '.idea/', label: '.idea/' },
  { pattern: '.vscode/', label: '.vscode/' },
];
