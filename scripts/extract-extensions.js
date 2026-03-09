#!/usr/bin/env node
/**
 * Extract built-in extensions into standalone projects.
 *
 * Usage:
 *   node scripts/extract-extensions.js [outputDir]
 *
 * Each extension gets its own directory under outputDir (default: ./extracted-extensions/)
 * with a Vite build setup, manifest.json, and all source files rewritten to use the
 * window.* sandbox API instead of relative imports.
 */

const fs = require('fs');
const path = require('path');

const EXTENSIONS_DIR = path.resolve(__dirname, '..', 'renderer-vue', 'src', 'extensions');
const TEMPLATE_DIR = path.resolve(__dirname, 'extension-template');
const OUTPUT_DIR = process.argv[2] || path.resolve(__dirname, '..', 'extracted-extensions');

const SKIP_DIRS = new Set(['.', '..']);
const ALWAYS_SKIP = new Set(['registry.js', 'tabCategories.js', 'index.js', 'README.md']);

const EXTENSIONS = fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}

function rewriteImports(content) {
  return content
    // ../registry imports -> window.__register* calls (handled in index.js rewrite)
    .replace(/import\s*\{[^}]*\}\s*from\s*['"]\.\.\/registry['"];?\s*/g, '')
    // ../../composables/useApi -> inline
    .replace(/import\s*\{[^}]*useApi[^}]*\}\s*from\s*['"]\.\.\/\.\.\/composables\/useApi['"];?\s*/g,
      'function useApi() { return window.releaseManager ?? {}; }\n')
    // ../../stores/app -> inline
    .replace(/import\s*\{[^}]*useAppStore[^}]*\}\s*from\s*['"]\.\.\/\.\.\/stores\/app['"];?\s*/g,
      'function useAppStore() { const pinia = window.__pinia; if (!pinia) return {}; const stores = pinia._s; return stores?.get?.("app") ?? {}; }\n')
    // ../../components/detail/ExtensionLayout.vue -> inline shim
    .replace(/import\s+(\w+)\s+from\s*['"]\.\.\/\.\.\/components\/detail\/ExtensionLayout\.vue['"];?\s*/g,
      '/* ExtensionLayout is provided by the host app — use a simple div wrapper */\n' +
      'const $1 = { name: "ExtensionLayout", props: { tabId: String, contentClass: String }, template: `<div class="detail-tab-panel" :data-detail-tab="tabId" :class="contentClass"><slot /></div>` };\n')
    // ../../utils/* -> inline stubs
    .replace(/import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/\.\.\/utils\/formatDate['"];?\s*/g, (_, names) => {
      return `function formatDate(d) { if (!d) return ''; try { return new Date(d).toLocaleString(); } catch { return String(d); } }\n`;
    })
    .replace(/import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/\.\.\/utils\/formatSize['"];?\s*/g, (_, names) => {
      return `function formatSize(b) { if (!b && b !== 0) return ''; const u = ['B','KB','MB','GB']; let i = 0; let s = Number(b); while (s >= 1024 && i < u.length - 1) { s /= 1024; i++; } return s.toFixed(i ? 1 : 0) + ' ' + u[i]; }\n`;
    })
    // ../../utils/renderGfm -> stub
    .replace(/import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/\.\.\/utils\/renderGfm['"];?\s*/g, (_, names) => {
      return `function renderGfmToHtml(md) { return md; }\nfunction parseHeadings(md) { return []; }\n`;
    })
    // ../../composables/useDashboard -> stub
    .replace(/import\s*\{[^}]*\}\s*from\s*['"]\.\.\/\.\.\/composables\/useDashboard['"];?\s*/g,
      'function useDashboard() { return {}; }\n')
    // ../../composables/useAgentCrewSlots -> stub
    .replace(/import\s*\{[^}]*\}\s*from\s*['"]\.\.\/\.\.\/composables\/useAgentCrewSlots['"];?\s*/g,
      'function useAgentCrewSlots() { return { slots: window.Vue?.ref?.([]) ?? { value: [] } }; }\n')
    // PrimeVue component imports — map to global PrimeVue
    .replace(/import\s+(\w+)\s+from\s*['"]primevue\/(\w+)['"];?\s*/g, (_, name, pkg) => {
      return `const ${name} = window.PrimeVue?.['${pkg}'] ?? { name: '${name}', template: '<div><slot /></div>' };\n`;
    });
}

function rewriteIndexJs(content, extId, extMeta) {
  let out = content;
  // Replace registerDetailTabExtension call with window.__registerDetailTabExtension
  out = out.replace(/registerDetailTabExtension\s*\(/g, 'window.__registerDetailTabExtension(');
  out = out.replace(/registerDocSection\s*\(/g, 'window.__registerDocSection(');
  out = out.replace(/registerCommand\s*\(/g, 'window.__registerCommand(');
  // Remove import of ../registry
  out = out.replace(/import\s*\{[^}]*\}\s*from\s*['"]\.\.\/registry['"];?\s*/g, '');
  out = out.replace(/import\s*\{[^}]*\}\s*from\s*['"]\.\.\/\.\.\/commandPalette\/registry['"];?\s*/g, '');
  return out;
}

console.log(`Extracting ${EXTENSIONS.length} extensions to ${OUTPUT_DIR}\n`);

for (const extName of EXTENSIONS) {
  const extDir = path.join(EXTENSIONS_DIR, extName);
  const indexPath = path.join(extDir, 'index.js');
  if (!fs.existsSync(indexPath)) {
    console.log(`  SKIP ${extName} (no index.js)`);
    continue;
  }

  const outDir = path.join(OUTPUT_DIR, `shipwell-ext-${extName}`);
  fs.mkdirSync(path.join(outDir, 'src'), { recursive: true });

  // Read existing index.js to extract metadata
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const labelMatch = indexContent.match(/label:\s*['"]([^'"]+)['"]/);
  const descMatch = indexContent.match(/description:\s*['"]([^'"]+)['"]/);
  const versionMatch = indexContent.match(/version:\s*['"]([^'"]+)['"]/);
  const extMeta = {
    id: extName,
    name: labelMatch?.[1] || extName,
    description: descMatch?.[1] || '',
    version: versionMatch?.[1] || '1.0.0',
  };

  // Copy template files with placeholder replacement
  const templateFiles = ['package.json', 'vite.config.js', '.gitignore'];
  for (const tf of templateFiles) {
    const src = path.join(TEMPLATE_DIR, tf);
    if (!fs.existsSync(src)) continue;
    let content = fs.readFileSync(src, 'utf8');
    content = content
      .replace(/__EXT_ID__/g, extMeta.id)
      .replace(/__EXT_NAME__/g, extMeta.name)
      .replace(/__EXT_DESCRIPTION__/g, extMeta.description);
    fs.writeFileSync(path.join(outDir, tf), content);
  }

  // Write manifest.json
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({
    id: extMeta.id,
    name: extMeta.name,
    version: extMeta.version,
    description: extMeta.description,
  }, null, 2));

  // Write README
  const readmeContent = `# ${extMeta.name}\n\n${extMeta.description}\n\nShipwell extension. See [Shipwell docs](https://shipwell.dev) for development instructions.\n\n## Build\n\n\`\`\`bash\nnpm install\nnpm run build\n\`\`\`\n\nProduces \`dist/index.js\` which is loaded by the desktop app.\n`;
  fs.writeFileSync(path.join(outDir, 'README.md'), readmeContent);

  // Copy and rewrite source files
  const files = fs.readdirSync(extDir).filter((f) => !f.endsWith('.spec.js'));
  for (const f of files) {
    const srcPath = path.join(extDir, f);
    if (fs.statSync(srcPath).isDirectory()) continue;

    let content = fs.readFileSync(srcPath, 'utf8');

    if (f === 'index.js') {
      content = rewriteIndexJs(content, extName, extMeta);
    }

    if (f.endsWith('.js') || f.endsWith('.vue')) {
      content = rewriteImports(content);
    }

    fs.writeFileSync(path.join(outDir, 'src', f), content);
  }

  // Copy subdirectories (non-test files)
  const subdirs = fs.readdirSync(extDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const sd of subdirs) {
    const subSrcDir = path.join(extDir, sd.name);
    const subOutDir = path.join(outDir, 'src', sd.name);
    fs.mkdirSync(subOutDir, { recursive: true });
    const subFiles = fs.readdirSync(subSrcDir).filter((f) => !f.endsWith('.spec.js'));
    for (const sf of subFiles) {
      const sfPath = path.join(subSrcDir, sf);
      if (fs.statSync(sfPath).isDirectory()) continue;
      let content = fs.readFileSync(sfPath, 'utf8');
      if (sf.endsWith('.js') || sf.endsWith('.vue')) {
        content = rewriteImports(content);
      }
      fs.writeFileSync(path.join(subOutDir, sf), content);
    }
  }

  console.log(`  OK  ${extName} -> ${path.relative(process.cwd(), outDir)}`);
}

console.log(`\nDone. Each extension can be pushed to its own GitHub repo.`);
console.log(`To build: cd <ext-dir> && npm install && npm run build`);
console.log(`The built dist/index.js is what the desktop app loads.`);
