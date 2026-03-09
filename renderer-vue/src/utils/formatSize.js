/**
 * Format a byte count for display (B, KB, MB).
 * @param {number} bytes - Byte count
 * @returns {string} Formatted string or '' if null/undefined
 */
export function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
