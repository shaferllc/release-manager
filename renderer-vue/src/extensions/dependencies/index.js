import { registerDetailTabExtension } from '../registry';
import DetailDependenciesCard from './DetailDependenciesCard.vue';

const DEPS_ICON =
  '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h2"/></svg>';

function isVisible(info) {
  const type = (info?.projectType || '').toLowerCase();
  return type === 'npm' || type === 'php';
}

registerDetailTabExtension({
  id: 'dependencies',
  label: 'Dependencies',
  description: 'View outdated packages (npm outdated / composer outdated) and run audit. Copy upgrade command or open in terminal.',
  version: '1.0.0',
  icon: DEPS_ICON,
  component: DetailDependenciesCard,
  isVisible,
});
