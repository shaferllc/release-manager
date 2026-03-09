/**
 * Markdown renderer: GFM, emoji, math (KaTeX), syntax highlighting, footnotes.
 * https://github.github.com/gfm/
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkEmoji from 'remark-emoji';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

/** Slug for heading IDs: lowercase, spaces to hyphens, strip non-alphanumeric */
function slugify(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'heading';
}

/** Rehype plugin: add id to h1–h6 from slug of text content */
function rehypeHeadingIds() {
  const used = new Set();
  return (tree) => {
    tree.children.forEach((node) => {
      if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
        const text = (node.children || [])
          .filter((n) => n.type === 'text')
          .map((n) => n.value)
          .join('');
        let id = slugify(text);
        if (used.has(id)) {
          let n = 1;
          while (used.has(id + '-' + n)) n++;
          id = id + '-' + n;
        }
        used.add(id);
        node.properties = node.properties || {};
        node.properties.id = id;
      }
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkEmoji)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeKatex)
  .use(rehypeHighlight)
  .use(rehypeHeadingIds)
  .use(rehypeStringify);

/**
 * @param {string} markdown - Raw markdown (GFM)
 * @returns {Promise<string>} HTML string
 */
export async function renderGfmToHtml(markdown) {
  if (!markdown || typeof markdown !== 'string') return '';
  try {
    const file = await processor.process(markdown.trim());
    return String(file);
  } catch {
    return '';
  }
}

/**
 * Sync is not available on unified; use renderGfmToHtml for async.
 * This runs the processor and returns the HTML (for use in async contexts).
 */
export { processor };

/** Parse markdown for headings; returns [{ level: 1–6, text, id }]. Ids match rendered HTML. */
export function parseHeadings(markdown) {
  if (!markdown || typeof markdown !== 'string') return [];
  const used = new Set();
  const headings = [];
  const re = /^(#{1,6})\s+(.+)$/gm;
  let m;
  while ((m = re.exec(markdown)) !== null) {
    const level = m[1].length;
    const text = m[2].trim().replace(/\s*\{#[\w-]+\}\s*$/, ''); // strip optional custom id
    let id = slugify(text);
    if (used.has(id)) {
      let n = 1;
      while (used.has(id + '-' + n)) n++;
      id = id + '-' + n;
    }
    used.add(id);
    headings.push({ level, text, id });
  }
  return headings;
}
