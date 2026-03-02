/**
 * Pure utility functions.
 */
import { BTN_ICONS } from './constants.js';

export function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

export function createBtnIcon(pathDOrArray) {
  if (pathDOrArray == null) return null;
  const paths = Array.isArray(pathDOrArray) ? pathDOrArray : [pathDOrArray];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'btn-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  paths.forEach((d) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  });
  return svg;
}

export function stripAnsi(text) {
  if (text == null || typeof text !== 'string') return '';
  return text
    .replace(/\x1b\[[\d;]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[?[\d;]*[a-zA-Z]/g, '');
}

export function formatAheadBehind(ahead, behind) {
  const parts = [];
  if (ahead != null && ahead > 0) parts.push(`${ahead} ahead`);
  if (behind != null && behind > 0) parts.push(`${behind} behind`);
  return parts.length ? parts.join(', ') : null;
}

export { BTN_ICONS };
