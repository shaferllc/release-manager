import { registerDetailTabExtension } from '../registry';
import DetailEnvCard from './DetailEnvCard.vue';

const ENV_ICON =
  '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 13H8"/><path d="M16 13h-2"/><path d="M10 17H8"/><path d="M16 17h-2"/></svg>';

function isVisible(info) {
  const type = (info?.projectType || '').toLowerCase();
  return type === 'npm' || type === 'php';
}

registerDetailTabExtension({
  id: 'env',
  label: 'Environment',
  description: 'View and edit .env or .env.example for this project. Shown for npm and PHP projects.',
  version: '1.0.0',
  icon: ENV_ICON,
  component: DetailEnvCard,
  isVisible,
});
