/**
 * Pure helpers for GitHub repo/releases. Testable without Electron.
 */

function getReleasesUrl(gitRemote) {
  if (!gitRemote || typeof gitRemote !== 'string') return null;
  const m = gitRemote.match(/github\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/);
  if (!m) return null;
  return `https://github.com/${m[1]}/releases`;
}

function getActionsUrl(gitRemote) {
  if (!gitRemote || typeof gitRemote !== 'string') return null;
  const slug = getRepoSlug(gitRemote);
  if (!slug) return null;
  return `https://github.com/${slug.owner}/${slug.repo}/actions`;
}

function getRepoSlug(gitRemote) {
  if (!gitRemote || typeof gitRemote !== 'string') return null;
  const m = gitRemote.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

/**
 * Pick best release asset for the given platform.
 * @param {Array<{ name: string }>} assets
 * @param {string} [platform] - 'darwin' | 'win32' | 'linux' (default: process.platform)
 */
function pickAssetForPlatform(assets, platform = process.platform) {
  if (!Array.isArray(assets) || assets.length === 0) return null;
  const extPriority =
    platform === 'darwin'
      ? ['.dmg', '.zip', '.pkg']
      : platform === 'win32'
        ? ['.exe', '.msi', '.zip']
        : ['.AppImage', '.deb', '.rpm', '.zip'];
  for (const ext of extPriority) {
    const extLower = ext.toLowerCase();
    const asset = assets.find((a) => a.name && a.name.toLowerCase().endsWith(extLower));
    if (asset) return asset;
  }
  return assets[0];
}

module.exports = { getReleasesUrl, getActionsUrl, getRepoSlug, pickAssetForPlatform };
