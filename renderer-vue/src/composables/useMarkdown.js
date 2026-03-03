import { marked } from 'marked';

/**
 * Renders markdown string to HTML. Use with v-html in a container that has
 * .prose-docs (or similar) for styling. Links get target="_blank" rel="noopener noreferrer".
 * @param {string} markdown - Raw markdown
 * @returns {string} HTML string
 */
export function renderMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') return '';
  const html = marked.parse(markdown.trim(), {
    gfm: true,
    breaks: true,
  });
  if (typeof html !== 'string') return '';
  return html.replace(/<a href=/gi, '<a target="_blank" rel="noopener noreferrer" href=');
}
