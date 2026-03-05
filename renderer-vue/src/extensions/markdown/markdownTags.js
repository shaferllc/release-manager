/**
 * Parse tags from markdown: YAML frontmatter (tags: [a, b] or tags: a, b) and #tag in body.
 * @param {string} markdown
 * @returns {string[]} Unique, sorted tag names
 */
export function parseTagsFromMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') return [];
  const tags = new Set();

  // Frontmatter: --- ... ---
  const fmMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    const front = fmMatch[1];
    const tagsLine = front.match(/^tags:\s*(.+)$/m);
    if (tagsLine) {
      const raw = tagsLine[1].trim();
      if (raw.startsWith('[')) {
        try {
          const arr = JSON.parse(raw.replace(/(\w+)/g, '"$1"'));
          arr.forEach((t) => tags.add(String(t).trim()));
        } catch (_) {
          raw.replace(/"([^"]+)"|'([^']+)'|(\S+)/g, (_, q1, q2, w) => {
            if (q1 || q2 || w) tags.add((q1 || q2 || w).trim());
          });
        }
      } else {
        raw.split(',').forEach((t) => {
          const s = t.trim().replace(/^['"]|['"]$/g, '');
          if (s) tags.add(s);
        });
      }
    }
  }

  // Inline #tag (word chars and hyphens only, not inside code)
  const body = fmMatch ? markdown.slice(fmMatch[0].length) : markdown;
  const tagRe = /(?:^|[^\w`#])#([a-zA-Z][\w-]*)/g;
  let m;
  while ((m = tagRe.exec(body)) !== null) {
    tags.add(m[1]);
  }

  return [...tags].sort((a, b) => a.localeCompare(b));
}
