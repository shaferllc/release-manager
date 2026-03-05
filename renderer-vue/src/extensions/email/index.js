import { registerDetailTabExtension } from '../registry';
import DetailEmailCard from './DetailEmailCard.vue';

const EMAIL_ICON = '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';

registerDetailTabExtension({
  id: 'email',
  label: 'Email',
  description: 'Catch outgoing emails from your app with a local SMTP server.',
  version: '1.0.0',
  icon: EMAIL_ICON,
  component: DetailEmailCard,
  featureFlagId: 'email',
});

// Email settings are per-project; configure them in the Email tab when a project is open.
