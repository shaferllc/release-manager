/**
 * Escape HTML for safe insertion into the DOM.
 */
export function escapeHtml(str) {
  if (str == null) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Truncate a path for display: if longer than maxLen, show "…" + last (maxLen - 1) chars.
 * @param {string} path
 * @param {number} maxLen - Max length of result (default 50)
 * @returns {string}
 */
export function truncatePath(path, maxLen = 50) {
  const p = path || '';
  if (p.length <= maxLen) return p;
  return '…' + p.slice(-(maxLen - 1));
}

/**
 * Format ahead/behind for display.
 */
export function formatAheadBehind(ahead, behind) {
  const a = ahead != null && ahead > 0 ? `${ahead} ahead` : '';
  const b = behind != null && behind > 0 ? `${behind} behind` : '';
  if (!a && !b) return '';
  return [a, b].filter(Boolean).join(', ');
}

/**
 * Display name for a project: name, or path basename, or ''.
 * @param {{ name?: string, path?: string }} project
 * @returns {string}
 */
export function projectDisplayName(project) {
  if (!project) return '';
  if (project.name) return String(project.name);
  if (project.path) {
    const segment = project.path.replace(/\\/g, '/').split('/').filter(Boolean).pop();
    return segment != null ? String(segment) : '';
  }
  return '';
}
