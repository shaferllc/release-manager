import { renderGfmToHtml } from '../utils/renderGfm';

/**
 * Renders GitHub Flavored Markdown to HTML. Use with v-html in a container that has
 * .prose-docs (or similar) for styling. Links get target="_blank" rel="noopener noreferrer".
 * @param {string} markdown - Raw markdown (GFM)
 * @returns {Promise<string>} HTML string
 */
export async function renderMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') return '';
  const html = await renderGfmToHtml(markdown);
  if (typeof html !== 'string') return '';
  return html.replace(/<a href=/gi, '<a target="_blank" rel="noopener noreferrer" href=');
}
