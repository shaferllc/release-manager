/**
 * .gitattributes presets and wizard options.
 * Use with the wizard to generate or append rules.
 */

/** Full presets (replace or append) */
export const GITATTRIBUTES_PRESETS = [
  {
    id: 'minimal',
    label: 'Minimal (line endings only)',
    content: `# Normalize line endings
* text=auto eol=lf
*.{cmd,[cC][mM][dD]} text eol=crlf
*.{bat,[bB][aA][tT]} text eol=crlf
`,
  },
  {
    id: 'cross-platform',
    label: 'Cross-platform (line endings + binary)',
    content: `# Line endings: auto-detect, default LF
* text=auto eol=lf
*.{cmd,[cC][mM][dD]} text eol=crlf
*.{bat,[bB][aA][tT]} text eol=crlf

# Binary
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.webp binary
*.pdf binary
*.woff binary
*.woff2 binary
*.ttf binary
*.eot binary
*.zip binary
*.gz binary
`,
  },
  {
    id: 'web',
    label: 'Web (assets binary, sources text)',
    content: `* text=auto eol=lf

# Binary assets
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.webp binary
*.svg binary
*.woff binary
*.woff2 binary
*.ttf binary
*.eot binary
*.pdf binary

# Scripts: always LF
*.js text eol=lf
*.ts text eol=lf
*.jsx text eol=lf
*.tsx text eol=lf
*.css text eol=lf
*.scss text eol=lf
*.html text eol=lf
*.json text eol=lf
`,
  },
  {
    id: 'php-composer',
    label: 'PHP / Composer',
    content: `* text=auto eol=lf

# Composer
/composer.json text
/composer.lock binary

# PHP
*.php text diff=php
*.phtml text

# Binary
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.pdf binary
*.woff binary
*.woff2 binary
`,
  },
  {
    id: 'linguist',
    label: 'GitHub Linguist (language stats)',
    content: `# Vendored / generated: exclude from language stats
vendor/** linguist-vendored
node_modules/** linguist-vendored
dist/** linguist-generated
build/** linguist-generated
*.min.js linguist-generated
*.min.css linguist-generated
`,
  },
  {
    id: 'export-ignore',
    label: 'Export-ignore (git archive)',
    content: `# Exclude from git archive (e.g. releases)
.gitignore export-ignore
.gitattributes export-ignore
.github/ export-ignore
docs/ export-ignore
tests/ export-ignore
*.md export-ignore
Dockerfile* export-ignore
.dockerignore export-ignore
`,
  },
];

/** Wizard categories: user picks what to include, we build the block */
export const GITATTRIBUTES_WIZARD_OPTIONS = [
  {
    id: 'line-endings',
    label: 'Line endings',
    description: 'Normalize line endings (LF by default, CRLF for Windows scripts)',
    lines: `# Line endings
* text=auto eol=lf
*.{cmd,bat} text eol=crlf
`,
  },
  {
    id: 'binary',
    label: 'Binary files',
    description: 'Mark images, fonts, archives as binary',
    lines: `# Binary
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.webp binary
*.pdf binary
*.woff binary
*.woff2 binary
*.ttf binary
*.zip binary
`,
  },
  {
    id: 'linguist',
    label: 'Linguist (GitHub language stats)',
    description: 'Exclude vendor/build from language detection',
    lines: `# Linguist
vendor/** linguist-vendored
node_modules/** linguist-vendored
dist/** linguist-generated
*.min.js linguist-generated
`,
  },
  {
    id: 'export-ignore',
    label: 'Export-ignore',
    description: 'Exclude from git archive',
    lines: `# Export-ignore
.gitignore export-ignore
.gitattributes export-ignore
.github/ export-ignore
*.md export-ignore
`,
  },
  {
    id: 'diff',
    label: 'Diff / merge',
    description: 'Custom diff for lockfiles; merge drivers',
    lines: `# Lockfiles: binary to avoid merge noise (optional)
# package-lock.json binary
# composer.lock binary
# yarn.lock binary
`,
  },
];
