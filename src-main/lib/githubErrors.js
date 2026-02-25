/**
 * User-friendly messages for GitHub API / network errors. Testable without Electron.
 */

const GITHUB_OFFLINE_HINT =
  'Cannot reach GitHub. Check your internet connection and try again. If you use a token, check Settings.';

/**
 * Turn a raw error (message or string) from a GitHub request into a short, user-friendly message.
 * @param {string} rawError
 * @returns {string}
 */
function formatGitHubError(rawError) {
  if (!rawError || typeof rawError !== 'string') return GITHUB_OFFLINE_HINT;
  const msg = rawError.trim().toLowerCase();
  if (
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('etimedout') ||
    msg.includes('network') ||
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch')
  ) {
    return GITHUB_OFFLINE_HINT;
  }
  if (msg.includes('401') || msg.includes('unauthorized')) {
    return 'GitHub token invalid or expired. Update it in Settings.';
  }
  if (msg.includes('403') || msg.includes('forbidden')) {
    return 'GitHub access denied. Check your token permissions or rate limit.';
  }
  if (msg.includes('404')) {
    return 'Repo or releases not found. Check the remote URL.';
  }
  if (rawError.length > 120) return `GitHub: ${rawError.trim().slice(0, 117)}…`;
  return `GitHub: ${rawError.trim()}`;
}

module.exports = { formatGitHubError, GITHUB_OFFLINE_HINT };
