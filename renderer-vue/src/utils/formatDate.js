/**
 * Format an ISO date string for display.
 * @param {string} isoDate - ISO date string (with or without time)
 * @returns {string} Formatted string or '—' if invalid/missing
 */
export function formatDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  const hasTime = typeof isoDate === 'string' && isoDate.includes('T');
  if (hasTime) {
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Short date format (e.g. "Mar 3, '25").
 * @param {string} isoDate - ISO date string
 * @returns {string} Short formatted string or empty if invalid
 */
export function formatDateShort(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

/**
 * Time only when same day, otherwise short date + time (e.g. for email/inbox lists).
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted string or '—' if invalid/missing
 */
export function formatDateWithTime(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Locale short date + short time (e.g. for file lists).
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted string or '' if invalid/missing
 */
export function formatDateTimeShort(isoDate) {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return isoDate;
  }
}
