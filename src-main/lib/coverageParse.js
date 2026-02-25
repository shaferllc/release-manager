/**
 * Parse coverage report text (Jest, Vitest, PHPUnit, Istanbul/c8) for a short summary.
 * Testable without Electron.
 */

/**
 * @param {string} text - Raw stdout/stderr from coverage command
 * @returns {string|null} - Short summary e.g. "87%" or "Lines 85.71%" or null
 */
function parseCoverageSummary(text) {
  if (!text || typeof text !== 'string') return null;
  const lines = text.split('\n');
  for (const line of lines) {
    const allFiles = line.match(/All files\s*\|\s*([\d.]+)/);
    if (allFiles) return `${allFiles[1]}%`;
    const stmt = line.match(/Statements\s*:\s*([\d.]+)%?/);
    if (stmt) return `Stmts ${stmt[1]}%`;
    const linesPct = line.match(/Lines\s*:\s*([\d.]+)%?/);
    if (linesPct) return `Lines ${linesPct[1]}%`;
  }
  for (const line of lines) {
    const phpUnit = line.match(/Code Coverage:\s*([\d.]+)%/);
    if (phpUnit) return `${phpUnit[1]}%`;
  }
  const generic = text.match(/(?:Coverage|coverage)[:\s]+([\d.]+)%/i) || text.match(/([\d.]+)%\s*coverage/i);
  return generic ? `${generic[1]}%` : null;
}

module.exports = { parseCoverageSummary };
