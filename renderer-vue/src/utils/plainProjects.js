/**
 * Convert a projects array (possibly containing Vue reactive proxies) to a plain
 * array of plain objects. Use this before passing projects to IPC (e.g. api.setProjects)
 * so the structured clone algorithm does not throw "An object could not be cloned".
 * @param {Array<{ path?: string, name?: string, tags?: string[], starred?: boolean, [key: string]: unknown }>} list
 * @returns {Array<{ path: string, name: string, tags: string[], starred: boolean }>}
 */
export function toPlainProjects(list) {
  if (!Array.isArray(list)) return [];
  return list.map((p) => ({
    path: String(p?.path ?? ''),
    name: String(p?.name ?? p?.path?.split(/[/\\]/).pop() ?? ''),
    tags: Array.isArray(p?.tags) ? [...p.tags] : [],
    starred: !!p?.starred,
  }));
}
