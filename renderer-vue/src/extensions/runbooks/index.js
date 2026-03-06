import { registerDetailTabExtension } from '../registry';
import DetailRunbooksCard from './DetailRunbooksCard.vue';

const RUNBOOKS_ICON =
  '<svg class="detail-tab-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 13h.01"/></svg>';

registerDetailTabExtension({
  id: 'runbooks',
  label: 'Runbooks',
  description: 'Per-project saved scripts: Deploy staging, Seed DB, Lint, and other repetitive commands. Run here or open in Terminal.',
  version: '1.0.0',
  icon: RUNBOOKS_ICON,
  component: DetailRunbooksCard,
});
