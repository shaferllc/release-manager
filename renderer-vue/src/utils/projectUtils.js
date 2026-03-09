/**
 * Check if a Shipwell project (with github_repo) is already in the local projects list.
 * Matches by directory name (last path segment).
 * @param {object} proj - Shipwell project with github_repo
 * @param {Array<{ path?: string }>} projects - Local projects
 * @returns {boolean}
 */
export function isProjectAlreadyAdded(proj, projects) {
  const repoName = proj.github_repo?.split('/').pop();
  return projects.some((p) => {
    const dirName = p.path?.split(/[/\\]/).pop();
    return dirName === repoName;
  });
}
