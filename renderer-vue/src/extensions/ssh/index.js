import { registerDetailTabExtension } from '../registry';
import DetailSshCard from './DetailSshCard.vue';

const SSH_ICON =
  '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/></svg>';

registerDetailTabExtension({
  id: 'ssh',
  label: 'SSH',
  description: 'Save SSH connections and open sessions in your system terminal.',
  version: '1.0.0',
  icon: SSH_ICON,
  component: DetailSshCard,
  featureFlagId: 'ssh',
});
