/**
 * Build a tree from flat markdown file paths for sidebar display.
 * @param {string[]} paths - Relative paths like ['README.md', 'docs/a.md', 'docs/guides/b.md']
 * @returns {{ name: string, path?: string, children?: object[] }[]} Tree nodes (folders have children, files have path)
 */
export function buildFileTree(paths) {
  const root = { children: [] };
  const folderNodes = new Map(); // path segment key -> { name, children: [] }

  for (const p of paths) {
    const parts = p.split('/');
    if (parts.length === 1) {
      root.children.push({ name: parts[0], path: p });
      continue;
    }
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const isFile = i === parts.length - 1;
      const segment = parts[i];
      const key = parts.slice(0, i + 1).join('/');
      if (isFile) {
        current.children.push({ name: segment, path: p });
      } else {
        let folder = folderNodes.get(key);
        if (!folder) {
          folder = { name: segment, folderKey: key, children: [] };
          folderNodes.set(key, folder);
          current.children.push(folder);
        }
        current = folder;
      }
    }
  }

  sortTreeNodes(root);
  return root.children;
}

function sortTreeNodes(node) {
  if (!node.children) return;
  node.children.sort((a, b) => {
    const aIsFolder = 'children' in a && !('path' in a);
    const bIsFolder = 'children' in b && !('path' in b);
    if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
  });
  node.children.forEach(sortTreeNodes);
}
