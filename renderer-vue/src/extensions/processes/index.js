import { registerDetailTabExtension } from '../registry';
import DetailProcessesCard from './DetailProcessesCard.vue';

const PROCESSES_ICON = '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="4" rx="1"/><rect x="2" y="10" width="20" height="4" rx="1"/><rect x="2" y="16" width="20" height="4" rx="1"/></svg>';

registerDetailTabExtension({
  id: 'processes',
  label: 'Dev stack',
  description: 'Run your dev stack in one place. Start or stop processes and view output.',
  version: '1.0.0',
  icon: PROCESSES_ICON,
  component: DetailProcessesCard,
  featureFlagId: 'processes',
});
