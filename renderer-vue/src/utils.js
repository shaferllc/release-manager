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
 * Format ahead/behind for display.
 */
export function formatAheadBehind(ahead, behind) {
  const a = ahead != null && ahead > 0 ? `${ahead} ahead` : '';
  const b = behind != null && behind > 0 ? `${behind} behind` : '';
  if (!a && !b) return '';
  return [a, b].filter(Boolean).join(', ');
}
