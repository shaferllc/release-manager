import { registerDetailTabExtension } from '../registry';
import DetailGitHubIssuesCard from './DetailGitHubIssuesCard.vue';

const GITHUB_ISSUES_ICON =
  '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

function isVisible(info) {
  if (!info?.gitRemote || typeof info.gitRemote !== 'string') return false;
  const m = info.gitRemote.match(/github\.com[:/]/);
  return !!m;
}

registerDetailTabExtension({
  id: 'github-issues',
  label: 'GitHub Issues',
  description: 'List repository issues, filter by label, open in browser. Read-only. Requires GitHub token in Settings.',
  version: '1.0.0',
  icon: GITHUB_ISSUES_ICON,
  component: DetailGitHubIssuesCard,
  isVisible,
});
