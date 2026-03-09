/**
 * CodeSeer extension: PHP debugging tab for Shipwell/Release Manager.
 * Receives dumps, traces, and logs from PHP via TCP (port 23523).
 */
import { registerDetailTabExtension } from '../registry';
import DetailCodeseerCard from './DetailCodeseerCard.vue';

const CODESEER_ICON =
  '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg>';

registerDetailTabExtension({
  id: 'codeseer',
  label: 'CodeSeer',
  description: 'PHP debugging: receive dumps, traces, and logs from your PHP app via TCP. Laradumps/Ray-style.',
  version: '1.0.0',
  icon: CODESEER_ICON,
  component: DetailCodeseerCard,
});
