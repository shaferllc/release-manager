/**
 * Conventional commits: suggest bump type from commit subjects.
 * Returns 'major' | 'minor' | 'patch' | null.
 */

function suggestBumpFromCommits(commits) {
  if (!Array.isArray(commits) || commits.length === 0) return null;
  const breaking = /^(\w+)(\([^)]*\))?!:|BREAKING\s+CHANGE/i;
  const feat = /^feat(\([^)]*\))?:/i;
  const fix = /^fix(\([^)]*\))?:/i;
  let hasMajor = false;
  let hasMinor = false;
  let hasPatch = false;
  for (const s of commits) {
    const subj = String(s).trim();
    if (breaking.test(subj)) hasMajor = true;
    else if (feat.test(subj)) hasMinor = true;
    else if (fix.test(subj)) hasPatch = true;
  }
  if (hasMajor) return 'major';
  if (hasMinor) return 'minor';
  if (hasPatch) return 'patch';
  return null;
}

module.exports = { suggestBumpFromCommits };
