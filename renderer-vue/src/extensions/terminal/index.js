import { registerDetailTabExtension } from '../registry';
import DetailTerminalCard from './DetailTerminalCard.vue';

const TERMINAL_ICON =
  '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>';

registerDetailTabExtension({
  id: 'terminal',
  label: 'Terminal',
  description: 'Run commands in the project directory. Multiple tabs, pop out to a separate window.',
  version: '1.0.0',
  icon: TERMINAL_ICON,
  component: DetailTerminalCard,
});
